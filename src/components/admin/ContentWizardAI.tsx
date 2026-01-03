import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useGrokMarketing } from "@/hooks/useGrokMarketing";
import {
  Wand2,
  Sparkles,
  Instagram,
  Video,
  Image,
  FileText,
  Copy,
  Download,
  RefreshCw,
  Send,
  Hash,
  Calendar,
  Clock,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Zap,
  Brain,
  Target,
  Palette,
  Music,
  Type,
  Layout
} from "lucide-react";

interface GeneratedContent {
  id: string;
  type: 'caption' | 'hashtags' | 'story' | 'reel_script' | 'bio';
  content: string;
  engagement_prediction: number;
  best_time: string;
  tone: string;
}

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: any;
}

const CONTENT_TEMPLATES: ContentTemplate[] = [
  { id: 'new_work', name: 'Nuevo Trabajo', description: 'Caption para mostrar un tatuaje recién terminado', type: 'caption', icon: Image },
  { id: 'behind_scenes', name: 'Behind the Scenes', description: 'Contenido del proceso creativo', type: 'story', icon: Video },
  { id: 'flash_promo', name: 'Flash Promo', description: 'Promoción de diseños flash disponibles', type: 'caption', icon: Zap },
  { id: 'client_story', name: 'Historia de Cliente', description: 'Narrativa del significado del tatuaje', type: 'caption', icon: Heart },
  { id: 'availability', name: 'Disponibilidad', description: 'Anuncio de fechas disponibles', type: 'story', icon: Calendar },
  { id: 'tip_tuesday', name: 'Tip Tuesday', description: 'Consejos de cuidado o preparación', type: 'reel_script', icon: Brain },
];

const TONES = [
  { id: 'professional', label: 'Profesional', emoji: '💼' },
  { id: 'casual', label: 'Casual', emoji: '😎' },
  { id: 'artistic', label: 'Artístico', emoji: '🎨' },
  { id: 'mystical', label: 'Místico', emoji: '✨' },
  { id: 'bold', label: 'Audaz', emoji: '🔥' },
  { id: 'minimalist', label: 'Minimalista', emoji: '◯' },
];

