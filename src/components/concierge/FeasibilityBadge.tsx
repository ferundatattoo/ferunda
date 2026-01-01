import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronDown,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface FeasibilityFactor {
  name: string;
  impact: 'positive' | 'neutral' | 'negative';
  score: number;
  description?: string;
}

interface FeasibilityBadgeProps {
  score: number; // 0-1
  recommendation: 'proceed' | 'caution' | 'not_recommended';
  factors?: FeasibilityFactor[];
  risks?: string[];
  aging?: {
    year5?: string;
    year10?: string;
    year20?: string;
  };
  compact?: boolean;
  onDetailsClick?: () => void;
}

export function FeasibilityBadge({
  score,
  recommendation,
  factors = [],
  risks = [],
  aging,
  compact = false,
  onDetailsClick
}: FeasibilityBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const percentage = Math.round(score * 100);
  
  const getStatusConfig = () => {
    switch (recommendation) {
      case 'proceed':
        return {
          icon: CheckCircle,
          label: 'Recommended',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          progressColor: 'bg-green-500'
        };
      case 'caution':
        return {
          icon: AlertTriangle,
          label: 'Proceed with Caution',
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          progressColor: 'bg-amber-500'
        };
      case 'not_recommended':
        return {
          icon: XCircle,
          label: 'Not Recommended',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          progressColor: 'bg-red-500'
        };
    }
  };
  
  const config = getStatusConfig();
  const StatusIcon = config.icon;
  
  if (compact) {
    return (
      <Badge 
        className={`${config.bgColor} ${config.color} border ${config.borderColor} cursor-pointer`}
        onClick={onDetailsClick}
      >
        <StatusIcon className="w-3 h-3 mr-1" />
        {percentage}% Viability
      </Badge>
    );
  }
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
      >
        {/* Header */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-background/30 transition-colors">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${config.color}`} />
              <div className="text-left">
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Progress 
                    value={percentage} 
                    className="w-20 h-1.5"
                  />
                  <span className="text-xs text-muted-foreground">
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>
            <ChevronDown 
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </CollapsibleTrigger>
        
        {/* Expanded Content */}
        <CollapsibleContent>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 pb-3 space-y-3 border-t border-border/50"
              >
                {/* Factors */}
                {factors.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Analysis Factors
                    </p>
                    <div className="space-y-1.5">
                      {factors.map((factor, i) => (
                        <div 
                          key={i}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-foreground">{factor.name}</span>
                          <div className="flex items-center gap-1.5">
                            {factor.impact === 'positive' && (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            )}
                            {factor.impact === 'neutral' && (
                              <Info className="w-3 h-3 text-muted-foreground" />
                            )}
                            {factor.impact === 'negative' && (
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            )}
                            <span className="text-muted-foreground">
                              {Math.round(factor.score * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Risks */}
                {risks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Considerations
                    </p>
                    <ul className="space-y-1">
                      {risks.map((risk, i) => (
                        <li 
                          key={i}
                          className="text-xs text-amber-500/80 flex items-start gap-1.5"
                        >
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Aging Simulation */}
                {aging && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Aging Prediction
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {aging.year5 && (
                        <div className="text-center p-2 rounded bg-background/50">
                          <span className="block text-muted-foreground">5 Years</span>
                          <Sparkles className="w-3 h-3 mx-auto my-1 text-green-500" />
                        </div>
                      )}
                      {aging.year10 && (
                        <div className="text-center p-2 rounded bg-background/50">
                          <span className="block text-muted-foreground">10 Years</span>
                          <Sparkles className="w-3 h-3 mx-auto my-1 text-amber-500" />
                        </div>
                      )}
                      {aging.year20 && (
                        <div className="text-center p-2 rounded bg-background/50">
                          <span className="block text-muted-foreground">20 Years</span>
                          <Sparkles className="w-3 h-3 mx-auto my-1 text-orange-500" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
}

export default FeasibilityBadge;
