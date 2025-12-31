import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  ImageIcon,
  Sparkles,
  AlertTriangle,
  Eye,
  Palette,
  Ruler,
  Heart,
  Clock,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  User,
  Scissors
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "validating" | "valid" | "invalid";
  error?: string;
}

interface AnalysisResult {
  image_quality: string;
  low_confidence: boolean;
  body_part: { location: string; confidence: number };
  design_style: { primary: string; secondary: string[]; complexity: string };
  color_usage: string;
  size_estimate: { category: string; estimated_cm: string; fit_to_zone: string; explanation: string };
  skin_analysis: { tone_fitzpatrick: string; age_texture: string; issues_detected: string[] };
  technical_viability: { score: number; risks: string[]; longevity_estimate_years: string };
  style_match_ferunda: { percentage: number; explanation: string };
  guidelines_compliance: { pass: boolean; issues: string[] };
  recommendations: { adjustments: string[]; estimated_sessions: number; price_range_eur: string; time_hours: string };
  overall_decision: string;
  client_summary: string;
  artist_notes: string;
}

type ProcessingStage = "idle" | "uploading" | "validating" | "detecting_zone" | "analyzing_style" | "generating_recommendations" | "complete" | "error";

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: "Listo para analizar",
  uploading: "Subiendo imágenes...",
  validating: "Validando calidad de imágenes...",
  detecting_zone: "Detectando zona del cuerpo...",
  analyzing_style: "Analizando estilo y técnica...",
  generating_recommendations: "Generando recomendaciones...",
  complete: "Análisis completado",
  error: "Error en el análisis"
};

const STAGE_PROGRESS: Record<ProcessingStage, number> = {
  idle: 0,
  uploading: 15,
  validating: 30,
  detecting_zone: 50,
  analyzing_style: 70,
  generating_recommendations: 90,
  complete: 100,
  error: 0
};

interface ReferenceAnalyzerAIProps {
  bookingId?: string;
  clientEmail?: string;
  onAnalysisComplete?: (result: AnalysisResult, referenceId: string) => void;
}

