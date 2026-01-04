import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Loader2, Sparkles, Wand2, Save, RefreshCw, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DesignGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: { prompt?: string; style?: string };
}

const TATTOO_STYLES = [
  { value: "traditional", label: "Tradicional Americano" },
  { value: "neotraditional", label: "Neo-tradicional" },
  { value: "realism", label: "Realismo" },
  { value: "blackwork", label: "Blackwork" },
  { value: "dotwork", label: "Dotwork" },
  { value: "watercolor", label: "Watercolor" },
  { value: "minimalist", label: "Minimalista" },
  { value: "japanese", label: "Japonés (Irezumi)" },
  { value: "geometric", label: "Geométrico" },
  { value: "tribal", label: "Tribal" },
  { value: "sketch", label: "Sketch/Boceto" },
  { value: "fineline", label: "Fine Line" }
];

export function DesignGeneratorModal({ 
  open, 
  onOpenChange, 
  initialData 
}: DesignGeneratorModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    prompt: "",
    style: "",
    placement: "",
    size: "medium",
    colorScheme: "blackwork",
    additionalNotes: ""
  });

  const [generatedDesign, setGeneratedDesign] = useState<{
    imageUrl: string;
    description: string;
    estimatedTime: string;
    complexity: string;
  } | null>(null);

  // Set initial data
  useEffect(() => {
    if (open && initialData) {
      setFormData(prev => ({
        ...prev,
        prompt: initialData.prompt || "",
        style: initialData.style || ""
      }));
    }
  }, [open, initialData]);

  const handleGenerate = async () => {
    if (!formData.prompt) {
      toast({
        title: "Descripción requerida",
        description: "Describe el diseño que deseas generar",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // First, get an enhanced prompt from Grok
      const { data: enhancedPromptData } = await supabase.functions.invoke("grok-gateway", {
        body: {
          messages: [
            {
              role: "user",
              content: `Como experto en diseño de tatuajes, mejora esta descripción para generar un diseño profesional:

              Idea original: ${formData.prompt}
              Estilo: ${TATTOO_STYLES.find(s => s.value === formData.style)?.label || "No especificado"}
              Ubicación: ${formData.placement || "No especificada"}
              Tamaño: ${formData.size}
              Colores: ${formData.colorScheme === "blackwork" ? "Solo negro/gris" : "A color"}
              Notas adicionales: ${formData.additionalNotes || "Ninguna"}

              Responde SOLO con el prompt mejorado para generar la imagen, sin explicaciones adicionales. Debe ser descriptivo, artístico y específico para un tatuaje.`
            }
          ]
        }
      });

      const enhancedPrompt = enhancedPromptData?.content || formData.prompt;

      // Then generate the design
      const { data, error } = await supabase.functions.invoke("generate-design", {
        body: {
          prompt: enhancedPrompt,
          style: formData.style,
          placement: formData.placement,
          size: formData.size,
          colorScheme: formData.colorScheme
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedDesign({
          imageUrl: data.imageUrl,
          description: enhancedPrompt,
          estimatedTime: data.estimatedTime || "2-4 horas",
          complexity: data.complexity || "Moderada"
        });

        toast({
          title: "✨ Diseño generado",
          description: "Tu diseño de tatuaje está listo",
        });
      } else {
        // Fallback: show a placeholder or message
        toast({
          title: "Diseño en proceso",
          description: "El diseño está siendo procesado. Revisa en unos momentos.",
        });
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el diseño",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!generatedDesign) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("ai_design_suggestions")
        .insert({
          user_prompt: formData.prompt,
          ai_description: generatedDesign.description,
          generated_image_url: generatedDesign.imageUrl,
          style_preferences: formData.style ? [formData.style] : [],
          suggested_placement: formData.placement,
          estimated_size: formData.size
        });

      if (error) throw error;

      toast({
        title: "✅ Guardado",
        description: "Diseño guardado en la galería",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el diseño",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Generador de Diseños AI
          </DialogTitle>
          <DialogDescription>
            Crea diseños de tatuaje únicos con inteligencia artificial
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="designPrompt">Describe tu diseño *</Label>
              <Textarea
                id="designPrompt"
                placeholder="Ej: Un lobo geométrico con elementos florales, estilo lineal delicado..."
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estilo</Label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TATTOO_STYLES.map(style => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiny">Tiny (2-5cm)</SelectItem>
                    <SelectItem value="small">Pequeño</SelectItem>
                    <SelectItem value="medium">Mediano</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                    <SelectItem value="xlarge">Extra grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  placeholder="Ej: Antebrazo, espalda..."
                  value={formData.placement}
                  onChange={(e) => setFormData(prev => ({ ...prev, placement: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Colores</Label>
                <Select
                  value={formData.colorScheme}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, colorScheme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blackwork">Negro/Gris</SelectItem>
                    <SelectItem value="color">A color</SelectItem>
                    <SelectItem value="watercolor">Watercolor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea
                placeholder="Cualquier detalle adicional que quieras incluir..."
                value={formData.additionalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                rows={2}
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
                  Generando diseño...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generar Diseño
                </>
              )}
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {generatedDesign ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  {/* Image Preview */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={generatedDesign.imageUrl}
                      alt="Generated tattoo design"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => window.open(generatedDesign.imageUrl, "_blank")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tiempo estimado:</span>
                        <p className="font-medium">{generatedDesign.estimatedTime}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Complejidad:</span>
                        <p className="font-medium">{generatedDesign.complexity}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Descripción AI:</span>
                      <p className="text-sm mt-1">{generatedDesign.description.slice(0, 200)}...</p>
                    </div>
                  </div>

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
                    <Button
                      className="flex-1"
                      onClick={handleSaveToGallery}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="aspect-square rounded-lg bg-muted flex items-center justify-center"
                >
                  <div className="text-center space-y-2 text-muted-foreground">
                    <Sparkles className="h-16 w-16 mx-auto opacity-50" />
                    <p>El diseño generado aparecerá aquí</p>
                    <p className="text-xs">Describe tu idea y haz clic en Generar</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
