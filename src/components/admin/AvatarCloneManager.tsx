import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Upload, Mic, Sparkles, Loader2, CheckCircle, 
  AlertCircle, Play, Pause, RefreshCw, Settings, 
  TrendingUp, Users, Eye, Download, Trash2, Plus,
  Globe, Wand2, Brain, Layers, Zap, Target, BarChart3,
  MessageCircle, Share2, Copy, ExternalLink
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
import { Switch } from '@/components/ui/switch';
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

interface MultiverseUniverse {
  id: string;
  emotion: string;
  script_variant: string;
  predicted_score: number;
  target_audience: string;
}

export const AvatarCloneManager: React.FC = () => {
  const [clones, setClones] = useState<AvatarClone[]>([]);
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedClone, setSelectedClone] = useState<AvatarClone | null>(null);
  const [testScript, setTestScript] = useState('');
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('clones');
  
  // Multi-verse state
  const [multiverseEnabled, setMultiverseEnabled] = useState(false);
  const [universes, setUniverses] = useState<MultiverseUniverse[]>([]);
  const [isGeneratingUniverses, setIsGeneratingUniverses] = useState(false);
  
  // Meta-RL state
  const [metaRLOptimization, setMetaRLOptimization] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Oracle state
  const [oracleQuestion, setOracleQuestion] = useState('');
  const [isOracleGenerating, setIsOracleGenerating] = useState(false);
  
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
      const { data: videos } = await supabase
        .from('ai_avatar_videos')
        .select('views_count, engagement_score, conversion_impact, script_emotion');

      if (videos && videos.length > 0) {
        const totalViews = videos.reduce((sum, v) => sum + (v.views_count || 0), 0);
        const avgEngagement = videos.reduce((sum, v) => sum + (v.engagement_score || 0), 0) / videos.length;
        const avgConversion = videos.reduce((sum, v) => sum + (v.conversion_impact || 0), 0) / videos.length;
        
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

      const { error: updateError } = await supabase
        .from('ai_avatar_clones')
        .update({
          voice_sample_url: urlData.publicUrl,
          status: 'training',
          training_progress: 10
        })
        .eq('id', selectedClone.id);

      if (updateError) throw updateError;

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
          action: 'generate',
          script_text: testScript,
          script_type: 'custom',
          emotion: multiverseEnabled ? 'auto' : 'calm',
          avatar_clone_id: selectedClone.id,
          language: 'es',
          generate_multiverse: multiverseEnabled,
          universe_count: 3
        }
      });

      if (error) throw error;
      
      if (data?.multiverse?.variants) {
        setUniverses(data.multiverse.variants);
      }
      
      toast.success('Video generándose...');
    } catch (error) {
      console.error('Test video error:', error);
      toast.error('Error generando video de prueba');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const previewUniverses = async () => {
    if (!testScript) return;

    setIsGeneratingUniverses(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-video', {
        body: {
          action: 'preview_universes',
          script_text: testScript,
          client_name: 'Test Client',
          client_mood: 'neutral'
        }
      });

      if (error) throw error;
      setUniverses(data.universes || []);
      toast.success(`${data.universes?.length || 0} universos generados`);
    } catch (error) {
      console.error('Universe preview error:', error);
      toast.error('Error previsualizando universos');
    } finally {
      setIsGeneratingUniverses(false);
    }
  };

  const runMetaRLOptimization = async () => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-video', {
        body: {
          action: 'optimize'
        }
      });

      if (error) throw error;
      setMetaRLOptimization(data.optimization);
      toast.success('Optimización Meta-RL completada');
    } catch (error) {
      console.error('Meta-RL error:', error);
      toast.error('Error en optimización');
    } finally {
      setIsOptimizing(false);
    }
  };

  const generateOracleVideo = async () => {
    if (!oracleQuestion) return;

    setIsOracleGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar-video', {
        body: {
          action: 'oracle',
          oracle_question: oracleQuestion,
          language: 'es'
        }
      });

      if (error) throw error;
      toast.success('Video Oracle generándose...');
    } catch (error) {
      console.error('Oracle error:', error);
      toast.error('Error generando respuesta Oracle');
    } finally {
      setIsOracleGenerating(false);
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
            AI Avatar Manager v2.0
          </h2>
          <p className="text-muted-foreground">
            Self-evolving loops + Multi-verse generation + Meta-RL optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runMetaRLOptimization} disabled={isOptimizing}>
            {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            <span className="ml-2">Meta-RL Optimize</span>
          </Button>
          <Button onClick={() => photoInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Nuevo Avatar
          </Button>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Meta-RL Optimization Results */}
      {metaRLOptimization && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-primary/10 border-purple-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Brain className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Meta-RL Self-Improving Loop</p>
                <p className="text-sm text-muted-foreground">{metaRLOptimization.script_adjustment}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-500">{metaRLOptimization.optimized_emotion}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(metaRLOptimization.confidence * 100)}% confianza
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="clones" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Avatares
          </TabsTrigger>
          <TabsTrigger value="multiverse" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Multi-Verse
          </TabsTrigger>
          <TabsTrigger value="oracle" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Oracle
          </TabsTrigger>
          <TabsTrigger value="federated" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Federated AI
          </TabsTrigger>
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            CRM Integration
          </TabsTrigger>
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

          {/* Test Video Generator */}
          {selectedClone?.status === 'ready' && (
            <Card>
              <CardHeader>
                <CardTitle>Generar Video de Prueba</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Switch 
                    checked={multiverseEnabled}
                    onCheckedChange={setMultiverseEnabled}
                  />
                  <span className="text-sm text-muted-foreground">
                    Multi-Verse Generation
                  </span>
                </div>
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
                <div className="flex gap-2">
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
                  {multiverseEnabled && (
                    <Button 
                      variant="outline"
                      onClick={previewUniverses}
                      disabled={isGeneratingUniverses || !testScript}
                    >
                      {isGeneratingUniverses ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Layers className="w-4 h-4 mr-2" />
                      )}
                      Preview Universes
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="multiverse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-500" />
                Multi-Verse Generation
              </CardTitle>
              <CardDescription>
                Genera infinite variants basadas en client data. QAOA selecciona best para max revenue impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Script Base</Label>
                <Textarea
                  value={testScript}
                  onChange={(e) => setTestScript(e.target.value)}
                  placeholder="Script que se adaptará a múltiples universos..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={previewUniverses}
                disabled={isGeneratingUniverses || !testScript}
                className="w-full"
              >
                {isGeneratingUniverses ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Generate Universe Variants
              </Button>

              {universes.length > 0 && (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {universes.map((universe, i) => (
                    <Card 
                      key={universe.id} 
                      className={`${i === 0 ? 'border-purple-500 bg-purple-500/5' : ''}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {i === 0 && (
                              <Badge className="bg-purple-500">QAOA Best</Badge>
                            )}
                            <div>
                              <p className="font-medium capitalize">{universe.emotion} Universe</p>
                              <p className="text-xs text-muted-foreground">
                                Target: {universe.target_audience}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              {Math.round(universe.predicted_score * 100)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Predicted Success</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {universe.script_variant}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant={i === 0 ? 'default' : 'outline'}>
                            <Video className="w-3 h-3 mr-1" />
                            Generate
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oracle" className="space-y-4">
          <Card className="bg-gradient-to-br from-purple-900/20 to-primary/10 border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                Avatar Oracle
              </CardTitle>
              <CardDescription>
                Pregunta al avatar y recibe respuestas video personalizadas con AI wisdom
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tu Pregunta</Label>
                <Textarea
                  value={oracleQuestion}
                  onChange={(e) => setOracleQuestion(e.target.value)}
                  placeholder="¿Qué significa para ti el arte del tatuaje?"
                  rows={2}
                />
              </div>
              <Button 
                onClick={generateOracleVideo}
                disabled={isOracleGenerating || !oracleQuestion}
                className="w-full bg-gradient-to-r from-purple-600 to-primary"
              >
                {isOracleGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Consultar al Oracle
              </Button>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOracleQuestion('¿Cómo cuidar mi tatuaje en verano?')}
                >
                  🌞 Healing Tips
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOracleQuestion('¿Qué estilo recomiendas para primer tatuaje?')}
                >
                  🎨 Style Advice
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOracleQuestion('¿Duele mucho el proceso?')}
                >
                  💪 Pain Q&A
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="federated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Federated Learning Insights
              </CardTitle>
              <CardDescription>
                Aprendizaje continuo de patrones de conversión (privacidad diferencial aplicada)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-emerald-600 mb-2">Emociones Calmantes</h4>
                    <p className="text-3xl font-bold text-emerald-500">+50%</p>
                    <p className="text-sm text-muted-foreground">
                      Mejor retención en healing videos
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-amber-600 mb-2">Duración Óptima</h4>
                    <p className="text-3xl font-bold text-amber-500">12-20s</p>
                    <p className="text-sm text-muted-foreground">
                      QAOA: min render cost, max engagement
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-purple-500 mb-3">QNN Pose Optimization</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center p-2 bg-background rounded">
                      <p className="font-medium">Head Tilt</p>
                      <p className="text-lg font-bold">5°</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="font-medium">Eye Contact</p>
                      <p className="text-lg font-bold">90%</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="font-medium">Smile</p>
                      <p className="text-lg font-bold">30%</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="font-medium">Gestures</p>
                      <p className="text-lg font-bold">Low</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">Continual Learning Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Videos analizados esta semana:</span>
                      <span className="font-bold">147</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Improvement desde inicio:</span>
                      <span className="font-bold text-emerald-500">+23% conversión</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Model confidence:</span>
                      <span className="font-bold">87%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                CRM Integration
              </CardTitle>
              <CardDescription>
                Auto-genera videos personalizados para cada etapa del customer journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-dashed hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="py-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h4 className="font-medium">Post-Booking Gracias</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-genera video de agradecimiento personalizado
                    </p>
                    <Badge className="mt-2 bg-emerald-500/20 text-emerald-500">Active</Badge>
                  </CardContent>
                </Card>
                <Card className="border-dashed hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="py-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-amber-500" />
                    </div>
                    <h4 className="font-medium">Healing Explicaciones</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Videos con análisis causal del progreso
                    </p>
                    <Badge className="mt-2 bg-amber-500/20 text-amber-500">Active</Badge>
                  </CardContent>
                </Card>
                <Card className="border-dashed hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="py-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <h4 className="font-medium">Onboarding Welcome</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Video multi-verse de bienvenida
                    </p>
                    <Badge className="mt-2 bg-blue-500/20 text-blue-500">Active</Badge>
                  </CardContent>
                </Card>
                <Card className="border-dashed hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="py-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Target className="w-6 h-6 text-purple-500" />
                    </div>
                    <h4 className="font-medium">Upsell Videos</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      +60% conversión con Stripe integration
                    </p>
                    <Badge className="mt-2 bg-purple-500/20 text-purple-500">Beta</Badge>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-primary/5">
                <CardContent className="py-4">
                  <p className="font-medium mb-2">Estadísticas CRM</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">234</p>
                      <p className="text-xs text-muted-foreground">Videos enviados</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-500">67%</p>
                      <p className="text-xs text-muted-foreground">Open rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-500">+$4.2K</p>
                      <p className="text-xs text-muted-foreground">Revenue atribuido</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AvatarCloneManager;
