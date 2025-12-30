import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

interface ActionBarProps {
  actions: Action[];
  className?: string;
  sticky?: boolean;
}

export function ActionBar({ actions, className, sticky = true }: ActionBarProps) {
  // Max 2 actions per the design spec
  const displayActions = actions.slice(0, 2);

  if (displayActions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 py-4",
        sticky && "sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border",
        className
      )}
    >
      {displayActions.map((action, index) => (
        <Button
          key={index}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
          variant={action.variant === 'secondary' ? 'outline' : 'default'}
          className={cn(
            "font-body text-sm tracking-wide uppercase min-w-[140px]",
            action.variant === 'primary' && "bg-foreground text-background hover:bg-foreground/90"
          )}
        >
          {action.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
