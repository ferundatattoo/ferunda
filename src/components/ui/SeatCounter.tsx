import React from 'react';
import { Users, Plus, AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface SeatCounterProps {
  used: number;
  total: number;
  onUpgrade?: () => void;
  compact?: boolean;
  className?: string;
}

export function SeatCounter({ 
  used, 
  total, 
  onUpgrade,
  compact = false,
  className 
}: SeatCounterProps) {
  const isOverLimit = used > total;
  const isNearLimit = used >= total * 0.8;
  const available = Math.max(0, total - used);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
            isOverLimit ? "bg-destructive/10 text-destructive" : 
            isNearLimit ? "bg-amber-500/10 text-amber-500" : 
            "bg-muted text-muted-foreground",
            className
          )}>
            <Users className="w-3 h-3" />
            <span>{used}/{total}</span>
            {isOverLimit && <AlertTriangle className="w-3 h-3" />}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{used} of {total} seats used</p>
          {isOverLimit && <p className="text-destructive">Upgrade to add more seats</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isOverLimit ? "border-destructive/50 bg-destructive/5" : 
      isNearLimit ? "border-amber-500/50 bg-amber-500/5" : 
      "border-border bg-card",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className={cn(
            "w-4 h-4",
            isOverLimit ? "text-destructive" : 
            isNearLimit ? "text-amber-500" : 
            "text-muted-foreground"
          )} />
          <div>
            <div className="text-sm font-medium">
              {used} / {total} seats
            </div>
            <div className="text-xs text-muted-foreground">
              {isOverLimit 
                ? `${used - total} seats over limit` 
                : `${available} available`
              }
            </div>
          </div>
        </div>

        {onUpgrade && (
          <Button 
            size="sm" 
            variant={isOverLimit ? "destructive" : "outline"}
            onClick={onUpgrade}
            className="gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            isOverLimit ? "bg-destructive" : 
            isNearLimit ? "bg-amber-500" : 
            "bg-primary"
          )}
          style={{ width: `${Math.min(100, (used / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default SeatCounter;
