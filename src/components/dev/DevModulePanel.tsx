import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Lock, Unlock, Package, Zap, Crown, Users, RefreshCw, 
  CheckCircle2, XCircle, Loader2, Settings2 
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_PRESETS = [
  { key: 'solo_free', label: 'Solo Free', icon: Users, color: 'bg-muted' },
  { key: 'solo_pro', label: 'Solo Pro', icon: Zap, color: 'bg-blue-500/20' },
  { key: 'solo_ultimate', label: 'Solo Ultimate', icon: Crown, color: 'bg-purple-500/20' },
  { key: 'studio_pro', label: 'Studio Pro', icon: Package, color: 'bg-emerald-500/20' },
  { key: 'studio_ultimate', label: 'Studio Ultimate', icon: Crown, color: 'bg-amber-500/20' },
];

export function DevModulePanel() {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace(user?.id ?? null);
  const { 
    modules, bundles, plans, subscription, currentPlan, 
    hasAccess, isLocked, isLoading, workspaceType 
  } = useModuleAccess();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const switchPlan = async (planKey: string) => {
    if (!workspaceId) {
      toast.error("No workspace ID available");
      return;
    }
    
    setUpdating(planKey);
    try {
      const { error } = await supabase
        .from('workspace_subscriptions')
        .upsert({
          workspace_id: workspaceId,
          plan_key: planKey,
          status: 'active',
          purchased_addons: subscription?.purchased_addons || [],
          purchased_bundles: subscription?.purchased_bundles || [],
          seat_count: subscription?.seat_count || 1,
          monthly_total: 0,
        }, { onConflict: 'workspace_id' });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['workspace-subscription'] });
      toast.success(`Switched to ${planKey}`);
    } catch (err) {
      console.error('Error switching plan:', err);
      toast.error("Failed to switch plan");
    } finally {
      setUpdating(null);
    }
  };

  const toggleAddon = async (addonKey: string) => {
    if (!workspaceId) return;
    
    setUpdating(addonKey);
    try {
      const currentAddons = subscription?.purchased_addons || [];
      const newAddons = currentAddons.includes(addonKey)
        ? currentAddons.filter((a: string) => a !== addonKey)
        : [...currentAddons, addonKey];

      const { error } = await supabase
        .from('workspace_subscriptions')
        .update({ purchased_addons: newAddons })
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['workspace-subscription'] });
      toast.success(newAddons.includes(addonKey) ? `Enabled ${addonKey}` : `Disabled ${addonKey}`);
    } catch (err) {
      console.error('Error toggling addon:', err);
      toast.error("Failed to toggle addon");
    } finally {
      setUpdating(null);
    }
  };

  const toggleBundle = async (bundleId: string) => {
    if (!workspaceId) return;
    
    setUpdating(bundleId);
    try {
      const currentBundles = subscription?.purchased_bundles || [];
      const newBundles = currentBundles.includes(bundleId)
        ? currentBundles.filter((b: string) => b !== bundleId)
        : [...currentBundles, bundleId];

      const { error } = await supabase
        .from('workspace_subscriptions')
        .update({ purchased_bundles: newBundles })
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['workspace-subscription'] });
      toast.success("Bundle updated");
    } catch (err) {
      console.error('Error toggling bundle:', err);
      toast.error("Failed to toggle bundle");
    } finally {
      setUpdating(null);
    }
  };

  const resetToFree = async () => {
    if (!workspaceId) return;
    
    setUpdating('reset');
    try {
      const { error } = await supabase
        .from('workspace_subscriptions')
        .update({ 
          plan_key: 'solo_free',
          purchased_addons: [],
          purchased_bundles: [],
          seat_count: 1,
          monthly_total: 0,
        })
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['workspace-subscription'] });
      toast.success("Reset to free plan");
    } catch (err) {
      console.error('Error resetting:', err);
      toast.error("Failed to reset");
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-dashed border-amber-500/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const groupedModules = {
    core: modules.filter(m => m.category === 'core'),
    lite: modules.filter(m => m.category === 'lite'),
    pro: modules.filter(m => m.category === 'pro'),
    addon: modules.filter(m => m.category === 'addon'),
  };

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <Settings2 className="h-5 w-5" />
            DEV: Module Access Control
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {workspaceType} / {subscription?.plan_key || 'no subscription'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Plan Switch */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Switch</p>
          <div className="flex flex-wrap gap-2">
            {PLAN_PRESETS.map((plan) => {
              const Icon = plan.icon;
              const isActive = subscription?.plan_key === plan.key;
              return (
                <Button
                  key={plan.key}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className={cn("gap-1.5", isActive && plan.color)}
                  onClick={() => switchPlan(plan.key)}
                  disabled={updating !== null}
                >
                  {updating === plan.key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  {plan.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="bundles">Bundles</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-3">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {Object.entries(groupedModules).map(([category, mods]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      {category}
                      <Badge variant="secondary" className="text-[10px]">{mods.length}</Badge>
                    </p>
                    <div className="space-y-1">
                      {mods.map((mod) => {
                        const access = hasAccess(mod.module_key);
                        const locked = isLocked(mod.module_key);
                        const isAddon = mod.category === 'addon';
                        const isPurchased = subscription?.purchased_addons?.includes(mod.module_key);
                        
                        return (
                          <div
                            key={mod.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md text-sm",
                              access ? "bg-emerald-500/10" : "bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {access ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : locked ? (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Unlock className="h-4 w-4 text-amber-500" />
                              )}
                              <span className={cn(!access && "text-muted-foreground")}>
                                {mod.display_name}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {mod.category}
                              </Badge>
                            </div>
                            {isAddon && (
                              <Switch
                                checked={isPurchased || false}
                                onCheckedChange={() => toggleAddon(mod.module_key)}
                                disabled={updating !== null}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="bundles" className="mt-3">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {bundles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No bundles configured</p>
                ) : (
                  bundles.map((bundle) => {
                    const isPurchased = subscription?.purchased_bundles?.includes(bundle.id);
                    return (
                      <div
                        key={bundle.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-md",
                          isPurchased ? "bg-purple-500/10" : "bg-muted/50"
                        )}
                      >
                        <div>
                          <p className="font-medium">{bundle.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {bundle.modules.length} modules • {bundle.discount_percent}% discount
                          </p>
                        </div>
                        <Switch
                          checked={isPurchased || false}
                          onCheckedChange={() => toggleBundle(bundle.id)}
                          disabled={updating !== null}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="plans" className="mt-3">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {plans.map((plan) => {
                  const isActive = currentPlan?.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "p-3 rounded-md border",
                        isActive ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {plan.display_name}
                            {isActive && <Badge className="text-[10px]">Current</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${plan.base_price}/mo • {plan.included_modules?.length || 0} modules
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isActive ? "secondary" : "outline"}
                          onClick={() => switchPlan(plan.plan_key)}
                          disabled={updating !== null || isActive}
                        >
                          {updating === plan.plan_key ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isActive ? (
                            "Active"
                          ) : (
                            "Switch"
                          )}
                        </Button>
                      </div>
                      {plan.included_modules && plan.included_modules.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {plan.included_modules.map((mod: string) => (
                            <Badge key={mod} variant="secondary" className="text-[10px]">
                              {mod}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Reset Button */}
        <div className="pt-2 border-t">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={resetToFree}
            disabled={updating !== null}
          >
            {updating === 'reset' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reset to Free Plan
          </Button>
        </div>

        {/* Debug Info */}
        <div className="text-[10px] text-muted-foreground font-mono p-2 bg-muted/30 rounded">
          workspace: {workspaceId || 'null'} | type: {workspaceType} | plan: {subscription?.plan_key || 'none'}
          <br />
          addons: [{subscription?.purchased_addons?.join(', ') || 'none'}]
          <br />
          bundles: [{subscription?.purchased_bundles?.join(', ') || 'none'}]
        </div>
      </CardContent>
    </Card>
  );
}

export default DevModulePanel;
