import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Play, Pause, Download, RefreshCw, AlertTriangle,
  CheckCircle, Eye, Layers, Move3D, Clock, Thermometer,
  Zap, ZapOff, Camera, RotateCcw, Loader2, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Types
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
  color: string;
}

interface SimulationResult {
  body_part_3d: {
    landmarks: PoseLandmark[];
    detected_zone: string;
    confidence: number;
  };
  curvature_estimate: "high" | "medium" | "low";
  movement_risk: number;
  risk_zones: RiskZone[];
  distortion_frames: string[];
  aging_frames: string[];
  heatmap_url: string;
  video_url: string;
  movement_distortion_risk: number;
  long_term_fading_simulation: {
    description: string;
    image_url: string;
  };
}

interface ViabilitySimulator3DProps {
  referenceImageUrl: string;
  designImageUrl?: string;
  bodyPart?: string;
  skinTone?: string;
  onSimulationComplete?: (result: SimulationResult) => void;
}

// MediaPipe Pose Landmarks indices
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Risk color mapping
const getRiskColor = (risk: number): string => {
  if (risk <= 3) return "#22c55e"; // green
  if (risk <= 6) return "#eab308"; // yellow
  return "#ef4444"; // red
};

export default function ViabilitySimulator3D({
  referenceImageUrl,
  designImageUrl,
  bodyPart = "forearm",
  skinTone = "III",
  onSimulationComplete,
}: ViabilitySimulator3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "detecting" | "simulating" | "rendering" | "complete">("idle");
  const [progress, setProgress] = useState(0);
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [agingYear, setAgingYear] = useState([0]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeView, setActiveView] = useState<"movement" | "aging" | "heatmap">("heatmap");

  // Initialize MediaPipe Pose detection
  const detectPose = useCallback(async (imageElement: HTMLImageElement): Promise<PoseLandmark[]> => {
    try {
      // Use edge function for pose detection with MediaPipe
      const { data, error } = await supabase.functions.invoke("viability-pose-detection", {
        body: { image_url: referenceImageUrl },
      });

      if (error) throw error;

      return data.landmarks || [];
    } catch (err) {
      console.error("Pose detection error:", err);
      return [];
    }
  }, [referenceImageUrl]);

  // Calculate curvature from landmarks
  const calculateCurvature = (landmarks: PoseLandmark[], bodyPart: string): "high" | "medium" | "low" => {
    if (landmarks.length === 0) return "medium";

    // Get relevant landmarks for body part
    let relevantLandmarks: PoseLandmark[] = [];
    
    if (bodyPart.includes("arm") || bodyPart.includes("forearm")) {
      relevantLandmarks = [
        landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
        landmarks[POSE_LANDMARKS.LEFT_ELBOW],
        landmarks[POSE_LANDMARKS.LEFT_WRIST],
      ].filter(Boolean);
    } else if (bodyPart.includes("leg") || bodyPart.includes("thigh")) {
      relevantLandmarks = [
        landmarks[POSE_LANDMARKS.LEFT_HIP],
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE],
      ].filter(Boolean);
    }

    if (relevantLandmarks.length < 3) return "medium";

    // Calculate angle between points (simplified curvature)
    const v1 = {
      x: relevantLandmarks[1].x - relevantLandmarks[0].x,
      y: relevantLandmarks[1].y - relevantLandmarks[0].y,
    };
    const v2 = {
      x: relevantLandmarks[2].x - relevantLandmarks[1].x,
      y: relevantLandmarks[2].y - relevantLandmarks[1].y,
    };

    const angle = Math.abs(Math.atan2(v1.x * v2.y - v1.y * v2.x, v1.x * v2.x + v1.y * v2.y));
    const angleDeg = (angle * 180) / Math.PI;

    if (angleDeg > 30) return "high";
    if (angleDeg > 15) return "medium";
    return "low";
  };

  // Calculate risk zones based on body part
  const calculateRiskZones = (bodyPart: string, curvature: string): RiskZone[] => {
    const baseRisks: Record<string, RiskZone[]> = {
      forearm: [
        { zone: "inner_elbow", risk: 7, reason: "Alta movilidad, fading acelerado", color: getRiskColor(7) },
        { zone: "wrist_crease", risk: 6, reason: "Roce constante", color: getRiskColor(6) },
        { zone: "outer_forearm", risk: 3, reason: "Zona estable", color: getRiskColor(3) },
      ],
      upper_arm: [
        { zone: "armpit_area", risk: 9, reason: "Máxima fricción y sudoración", color: getRiskColor(9) },
        { zone: "bicep", risk: 4, reason: "Deformación por músculo", color: getRiskColor(4) },
        { zone: "outer_arm", risk: 2, reason: "Excelente longevidad", color: getRiskColor(2) },
      ],
      chest: [
        { zone: "sternum", risk: 3, reason: "Zona estable, buen aging", color: getRiskColor(3) },
        { zone: "pectoral_edge", risk: 5, reason: "Distorsión con movimiento", color: getRiskColor(5) },
      ],
      ribs: [
        { zone: "ribs_front", risk: 8, reason: "Alta curvatura, dolor intenso", color: getRiskColor(8) },
        { zone: "ribs_side", risk: 7, reason: "Movimiento respiratorio", color: getRiskColor(7) },
      ],
      thigh: [
        { zone: "inner_thigh", risk: 8, reason: "Fricción constante", color: getRiskColor(8) },
        { zone: "front_thigh", risk: 3, reason: "Zona muy estable", color: getRiskColor(3) },
        { zone: "outer_thigh", risk: 2, reason: "Excelente para tatuajes grandes", color: getRiskColor(2) },
      ],
      calf: [
        { zone: "behind_knee", risk: 9, reason: "Flexión constante, fading rápido", color: getRiskColor(9) },
        { zone: "mid_calf", risk: 3, reason: "Buena longevidad", color: getRiskColor(3) },
      ],
    };

    const normalizedPart = Object.keys(baseRisks).find(key => 
      bodyPart.toLowerCase().includes(key)
    ) || "forearm";

    return baseRisks[normalizedPart] || baseRisks.forearm;
  };

  // Draw heatmap overlay
  const drawHeatmap = useCallback((riskZones: RiskZone[]) => {
    const canvas = heatmapCanvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.naturalWidth || 800;
    canvas.height = image.naturalHeight || 600;

    // Draw original image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Create gradient overlay based on risk zones
    riskZones.forEach((zone, index) => {
      const gradient = ctx.createRadialGradient(
        canvas.width * (0.3 + index * 0.2),
        canvas.height * (0.3 + index * 0.15),
        0,
        canvas.width * (0.3 + index * 0.2),
        canvas.height * (0.3 + index * 0.15),
        canvas.width * 0.2
      );

      const alpha = zone.risk / 15; // 0.0 - 0.66
      gradient.addColorStop(0, zone.color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }, []);

  // Run simulation
  const runSimulation = async () => {
    setIsLoading(true);
    setStage("detecting");
    setProgress(10);

    try {
      // Step 1: Call edge function for full simulation
      setProgress(30);
      setStage("simulating");

      const { data, error } = await supabase.functions.invoke("viability-3d-simulator", {
        body: {
          reference_image_url: referenceImageUrl,
          design_image_url: designImageUrl,
          body_part: bodyPart,
          skin_tone: skinTone,
        },
      });

      if (error) throw error;

      setProgress(70);
      setStage("rendering");

      // Process results
      const detectedLandmarks = data.landmarks || [];
      setLandmarks(detectedLandmarks);

      const curvature = calculateCurvature(detectedLandmarks, bodyPart);
      const riskZones = calculateRiskZones(bodyPart, curvature);

      // Calculate overall movement risk
      const avgRisk = riskZones.reduce((sum, z) => sum + z.risk, 0) / riskZones.length;

      const result: SimulationResult = {
        body_part_3d: {
          landmarks: detectedLandmarks,
          detected_zone: data.detected_zone || bodyPart,
          confidence: data.confidence || 0.85,
        },
        curvature_estimate: curvature,
        movement_risk: Math.round(avgRisk),
        risk_zones: riskZones,
        distortion_frames: data.distortion_frames || [],
        aging_frames: data.aging_frames || [],
        heatmap_url: data.heatmap_url || "",
        video_url: data.video_url || "",
        movement_distortion_risk: data.movement_distortion_risk || Math.round(avgRisk),
        long_term_fading_simulation: {
          description: data.fading_description || `Simulación de envejecimiento a ${agingYear[0]} años para piel Fitzpatrick ${skinTone}`,
          image_url: data.aged_image_url || "",
        },
      };

      setSimulationResult(result);
      setProgress(100);
      setStage("complete");

      // Draw heatmap
      setTimeout(() => drawHeatmap(riskZones), 100);

      onSimulationComplete?.(result);
      toast.success("Simulación 3D completada");
    } catch (err) {
      console.error("Simulation error:", err);
      toast.error("Error en la simulación. Usando análisis 2D como fallback.");
      
      // Fallback to 2D analysis
      const fallbackRiskZones = calculateRiskZones(bodyPart, "medium");
      setSimulationResult({
        body_part_3d: {
          landmarks: [],
          detected_zone: bodyPart,
          confidence: 0.5,
        },
        curvature_estimate: "medium",
        movement_risk: 5,
        risk_zones: fallbackRiskZones,
        distortion_frames: [],
        aging_frames: [],
        heatmap_url: "",
        video_url: "",
        movement_distortion_risk: 5,
        long_term_fading_simulation: {
          description: "Análisis 2D fallback - sube una imagen con mejor ángulo para simulación 3D completa",
          image_url: "",
        },
      });
      setStage("complete");
    } finally {
      setIsLoading(false);
    }
  };

  // Export simulation as video/GIF
  const exportSimulation = async () => {
    if (!simulationResult?.video_url) {
      toast.error("No hay video disponible para descargar");
      return;
    }

    try {
      const response = await fetch(simulationResult.video_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `ferunda-tattoo-simulation-${Date.now()}.mp4`;
      a.click();
      
      URL.revokeObjectURL(url);
      toast.success("Video descargado");
    } catch {
      toast.error("Error al descargar el video");
    }
  };

  // Stage labels
  const stageLabels = {
    idle: "Listo para simular",
    detecting: "Detectando pose 3D...",
    simulating: "Calculando distorsiones...",
    rendering: "Generando visualización...",
    complete: "Simulación completa",
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Move3D className="w-5 h-5 text-primary" />
              3D Viability Simulator
            </CardTitle>
            <CardDescription>
              Simulación de movimiento y envejecimiento del tatuaje
            </CardDescription>
          </div>
          <Badge variant={simulationResult ? "default" : "secondary"}>
            {simulationResult ? "Análisis 3D" : "Pendiente"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Reference Image Display */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            ref={imageRef}
            src={referenceImageUrl}
            alt="Referencia"
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
          
          {/* Heatmap Overlay */}
          {showHeatmap && simulationResult && (
            <canvas
              ref={heatmapCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
            />
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">{stageLabels[stage]}</p>
              <Progress value={progress} className="w-48 mt-2" />
            </div>
          )}

          {/* 3D Landmark Points Overlay */}
          {landmarks.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {landmarks.map((lm, i) => (
                <circle
                  key={i}
                  cx={`${lm.x * 100}%`}
                  cy={`${lm.y * 100}%`}
                  r="4"
                  fill={lm.visibility > 0.5 ? "#22c55e" : "#ef4444"}
                  opacity={lm.visibility}
                />
              ))}
            </svg>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runSimulation}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulando...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Iniciar Simulación 3D</>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHeatmap(!showHeatmap)}
            disabled={!simulationResult}
          >
            {showHeatmap ? <Eye className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={exportSimulation}
            disabled={!simulationResult?.video_url}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Results Tabs */}
        {simulationResult && (
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="heatmap">
                <Thermometer className="w-4 h-4 mr-2" /> Heatmap
              </TabsTrigger>
              <TabsTrigger value="movement">
                <Move3D className="w-4 h-4 mr-2" /> Movimiento
              </TabsTrigger>
              <TabsTrigger value="aging">
                <Clock className="w-4 h-4 mr-2" /> Envejecimiento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="heatmap" className="space-y-4">
              {/* Risk Zones Legend */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Zonas de Riesgo</h4>
                <div className="grid gap-2">
                  {simulationResult.risk_zones.map((zone, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className="text-sm capitalize">{zone.zone.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{zone.reason}</span>
                        <Badge variant={zone.risk > 6 ? "destructive" : zone.risk > 3 ? "default" : "secondary"}>
                          {zone.risk}/10
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
                <div className="text-center">
                  <p className="text-2xl font-bold">{simulationResult.movement_risk}/10</p>
                  <p className="text-xs text-muted-foreground">Riesgo Movimiento</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold capitalize">{simulationResult.curvature_estimate}</p>
                  <p className="text-xs text-muted-foreground">Curvatura</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{Math.round(simulationResult.body_part_3d.confidence * 100)}%</p>
                  <p className="text-xs text-muted-foreground">Confianza 3D</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="movement" className="space-y-4">
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
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Video de movimiento no disponible</p>
                    <p className="text-xs">Se requiere mayor confianza en detección 3D</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {simulationResult.movement_distortion_risk > 6 ? (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <span className="font-medium">
                    Distorsión por movimiento: {simulationResult.movement_distortion_risk}/10
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {simulationResult.movement_distortion_risk > 6
                    ? "Alto riesgo de distorsión. Considera zona alternativa o diseño más bold."
                    : "Riesgo aceptable de distorsión con el movimiento natural."}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="aging" className="space-y-4">
              {/* Aging Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Simular envejecimiento</span>
                  <span className="text-sm text-muted-foreground">{agingYear[0]} años</span>
                </div>
                <Slider
                  value={agingYear}
                  onValueChange={setAgingYear}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>

              {/* Aging Preview */}
              {simulationResult.long_term_fading_simulation.image_url ? (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={simulationResult.long_term_fading_simulation.image_url}
                    alt={`Simulación a ${agingYear[0]} años`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Simulación de envejecimiento</p>
                    <p className="text-xs">Proximamente con IA generativa</p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  {simulationResult.long_term_fading_simulation.description}
                </p>
                {skinTone === "I" || skinTone === "II" ? (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Piel clara (Fitzpatrick {skinTone}): Mayor riesgo de fading. 
                    Recomendamos black & grey saturado.
                  </p>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
