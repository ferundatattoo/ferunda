import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StatusPill, ProposalStatus } from "./StatusPill";
import { ChevronRight, Calendar, Clock } from "lucide-react";

interface ProposalCardProps {
  id: string;
  type: 'reschedule' | 'duration_change' | 'service_change' | 'info_request' | 'cancellation';
  status: ProposalStatus;
  appointmentTitle: string;
  proposedBy: string;
  createdAt: Date | string;
  expiresAt?: Date | string;
  onClick: () => void;
  className?: string;
}

const typeLabels: Record<string, string> = {
  reschedule: 'Re-agendar',
  duration_change: 'Cambio de duracion',
  service_change: 'Cambio de servicio',
  info_request: 'Solicitud de informacion',
  cancellation: 'Cancelacion',
};

export function ProposalCard({
  type,
  status,
  appointmentTitle,
  proposedBy,
  createdAt,
  expiresAt,
  onClick,
  className,
}: ProposalCardProps) {
  const isExpiringSoon = expiresAt && new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border border-border bg-card",
        "hover:border-foreground/30 transition-all duration-200",
        "group",
        isExpiringSoon && "border-amber-500/50",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-body text-xs uppercase tracking-wider text-muted-foreground">
              {typeLabels[type] || type}
            </span>
            <StatusPill status={status} size="sm" />
          </div>
          
          <h3 className="font-display text-lg text-foreground truncate">
            {appointmentTitle}
          </h3>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
            <span>
              Propuesto por {proposedBy}
            </span>
            
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(createdAt), "d MMM", { locale: es })}
            </span>
            
            {expiresAt && (
              <span className={cn(
                "flex items-center gap-1",
                isExpiringSoon && "text-amber-400"
              )}>
                <Clock className="w-3 h-3" />
                Expira {format(new Date(expiresAt), "d MMM", { locale: es })}
              </span>
            )}
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}
