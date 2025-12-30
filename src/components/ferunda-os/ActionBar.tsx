import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
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
        "flex items-center justify-end gap-3 py-4 px-6",
        sticky && "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border",
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-end gap-3 max-w-2xl">
        {displayActions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            variant={action.variant === 'secondary' || action.variant === 'outline' ? 'outline' : 'default'}
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
    </div>
  );
}
