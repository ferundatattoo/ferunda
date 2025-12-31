import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Download, AlertTriangle,
  CheckCircle, Eye, Move3D, Clock, Thermometer,
  Zap, ZapOff, Loader2, Video, FileText, RotateCcw,
  Maximize2, Layers, Activity, TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ============= TYPES =============
interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface RiskZone {
  zone: string;
  risk: number;
  reason: string;
  color?: string;
  mitigation?: string;
}

interface MovementAnalysis {
  overall_risk: number;
  poses_analyzed: string[];
  distortion_by_pose: Record<string, number>;
  physics_factors: string[];
}

interface AgingAnalysis {
  summary: string;
  years_analysis: Record<number, { fading_percent: number; description: string }>;
  sun_exposure_impact: string;
  recommendations: string[];
}

interface BlowoutRisk {
  overall: number;
  factors: string[];
  line_thickness_recommendation: string;
}

interface HeatmapData {
  zones: Array<{ name: string; risk: number; mitigation: string; position?: { x: number; y: number } }>;
  overall_risk: number;
  recommended_approach: string;
}

interface SimulationResult {
  version: string;
  landmarks: PoseLandmark[];
  detected_zone: string;
  confidence: number;
  multi_view_used: boolean;
  depth_map: { available: boolean; min_depth?: number; max_depth?: number };
  segmentation: { available: boolean; precision?: string };
  risk_zones: RiskZone[];
  movement_distortion_risk: number;
  movement_analysis: MovementAnalysis;
  blowout_probability: BlowoutRisk;
  aging_simulation: AgingAnalysis;
  fading_description: string;
  sim_videos: string[];
  video_url: string;
  risk_heatmap_data: HeatmapData;
  recommendations: string[];
  recommendations_summary: string;
  quality_tier: string;
}

interface ViabilitySimulator3DProps {
  referenceImageUrls: string | string[]; // Supports single or multiple images
  designImageUrl?: string;
  bodyPart?: string;
  skinTone?: string;
  clientAge?: number;
  quality?: "fast" | "standard" | "ultra";
  onSimulationComplete?: (result: SimulationResult) => void;
}

// ============= HELPERS =============
const getRiskColor = (risk: number): string => {
  if (risk <= 3) return "hsl(142, 76%, 36%)"; // green
  if (risk <= 5) return "hsl(48, 96%, 53%)"; // yellow
  if (risk <= 7) return "hsl(25, 95%, 53%)"; // orange
  return "hsl(0, 84%, 60%)"; // red
};

const getRiskLabel = (risk: number): string => {
  if (risk <= 3) return "Bajo";
  if (risk <= 5) return "Moderado";
  if (risk <= 7) return "Alto";
  return "Crítico";
};