export default function ReferenceAnalyzerAI({ bookingId, clientEmail, onAnalysisComplete }: ReferenceAnalyzerAIProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"client" | "artist">("client");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateImageDimensions = (file: File): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width < 500 || img.height < 500) {
          resolve({ valid: false, error: "Imagen muy pequeña (mínimo 500x500px)" });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => {
        resolve({ valid: false, error: "No se pudo cargar la imagen" });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check max limit
    if (images.length + files.length > 5) {
      toast.error("Máximo 5 imágenes permitidas");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Solo JPEG, PNG o WebP`);
        continue;
      }

      if (file.size > maxSize) {
        toast.error(`${file.name}: Máximo 10MB`);
        continue;
      }

      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);

      const newImage: UploadedImage = {
        id,
        file,
        preview,
        status: "validating"
      };

      setImages(prev => [...prev, newImage]);

      // Validate dimensions
      const validation = await validateImageDimensions(file);
      
      setImages(prev => prev.map(img => 
        img.id === id 
          ? { ...img, status: validation.valid ? "valid" : "invalid", error: validation.error }
          : img
      ));

      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
      }
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [images.length]);

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${crypto.randomUUID()}-${safeName}`;

    // IMPORTANT: Storage policies only allow uploads under `bookings/` or `concierge/`
    const bookingScope = bookingId ? bookingId : "anonymous";
    const filePath = `bookings/${bookingScope}/reference-analyzer/${fileName}`;

    const { data, error } = await supabase.storage
      .from("reference-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("reference-images")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const runAnalysis = async () => {
    const validImages = images.filter(img => img.status === "valid");
    
    if (validImages.length === 0) {
      toast.error("Sube al menos una imagen válida");
      return;
    }

    try {
      // Stage: Uploading
      setStage("uploading");
      const imageUrls: string[] = [];

      for (const img of validImages) {
        const url = await uploadToStorage(img.file);
        imageUrls.push(url);
      }

      // Stage: Validating
      setStage("validating");
      await new Promise(r => setTimeout(r, 500));

      // Stage: Detecting zone
      setStage("detecting_zone");
      await new Promise(r => setTimeout(r, 500));

      // Stage: Analyzing style
      setStage("analyzing_style");

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("analyze-reference", {
        body: {
          image_urls: imageUrls,
          booking_id: bookingId,
          client_email: clientEmail
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Stage: Generating recommendations
      setStage("generating_recommendations");
      await new Promise(r => setTimeout(r, 300));

      // Check for low confidence
      if (data.low_confidence) {
        setStage("error");
        toast.error("Sube una foto más clara de la zona del cuerpo con la referencia visible para un análisis preciso", {
          duration: 6000
        });
        setAnalysis(data.analysis);
        return;
      }

      // Complete!
      setStage("complete");
      setAnalysis(data.analysis);
      setReferenceId(data.reference_id);
      
      toast.success("Análisis completado");
      
      if (onAnalysisComplete && data.analysis) {
        onAnalysisComplete(data.analysis, data.reference_id);
      }

    } catch (error: any) {
      console.error("Analysis error:", error);
      setStage("error");
      toast.error(error.message || "Error al analizar las imágenes");
    }
  };

  const resetAnalysis = () => {
    setStage("idle");
    setAnalysis(null);
    setReferenceId(null);
    setImages([]);
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case "auto_approve": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "suggest_adjustments": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "manual_review": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "polite_decline": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case "auto_approve": return "✓ Aprobado";
      case "suggest_adjustments": return "⚠ Ajustes sugeridos";
      case "manual_review": return "👁 Revisión manual";
      case "polite_decline": return "✗ No compatible";
      default: return decision;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getViabilityColor = (score: number) => {
    if (score >= 8) return "text-emerald-400";
    if (score >= 6) return "text-amber-400";
    if (score >= 4) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-purple-400" />
        <div>
          <h2 className="font-display text-xl text-foreground">Análisis de Referencia IA</h2>
          <p className="text-sm text-muted-foreground">Sube tus referencias para un análisis detallado</p>
        </div>
      </div>

      {/* Upload Area */}
      {stage === "idle" && !analysis && (
        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div 
              className="flex flex-col items-center justify-center gap-4 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Arrastra o haz clic para subir</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hasta 5 imágenes • JPEG, PNG, WebP • Máx 10MB c/u • Mín 500x500px
                </p>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 0 && (
              <div className="mt-6 grid grid-cols-5 gap-3">
                {images.map(img => (
                  <div key={img.id} className="relative aspect-square group">
                    <img
                      src={img.preview}
                      alt="Preview"
                      className={`w-full h-full object-cover rounded-lg ${
                        img.status === "invalid" ? "opacity-50 ring-2 ring-red-500" : ""
                      }`}
                    />
                    
                    {/* Status indicator */}
                    <div className="absolute top-1 left-1">
                      {img.status === "validating" && (
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      )}
                      {img.status === "valid" && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                      {img.status === "invalid" && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Error tooltip */}
                    {img.error && (
                      <div className="absolute bottom-1 left-1 right-1 bg-red-500/90 text-white text-xs p-1 rounded truncate">
                        {img.error}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add more slot */}
                {images.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary/50 transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {/* Analyze button */}
            {images.filter(i => i.status === "valid").length > 0 && (
              <Button
                onClick={runAnalysis}
                className="w-full mt-6 gap-2"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                Analizar {images.filter(i => i.status === "valid").length} imagen(es)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {stage !== "idle" && stage !== "complete" && stage !== "error" && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{STAGE_LABELS[stage]}</span>
                  <span className="text-foreground">{STAGE_PROGRESS[stage]}%</span>
                </div>
                <Progress value={STAGE_PROGRESS[stage]} className="h-2" />
              </div>
              
              {/* Stage indicators */}
              <div className="flex gap-2 text-xs">
                {(["uploading", "validating", "detecting_zone", "analyzing_style", "generating_recommendations"] as ProcessingStage[]).map((s, i) => (
                  <Badge
                    key={s}
                    variant={stage === s ? "default" : STAGE_PROGRESS[stage] > STAGE_PROGRESS[s] ? "secondary" : "outline"}
                    className="gap-1"
                  >
                    {STAGE_PROGRESS[stage] > STAGE_PROGRESS[s] ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : stage === s ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    {i + 1}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state with low confidence */}
      {stage === "error" && analysis?.low_confidence && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="font-display text-lg text-foreground">Imagen de baja calidad</h3>
                <p className="text-muted-foreground">
                  Sube una foto más clara de la zona del cuerpo con la referencia visible para un análisis preciso.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Asegúrate de que la imagen esté bien iluminada</li>
                  <li>• Evita imágenes borrosas o pixeladas</li>
                  <li>• La zona del cuerpo debe ser visible claramente</li>
                </ul>
                <Button onClick={resetAnalysis} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Subir nuevas imágenes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {stage === "complete" && analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Decision Banner */}
          <Card className={`border ${getDecisionColor(analysis.overall_decision)}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getDecisionColor(analysis.overall_decision)}>
                  {getDecisionLabel(analysis.overall_decision)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Match Ferunda: <span className={getScoreColor(analysis.style_match_ferunda.percentage)}>
                    {analysis.style_match_ferunda.percentage}%
                  </span>
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={resetAnalysis} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Nuevo análisis
              </Button>
            </CardContent>
          </Card>

          {/* Tabs: Client / Artist */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "client" | "artist")}>
            <TabsList className="w-full">
              <TabsTrigger value="client" className="flex-1 gap-2">
                <User className="w-4 h-4" />
                Resumen Cliente
              </TabsTrigger>
              <TabsTrigger value="artist" className="flex-1 gap-2">
                <Scissors className="w-4 h-4" />
                Detalles Artista
              </TabsTrigger>
            </TabsList>

            {/* Client Summary Tab */}
            <TabsContent value="client" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-foreground leading-relaxed">{analysis.client_summary}</p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Ruler className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground">Tamaño</p>
                    <p className="font-medium">{analysis.size_estimate.category}</p>
                    <p className="text-xs text-muted-foreground">{analysis.size_estimate.estimated_cm}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground">Sesiones</p>
                    <p className="font-medium">{analysis.recommendations.estimated_sessions}</p>
                    <p className="text-xs text-muted-foreground">{analysis.recommendations.time_hours}h</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground">Precio est.</p>
                    <p className="font-medium">€{analysis.recommendations.price_range_eur}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Palette className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground">Estilo</p>
                    <p className="font-medium text-sm">{analysis.design_style.primary}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              {analysis.recommendations.adjustments.length > 0 && (
                <Card className="border-amber-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Ajustes recomendados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.adjustments.map((adj, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-amber-400">•</span>
                          {adj}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Artist Details Tab */}
            <TabsContent value="artist" className="space-y-4">
              {/* Artist Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Notas técnicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{analysis.artist_notes}</p>
                </CardContent>
              </Card>

              {/* Technical Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Body Part */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Zona detectada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{analysis.body_part.location}</p>
                    <p className="text-xs text-muted-foreground">Confianza: {analysis.body_part.confidence}%</p>
                  </CardContent>
                </Card>

                {/* Skin Analysis */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Análisis de piel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-sm">Fitzpatrick: <span className="font-medium">{analysis.skin_analysis.tone_fitzpatrick}</span></p>
                    <p className="text-sm">Textura: <span className="font-medium">{analysis.skin_analysis.age_texture}</span></p>
                    {analysis.skin_analysis.issues_detected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {analysis.skin_analysis.issues_detected.map((issue, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">{issue}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Technical Viability */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Viabilidad técnica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Score</span>
                      <span className={`font-bold text-lg ${getViabilityColor(analysis.technical_viability.score)}`}>
                        {analysis.technical_viability.score}/10
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Longevidad: {analysis.technical_viability.longevity_estimate_years} años
                    </p>
                    {analysis.technical_viability.risks.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {analysis.technical_viability.risks.map((risk, i) => (
                          <p key={i} className="text-xs text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {risk}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Style Match */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Match con Ferunda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <Progress 
                          value={analysis.style_match_ferunda.percentage} 
                          className="h-3"
                        />
                      </div>
                      <span className={`font-bold ${getScoreColor(analysis.style_match_ferunda.percentage)}`}>
                        {analysis.style_match_ferunda.percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{analysis.style_match_ferunda.explanation}</p>
                  </CardContent>
                </Card>

                {/* Design Style */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Estilo detectado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className="mb-2">{analysis.design_style.primary}</Badge>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {analysis.design_style.secondary.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Complejidad: <span className="capitalize">{analysis.design_style.complexity}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Color: {analysis.color_usage}
                    </p>
                  </CardContent>
                </Card>

                {/* Guidelines */}
                <Card className={analysis.guidelines_compliance.pass ? "border-emerald-500/20" : "border-red-500/20"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {analysis.guidelines_compliance.pass ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                      Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysis.guidelines_compliance.pass ? (
                      <p className="text-sm text-emerald-400">Cumple con todas las políticas</p>
                    ) : (
                      <ul className="space-y-1">
                        {analysis.guidelines_compliance.issues.map((issue, i) => (
                          <li key={i} className="text-sm text-red-400 flex items-start gap-1">
                            <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Image Quality */}
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Calidad de imagen</span>
                  <span className="text-sm font-medium">{analysis.image_quality}</span>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}
