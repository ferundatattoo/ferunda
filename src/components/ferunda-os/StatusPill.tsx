import { cn } from "@/lib/utils";

export type RequestStatus = 
  | 'new'
  | 'brief_in_progress'
  | 'brief_ready'
  | 'assigned_artist'
  | 'pending_artist_acceptance'
  | 'artist_accepted'
  | 'artist_rejected'
  | 'artist_counter_proposed'
  | 'scheduling'
  | 'deposit_pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'aftercare'
  | 'rebook'
  | 'cancelled';

export type ProposalStatus =
  | 'draft'
  | 'pending_artist'
  | 'accepted'
  | 'rejected'
  | 'counter_proposed'
  | 'pending_studio'
  | 'expired'
  | 'applied'
  | 'cancelled';

export type AppointmentState = 'hold' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

type StatusType = RequestStatus | ProposalStatus | AppointmentState;

interface StatusPillProps {
  status: StatusType;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: 'neutral' | 'warning' | 'success' | 'error' | 'info' }> = {
  // Request statuses
  new: { label: 'Nueva', variant: 'info' },
  brief_in_progress: { label: 'Brief en curso', variant: 'warning' },
  brief_ready: { label: 'Brief listo', variant: 'success' },
  assigned_artist: { label: 'Artista asignado', variant: 'info' },
  pending_artist_acceptance: { label: 'Pendiente artista', variant: 'warning' },
  artist_accepted: { label: 'Aceptada', variant: 'success' },
  artist_rejected: { label: 'Rechazada', variant: 'error' },
  artist_counter_proposed: { label: 'Contra-propuesta', variant: 'warning' },
  scheduling: { label: 'Agendando', variant: 'info' },
  deposit_pending: { label: 'Deposito pendiente', variant: 'warning' },
  confirmed: { label: 'Confirmada', variant: 'success' },
  in_progress: { label: 'En curso', variant: 'info' },
  completed: { label: 'Completada', variant: 'success' },
  aftercare: { label: 'Aftercare', variant: 'info' },
  rebook: { label: 'Re-agendar', variant: 'warning' },
  cancelled: { label: 'Cancelada', variant: 'error' },
  
  // Proposal statuses
  draft: { label: 'Borrador', variant: 'neutral' },
  pending_artist: { label: 'Pendiente artista', variant: 'warning' },
  accepted: { label: 'Aceptada', variant: 'success' },
  rejected: { label: 'Rechazada', variant: 'error' },
  counter_proposed: { label: 'Contra-propuesta', variant: 'warning' },
  pending_studio: { label: 'Pendiente estudio', variant: 'warning' },
  expired: { label: 'Expirada', variant: 'error' },
  applied: { label: 'Aplicada', variant: 'success' },
  
  // Appointment states
  hold: { label: 'En espera', variant: 'warning' },
  // confirmed already defined
  // completed already defined
  // cancelled already defined
  no_show: { label: 'No asistio', variant: 'error' },
};

const variantStyles: Record<string, string> = {
  neutral: 'bg-muted/50 text-muted-foreground',
  warning: 'bg-amber-500/10 text-amber-400',
  success: 'bg-emerald-500/10 text-emerald-400',
  error: 'bg-red-500/10 text-red-400',
  info: 'bg-blue-500/10 text-blue-400',
};

export function StatusPill({ status, size = 'md', className }: StatusPillProps) {
  const config = statusConfig[status] || { label: status, variant: 'neutral' };
  
  return (
    <span
      className={cn(
        "inline-flex items-center font-body tracking-wide uppercase",
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        variantStyles[config.variant],
        className
      )}
    >
      {config.label}
    </span>
  );
}
