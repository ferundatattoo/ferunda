import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, X, Check, Loader2, ZoomIn, ZoomOut,
  RotateCw, FlipHorizontal, Download, Sparkles,
  Move, RefreshCw, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

type BodyPart =
  | "left_wrist" | "right_wrist"
  | "left_inner_forearm" | "right_inner_forearm"
  | "left_outer_forearm" | "right_outer_forearm"
  | "left_bicep" | "right_bicep"
  | "chest_center" | "stomach"
  | "upper_back" | "lower_back"
  | "left_thigh_front" | "right_thigh_front"
  | "left_calf" | "right_calf";

interface TattooTransform {
  scale: number;
  rotation: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
}

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

// MediaPipe Pose Landmarks
const POSE_LANDMARKS: Record<number, string> = {
  0: "nose", 11: "left_shoulder", 12: "right_shoulder",
  13: "left_elbow", 14: "right_elbow", 15: "left_wrist", 16: "right_wrist",
  23: "left_hip", 24: "right_hip", 25: "left_knee", 26: "right_knee",
  27: "left_ankle", 28: "right_ankle"
};

// Body part configuration for landmark mapping
const BODY_PART_CONFIG: Record<BodyPart, {
  landmarks: number[];
  baseScale: number;
  anchorIndex: number;
}> = {
  left_wrist: { landmarks: [15, 13], baseScale: 0.08, anchorIndex: 0 },
  right_wrist: { landmarks: [16, 14], baseScale: 0.08, anchorIndex: 0 },
  left_inner_forearm: { landmarks: [13, 15], baseScale: 0.15, anchorIndex: 0 },
  right_inner_forearm: { landmarks: [14, 16], baseScale: 0.15, anchorIndex: 0 },
  left_outer_forearm: { landmarks: [13, 15], baseScale: 0.15, anchorIndex: 0 },
  right_outer_forearm: { landmarks: [14, 16], baseScale: 0.15, anchorIndex: 0 },
  left_bicep: { landmarks: [11, 13], baseScale: 0.18, anchorIndex: 0 },
  right_bicep: { landmarks: [12, 14], baseScale: 0.18, anchorIndex: 0 },
  chest_center: { landmarks: [11, 12], baseScale: 0.25, anchorIndex: 0 },
  stomach: { landmarks: [23, 24, 11, 12], baseScale: 0.3, anchorIndex: 0 },
  upper_back: { landmarks: [11, 12], baseScale: 0.3, anchorIndex: 0 },
  lower_back: { landmarks: [23, 24], baseScale: 0.25, anchorIndex: 0 },
  left_thigh_front: { landmarks: [23, 25], baseScale: 0.2, anchorIndex: 0 },
  right_thigh_front: { landmarks: [24, 26], baseScale: 0.2, anchorIndex: 0 },
  left_calf: { landmarks: [25, 27], baseScale: 0.15, anchorIndex: 0 },
  right_calf: { landmarks: [26, 28], baseScale: 0.15, anchorIndex: 0 },
};

const DEFAULT_TRANSFORM: TattooTransform = {
  scale: 1,
  rotation: 0,
  opacity: 0.85,
  offsetX: 0,
  offsetY: 0,
};

interface ConciergeARPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  referenceImageUrl: string;
  onBookingClick: () => void;
  onCapture?: (imageUrl: string) => void;
  onFeedback?: (feedback: 'love' | 'refine', screenshotUrl?: string) => void;
  suggestedBodyPart?: string;
  conversationId?: string;
  sketchId?: string;
}