// ============= COMPONENT =============
export default function ViabilitySimulator3D({
  referenceImageUrls,
  designImageUrl,
  bodyPart = "forearm",
  skinTone = "III",
  clientAge = 30,
  quality = "standard",
  onSimulationComplete,
}: ViabilitySimulator3DProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Normalize to array
  const imageUrls = Array.isArray(referenceImageUrls) ? referenceImageUrls : [referenceImageUrls];

  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "detecting" | "simulating" | "rendering" | "complete">("idle");
  const [progress, setProgress] = useState(0);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [agingYear, setAgingYear] = useState([5]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeView, setActiveView] = useState<"heatmap" | "movement" | "aging" | "blowout">("heatmap");
  const [selectedPose, setSelectedPose] = useState<string>("neutral_resting");

  // Draw heatmap overlay on canvas
  const drawHeatmap = useCallback((result: SimulationResult) => {
    const canvas = heatmapCanvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.naturalWidth || 800;
    canvas.height = image.naturalHeight || 600;

    // Draw original image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw risk zone overlays
    result.risk_zones.forEach((zone, index) => {
      const x = canvas.width * (0.2 + (index % 3) * 0.25);
      const y = canvas.height * (0.3 + Math.floor(index / 3) * 0.2);
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, canvas.width * 0.15);
      const color = getRiskColor(zone.risk);
      const alpha = Math.min(0.6, zone.risk / 15);
      
      gradient.addColorStop(0, color.replace(")", `, ${alpha})`).replace("hsl", "hsla"));
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    // Draw landmarks if available
    result.landmarks.forEach((lm) => {
      if (lm.visibility > 0.3) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, Math.PI * 2);
        ctx.fillStyle = lm.visibility > 0.6 ? "#22c55e" : "#eab308";
        ctx.fill();
      }
    });
  }, []);

  // Run simulation
  const runSimulation = async () => {
    setIsLoading(true);
    setStage("detecting");
    setProgress(10);

    try {
      // Call edge function
      setProgress(25);
      setStage("simulating");

      const { data, error } = await supabase.functions.invoke("viability-3d-simulator", {
        body: {
          reference_image_urls: imageUrls,
          design_image_url: designImageUrl,
          body_part: bodyPart,
          skin_tone: skinTone,
          client_age: clientAge,
          simulation_quality: quality,
        },
      });

      if (error) throw error;

      setProgress(80);
      setStage("rendering");

      // Process result
      const result: SimulationResult = {
        version: data.version || "2.0",
        landmarks: data.landmarks || [],
        detected_zone: data.detected_zone || bodyPart,
        confidence: data.confidence || 0.7,
        multi_view_used: data.multi_view_used || false,
        depth_map: data.depth_map || { available: false },
        segmentation: data.segmentation || { available: false },
        risk_zones: (data.risk_zones || []).map((z: RiskZone) => ({
          ...z,
          color: getRiskColor(z.risk),
        })),
        movement_distortion_risk: data.movement_distortion_risk || 5,
        movement_analysis: data.movement_analysis || {
          overall_risk: 5,
          poses_analyzed: [],
          distortion_by_pose: {},
          physics_factors: [],
        },
        blowout_probability: data.blowout_probability || {
          overall: 3,
          factors: [],
          line_thickness_recommendation: "",
        },
        aging_simulation: data.aging_simulation || {
          summary: "",
          years_analysis: {},
          sun_exposure_impact: "",
          recommendations: [],
        },
        fading_description: data.fading_description || "",
        sim_videos: data.sim_videos || [],
        video_url: data.video_url || "",
        risk_heatmap_data: data.risk_heatmap_data || {
          zones: [],
          overall_risk: 5,
          recommended_approach: "",
        },
        recommendations: data.recommendations || [],
        recommendations_summary: data.recommendations_summary || "",
        quality_tier: data.quality_tier || "standard",
      };

      setSimulationResult(result);
      setProgress(100);
      setStage("complete");

      // Draw heatmap
      setTimeout(() => drawHeatmap(result), 100);

      onSimulationComplete?.(result);
      toast.success("Simulación 3D Elite completada");
    } catch (err) {
      console.error("Simulation error:", err);
      toast.error("Error en simulación. Intenta de nuevo.");
      setStage("idle");
    } finally {
      setIsLoading(false);
    }
  };

  // Export PDF report
  const exportPDFReport = () => {
    if (!simulationResult) return;
    
    // Create report content
    const report = {
      title: "Reporte de Viabilidad 3D - Ferunda Tattoo",
      date: new Date().toLocaleDateString("es-ES"),
      bodyPart,
      skinTone,
      ...simulationResult,
    };
    
    // For now, download as JSON (PDF generation would require a library)
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ferunda-viability-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado");
  };

  // Stage labels
  const stageLabels: Record<string, string> = {
    idle: "Listo para simular",
    detecting: "Detectando pose 3D con MediaPipe...",
    simulating: "Calculando física y distorsiones...",
    rendering: "Generando visualización...",
    complete: "Simulación Elite completa",
  };

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Move3D className="w-5 h-5 text-primary" />
              3D Viability Simulator
              <Badge variant="outline" className="ml-2 text-xs">v2.0 Elite</Badge>
            </CardTitle>
            <CardDescription>
              Simulación avanzada con física, SAM2, y ML aging
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {imageUrls.length > 1 && (
              <Badge variant="secondary" className="text-xs">
                {imageUrls.length} vistas
              </Badge>
            )}
            <Badge variant={simulationResult ? "default" : "secondary"}>
              {simulationResult ? `Confianza ${Math.round(simulationResult.confidence * 100)}%` : "Pendiente"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Image Display with Heatmap Overlay */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            ref={imageRef}
            src={imageUrls[0]}
            alt="Referencia"
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
          
          {/* Heatmap Canvas Overlay */}
          {showHeatmap && simulationResult && (
            <canvas
              ref={heatmapCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none mix-blend-multiply opacity-70"
            />
          )}

          {/* Loading Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium mb-2">{stageLabels[stage]}</p>
                <Progress value={progress} className="w-56" />
                <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multi-view indicator */}
          {imageUrls.length > 1 && (
            <div className="absolute top-2 left-2 flex gap-1">
              {imageUrls.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/50"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runSimulation}
            disabled={isLoading}
            className="flex-1 min-w-[200px]"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Iniciar Simulación Elite</>
            )}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  disabled={!simulationResult}
                >
                  {showHeatmap ? <Eye className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Heatmap</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={exportPDFReport}
                  disabled={!simulationResult}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar Reporte</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSimulationResult(null)}
                  disabled={!simulationResult}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reiniciar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Results */}
        {simulationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="heatmap" className="text-xs">
                  <Thermometer className="w-3 h-3 mr-1" /> Heatmap
                </TabsTrigger>
                <TabsTrigger value="movement" className="text-xs">
                  <Activity className="w-3 h-3 mr-1" /> Movimiento
                </TabsTrigger>
                <TabsTrigger value="aging" className="text-xs">
                  <TrendingDown className="w-3 h-3 mr-1" /> Fading
                </TabsTrigger>
                <TabsTrigger value="blowout" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Blowout
                </TabsTrigger>
              </TabsList>

              {/* HEATMAP TAB */}
              <TabsContent value="heatmap" className="space-y-4 mt-4">
                {/* Summary Metrics */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold" style={{ color: getRiskColor(simulationResult.risk_heatmap_data.overall_risk) }}>
                      {simulationResult.risk_heatmap_data.overall_risk}/10
                    </p>
                    <p className="text-xs text-muted-foreground">Riesgo Global</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{Math.round(simulationResult.confidence * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Confianza 3D</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{simulationResult.risk_zones.length}</p>
                    <p className="text-xs text-muted-foreground">Zonas Analizadas</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      {simulationResult.depth_map.available && <Layers className="w-4 h-4 text-green-500" />}
                      {simulationResult.segmentation.available && <Maximize2 className="w-4 h-4 text-blue-500" />}
                      {simulationResult.multi_view_used && <Move3D className="w-4 h-4 text-purple-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Features</p>
                  </div>
                </div>

                {/* Risk Zones */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Zonas de Riesgo</h4>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {simulationResult.risk_zones.map((zone, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="text-sm capitalize">{zone.zone.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                                  {zone.reason}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{zone.reason}</p>
                                {zone.mitigation && (
                                  <p className="text-green-400 mt-1">💡 {zone.mitigation}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Badge 
                            variant={zone.risk > 6 ? "destructive" : zone.risk > 4 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {zone.risk}/10
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Approach Recommendation */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">
                    {simulationResult.risk_heatmap_data.recommended_approach}
                  </p>
                </div>
              </TabsContent>

              {/* MOVEMENT TAB */}
              <TabsContent value="movement" className="space-y-4 mt-4">
                {/* Video player if available */}
                {simulationResult.video_url ? (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      src={simulationResult.video_url}
                      className="w-full h-full object-contain"
                      loop
                      muted
                      playsInline
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2"
                      onClick={() => {
                        if (videoRef.current?.paused) {
                          videoRef.current.play();
                        } else {
                          videoRef.current?.pause();
                        }
                      }}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Simulación de video próximamente</p>
                      <p className="text-xs">Disponible en calidad "ultra"</p>
                    </div>
                  </div>
                )}

                {/* Poses Analysis */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Análisis por Pose (5 dinámicas)</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {["neutral_resting", "full_flexion", "full_extension", "lateral_twist", "daily_motion"].map((pose) => {
                      const risk = simulationResult.movement_analysis.distortion_by_pose[pose] || 5;
                      return (
                        <button
                          key={pose}
                          onClick={() => setSelectedPose(pose)}
                          className={`p-2 rounded-lg text-center transition-all ${
                            selectedPose === pose 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <p className="text-lg font-bold">{risk}</p>
                          <p className="text-[10px] capitalize">{pose.replace(/_/g, " ")}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Physics Factors */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Factores Físicos</h5>
                  <div className="flex flex-wrap gap-1">
                    {simulationResult.movement_analysis.physics_factors.map((factor, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Overall Risk */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{
                  backgroundColor: `${getRiskColor(simulationResult.movement_distortion_risk)}15`
                }}>
                  {simulationResult.movement_distortion_risk > 6 ? (
                    <AlertTriangle className="w-5 h-5" style={{ color: getRiskColor(simulationResult.movement_distortion_risk) }} />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      Riesgo de distorsión: {simulationResult.movement_distortion_risk}/10 ({getRiskLabel(simulationResult.movement_distortion_risk)})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Basado en análisis de {simulationResult.movement_analysis.poses_analyzed.length} poses dinámicas
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* AGING TAB */}
              <TabsContent value="aging" className="space-y-4 mt-4">
                {/* Year Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Simular envejecimiento</span>
                    <Badge variant="outline">{agingYear[0]} años</Badge>
                  </div>
                  <Slider
                    value={agingYear}
                    onValueChange={setAgingYear}
                    min={1}
                    max={20}
                    step={1}
                    className="py-2"
                  />
                </div>

                {/* Year Analysis */}
                <div className="grid grid-cols-5 gap-2">
                  {[1, 5, 10, 15, 20].map((year) => {
                    const yearData = simulationResult.aging_simulation.years_analysis[year];
                    return (
                      <div
                        key={year}
                        className={`p-2 rounded-lg text-center ${
                          agingYear[0] === year ? "bg-primary/20 border border-primary" : "bg-muted/50"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground">Año {year}</p>
                        <p className="text-lg font-bold">
                          {yearData?.fading_percent ?? "–"}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">fading</p>
                      </div>
                    );
                  })}
                </div>

                {/* Aging Description */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm">
                    {simulationResult.aging_simulation.years_analysis[agingYear[0]]?.description ||
                      simulationResult.aging_simulation.summary ||
                      "Simulación de envejecimiento no disponible"}
                  </p>
                  {simulationResult.aging_simulation.sun_exposure_impact && (
                    <p className="text-xs text-amber-600">
                      ☀️ {simulationResult.aging_simulation.sun_exposure_impact}
                    </p>
                  )}
                </div>

                {/* Aging Recommendations */}
                {simulationResult.aging_simulation.recommendations.length > 0 && (
                  <div className="space-y-1">
                    {simulationResult.aging_simulation.recommendations.map((rec, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span>💡</span> {rec}
                      </p>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* BLOWOUT TAB */}
              <TabsContent value="blowout" className="space-y-4 mt-4">
                {/* Blowout Risk Gauge */}
                <div className="flex items-center justify-center p-6">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        className="text-muted"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={getRiskColor(simulationResult.blowout_probability.overall)}
                        strokeWidth="10"
                        strokeDasharray={`${(simulationResult.blowout_probability.overall / 10) * 283} 283`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{simulationResult.blowout_probability.overall}</span>
                      <span className="text-xs text-muted-foreground">/10</span>
                    </div>
                  </div>
                </div>

                <p className="text-center font-medium">
                  Probabilidad de Blowout: {getRiskLabel(simulationResult.blowout_probability.overall)}
                </p>

                {/* Factors */}
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Factores de Riesgo</h5>
                  {simulationResult.blowout_probability.factors.length > 0 ? (
                    <div className="space-y-1">
                      {simulationResult.blowout_probability.factors.map((factor, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          {factor}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin factores de riesgo significativos</p>
                  )}
                </div>

                {/* Line Thickness Recommendation */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">
                    📏 {simulationResult.blowout_probability.line_thickness_recommendation}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Recommendations Summary */}
            {simulationResult.recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20"
              >
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  Recomendaciones
                </h4>
                {simulationResult.recommendations_summary && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {simulationResult.recommendations_summary}
                  </p>
                )}
                <div className="space-y-1">
                  {simulationResult.recommendations.slice(0, 5).map((rec, i) => (
                    <p key={i} className="text-sm">{rec}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
