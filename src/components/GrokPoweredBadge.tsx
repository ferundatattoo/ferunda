import { motion } from 'framer-motion';
import { Brain, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GrokPoweredBadgeProps {
  variant?: 'default' | 'compact' | 'inline';
  showTooltip?: boolean;
  isThinking?: boolean;
}

export function GrokPoweredBadge({ 
  variant = 'default', 
  showTooltip = true,
  isThinking = false 
}: GrokPoweredBadgeProps) {
  const badge = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center"
    >
      {variant === 'inline' ? (
        <span className="flex items-center gap-1 text-xs text-purple-400">
          <Brain className="w-3 h-3" />
          <span>Grok</span>
        </span>
      ) : (
        <Badge 
          variant="outline" 
          className={`
            bg-gradient-to-r from-purple-500/20 to-pink-500/20 
            border-purple-500/40 text-purple-300
            ${variant === 'compact' ? 'h-5 px-1.5 text-[10px]' : 'px-2 py-0.5 text-xs'}
          `}
        >
          <motion.div
            animate={isThinking ? { rotate: 360 } : {}}
            transition={{ repeat: isThinking ? Infinity : 0, duration: 2, ease: 'linear' }}
            className="mr-1"
          >
            {isThinking ? (
              <Sparkles className={variant === 'compact' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            ) : (
              <Brain className={variant === 'compact' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            )}
          </motion.div>
          <span>{isThinking ? 'Grok-4 razonando...' : 'Grok-4 AI'}</span>
          {!isThinking && (
            <Zap className={`ml-0.5 ${variant === 'compact' ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
          )}
        </Badge>
      )}
    </motion.div>
  );

  if (!showTooltip || variant === 'inline') {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="space-y-1 max-w-xs">
          <p className="font-medium flex items-center gap-1">
            <Brain className="w-4 h-4 text-purple-400" />
            Impulsado por Grok AI
          </p>
          <p className="text-xs text-muted-foreground">
            Razonamiento causal profundo, visión multimodal, y respuestas en español con prioridad.
          </p>
          <div className="flex gap-1 flex-wrap pt-1">
            <Badge variant="secondary" className="text-[10px] h-4">Vision</Badge>
            <Badge variant="secondary" className="text-[10px] h-4">Multilingual</Badge>
            <Badge variant="secondary" className="text-[10px] h-4">Causal</Badge>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Thinking indicator for when Grok is processing
export function GrokThinkingIndicator({ message = 'Grok razonando...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 text-sm text-purple-400"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      >
        <Sparkles className="w-4 h-4" />
      </motion.div>
      <span>{message}</span>
      <motion.div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-purple-400"
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
