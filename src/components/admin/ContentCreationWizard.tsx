import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, Loader2, Copy, Instagram, Video, Mail, 
  Image, Hash, Calendar, Wand2, RefreshCw, CheckCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ContentCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: { type?: string; topic?: string };
}

type ContentType = "post" | "story" | "reel" | "email";

interface GeneratedContent {
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  bestTime: string;
  variations: string[];
}

export function ContentCreationWizard({ 
  open, 
  onOpenChange, 
  initialData 
}: ContentCreationWizardProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>("post");
  
  const [formData, setFormData] = useState({
    topic: "",
    tone: "professional",
    targetAudience: "",
    callToAction: ""
  });

  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [selectedVariation, setSelectedVariation] = useState(0);

  // Set initial data
  useEffect(() => {
    if (open && initialData) {
      if (initialData.type) {
        setActiveTab(initialData.type as ContentType);
      }
      if (initialData.topic) {
        setFormData(prev => ({ ...prev, topic: initialData.topic || "" }));
      }
    }
  }, [open, initialData]);

  const handleGenerate = async () => {
    if (!formData.topic) {
      toast({
        title: "Tema requerido",
        description: "Ingresa un tema o idea para generar contenido",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const contentTypeInstructions = {
        post: "un post de Instagram con caption profesional y hashtags relevantes",
        story: "contenido para Instagram Story con texto corto e impactante",
        reel: "un guión para Reel de 30-60 segundos con hook, contenido y CTA",
        email: "un email de marketing para promocionar servicios de tatuaje"
      };

      const { data, error } = await supabase.functions.invoke("grok-gateway", {
        body: {
          messages: [
            {
              role: "user",
              content: `Eres un experto en marketing para estudios de tatuajes. Genera ${contentTypeInstructions[activeTab]}.

              Tema: ${formData.topic}
              Tono: ${formData.tone}
              Audiencia: ${formData.targetAudience || "Personas interesadas en tatuajes de calidad"}
              CTA: ${formData.callToAction || "Reservar cita"}

              Responde en formato JSON con esta estructura exacta:
              {
                "caption": "texto principal",
                "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
                "imagePrompt": "descripción para generar imagen con AI",
                "bestTime": "mejor hora para publicar",
                "variations": ["variación 1 del caption", "variación 2 del caption"]
              }`
            }
          ]
        }
      });

      if (error) throw error;

      // Parse the response
      let content = data?.content || "";
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          setGeneratedContent(parsed);
        } catch {
          // If JSON parsing fails, create a basic structure
          setGeneratedContent({
            caption: content,
            hashtags: ["tattoo", "ink", "tattooart", "inked", "tattooartist"],
            imagePrompt: formData.topic,
            bestTime: "6:00 PM - 9:00 PM",
            variations: []
          });
        }
      } else {
        setGeneratedContent({
          caption: content,
          hashtags: ["tattoo", "ink", "tattooart", "inked", "tattooartist"],
          imagePrompt: formData.topic,
          bestTime: "6:00 PM - 9:00 PM",
          variations: []
        });
      }

      toast({
        title: "✨ Contenido generado",
        description: "Tu contenido está listo para revisar",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el contenido",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "📋 Copiado al portapapeles" });
  };

  const handleCopyAll = () => {
    if (!generatedContent) return;
    const fullContent = `${generatedContent.caption}\n\n${generatedContent.hashtags.map(h => `#${h}`).join(" ")}`;
    navigator.clipboard.writeText(fullContent);
    toast({ title: "📋 Contenido completo copiado" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Creador de Contenido AI
          </DialogTitle>
          <DialogDescription>
            Genera contenido de marketing optimizado con Grok AI
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="post" className="flex items-center gap-1">
              <Image className="h-4 w-4" />
              Post
            </TabsTrigger>
            <TabsTrigger value="story" className="flex items-center gap-1">
              <Instagram className="h-4 w-4" />
              Story
            </TabsTrigger>
            <TabsTrigger value="reel" className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              Reel
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Input Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Tema o Idea *</Label>
                <Textarea
                  id="topic"
                  placeholder="Ej: Nuevo estilo de tatuaje minimalista, promoción de verano, trabajo recién terminado..."
                  value={formData.topic}
                  onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tono</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={formData.tone}
                    onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
                  >
                    <option value="professional">Profesional</option>
                    <option value="casual">Casual</option>
                    <option value="artistic">Artístico</option>
                    <option value="edgy">Edgy/Alternativo</option>
                    <option value="luxury">Lujo/Premium</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Call to Action</Label>
                  <Input
                    placeholder="Ej: Reserva tu cita"
                    value={formData.callToAction}
                    onChange={(e) => setFormData(prev => ({ ...prev, callToAction: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Audiencia Objetivo</Label>
                <Input
                  placeholder="Ej: Jóvenes 25-35, amantes del arte..."
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generando con Grok AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generar Contenido
                  </>
                )}
              </Button>
            </div>

            {/* Generated Content Preview */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {generatedContent ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Caption */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Caption</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(generatedContent.caption)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{generatedContent.caption}</p>
                    </div>

                    {/* Hashtags */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          <Hash className="h-3 w-3" /> Hashtags
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(generatedContent.hashtags.map(h => `#${h}`).join(" "))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {generatedContent.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Best Time */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Mejor hora para publicar: <span className="font-medium text-foreground">{generatedContent.bestTime}</span>
                    </div>

                    {/* Variations */}
                    {generatedContent.variations.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Variaciones</Label>
                        <div className="grid gap-2">
                          {generatedContent.variations.map((variation, i) => (
                            <div
                              key={i}
                              className={`p-2 border rounded cursor-pointer transition-colors ${
                                selectedVariation === i ? "border-primary bg-primary/5" : "hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedVariation(i)}
                            >
                              <p className="text-sm truncate">{variation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerar
                      </Button>
                      <Button className="flex-1" onClick={handleCopyAll}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copiar Todo
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center text-muted-foreground"
                  >
                    <div className="text-center space-y-2">
                      <Sparkles className="h-12 w-12 mx-auto opacity-50" />
                      <p>El contenido generado aparecerá aquí</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
