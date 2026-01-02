import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ChevronRight, ChevronLeft, Lightbulb, 
  Zap, TrendingUp, AlertCircle, CheckCircle, 
  Calendar, DollarSign, MessageSquare, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  type: 'urgent' | 'opportunity' | 'task' | 'insight';
  impact: 'high' | 'medium' | 'low';
  action: () => void;
}

interface GODLensPanelProps {
  context?: string;
  summary?: string;
  actions?: SuggestedAction[];
  onGenerateOptions?: () => void;
  isLoading?: boolean;
}

const defaultActions: SuggestedAction[] = [
  {
    id: '1',
    title: 'Follow up hot lead',
    description: 'Maria hasn\'t responded in 2h - send gentle nudge',
    type: 'urgent',
    impact: 'high',
    action: () => console.log('Follow up')
  },
  {
    id: '2',
    title: 'Confirm tomorrow\'s session',
    description: '3 sessions need pre-day confirmation',
    type: 'task',
    impact: 'medium',
    action: () => console.log('Confirm')
  },
  {
    id: '3',
    title: 'Optimize deposit timing',
    description: 'Sending at 6pm increases conversion 23%',
    type: 'insight',
    impact: 'medium',
    action: () => console.log('Apply')
  }
];

export default function GODLensPanel({
  context = 'Dashboard',
  summary,
  actions = defaultActions,
  onGenerateOptions,
  isLoading = false
}: GODLensPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateOptions = async () => {
    setIsGenerating(true);
    onGenerateOptions?.();
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const getActionIcon = (type: SuggestedAction['type']) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'task': return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'insight': return <Lightbulb className="h-4 w-4 text-warning" />;
    }
  };

  const getImpactBadge = (impact: SuggestedAction['impact']) => {
    const colors = {
      high: 'bg-destructive/10 text-destructive',
      medium: 'bg-warning/10 text-warning',
      low: 'bg-muted text-muted-foreground'
    };
    return <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", colors[impact])}>{impact}</Badge>;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ width: isCollapsed ? 48 : 320 }}
        animate={{ width: isCollapsed ? 48 : 320 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "h-full border-l border-border bg-surface-1 flex flex-col relative",
          isCollapsed ? "items-center py-4" : ""
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -left-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
        >
          {isCollapsed ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        {isCollapsed ? (
          /* Collapsed State */
          <div className="flex flex-col items-center gap-3 mt-8">
            <div className="h-8 w-8 rounded-lg gradient-ai flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="h-px w-6 bg-border" />
            {actions.slice(0, 3).map((action, i) => (
              <button
                key={action.id}
                onClick={action.action}
                className="h-8 w-8 rounded-lg bg-muted hover:bg-accent/10 flex items-center justify-center transition-colors"
                title={action.title}
              >
                {getActionIcon(action.type)}
              </button>
            ))}
          </div>
        ) : (
          /* Expanded State */
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg gradient-ai flex items-center justify-center shadow-ai">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">GOD Lens</h3>
                  <p className="text-[11px] text-muted-foreground">{context}</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Summary */}
                {summary && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <Calendar className="h-4 w-4 mx-auto text-primary mb-1" />
                    <p className="text-xs font-medium">4</p>
                    <p className="text-[10px] text-muted-foreground">Today</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <MessageSquare className="h-4 w-4 mx-auto text-warning mb-1" />
                    <p className="text-xs font-medium">7</p>
                    <p className="text-[10px] text-muted-foreground">Pending</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <DollarSign className="h-4 w-4 mx-auto text-success mb-1" />
                    <p className="text-xs font-medium">$2.4k</p>
                    <p className="text-[10px] text-muted-foreground">Due</p>
                  </div>
                </div>

                {/* Suggested Actions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Suggested Actions
                    </h4>
                    <Badge variant="secondary" className="text-[10px]">{actions.length}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {actions.map((action) => (
                      <motion.button
                        key={action.id}
                        onClick={action.action}
                        className="w-full p-3 rounded-lg border border-border bg-card hover:bg-muted/50 text-left transition-all group"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{getActionIcon(action.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-medium truncate">{action.title}</p>
                              {getImpactBadge(action.impact)}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {action.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Generate Options Button */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleGenerateOptions}
                disabled={isGenerating || isLoading}
                className="w-full gradient-ai text-white hover:opacity-90"
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Options
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
