import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RealtimeStatusIndicatorProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function RealtimeStatusIndicator({ 
  status, 
  showLabel = false,
  size = 'sm' 
}: RealtimeStatusIndicatorProps) {
  const iconSize = size === 'sm' ? 14 : 18;
  
  const statusConfig = {
    connecting: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
      label: 'Connecting...',
      icon: <Loader2 className="animate-spin" style={{ width: iconSize, height: iconSize }} />
    },
    connected: {
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      label: 'Live',
      icon: <Wifi style={{ width: iconSize, height: iconSize }} />
    },
    disconnected: {
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      label: 'Offline',
      icon: <WifiOff style={{ width: iconSize, height: iconSize }} />
    },
    error: {
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      label: 'Offline Mode',
      icon: <WifiOff style={{ width: iconSize, height: iconSize }} />
    }
  };

  const config = statusConfig[status];

  const indicator = (
    <motion.div 
      className={`flex items-center gap-1.5 ${config.color}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={`p-1 rounded-full ${config.bgColor}`}>
        {config.icon}
      </div>
      {showLabel && (
        <span className="text-xs font-medium">{config.label}</span>
      )}
    </motion.div>
  );

  if (showLabel) {
    return indicator;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {indicator}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
