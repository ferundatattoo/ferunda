import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {Icon && (
        <div className="w-12 h-12 mb-6 flex items-center justify-center border border-border">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      
      <h3 className="font-display text-xl text-foreground mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="font-body text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 font-body text-xs uppercase tracking-wider text-foreground border-b border-foreground pb-0.5 hover:text-muted-foreground hover:border-muted-foreground transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
