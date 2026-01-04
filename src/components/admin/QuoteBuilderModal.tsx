import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Loader2, Sparkles, Send, FileText, Palette, Ruler, Clock } from "lucide-react";

interface QuoteBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: { clientEmail?: string; description?: string };
}

const SIZE_MULTIPLIERS: Record<string, number> = {
  tiny: 1,
  small: 1.5,
  medium: 2.5,
  large: 4,
  xlarge: 6,
  sleeve: 10
};

const COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  simple: 1,
  moderate: 1.5,
  detailed: 2,
  intricate: 3
};

export function QuoteBuilderModal({ 
  open, 
  onOpenChange, 
  initialData 
}: QuoteBuilderModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiCalculating, setIsAiCalculating] = useState(false);
  
  const [formData, setFormData] = useState({
    clientEmail: "",
    style: "",
    size: "medium",
    complexity: "moderate",
    placement: "",
    colorwork: false,
    sessions: 1,
    description: "",
    hourlyRate: 150,
    estimatedHours: 2
  });

  const [quote, setQuote] = useState({
    minPrice: 0,
    maxPrice: 0,
    estimatedTime: "",
    breakdown: [] as string[]
  });

  // Set initial data
  useEffect(() => {
    if (open && initialData) {
      setFormData(prev => ({
        ...prev,
        clientEmail: initialData.clientEmail || "",
        description: initialData.description || ""
      }));
    }
  }, [open, initialData]);

  // Calculate quote automatically
  useEffect(() => {
    const sizeMultiplier = SIZE_MULTIPLIERS[formData.size] || 2.5;
    const complexityMultiplier = COMPLEXITY_MULTIPLIERS[formData.complexity] || 1.5;
    const colorBonus = formData.colorwork ? 1.3 : 1;
    const sessionMultiplier = formData.sessions > 1 ? 0.95 : 1; // Slight discount for multiple sessions

    const basePrice = formData.hourlyRate * formData.estimatedHours;
    const adjustedPrice = basePrice * sizeMultiplier * complexityMultiplier * colorBonus * sessionMultiplier;

    const minPrice = Math.round(adjustedPrice * 0.85);
    const maxPrice = Math.round(adjustedPrice * 1.15);

    const totalHours = formData.estimatedHours * sizeMultiplier * complexityMultiplier;
    const hoursPerSession = totalHours / formData.sessions;

    setQuote({
      minPrice,
      maxPrice,
      estimatedTime: `${Math.round(totalHours)} horas (${formData.sessions} sesión${formData.sessions > 1 ? "es" : ""})`,
      breakdown: [
        `Base: $${formData.hourlyRate}/hr × ${formData.estimatedHours}hr = $${basePrice}`,
        `Tamaño (${formData.size}): ×${sizeMultiplier}`,
        `Complejidad (${formData.complexity}): ×${complexityMultiplier}`,
        formData.colorwork ? `Color: ×1.3` : "",
        formData.sessions > 1 ? `Multi-sesión: -5%` : ""
      ].filter(Boolean)
    });
  }, [formData]);

  const handleAiEstimate = async () => {
    setIsAiCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("grok-gateway", {
        body: {
          messages: [
            {
              role: "user",
              content: `Como experto en tatuajes, analiza esta solicitud y sugiere precio y tiempo:
              
              Estilo: ${formData.style || "No especificado"}
              Tamaño: ${formData.size}
              Complejidad: ${formData.complexity}
              Ubicación: ${formData.placement || "No especificada"}
              Color: ${formData.colorwork ? "Sí" : "Solo negro/gris"}
              Descripción: ${formData.description || "No proporcionada"}
              
              Responde con:
              1. Rango de precio sugerido (USD)
              2. Tiempo estimado
              3. Número de sesiones recomendadas
              4. Consideraciones especiales`
            }
          ]
        }
      });

      if (data?.content) {
        toast({
          title: "🤖 Estimación de Grok AI",
          description: data.content.slice(0, 300),
        });
      }
    } catch (error) {
      console.error("AI estimate error:", error);
    } finally {
      setIsAiCalculating(false);
    }
  };

  const handleSendQuote = async () => {
    if (!formData.clientEmail) {
      toast({
        title: "Email requerido",
        description: "Ingresa el email del cliente",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Here you would send the quote via email
      const { error } = await supabase.functions.invoke("crm-send-email", {
        body: {
          to: formData.clientEmail,
          subject: "Tu Cotización de Tatuaje 🎨",
          template: "quote",
          data: {
            style: formData.style,
            size: formData.size,
            minPrice: quote.minPrice,
            maxPrice: quote.maxPrice,
            estimatedTime: quote.estimatedTime,
            description: formData.description
          }
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Cotización enviada",
        description: `Quote enviado a ${formData.clientEmail}`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la cotización",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Generador de Cotizaciones
          </DialogTitle>
          <DialogDescription>
            Calcula y envía una cotización profesional
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left: Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quoteEmail">Email del Cliente</Label>
              <Input
                id="quoteEmail"
                type="email"
                placeholder="cliente@email.com"
                value={formData.clientEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Estilo
                </Label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditional">Tradicional</SelectItem>
                    <SelectItem value="realism">Realismo</SelectItem>
                    <SelectItem value="blackwork">Blackwork</SelectItem>
                    <SelectItem value="watercolor">Watercolor</SelectItem>
                    <SelectItem value="minimalist">Minimalista</SelectItem>
                    <SelectItem value="japanese">Japonés</SelectItem>
                    <SelectItem value="geometric">Geométrico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> Tamaño
                </Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiny">Tiny (2-5cm)</SelectItem>
                    <SelectItem value="small">Pequeño (5-10cm)</SelectItem>
                    <SelectItem value="medium">Mediano (10-20cm)</SelectItem>
                    <SelectItem value="large">Grande (20-35cm)</SelectItem>
                    <SelectItem value="xlarge">XL (35cm+)</SelectItem>
                    <SelectItem value="sleeve">Manga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Complejidad</Label>
              <Select
                value={formData.complexity}
                onValueChange={(value) => setFormData(prev => ({ ...prev, complexity: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple - Líneas básicas</SelectItem>
                  <SelectItem value="moderate">Moderado - Detalles estándar</SelectItem>
                  <SelectItem value="detailed">Detallado - Alta precisión</SelectItem>
                  <SelectItem value="intricate">Intrincado - Máximo detalle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input
                placeholder="Ej: Antebrazo, espalda, costillas..."
                value={formData.placement}
                onChange={(e) => setFormData(prev => ({ ...prev, placement: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Sesiones Estimadas: {formData.sessions}
              </Label>
              <Slider
                value={[formData.sessions]}
                onValueChange={([v]) => setFormData(prev => ({ ...prev, sessions: v }))}
                min={1}
                max={6}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Describe el diseño..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAiEstimate}
              disabled={isAiCalculating}
            >
              {isAiCalculating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Estimación con AI
            </Button>
          </div>

          {/* Right: Quote Preview */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5" />
              Cotización
            </div>

            <div className="text-center py-6">
              <div className="text-sm text-muted-foreground mb-1">Rango de Precio</div>
              <div className="text-4xl font-bold text-primary">
                ${quote.minPrice} - ${quote.maxPrice}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {quote.estimatedTime}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Desglose:</div>
              {quote.breakdown.map((item, i) => (
                <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  {item}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-4">
                * Los precios son estimados y pueden variar según el diseño final.
                El depósito requerido es del 30% del precio mínimo.
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSendQuote} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Send className="h-4 w-4 mr-2" />
            Enviar Cotización
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
