import React from 'react';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showPreview?: boolean;
  className?: string;
}

export function FeatureGate({ 
  module, 
  children, 
  fallback,
  showPreview = true,
  className 
}: FeatureGateProps) {
  const { hasAccess, getModuleInfo, getUpgradeOptions } = useModuleAccess();
  
  if (hasAccess(module)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const moduleInfo = getModuleInfo(module);
  const upgradeOptions = getUpgradeOptions(module);

  return (
    <div className={cn("relative", className)}>
      {showPreview && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none z-10" />
      )}
      
      {showPreview && (
        <div className="opacity-30 blur-[2px] pointer-events-none">
          {children}
        </div>
      )}
      
      <div className={cn(
        "flex flex-col items-center justify-center text-center p-8 gap-4",
        showPreview ? "absolute inset-0 z-20" : ""
      )}>
        <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {moduleInfo?.display_name || 'Premium Feature'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {moduleInfo?.description || 'Upgrade to access this feature'}
          </p>
        </div>

        {moduleInfo?.features && moduleInfo.features.length > 0 && (
          <ul className="text-sm text-muted-foreground space-y-1">
            {moduleInfo.features.slice(0, 3).map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-3 mt-2">
          {upgradeOptions.individual && (
            <Button size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Unlock for ${upgradeOptions.individual.price}/mo
            </Button>
          )}
          {upgradeOptions.bundles.length > 0 && (
            <Button size="sm" variant="outline">
              View Bundles
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeatureGate;
