import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  HelpCircle, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  Sparkles,
  Target,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DecisionExplanation {
  id: string;
  conversation_id: string;
  decision_type: string;
  persona_chosen: string;
  top_signals: unknown[] | null;
  confidence: number;
  fallback_used: boolean;
  fallback_reason: string | null;
  processing_time_ms: number | null;
  created_at: string;
}

interface ExplainabilityPanelProps {
  conversationId?: string;
  compact?: boolean;
}

const PERSONA_OPTIONS = [
  { value: 'studio', label: 'Studio', color: 'bg-blue-500' },
  { value: 'artist', label: 'Artist', color: 'bg-purple-500' },
  { value: 'hybrid', label: 'Hybrid', color: 'bg-amber-500' },
  { value: 'concierge', label: 'Concierge', color: 'bg-emerald-500' },
];

export function ExplainabilityPanel({ conversationId, compact = false }: ExplainabilityPanelProps) {
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (conversationId) {
      fetchLatestExplanation();
    }
  }, [conversationId]);

  const fetchLatestExplanation = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('decision_explanations')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) setExplanation(data);
    } catch (error) {
      // No explanation yet is fine
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (type: 'agree' | 'disagree' | 'partial') => {
    if (!explanation) return;

    const { error } = await supabase
      .from('human_feedback')
      .insert([{
        conversation_id: conversationId,
        decision_id: explanation.id,
        feedback_type: type,
        original_persona: explanation.persona_chosen,
        suggested_persona: selectedPersona,
        note: feedbackNote,
      }]);

    if (!error) {
      toast.success('Feedback submitted - AI will learn from this');
      setShowFeedback(false);
      setFeedbackNote('');
      setSelectedPersona(null);
    }
  };

  const getSignalIcon = (signal: string) => {
    if (signal.includes('intent')) return <Target className="h-3 w-3" />;
    if (signal.includes('stage')) return <Clock className="h-3 w-3" />;
    if (signal.includes('risk')) return <AlertCircle className="h-3 w-3" />;
    return <Sparkles className="h-3 w-3" />;
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
            <Brain className="h-3 w-3" />
            Why this?
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          {explanation ? (
            <CompactExplanation 
              explanation={explanation}
              onFeedback={() => setShowFeedback(true)}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No AI decision recorded for this message
            </p>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  if (!explanation) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <Brain className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No AI decision explanation available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Decision Explanation
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chosen Persona */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Persona:</span>
            <Badge className="capitalize">
              {explanation.persona_chosen}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Progress 
              value={(explanation.confidence || 0) * 100} 
              className="w-16 h-2"
            />
            <span className="text-xs text-muted-foreground">
              {((explanation.confidence || 0) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Top Signals */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Key Signals:</p>
          <div className="flex flex-wrap gap-1">
            {(explanation.top_signals || []).slice(0, 3).map((signal, idx) => (
              <Badge 
                key={idx} 
                variant="outline" 
                className="text-xs gap-1"
              >
                {getSignalIcon(signal.signal)}
                {signal.signal}: {String(signal.weight).slice(0, 4)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Fallback Warning */}
        {explanation.fallback_used && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
            <p className="text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Fallback used: {explanation.fallback_reason}
            </p>
          </div>
        )}

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 border-t"
            >
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Decision Type</p>
                  <p className="capitalize">{explanation.decision_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Processing Time</p>
                  <p>{explanation.processing_time_ms || 'N/A'}ms</p>
                </div>
              </div>

              {/* All Signals */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">All Signals:</p>
                {(explanation.top_signals || []).map((signal, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between text-xs p-1 rounded bg-muted/50"
                  >
                    <span className="flex items-center gap-1">
                      {getSignalIcon(signal.signal)}
                      {signal.signal}
                    </span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={signal.weight * 100} 
                        className="w-12 h-1.5"
                      />
                      <span className="w-8 text-right">
                        {(signal.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 text-xs text-emerald-600"
              onClick={() => submitFeedback('agree')}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Agree
            </Button>
            <Popover open={showFeedback} onOpenChange={setShowFeedback}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 text-xs text-red-500"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Disagree
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">What would be better?</p>
                  <div className="flex flex-wrap gap-1">
                    {PERSONA_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        size="sm"
                        variant={selectedPersona === opt.value ? 'default' : 'outline'}
                        className="text-xs h-7"
                        onClick={() => setSelectedPersona(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <Textarea 
                    placeholder="Optional note..."
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => submitFeedback('disagree')}
                  >
                    Submit Feedback
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(explanation.created_at).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactExplanation({ 
  explanation, 
  onFeedback 
}: { 
  explanation: DecisionExplanation;
  onFeedback: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge className="capitalize">{explanation.persona_chosen}</Badge>
        <span className="text-xs text-muted-foreground">
          {((explanation.confidence || 0) * 100).toFixed(0)}% confident
        </span>
      </div>
      
      <div>
        <p className="text-xs text-muted-foreground mb-1">Key signals:</p>
        <ul className="text-xs space-y-1">
          {(explanation.top_signals || []).slice(0, 3).map((signal, idx) => (
            <li key={idx} className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="capitalize">{signal.signal}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs">
          <ThumbsUp className="h-3 w-3 mr-1" />
          Agree
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="flex-1 h-7 text-xs"
          onClick={onFeedback}
        >
          <ThumbsDown className="h-3 w-3 mr-1" />
          Disagree
        </Button>
      </div>
    </div>
  );
}

export default ExplainabilityPanel;
