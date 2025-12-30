import { format } from "date-fns";
import { es } from "date-fns/locale";
import { StatusPill, RequestStatus, ProposalStatus, AppointmentState } from "./StatusPill";
import { cn } from "@/lib/utils";

interface DossierHeaderProps {
  title: string;
  subtitle?: string;
  status?: RequestStatus | ProposalStatus | AppointmentState;
  date?: Date | string;
  meta?: { label: string; value: string }[];
  className?: string;
}

export function DossierHeader({ 
  title, 
  subtitle, 
  status, 
  date, 
  meta,
  className 
}: DossierHeaderProps) {
  const formattedDate = date 
    ? format(new Date(date), "d MMM yyyy", { locale: es })
    : null;

  return (
    <header className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="font-body text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        
        {status && <StatusPill status={status} />}
      </div>

      {(formattedDate || meta) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-border">
          {formattedDate && (
            <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">
              {formattedDate}
            </span>
          )}
          {meta?.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                {item.label}:
              </span>
              <span className="font-body text-xs text-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
