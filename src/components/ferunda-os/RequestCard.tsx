import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StatusPill, RequestStatus } from "./StatusPill";
import { ChevronRight, Clock, MapPin } from "lucide-react";

export interface RequestCardProps {
  id: string;
  clientName: string;
  serviceType: string;
  status: RequestStatus;
  createdAt: Date | string;
  estimatedHours?: number;
  city?: string;
  onClick: () => void;
  className?: string;
}

const serviceLabels: Record<string, string> = {
  custom: 'Personalizado',
  flash: 'Flash',
  coverup: 'Cover-up',
  touchup: 'Retoque',
  consult: 'Consulta',
};

export function RequestCard({
  clientName,
  serviceType,
  status,
  createdAt,
  estimatedHours,
  city,
  onClick,
  className,
}: RequestCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border border-border bg-card",
        "hover:border-foreground/30 transition-all duration-200",
        "group",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-lg text-foreground truncate">
              {clientName}
            </h3>
            <StatusPill status={status} size="sm" />
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
            <span className="uppercase tracking-wider">
              {serviceLabels[serviceType] || serviceType}
            </span>
            
            {estimatedHours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {estimatedHours}h
              </span>
            )}
            
            {city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {city}
              </span>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground font-body">
            {format(new Date(createdAt), "d MMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}
