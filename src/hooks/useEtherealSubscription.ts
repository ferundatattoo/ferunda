import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ETHEREAL_PRICING, getPlanByProductId } from '@/config/ethereal-pricing';
import { toast } from 'sonner';

interface SubscriptionState {
  subscribed: boolean;
  planKey: string;
  productId: string | null;
  subscriptionEnd: string | null;
  addons: string[];
  extraSeats: number;
  loading: boolean;
  error: string | null;
}

export function useEtherealSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    planKey: 'free',
    productId: null,
    subscriptionEnd: null,
    addons: [],
    extraSeats: 0,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('ethereal-check-subscription');
      
      if (error) throw error;

      setState({
        subscribed: data.subscribed,
        planKey: data.plan_key || 'free',
        productId: data.product_id,
        subscriptionEnd: data.subscription_end,
        addons: data.addons || [],
        extraSeats: data.extra_seats || 0,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh periodically
  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000); // Every minute
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const createCheckout = async (priceId: string, quantity = 1) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ethereal-create-checkout', {
        body: { price_id: priceId, quantity },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        return data.url;
      }
      return null;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to create checkout session');
      return null;
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ethereal-customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        return data.url;
      }
      return null;
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Failed to open subscription management');
      return null;
    }
  };

  const getCurrentPlan = () => {
    const planEntry = Object.entries(ETHEREAL_PRICING).find(
      ([key]) => key === state.planKey
    );
    return planEntry ? { key: planEntry[0], ...planEntry[1] } : null;
  };

  const hasAddon = (addonKey: string) => state.addons.includes(addonKey);

  const isPro = state.planKey.includes('pro') || state.planKey.includes('ultimate');
  const isStudio = state.planKey.includes('studio');

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    getCurrentPlan,
    hasAddon,
    isPro,
    isStudio,
    pricing: ETHEREAL_PRICING,
  };
}