export function ConciergeARPreview({
  isOpen,
  onClose,
  referenceImageUrl,
  onBookingClick,
  onCapture,
  onFeedback,
  suggestedBodyPart,
  conversationId,
  sketchId
}: ConciergeARPreviewProps) {
  const { toast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [bodyPart, setBodyPart] = useState<BodyPart>("left_inner_forearm");
  const [transform, setTransform] = useState<TattooTransform>(DEFAULT_TRANSFORM);
  const [designImage, setDesignImage] = useState<HTMLImageElement | null>(null);
  const [fps, setFps] = useState(0);
  const [hasTracking, setHasTracking] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const poseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fpsRef = useRef({ count: 0, lastTime: Date.now() });

  // Load reference image
  useEffect(() => {
    if (!referenceImageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setDesignImage(img);
      setIsLoading(false);
    };
    img.onerror = () => {
      console.error("Failed to load reference image:", referenceImageUrl);
      setIsLoading(false);
    };
    img.src = referenceImageUrl;
  }, [referenceImageUrl]);

  // Parse suggested body part
  useEffect(() => {
    if (suggestedBodyPart) {
      const normalized = suggestedBodyPart.toLowerCase().replace(/\s+/g, "_");
      const matchingPart = Object.keys(BODY_PART_CONFIG).find(
        part => normalized.includes(part.replace(/_/g, "")) || part.includes(normalized)
      );
      if (matchingPart) {
        setBodyPart(matchingPart as BodyPart);
      }
    }
  }, [suggestedBodyPart]);

  // Load MediaPipe scripts dynamically
  const loadMediaPipe = useCallback(async () => {
    if (poseRef.current) return true;

    try {
      // Check if already loaded
      if (!(window as any).Pose) {
        // Load scripts
        await new Promise<void>((resolve, reject) => {
          const script1 = document.createElement("script");
          script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
          script1.onload = () => resolve();
          script1.onerror = reject;
          document.head.appendChild(script1);
        });

        await new Promise<void>((resolve, reject) => {
          const script2 = document.createElement("script");
          script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
          script2.onload = () => resolve();
          script2.onerror = reject;
          document.head.appendChild(script2);
        });
      }

      // Initialize Pose
      const Pose = (window as any).Pose;
      const pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults((results: any) => {
        if (results.poseLandmarks) {
          setLandmarks(results.poseLandmarks);
          setHasTracking(true);
          
          // FPS counter
          fpsRef.current.count++;
          const now = Date.now();
          if (now - fpsRef.current.lastTime >= 1000) {
            setFps(fpsRef.current.count);
            fpsRef.current.count = 0;
            fpsRef.current.lastTime = now;
          }
        } else {
          setHasTracking(false);
        }
      });

      await pose.initialize();
      poseRef.current = pose;
      return true;
    } catch (error) {
      console.error("Failed to load MediaPipe:", error);
      return false;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load MediaPipe first
      const mpLoaded = await loadMediaPipe();
      if (!mpLoaded) {
        toast({ title: "Error", description: "No se pudo cargar el tracking", variant: "destructive" });
        return;
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setIsLoading(false);

      // Start processing loop
      const processFrame = async () => {
        if (videoRef.current && poseRef.current && streamRef.current) {
          try {
            await poseRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.error("Pose processing error:", e);
          }
        }
        if (streamRef.current) {
          animationRef.current = requestAnimationFrame(processFrame);
        }
      };
      processFrame();

    } catch (error) {
      console.error("Camera error:", error);
      toast({ title: "Error", description: "No se pudo acceder a la cámara", variant: "destructive" });
      setIsLoading(false);
    }
  }, [loadMediaPipe, toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setLandmarks(null);
    setHasTracking(false);
  }, []);

  // Draw frame with tattoo overlay
  useEffect(() => {
    if (!isCameraActive || !landmarks || !designImage || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw tattoo overlay
    const config = BODY_PART_CONFIG[bodyPart];
    if (config && config.landmarks.length >= 2) {
      const lm1 = landmarks[config.landmarks[0]];
      const lm2 = landmarks[config.landmarks[1]];

      if (lm1 && lm2 && lm1.visibility > 0.5 && lm2.visibility > 0.5) {
        // Calculate position (mirrored)
        const x1 = (1 - lm1.x) * canvas.width;
        const y1 = lm1.y * canvas.height;
        const x2 = (1 - lm2.x) * canvas.width;
        const y2 = lm2.y * canvas.height;

        const centerX = (x1 + x2) / 2 + transform.offsetX;
        const centerY = (y1 + y2) / 2 + transform.offsetY;
        const distance = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);

        const tattooSize = distance * config.baseScale * transform.scale * 2;

        ctx.save();
        ctx.globalAlpha = transform.opacity;
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + (transform.rotation * Math.PI / 180));

        const aspectRatio = designImage.height / designImage.width;
        const drawWidth = tattooSize;
        const drawHeight = tattooSize * aspectRatio;

        ctx.drawImage(
          designImage,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
        ctx.restore();
      }
    }
  }, [landmarks, designImage, bodyPart, transform, isCameraActive]);

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");
    
    // Create download
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `ar-preview-${Date.now()}.png`;
    link.click();

    // Track conversion event
    if (conversationId) {
      try {
        await supabase.from("chat_messages").insert({
          conversation_id: conversationId,
          role: "system",
          content: "[AR_SCREENSHOT_CAPTURED]"
        });
      } catch (e) {
        console.error("Failed to track AR capture:", e);
      }
    }

    if (onCapture) {
      onCapture(dataUrl);
    }

    toast({ title: "¡Captura guardada!", description: "La imagen se ha descargado" });
  }, [conversationId, onCapture, toast]);

  // Handle booking click
  const handleBookingClick = useCallback(async () => {
    // Track conversion
    if (conversationId) {
      try {
        await supabase.from("chat_messages").insert({
          conversation_id: conversationId,
          role: "system",
          content: "[AR_TO_BOOKING_CONVERSION]"
        });
        
        await supabase
          .from("chat_conversations")
          .update({ converted: true, conversion_type: "ar_preview" })
          .eq("id", conversationId);
      } catch (e) {
        console.error("Failed to track AR conversion:", e);
      }
    }

    stopCamera();
    onBookingClick();
    onClose();
  }, [conversationId, onBookingClick, onClose, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen) return null;

  const bodyPartOptions: { value: BodyPart; label: string }[] = [
    { value: "left_inner_forearm", label: "Antebrazo izq." },
    { value: "right_inner_forearm", label: "Antebrazo der." },
    { value: "left_bicep", label: "Bícep izq." },
    { value: "right_bicep", label: "Bícep der." },
    { value: "chest_center", label: "Pecho" },
    { value: "stomach", label: "Abdomen" },
    { value: "upper_back", label: "Espalda alta" },
    { value: "left_thigh_front", label: "Muslo izq." },
    { value: "right_thigh_front", label: "Muslo der." },
    { value: "left_calf", label: "Pantorrilla izq." },
    { value: "right_calf", label: "Pantorrilla der." },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 flex items-center justify-center rounded">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg text-foreground">Vista AR</h3>
              <p className="text-xs text-muted-foreground">Ve cómo luciría en tu cuerpo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasTracking && (
              <Badge variant="secondary" className="text-xs">
                {fps} FPS
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onClose(); }}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Camera/Canvas area */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {!isCameraActive ? (
              <div className="text-center space-y-6 p-8">
                {/* Reference image preview */}
                {designImage && (
                  <div className="mx-auto w-48 h-48 relative border border-border/50 rounded overflow-hidden">
                    <img 
                      src={referenceImageUrl} 
                      alt="Diseño de referencia" 
                      className="w-full h-full object-contain bg-background/10"
                    />
                  </div>
                )}
                
                <div>
                  <h4 className="text-lg font-display text-foreground mb-2">
                    Activa la cámara para ver el diseño en tu cuerpo
                  </h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    Usaremos tracking de cuerpo para posicionar el tatuaje
                  </p>
                </div>

                <Button
                  onClick={startCamera}
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 mr-2" />
                  )}
                  {isLoading ? "Cargando..." : "Activar Cámara"}
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="hidden"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: "scaleX(1)" }}
                />
                
                {/* Tracking indicator */}
                <div className="absolute top-4 left-4">
                  <Badge 
                    variant={hasTracking ? "default" : "secondary"}
                    className="text-xs"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    {hasTracking ? "Tracking activo" : "Buscando cuerpo..."}
                  </Badge>
                </div>

                {/* Quick actions */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => setTransform(DEFAULT_TRANSFORM)}
                    title="Restablecer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={captureScreenshot}
                    title="Capturar"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Controls panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/30 bg-background/95 p-4 space-y-6 overflow-y-auto">
            {/* Body part selector */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Ubicación
              </Label>
              <div className="grid grid-cols-2 gap-1">
                {bodyPartOptions.map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={bodyPart === value ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setBodyPart(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Transform controls */}
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Ajustes
              </Label>

              {/* Scale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <ZoomIn className="w-4 h-4" /> Tamaño
                  </span>
                  <span className="text-xs text-muted-foreground">{Math.round(transform.scale * 100)}%</span>
                </div>
                <Slider
                  value={[transform.scale]}
                  min={0.3}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) => setTransform(t => ({ ...t, scale: v }))}
                />
              </div>

              {/* Rotation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <RotateCw className="w-4 h-4" /> Rotación
                  </span>
                  <span className="text-xs text-muted-foreground">{transform.rotation}°</span>
                </div>
                <Slider
                  value={[transform.rotation]}
                  min={-180}
                  max={180}
                  step={5}
                  onValueChange={([v]) => setTransform(t => ({ ...t, rotation: v }))}
                />
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Opacidad</span>
                  <span className="text-xs text-muted-foreground">{Math.round(transform.opacity * 100)}%</span>
                </div>
                <Slider
                  value={[transform.opacity]}
                  min={0.3}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => setTransform(t => ({ ...t, opacity: v }))}
                />
              </div>

              {/* Position offset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Move className="w-4 h-4" /> Posición X
                  </span>
                </div>
                <Slider
                  value={[transform.offsetX]}
                  min={-100}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setTransform(t => ({ ...t, offsetX: v }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Posición Y</span>
                </div>
                <Slider
                  value={[transform.offsetY]}
                  min={-100}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setTransform(t => ({ ...t, offsetY: v }))}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border/30 space-y-3">
              {/* Feedback buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    captureScreenshot();
                    onFeedback?.('love');
                  }}
                  variant="outline"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                >
                  ❤️ ¡Me encanta!
                </Button>
                <Button
                  onClick={async () => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const screenshotUrl = canvas.toDataURL('image/png');
                      onFeedback?.('refine', screenshotUrl);
                    } else {
                      onFeedback?.('refine');
                    }
                    stopCamera();
                    onClose();
                  }}
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                >
                  🔄 Refinar
                </Button>
              </div>

              <Button
                onClick={handleBookingClick}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                <Check className="w-5 h-5 mr-2" />
                ¡Reservar ahora!
              </Button>
              
              <Button
                onClick={() => { stopCamera(); onClose(); }}
                variant="ghost"
                className="w-full text-muted-foreground"
                size="sm"
              >
                Volver al chat
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ConciergeARPreview;
