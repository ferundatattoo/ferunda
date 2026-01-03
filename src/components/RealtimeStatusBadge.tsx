import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2, Zap, Brain, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGlobalRealtime, GlobalRealtimeStatus, reconnectGlobalRealtime } from '@/hooks/useGlobalRealtime';

interface RealtimeStatusBadgeProps {
  showDetails?: boolean;
  variant?: 'compact' | 'full';
}

export function RealtimeStatusBadge({ showDetails = false, variant = 'compact' }: RealtimeStatusBadgeProps) {
  const { status, connectedTables, lastEventAt, eventCount, provider } = useGlobalRealtime();

  const statusConfig: Record<GlobalRealtimeStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    connecting: {
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/20 border-yellow-500/30',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Conectando...',
    },
    connected: {
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/20 border-emerald-500/30',
      icon: <Wifi className="w-3 h-3" />,
      label: 'Realtime Vivo',
    },
    disconnected: {
      color: 'text-muted-foreground',
      bg: 'bg-muted/50 border-muted',
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Offline Mode',
    },
    error: {
      color: 'text-muted-foreground',
      bg: 'bg-muted/50 border-muted',
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Offline Mode',
    },
  };

  const config = statusConfig[status];

  const badge = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${config.bg} ${config.color}`}
    >
      {config.icon}
      {variant === 'full' && (
        <>
          <span className="text-xs font-medium">{config.label}</span>
          {status === 'connected' && provider === 'grok' && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] bg-purple-500/20 border-purple-500/30 text-purple-400">
              <Brain className="w-2.5 h-2.5 mr-0.5" />
              Grok
            </Badge>
          )}
        </>
      )}
      {status === 'connected' && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
        />
      )}
    </motion.div>
  );

  const handleRetry = () => {
    reconnectGlobalRealtime();
  };

  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{config.label}</p>
            {status === 'connected' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {connectedTables.length} tablas conectadas
                </p>
                {lastEventAt && (
                  <p className="text-xs text-muted-foreground">
                    Último evento: {lastEventAt.toLocaleTimeString()}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {eventCount} eventos recibidos
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Los datos se actualizan manualmente
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full h-7 text-xs mt-1"
                  onClick={handleRetry}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reintentar conexión
                </Button>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2">
      {badge}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {connectedTables.length} tablas en tiempo real
        </p>
        {lastEventAt && (
          <p>Último: {lastEventAt.toLocaleTimeString()}</p>
        )}
        <p>{eventCount} eventos</p>
      </div>
    </div>
  );
}

// Simple inline status for headers
export function RealtimeInlineStatus() {
  const { status } = useGlobalRealtime();
  
  if (status !== 'connected') return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1 text-xs text-emerald-500"
    >
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
      />
      <span className="hidden sm:inline">Vivo</span>
    </motion.div>
  );
}
