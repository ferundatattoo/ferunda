import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Option {
  id: string;
  label: string;
  sublabel?: string;
  description?: string;
  recommended?: boolean;
}

interface ThreeOptionsListProps {
  options: Option[];
  selectedId?: string;
  onSelect: (id: string) => void;
  title?: string;
  className?: string;
}

export function ThreeOptionsList({ 
  options, 
  selectedId, 
  onSelect, 
  title,
  className 
}: ThreeOptionsListProps) {
  // Always show max 3 options
  const displayOptions = options.slice(0, 3);

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="font-display text-lg text-foreground">
          {title}
        </h3>
      )}
      
      <div className="space-y-2">
        {displayOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "w-full text-left p-4 border transition-all duration-200",
              "hover:border-foreground/30",
              selectedId === option.id 
                ? "border-foreground bg-foreground/5" 
                : "border-border bg-transparent"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-body text-sm text-foreground">
                    {option.label}
                  </span>
                  {option.recommended && (
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-foreground/10 text-foreground">
                      Recomendado
                    </span>
                  )}
                </div>
                {option.sublabel && (
                  <span className="font-body text-xs text-muted-foreground mt-0.5 block">
                    {option.sublabel}
                  </span>
                )}
                {option.description && (
                  <p className="font-body text-xs text-muted-foreground mt-2">
                    {option.description}
                  </p>
                )}
              </div>
              
              <div className={cn(
                "w-5 h-5 border flex items-center justify-center flex-shrink-0 transition-colors",
                selectedId === option.id 
                  ? "border-foreground bg-foreground" 
                  : "border-border"
              )}>
                {selectedId === option.id && (
                  <Check className="w-3 h-3 text-background" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
