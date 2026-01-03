import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, Check, Sparkles, Users, Zap, TrendingUp, Brain, 
  CreditCard, ExternalLink, Loader2, RefreshCw
} from 'lucide-react';
import { useEtherealSubscription } from '@/hooks/useEtherealSubscription';
import { ETHEREAL_PRICING } from '@/config/ethereal-pricing';
import { cn } from '@/lib/utils';

const BillingManager = () => {
  const {
    subscribed,
    planKey,
    subscriptionEnd,
    addons,
    extraSeats,
    loading,
    createCheckout,
    openCustomerPortal,
    checkSubscription,
    isPro,
    isStudio,
  } = useEtherealSubscription();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string, planName: string) => {
    setCheckoutLoading(priceId);
    await createCheckout(priceId);
    setCheckoutLoading(null);
  };

  const soloPlans = [
    {
      key: 'solo_free',
      name: 'Free',
      price: 0,
      features: ['Command Center', 'Inbox', 'Pipeline', 'Calendar', 'Clients (50 max)', 'Basic Creative'],
      cta: null,
    },
    {
      key: 'solo_pro',
      name: 'Solo Pro',
      price: 29,
      priceId: ETHEREAL_PRICING.solo_pro.priceId,
      features: ['Everything in Free', 'Creative Studio PRO', 'Money PRO', 'Unlimited Clients', 'Priority Support'],
      popular: true,
    },
    {
      key: 'solo_ultimate',
      name: 'Solo Ultimate',
      price: 59,
      priceId: ETHEREAL_PRICING.solo_ultimate.priceId,
      features: ['Everything in Pro', 'Growth Suite', 'AI Center', 'Advanced Analytics', 'White-glove onboarding'],
    },
  ];

  const studioPlans = [
    {
      key: 'studio_basic',
      name: 'Studio Basic',
      price: 49,
      priceId: ETHEREAL_PRICING.studio_basic.priceId,
      seats: 3,
      perSeat: 15,
      features: ['Core modules', '3 team seats', 'Team calendar', 'Basic reporting'],
    },
    {
      key: 'studio_pro',
      name: 'Studio Pro',
      price: 99,
      priceId: ETHEREAL_PRICING.studio_pro.priceId,
      seats: 5,
      perSeat: 12,
      features: ['Everything in Basic', 'Creative PRO', 'Money PRO', '5 team seats', 'Advanced analytics'],
      popular: true,
    },
    {
      key: 'studio_ultimate',
      name: 'Studio Ultimate',
      price: 199,
      priceId: ETHEREAL_PRICING.studio_ultimate.priceId,
      seats: 10,
      perSeat: 10,
      features: ['Everything in Pro', 'Growth Suite', 'AI Center', '10 team seats', 'Dedicated support'],
    },
  ];

  const addonsList = [
    {
      key: 'growth',
      name: 'Growth Suite',
      price: 39,
      priceId: ETHEREAL_PRICING.growth_addon.priceId,
      icon: TrendingUp,
      description: 'Social media, marketing, and growth tools',
    },
    {
      key: 'ai_center',
      name: 'AI Center',
      price: 49,
      priceId: ETHEREAL_PRICING.ai_center_addon.priceId,
      icon: Brain,
      description: 'Full AI capabilities and automations',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Plan Status */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>
                  {subscribed ? `Your subscription is active` : 'You are on the free plan'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={checkSubscription}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {subscribed && (
                <Button variant="outline" size="sm" onClick={openCustomerPortal}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={subscribed ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                {planKey.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            {subscriptionEnd && (
              <div className="text-sm text-muted-foreground">
                Renews: {new Date(subscriptionEnd).toLocaleDateString()}
              </div>
            )}
            {addons.length > 0 && (
              <div className="flex gap-2">
                {addons.map(addon => (
                  <Badge key={addon} variant="outline" className="text-xs">
                    +{addon}
                  </Badge>
                ))}
              </div>
            )}
            {extraSeats > 0 && (
              <Badge variant="outline" className="text-xs">
                +{extraSeats} extra seats
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Solo Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Solo Artist Plans
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {soloPlans.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={cn(
                "relative overflow-hidden h-full transition-all",
                plan.popular && "border-primary shadow-lg",
                planKey === plan.key && "ring-2 ring-primary"
              )}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                {planKey === plan.key && (
                  <div className="absolute top-0 left-0 bg-emerald-500 text-white text-xs px-3 py-1 rounded-br-lg">
                    Current
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.priceId && planKey !== plan.key && (
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                      disabled={checkoutLoading === plan.priceId}
                      onClick={() => handleUpgrade(plan.priceId!, plan.name)}
                    >
                      {checkoutLoading === plan.priceId ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Upgrade
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Studio Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Studio Plans
          <Badge variant="secondary" className="ml-2">Teams</Badge>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {studioPlans.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Card className={cn(
                "relative overflow-hidden h-full transition-all",
                plan.popular && "border-primary shadow-lg",
                planKey === plan.key && "ring-2 ring-primary"
              )}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg">
                    Best Value
                  </div>
                )}
                {planKey === plan.key && (
                  <div className="absolute top-0 left-0 bg-emerald-500 text-white text-xs px-3 py-1 rounded-br-lg">
                    Current
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plan.seats} seats included · ${plan.perSeat}/extra seat
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {planKey !== plan.key && (
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                      disabled={checkoutLoading === plan.priceId}
                      onClick={() => handleUpgrade(plan.priceId, plan.name)}
                    >
                      {checkoutLoading === plan.priceId ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Upgrade
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Add-ons */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Power Add-ons
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {addonsList.map((addon, i) => {
            const hasAddon = addons.includes(addon.key);
            const Icon = addon.icon;
            return (
              <motion.div
                key={addon.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <Card className={cn(
                  "transition-all",
                  hasAddon && "border-emerald-500/50 bg-emerald-500/5"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-3 rounded-xl",
                          hasAddon ? "bg-emerald-500/20" : "bg-primary/10"
                        )}>
                          <Icon className={cn(
                            "w-6 h-6",
                            hasAddon ? "text-emerald-500" : "text-primary"
                          )} />
                        </div>
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {addon.name}
                            {hasAddon && <Badge variant="outline" className="text-emerald-500 border-emerald-500">Active</Badge>}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">{addon.description}</p>
                          <p className="text-lg font-bold mt-2">${addon.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        </div>
                      </div>
                      {!hasAddon && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={checkoutLoading === addon.priceId}
                          onClick={() => handleUpgrade(addon.priceId, addon.name)}
                        >
                          {checkoutLoading === addon.priceId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Add'
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Extra Seats */}
      {isStudio && (
        <>
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Extra Team Seats
            </h3>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Add More Team Members</h4>
                    <p className="text-sm text-muted-foreground">
                      ${ETHEREAL_PRICING.extra_seat.price}/month per additional seat
                    </p>
                    {extraSeats > 0 && (
                      <Badge variant="outline" className="mt-2">
                        {extraSeats} extra seats active
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline"
                    disabled={checkoutLoading === ETHEREAL_PRICING.extra_seat.priceId}
                    onClick={() => handleUpgrade(ETHEREAL_PRICING.extra_seat.priceId!, 'Extra Seat')}
                  >
                    {checkoutLoading === ETHEREAL_PRICING.extra_seat.priceId ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    Add Seat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default BillingManager;
