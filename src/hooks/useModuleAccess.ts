import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace, WorkspaceType } from "./useWorkspace";

export interface EtherealModule {
  id: string;
  module_key: string;
  display_name: string;
  description: string | null;
  category: 'core' | 'lite' | 'pro' | 'addon';
  icon: string | null;
  route: string | null;
  parent_module: string | null;
  solo_addon_price: number | null;
  studio_addon_price: number | null;
  is_always_free: boolean;
  is_locked: boolean;
  lock_message: string | null;
  features: string[];
  sort_order: number;
}

export interface EtherealBundle {
  id: string;
  name: string;
  description: string | null;
  modules: string[];
  solo_price: number | null;
  studio_price: number | null;
  discount_percent: number;
  is_active: boolean;
  promo_ends_at: string | null;
}

export interface WorkspaceSubscription {
  id: string;
  workspace_id: string;
  plan_key: string;
  purchased_addons: string[];
  purchased_bundles: string[];
  seat_count: number;
  monthly_total: number;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'free';
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export interface PricingPlan {
  id: string;
  plan_key: string;
  display_name: string;
  description: string | null;
  workspace_type: 'solo' | 'studio';
  base_price: number;
  price_per_seat: number;
  included_seats: number;
  included_modules: string[];
  features: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

export function useModuleAccess() {
  const { user } = useAuth();
  const { workspaceId, workspaceType } = useWorkspace(user?.id ?? null);

  // Fetch all modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['ethereal-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ethereal_modules')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return (data || []).map(m => ({
        ...m,
        features: Array.isArray(m.features) ? m.features : []
      })) as EtherealModule[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all pricing plans
  const { data: plans = [] } = useQuery({
    queryKey: ['ethereal-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ethereal_pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as PricingPlan[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all bundles
  const { data: bundles = [] } = useQuery({
    queryKey: ['ethereal-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ethereal_bundles')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as EtherealBundle[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch workspace subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['workspace-subscription', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from('workspace_subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (error) throw error;
      return data as WorkspaceSubscription | null;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });

  // Get current plan details
  const currentPlan = plans.find(p => p.plan_key === subscription?.plan_key);
  const effectiveType = workspaceType === 'studio' ? 'studio' : 'solo';

  // Check if module is included in current plan
  const isIncludedInPlan = (moduleKey: string): boolean => {
    if (!currentPlan) {
      // Default to free plan modules
      const freePlan = plans.find(p => p.plan_key === `${effectiveType}_free`);
      return freePlan?.included_modules?.includes(moduleKey) ?? false;
    }
    return currentPlan.included_modules?.includes(moduleKey) ?? false;
  };

  // Check if module was purchased as addon
  const isPurchasedAddon = (moduleKey: string): boolean => {
    if (!subscription) return false;
    
    // Direct addon purchase
    if (subscription.purchased_addons?.includes(moduleKey)) return true;
    
    // Through bundle
    const purchasedBundles = bundles.filter(b => 
      subscription.purchased_bundles?.includes(b.id)
    );
    return purchasedBundles.some(bundle => bundle.modules.includes(moduleKey));
  };

  // Main access check
  const hasAccess = (moduleKey: string): boolean => {
    const module = modules.find(m => m.module_key === moduleKey);
    
    // Module not found or always free
    if (!module) return false;
    if (module.is_always_free) return true;
    if (module.category === 'core') return true;
    
    // Check if admin locked it
    if (module.is_locked) {
      // Even if locked, check if they purchased it
      return isIncludedInPlan(moduleKey) || isPurchasedAddon(moduleKey);
    }
    
    // LITE modules are free, PRO/addon need plan or purchase
    if (module.category === 'lite') return true;
    
    return isIncludedInPlan(moduleKey) || isPurchasedAddon(moduleKey);
  };

  // Check specific access levels
  const hasLiteAccess = (moduleKey: string): boolean => {
    const liteKey = moduleKey.replace('-pro', '-lite');
    return hasAccess(liteKey);
  };

  const hasProAccess = (moduleKey: string): boolean => {
    const proKey = moduleKey.includes('-pro') ? moduleKey : `${moduleKey}-pro`;
    return hasAccess(proKey);
  };

  // Check if module is locked (requires upgrade)
  const isLocked = (moduleKey: string): boolean => {
    const module = modules.find(m => m.module_key === moduleKey);
    if (!module) return false;
    if (module.is_always_free || module.category === 'core' || module.category === 'lite') return false;
    return !hasAccess(moduleKey);
  };

  // Get module info
  const getModuleInfo = (moduleKey: string): EtherealModule | undefined => {
    return modules.find(m => m.module_key === moduleKey);
  };

  // Get bundles that include a module
  const getBundlesFor = (moduleKey: string): EtherealBundle[] => {
    return bundles.filter(b => b.modules.includes(moduleKey));
  };

  // Get upgrade options for a locked module
  const getUpgradeOptions = (moduleKey: string) => {
    const module = getModuleInfo(moduleKey);
    if (!module) return { individual: null, bundles: [], plans: [] };

    const price = effectiveType === 'studio' 
      ? module.studio_addon_price 
      : module.solo_addon_price;

    const relevantBundles = getBundlesFor(moduleKey);
    const upgradePlans = plans.filter(p => 
      p.workspace_type === effectiveType &&
      p.included_modules?.includes(moduleKey) &&
      p.plan_key !== subscription?.plan_key
    );

    return {
      individual: price ? { moduleKey, price } : null,
      bundles: relevantBundles,
      plans: upgradePlans,
    };
  };

  // Get seat info for studios
  const seatsUsed = 1; // TODO: Calculate from workspace_members
  const seatsAvailable = (currentPlan?.included_seats || 1) + (subscription?.seat_count || 0) - 1;

  return {
    // Access checks
    hasAccess,
    hasLiteAccess,
    hasProAccess,
    isLocked,
    
    // Data
    modules,
    bundles,
    plans,
    subscription,
    currentPlan,
    
    // Helpers
    getModuleInfo,
    getBundlesFor,
    getUpgradeOptions,
    
    // Seats (for studios)
    seatCount: subscription?.seat_count || 1,
    seatsUsed,
    seatsAvailable,
    
    // Status
    isLoading: modulesLoading || subscriptionLoading,
    workspaceType: effectiveType,
  };
}

export default useModuleAccess;
