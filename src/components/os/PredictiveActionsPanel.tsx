import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Brain, Clock, MessageSquare, Calendar, 
  DollarSign, X, ChevronRight, Zap, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOSAction } from './OSActionProvider';
import { toast } from 'sonner';

interface PredictiveAction {
  id: string;
  type: 'follow-up' | 'deposit' | 'booking' | 'content' | 'reply';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  context: Record<string, any>;
  confidence: number;
}

export const PredictiveActionsPanel: React.FC = () => {
  const [actions, setActions] = useState<PredictiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { dispatch } = useOSAction();

  useEffect(() => {
    analyzeAndSuggest();
  }, []);

  const analyzeAndSuggest = async () => {
    setLoading(true);
    try {
      // Fetch recent data to analyze - using correct column names
      const [bookingsRes, sessionsRes] = await Promise.all([
        supabase.from('bookings').select('id, name, email, pipeline_stage, estimated_price, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('concierge_sessions').select('id, client_id, stage, updated_at, message_count').order('updated_at', { ascending: false }).limit(20),
      ]);

      const suggestions: PredictiveAction[] = [];

      // Analyze concierge sessions needing follow-up
      if (sessionsRes.data?.length) {
        const needsFollowUp = sessionsRes.data.filter(s => {
          const hoursSinceUpdate = (Date.now() - new Date(s.updated_at || '').getTime()) / (1000 * 60 * 60);
          return hoursSinceUpdate >= 24 && s.stage !== 'completed' && s.stage !== 'closed' && s.stage !== 'booked';
        });

        needsFollowUp.slice(0, 3).forEach(session => {
          suggestions.push({
            id: `followup-${session.id}`,
            type: 'follow-up',
            title: 'Seguimiento pendiente',
            description: `Sesión con ${session.message_count || 0} mensajes sin respuesta. Considera hacer seguimiento.`,
            priority: 'medium',
            context: { sessionId: session.id },
            confidence: 0.75,
          });
        });
      }

      // Analyze bookings that might need quotes
      if (bookingsRes.data?.length) {
        const needsQuote = bookingsRes.data.filter(b => 
          (b.pipeline_stage === 'inquiry' || b.pipeline_stage === 'new') && !b.estimated_price
        );

        needsQuote.slice(0, 2).forEach(booking => {
          suggestions.push({
            id: `quote-${booking.id}`,
            type: 'booking',
            title: 'Enviar cotización',
            description: `${booking.name || 'Cliente'} está esperando una cotización`,
            priority: 'high',
            context: { bookingId: booking.id, name: booking.name, email: booking.email },
            confidence: 0.9,
          });
        });
      }

      // Content suggestion based on time
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      if ((dayOfWeek === 1 || dayOfWeek === 4) && hour >= 9 && hour <= 11) {
        suggestions.push({
          id: 'content-weekly',
          type: 'content',
          title: 'Crear contenido semanal',
          description: 'Buen momento para publicar contenido. Tu audiencia está activa.',
          priority: 'low',
          context: { suggestedType: 'post', suggestedTopic: 'portfolio showcase' },
          confidence: 0.7,
        });
      }

      setActions(suggestions.filter(a => !dismissed.includes(a.id)));
    } catch (error) {
      console.error('Error analyzing for suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: PredictiveAction) => {
    switch (action.type) {
      case 'deposit':
        dispatch({ type: 'send-deposit', payload: action.context });
        break;
      case 'follow-up':
        dispatch({ type: 'ai-generate-reply', payload: action.context });
        break;
      case 'booking':
        dispatch({ type: 'create-quote', payload: action.context });
        break;
      case 'content':
        dispatch({ type: 'create-content', payload: action.context });
        break;
      case 'reply':
        dispatch({ type: 'ai-generate-reply', payload: action.context });
        break;
    }
    setDismissed(prev => [...prev, action.id]);
    toast.success('Acción iniciada', { description: action.title });
  };

  const handleDismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return DollarSign;
      case 'follow-up': return MessageSquare;
      case 'booking': return Calendar;
      case 'content': return TrendingUp;
      case 'reply': return MessageSquare;
      default: return Zap;
    }
  };

  const visibleActions = actions.filter(a => !dismissed.includes(a.id));

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-card/50 to-accent/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-primary/10 rounded w-1/2 animate-pulse" />
              <div className="h-3 bg-primary/5 rounded w-3/4 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Sugerencias AI</span>
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          {visibleActions.length} pendientes
        </Badge>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {visibleActions.slice(0, 3).map((action, index) => {
            const Icon = getTypeIcon(action.type);
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all group">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getPriorityColor(action.priority)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{action.title}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {Math.round(action.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {action.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDismiss(action.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleAction(action)}
                        >
                          Ejecutar
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PredictiveActionsPanel;
