import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, XCircle, MessageSquare, Image, Clock, 
  Sparkles, RefreshCw, Send, Palette, User, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DesignDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: {
    id: string;
    generated_image_url?: string;
    user_prompt?: string;
    created_at: string;
    client_reaction?: string;
    style_preferences?: string[];
    suggested_placement?: string;
    estimated_duration_minutes?: number;
    ai_description?: string;
  } | null;
  onAction?: () => void;
}

const DesignDetailModal: React.FC<DesignDetailModalProps> = ({
  open,
  onOpenChange,
  design,
  onAction
}) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('preview');

  if (!design) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ai_design_suggestions')
        .update({ 
          client_reaction: 'approved',
          reaction_sentiment_score: 1.0
        })
        .eq('id', design.id);

      if (error) throw error;

      toast.success('Diseño aprobado', {
        description: 'El diseño ha sido marcado como aprobado'
      });
      onAction?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving design:', error);
      toast.error('Error al aprobar el diseño');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ai_design_suggestions')
        .update({ 
          client_reaction: feedback || 'rejected',
          reaction_sentiment_score: -1.0
        })
        .eq('id', design.id);

      if (error) throw error;

      toast.success('Diseño rechazado', {
        description: 'El diseño ha sido marcado como rechazado'
      });
      onAction?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error rejecting design:', error);
      toast.error('Error al rechazar el diseño');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!feedback.trim()) {
      toast.error('Agrega notas de revisión', {
        description: 'Por favor indica qué cambios necesitas'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ai_design_suggestions')
        .update({ 
          client_reaction: `revision_requested: ${feedback}`,
          reaction_sentiment_score: 0.5
        })
        .eq('id', design.id);

      if (error) throw error;

      toast.success('Revisión solicitada', {
        description: 'Se ha enviado la solicitud de revisión'
      });
      onAction?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Error al solicitar revisión');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!design.client_reaction) {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>;
    }
    if (design.client_reaction === 'approved') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Aprobado</Badge>;
    }
    if (design.client_reaction.startsWith('revision_requested')) {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">En revisión</Badge>;
    }
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rechazado</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Detalle del Diseño
            </DialogTitle>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="preview" className="gap-2">
              <Image className="w-4 h-4" />
              Vista Previa
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Detalles AI
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="preview" className="h-full m-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Preview */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-square bg-secondary/50 rounded-xl overflow-hidden"
                >
                  {design.generated_image_url ? (
                    <img
                      src={design.generated_image_url}
                      alt="Design preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                </motion.div>

                {/* Quick Info */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Prompt Original</Label>
                    <p className="text-sm mt-1">{design.user_prompt || 'Sin descripción'}</p>
                  </div>

                  {design.ai_description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción AI</Label>
                      <p className="text-sm mt-1 text-muted-foreground">{design.ai_description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {design.suggested_placement && (
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          Ubicación sugerida
                        </div>
                        <p className="text-sm font-medium mt-1">{design.suggested_placement}</p>
                      </div>
                    )}

                    {design.estimated_duration_minutes && (
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Duración estimada
                        </div>
                        <p className="text-sm font-medium mt-1">{design.estimated_duration_minutes} min</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Creado
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {new Date(design.created_at).toLocaleDateString('es', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {design.style_preferences && design.style_preferences.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Estilos</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {design.style_preferences.map((style, i) => (
                          <Badge key={i} variant="secondary">{style}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="m-0">
              <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Análisis AI del Diseño</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {design.ai_description || 
                        'Este diseño fue generado basándose en el prompt del usuario y el estilo del artista. El sistema AI analizó referencias similares para crear una propuesta única.'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="feedback" className="m-0 space-y-4">
              <div>
                <Label>Notas de revisión</Label>
                <Textarea
                  placeholder="Describe los cambios que necesitas o feedback para el diseño..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="mt-2 min-h-[120px]"
                />
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleRequestRevision}
                disabled={loading || !feedback.trim()}
              >
                <RefreshCw className="w-4 h-4" />
                Solicitar Revisión
              </Button>
            </TabsContent>
          </div>
        </Tabs>

        {/* Action Buttons */}
        {!design.client_reaction && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
              onClick={handleReject}
              disabled={loading}
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </Button>
            <Button
              className="flex-1 gap-2 bg-success hover:bg-success/90"
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Aprobar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DesignDetailModal;
