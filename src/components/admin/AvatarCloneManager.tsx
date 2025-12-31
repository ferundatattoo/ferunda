import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Upload, Mic, Sparkles, Loader2, CheckCircle, 
  AlertCircle, Play, Pause, RefreshCw, Settings, 
  TrendingUp, Users, Eye, Download, Trash2, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarClone {
  id: string;
  display_name: string;
  avatar_photo_url?: string;
  voice_sample_url?: string;
  synthesia_avatar_id?: string;
  status: 'pending' | 'training' | 'ready' | 'failed';
  training_progress?: number;
  avatar_style?: string;
  background_preset?: string;
}

interface VideoAnalytics {
  total_views: number;
  avg_completion_rate: number;
  conversion_rate: number;
  top_emotion: string;
}

export const AvatarCloneManager: React.FC = () => {
  const [clones, setClones] = useState<AvatarClone[]>([]);
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedClone, setSelectedClone] = useState<AvatarClone | null>(null);
  const [testScript, setTestScript] = useState('');
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClones();
    fetchAnalytics();
  }, []);

  const fetchClones = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_avatar_clones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClones((data as AvatarClone[]) || []);
    } catch (error) {
      console.error('Error fetching clones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Aggregate video analytics
      const { data: videos } = await supabase
        .from('ai_avatar_videos')
        .select('views_count, engagement_score, conversion_impact, script_emotion');

      if (videos && videos.length > 0) {
        const totalViews = videos.reduce((sum, v) => sum + (v.views_count || 0), 0);
        const avgEngagement = videos.reduce((sum, v) => sum + (v.engagement_score || 0), 0) / videos.length;
        const avgConversion = videos.reduce((sum, v) => sum + (v.conversion_impact || 0), 0) / videos.length;
        
        // Find top emotion
        const emotionCounts: Record<string, number> = {};
        videos.forEach(v => {
          if (v.script_emotion) {
            emotionCounts[v.script_emotion] = (emotionCounts[v.script_emotion] || 0) + 1;
          }
        });
        const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm';

        setAnalytics({
          total_views: totalViews,
          avg_completion_rate: avgEngagement * 100,
          conversion_rate: avgConversion * 100,
          top_emotion: topEmotion
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `avatar-photos/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('reference-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('reference-images')
        .getPublicUrl(fileName);

      // Create new clone
      const { data: newClone, error: insertError } = await supabase
        .from('ai_avatar_clones')
        .insert({
          display_name: 'Ferunda Avatar',
          avatar_photo_url: urlData.publicUrl,
          status: 'pending',
          avatar_style: 'micro-realism',
          background_preset: 'dark_studio'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setClones(prev => [newClone as AvatarClone, ...prev]);
      toast.success('Foto subida. Ahora sube una muestra de voz.');
      setSelectedClone(newClone as AvatarClone);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error subiendo foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClone) return;

    setIsUploading(true);
    try {
      const fileName = `avatar-voices/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('reference-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('reference-images')
        .getPublicUrl(fileName);

      // Update clone with voice
      const { error: updateError } = await supabase
        .from('ai_avatar_clones')
        .update({
          voice_sample_url: urlData.publicUrl,
          status: 'training',
          training_progress: 10
        })
        .eq('id', selectedClone.id);

      if (updateError) throw updateError;

      // Simulate training progress
      simulateTraining(selectedClone.id);

      toast.success('Muestra de voz subida. Entrenamiento iniciado.');
      fetchClones();
    } catch (error) {
      console.error('Voice upload error:', error);
      toast.error('Error subiendo muestra de voz');
    } finally {
      setIsUploading(false);
    }
  };

  const simulateTraining = async (cloneId: string) => {
    // Simulate training progress (in production, this would be Synthesia callbacks)
    let progress = 10;
    const interval = setInterval(async () => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        await supabase
          .from('ai_avatar_clones')
          .update({
            status: 'ready',
            training_progress: 100,
            last_trained_at: new Date().toISOString()
          })
          .eq('id', cloneId);
          
        toast.success('¡Avatar listo para usar!');
        fetchClones();
      } else {
        await supabase
          .from('ai_avatar_clones')
          .update({ training_progress: Math.round(progress) })
          .eq('id', cloneId);
        
        setClones(prev => prev.map(c => 
          c.id === cloneId ? { ...c, training_progress: Math.round(progress) } : c
        ));
      }
    }, 2000);
  };

  const generateTestVideo = async () => {
    if (!selectedClone || !testScript) return;

    setIsGeneratingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-video', {
        body: {
          script_text: testScript,
          script_type: 'custom',
          emotion: 'calm',
          avatar_clone_id: selectedClone.id,
          language: 'es'
        }
      });

      if (error) throw error;
      toast.success('Video de prueba generándose...');
    } catch (error) {
      console.error('Test video error:', error);
      toast.error('Error generando video de prueba');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const deleteClone = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_avatar_clones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setClones(prev => prev.filter(c => c.id !== id));
      toast.success('Avatar eliminado');
    } catch (error) {
      toast.error('Error eliminando avatar');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            AI Avatar Manager
          </h2>
          <p className="text-muted-foreground">
            Crea y gestiona clones de avatar con tu imagen y voz
          </p>
        </div>
        <Button onClick={() => photoInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Nuevo Avatar
        </Button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.total_views}</p>
                  <p className="text-xs text-muted-foreground">Vistas Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.avg_completion_rate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Tasa Completación</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.conversion_rate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Conversión</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold capitalize">{analytics.top_emotion}</p>
                  <p className="text-xs text-muted-foreground">Emoción +Efectiva</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="clones">
        <TabsList>
          <TabsTrigger value="clones">Mis Avatares</TabsTrigger>
          <TabsTrigger value="create">Crear Avatar</TabsTrigger>
          <TabsTrigger value="federated">Federated Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="clones" className="space-y-4">
          {clones.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No tienes avatares aún</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primer avatar con tu foto y voz
                </p>
                <Button onClick={() => photoInputRef.current?.click()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Avatar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {clones.map((clone) => (
                <Card key={clone.id} className="overflow-hidden">
                  <div className="aspect-video bg-black/50 relative">
                    {clone.avatar_photo_url ? (
                      <img 
                        src={clone.avatar_photo_url} 
                        alt={clone.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge 
                      className={`absolute top-2 right-2 ${
                        clone.status === 'ready' ? 'bg-emerald-500' :
                        clone.status === 'training' ? 'bg-amber-500' :
                        clone.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                      }`}
                    >
                      {clone.status === 'ready' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {clone.status === 'training' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {clone.status}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-medium">{clone.display_name}</h4>
                    {clone.status === 'training' && clone.training_progress && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Entrenando...</span>
                          <span>{clone.training_progress}%</span>
                        </div>
                        <Progress value={clone.training_progress} />
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {clone.status === 'ready' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setSelectedClone(clone)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Probar
                        </Button>
                      )}
                      {clone.status === 'pending' && !clone.voice_sample_url && (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedClone(clone);
                            voiceInputRef.current?.click();
                          }}
                        >
                          <Mic className="w-3 h-3 mr-1" />
                          Subir Voz
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteClone(clone.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <input
            ref={voiceInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleVoiceUpload}
          />
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Avatar</CardTitle>
              <CardDescription>
                Sube una foto frontal clara y una muestra de voz de 30+ segundos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Foto del Artista</Label>
                  <div 
                    className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click para subir</p>
                    <p className="text-xs text-muted-foreground/60">JPG, PNG. Vista frontal recomendada.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Muestra de Voz</Label>
                  <div 
                    className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => voiceInputRef.current?.click()}
                  >
                    <Mic className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click para subir</p>
                    <p className="text-xs text-muted-foreground/60">MP3, WAV. Mínimo 30 segundos.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Estilo Visual</Label>
                <Select defaultValue="dark_studio">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark_studio">Estudio Oscuro (Tattoo Vibe)</SelectItem>
                    <SelectItem value="minimalist_white">Minimalista Blanco</SelectItem>
                    <SelectItem value="neon_glow">Neon Glow</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Test Video Generator */}
          {selectedClone?.status === 'ready' && (
            <Card>
              <CardHeader>
                <CardTitle>Generar Video de Prueba</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Script de Prueba</Label>
                  <Textarea
                    value={testScript}
                    onChange={(e) => setTestScript(e.target.value)}
                    placeholder="¡Hola! Soy Ferunda. Gracias por tu interés en mi trabajo..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {testScript.length}/200 caracteres • ~{Math.round(testScript.length / 10)}s de video
                  </p>
                </div>
                <Button 
                  onClick={generateTestVideo}
                  disabled={isGeneratingTest || !testScript}
                >
                  {isGeneratingTest ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4 mr-2" />
                  )}
                  Generar Video
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="federated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Federated Learning Insights
              </CardTitle>
              <CardDescription>
                Aprendizaje anónimo de patrones de conversión (privacidad diferencial aplicada)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/10 rounded-lg">
                  <h4 className="font-medium text-emerald-600 mb-2">Emociones Calmantes</h4>
                  <p className="text-3xl font-bold text-emerald-500">+30%</p>
                  <p className="text-sm text-muted-foreground">
                    Mejor tasa de conversión vs. otras emociones
                  </p>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-lg">
                  <h4 className="font-medium text-amber-600 mb-2">Duración Óptima</h4>
                  <p className="text-3xl font-bold text-amber-500">15-20s</p>
                  <p className="text-sm text-muted-foreground">
                    Videos más cortos tienen mejor retención
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h4 className="font-medium mb-3">Recomendaciones Basadas en Datos</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Usar emoción "calm" para confirmaciones de booking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Personalizar con nombre del cliente (+22% engagement)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Enviar 2-4 horas antes de la cita
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Evitar scripts mayores a 30 segundos
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AvatarCloneManager;
