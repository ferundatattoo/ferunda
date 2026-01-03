import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Badge } from './badge';
import { useModuleAccess, EtherealModule, EtherealBundle, PricingPlan } from '@/hooks/useModuleAccess';
import { Lock, Sparkles, Check, Zap, Crown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey?: string;
  mode?: 'module' | 'seats' | 'plans';
}

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  moduleKey,
  mode = 'module' 
}: UpgradeModalProps) {
  const { 
    getModuleInfo, 
    getUpgradeOptions, 
    plans, 
    workspaceType,
    currentPlan,
    subscription 
  } = useModuleAccess();

  const moduleInfo = moduleKey ? getModuleInfo(moduleKey) : null;
  const upgradeOptions = moduleKey ? getUpgradeOptions(moduleKey) : null;

  const filteredPlans = plans.filter(p => p.workspace_type === workspaceType);

  const handleUpgrade = (type: 'individual' | 'bundle' | 'plan', id?: string) => {
    // TODO: Integrate with Stripe checkout
    console.log('Upgrade requested:', { type, id, moduleKey });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'module' && moduleInfo && (
              <>
                <Lock className="w-5 h-5 text-primary" />
                Unlock {moduleInfo.display_name}
              </>
            )}
            {mode === 'seats' && (
              <>
                <Building2 className="w-5 h-5 text-primary" />
                Add More Seats
              </>
            )}
            {mode === 'plans' && (
              <>
                <Crown className="w-5 h-5 text-primary" />
                Upgrade Your Plan
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'module' && moduleInfo?.description}
            {mode === 'seats' && 'Add more team members to your workspace'}
            {mode === 'plans' && 'Choose the plan that fits your needs'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Module Features */}
          {mode === 'module' && moduleInfo?.features && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Features included:</h4>
              <div className="grid grid-cols-2 gap-2">
                {moduleInfo.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Purchase Option */}
          {mode === 'module' && upgradeOptions?.individual && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Buy Individual</h4>
                  <p className="text-sm text-muted-foreground">
                    Add just {moduleInfo?.display_name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    ${upgradeOptions.individual.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <Button size="sm" className="mt-2" onClick={() => handleUpgrade('individual')}>
                    <Zap className="w-4 h-4 mr-1" />
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bundle Options */}
          {mode === 'module' && upgradeOptions?.bundles && upgradeOptions.bundles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Save with Bundles
              </h4>
              <div className="grid gap-3">
                {upgradeOptions.bundles.map((bundle) => (
                  <BundleCard 
                    key={bundle.id} 
                    bundle={bundle} 
                    workspaceType={workspaceType as 'solo' | 'studio'}
                    onSelect={() => handleUpgrade('bundle', bundle.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Plan Upgrade Options */}
          {(mode === 'plans' || (mode === 'module' && upgradeOptions?.plans && upgradeOptions.plans.length > 0)) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                {mode === 'module' ? 'Or upgrade your plan' : 'Available Plans'}
              </h4>
              <div className="grid gap-3">
                {filteredPlans.map((plan) => (
                  <PlanCard 
                    key={plan.id} 
                    plan={plan}
                    isCurrent={plan.plan_key === subscription?.plan_key}
                    onSelect={() => handleUpgrade('plan', plan.plan_key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seat Upgrade */}
          {mode === 'seats' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Current seats</span>
                  <span className="font-medium">{subscription?.seat_count || 1}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Price per seat</span>
                  <span className="font-medium">${currentPlan?.price_per_seat || 15}/mo</span>
                </div>
                <Button className="w-full" onClick={() => handleUpgrade('plan', 'add-seat')}>
                  Add Seat (+${currentPlan?.price_per_seat || 15}/mo)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BundleCard({ 
  bundle, 
  workspaceType,
  onSelect 
}: { 
  bundle: EtherealBundle; 
  workspaceType: 'solo' | 'studio';
  onSelect: () => void;
}) {
  const price = workspaceType === 'studio' ? bundle.studio_price : bundle.solo_price;
  
  if (!price) return null;

  return (
    <div className="p-4 rounded-lg border hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-medium">{bundle.name}</h5>
            {bundle.discount_percent > 0 && (
              <Badge variant="secondary" className="text-xs">
                Save {bundle.discount_percent}%
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {bundle.modules.join(' + ')}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">${price}<span className="text-sm font-normal">/mo</span></div>
          <Button size="sm" variant="outline" className="mt-2" onClick={onSelect}>
            Select
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ 
  plan, 
  isCurrent,
  onSelect 
}: { 
  plan: PricingPlan; 
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      isCurrent ? "border-primary bg-primary/5" : "hover:border-primary/50"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-medium">{plan.display_name}</h5>
            {isCurrent && (
              <Badge variant="default" className="text-xs">Current</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {plan.description}
          </p>
          {plan.workspace_type === 'studio' && plan.included_seats > 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              Includes {plan.included_seats} seats (+${plan.price_per_seat}/additional)
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">
            ${plan.base_price}
            <span className="text-sm font-normal">/mo</span>
          </div>
          {!isCurrent && (
            <Button size="sm" className="mt-2" onClick={onSelect}>
              Upgrade
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