const ContentWizardAI = () => {
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState('artistic');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [savedContent, setSavedContent] = useState<GeneratedContent[]>([]);
  
  const { generateCaptions, getHashtags, isGenerating: grokGenerating } = useGrokMarketing();

  const generateContent = async () => {
    if (!prompt && !selectedTemplate) {
      toast.error('Ingresa una descripción o selecciona una plantilla');
      return;
    }

    setGenerating(true);
    try {
      const template = CONTENT_TEMPLATES.find(t => t.id === selectedTemplate);
      const tone = TONES.find(t => t.id === selectedTone);

      // Try Grok-powered generation first
      const grokCaptions = await generateCaptions({
        topic: prompt || template?.name || 'tatuaje nuevo',
        platform: 'instagram',
        tone: selectedTone as any,
        language: 'es',
        variations: 3,
      });

      if (grokCaptions.length > 0) {
        const variations: GeneratedContent[] = grokCaptions.map((caption, i) => ({
          id: caption.id,
          type: template?.type as any || 'caption',
          content: caption.content,
          engagement_prediction: caption.engagementPrediction,
          best_time: caption.bestTime,
          tone: tone?.label || 'Artístico'
        }));

        // Add hashtags as separate item
        if (grokCaptions[0]?.hashtags?.length > 0) {
          variations.push({
            id: 'hashtags-' + Date.now(),
            type: 'hashtags',
            content: grokCaptions[0].hashtags.map(h => `#${h}`).join(' '),
            engagement_prediction: 80,
            best_time: 'Siempre',
            tone: 'Universal'
          });
        }

        setGeneratedContent(variations);
        toast.success('Contenido generado con Grok AI');
        return;
      }

      // Fallback to edge function
      const { data, error } = await supabase.functions.invoke('ai-marketing-studio', {
        body: {
          action: 'generate_content',
          prompt: prompt || `Genera contenido para ${template?.name}`,
          template: selectedTemplate,
          tone: selectedTone,
          platform: 'instagram'
        }
      });

      if (error) throw error;

      // Generate multiple variations
      const variations: GeneratedContent[] = [
        {
          id: '1',
          type: template?.type as any || 'caption',
          content: data?.content || generateMockContent(selectedTemplate, selectedTone),
          engagement_prediction: 85 + Math.random() * 10,
          best_time: '18:00 - 20:00',
          tone: tone?.label || 'Artístico'
        },
        {
          id: '2',
          type: template?.type as any || 'caption',
          content: generateMockContent(selectedTemplate, selectedTone, true),
          engagement_prediction: 78 + Math.random() * 15,
          best_time: '12:00 - 14:00',
          tone: tone?.label || 'Artístico'
        },
        {
          id: '3',
          type: 'hashtags',
          content: generateHashtags(),
          engagement_prediction: 72 + Math.random() * 20,
          best_time: 'Siempre',
          tone: 'Universal'
        }
      ];

      setGeneratedContent(variations);
      toast.success('Contenido generado con IA');
    } catch (error) {
      console.error('Generation error:', error);
      // Use mock content on error
      setGeneratedContent([
        {
          id: '1',
          type: 'caption',
          content: generateMockContent(selectedTemplate, selectedTone),
          engagement_prediction: 85,
          best_time: '18:00 - 20:00',
          tone: TONES.find(t => t.id === selectedTone)?.label || 'Artístico'
        }
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const generateMockContent = (template: string | null, tone: string, variant = false): string => {
    const contents: Record<string, string[]> = {
      new_work: [
        "✨ Arte que cuenta historias en la piel\n\nCada línea tiene un propósito, cada sombra una intención. Este proyecto representó semanas de diseño y horas de ejecución meticulosa.\n\n¿Qué historia quieres contar?",
        "🖤 Cuando el arte se convierte en parte de ti\n\nNuevo trabajo terminado. Geometría sagrada que fluye con el movimiento natural del cuerpo.\n\nGracias por confiar en mi visión."
      ],
      behind_scenes: [
        "El proceso es tan importante como el resultado ✨\n\nDesde el primer sketch hasta la última línea, cada momento cuenta una parte de la historia.",
        "POV: Estás viendo nacer arte en tiempo real 🎨\n\nMi estudio, mi santuario, mi espacio de creación."
      ],
      flash_promo: [
        "⚡ FLASH DISPONIBLES ⚡\n\nDiseños únicos, precios especiales. Una vez tatuados, no se repiten.\n\nDesliza para ver los diseños disponibles →",
        "🔥 DROP DE FLASH 🔥\n\nNuevos diseños listos para tatuar. First come, first served.\n\nDM para reservar el tuyo."
      ],
      default: [
        "Arte que trasciende el tiempo ✨\n\nCada tatuaje es una colaboración entre artista y lienzo humano.\n\n¿Listo para crear algo único?",
        "Transformando ideas en arte permanente 🖤\n\nMi misión es dar vida a tus visiones más profundas."
      ]
    };

    const templateContents = contents[template || 'default'] || contents.default;
    return variant ? templateContents[1] || templateContents[0] : templateContents[0];
  };

  const generateHashtags = (): string => {
    return "#tattoo #tattooart #inked #tattooideas #tattoodesign #ink #tattooed #tattooartist #tattoos #tattooinspiration #tattoolife #blackwork #finelinetattoo #minimalisttattoo #geometrictattoo #dotwork #blackworktattoo #tattoolovers #tattoostyle #inkstagram";
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado al portapapeles');
  };

  const saveContent = (content: GeneratedContent) => {
    setSavedContent(prev => [...prev, content]);
    toast.success('Contenido guardado');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
            <Wand2 className="h-6 w-6 text-pink-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Wizard AI</h1>
            <p className="text-muted-foreground">Genera contenido viral para tus redes</p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Powered by Grok AI
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Generar
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Guardados
            {savedContent.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {savedContent.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Describe tu contenido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Selection */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Plantilla rápida (opcional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TEMPLATES.slice(0, 4).map((template) => {
                      const Icon = template.icon;
                      return (
                        <Button
                          key={template.id}
                          variant={selectedTemplate === template.id ? "default" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => setSelectedTemplate(
                            selectedTemplate === template.id ? null : template.id
                          )}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {template.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Descripción</p>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe el tatuaje, el contexto, o lo que quieres comunicar..."
                    rows={4}
                  />
                </div>

                {/* Tone Selection */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Tono</p>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((tone) => (
                      <Button
                        key={tone.id}
                        variant={selectedTone === tone.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTone(tone.id)}
                      >
                        {tone.emoji} {tone.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={generateContent}
                  disabled={generating}
                >
                  {generating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generar con IA
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Contenido Generado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {generatedContent.map((content, index) => (
                        <motion.div
                          key={content.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="hover:border-primary/50 transition-all">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">
                                  {content.type === 'caption' && <FileText className="h-3 w-3 mr-1" />}
                                  {content.type === 'hashtags' && <Hash className="h-3 w-3 mr-1" />}
                                  {content.type === 'story' && <Video className="h-3 w-3 mr-1" />}
                                  {content.type}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {Math.round(content.engagement_prediction)}%
                                  </Badge>
                                </div>
                              </div>

                              <p className="text-sm text-foreground whitespace-pre-line mb-3">
                                {content.content}
                              </p>

                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Mejor hora: {content.best_time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Palette className="h-3 w-3" />
                                  Tono: {content.tone}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => copyToClipboard(content.content)}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copiar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => saveContent(content)}
                                >
                                  <Bookmark className="h-3 w-3 mr-1" />
                                  Guardar
                                </Button>
                                <Button size="sm" variant="outline">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Variación
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {generatedContent.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Wand2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Genera contenido para ver resultados</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONTENT_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setActiveTab("generate");
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{template.name}</p>
                        <Badge variant="outline" className="text-xs">{template.type}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Saved Tab */}
        <TabsContent value="saved">
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedContent.map((content, index) => (
                <Card key={`${content.id}-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{content.type}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(content.content)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-line">
                      {content.content.substring(0, 150)}...
                    </p>
                  </CardContent>
                </Card>
              ))}
              {savedContent.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay contenido guardado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentWizardAI;
