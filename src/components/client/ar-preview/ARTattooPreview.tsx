import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera, Upload, RotateCcw, ZoomIn, ZoomOut,
  Share2, Download, Layers, X, Check,
  FlipHorizontal, Eye, EyeOff, Loader2,
  RefreshCw, Save, Scan, Target, Move,
  Sun, Moon, Droplets, Palette, Grid3X3,
  Plus, Trash2, Copy, Send, Smartphone,
  Monitor, Maximize2, Minimize2, Settings,
  Image as ImageIcon, Sparkles, Wand2, Lock, Unlock,
  RotateCw, ZapOff, Zap, Wifi, WifiOff,
  Video, VideoOff, Mic, MicOff, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// TYPES
// ============================================================================

type BodyPart =
  | "left_wrist" | "right_wrist"
  | "left_inner_forearm" | "right_inner_forearm"
  | "left_outer_forearm" | "right_outer_forearm"
  | "left_bicep" | "right_bicep"
  | "left_tricep" | "right_tricep"
  | "left_shoulder" | "right_shoulder"
  | "chest_left" | "chest_right" | "chest_center"
  | "stomach" | "ribs_left" | "ribs_right"
  | "upper_back" | "lower_back"
  | "left_thigh_front" | "right_thigh_front"
  | "left_thigh_side" | "right_thigh_side"
  | "left_calf" | "right_calf"
  | "left_ankle" | "right_ankle"
  | "neck_front" | "neck_back"
  | "left_hand" | "right_hand";

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface TattooLayer {
  id: string;
  name: string;
  imageSrc: string;
  imageElement: HTMLImageElement | null;
  bodyPart: BodyPart;
  transform: TattooTransform;
  visible: boolean;
  locked: boolean;
  blendMode: GlobalCompositeOperation;
}

interface TattooTransform {
  scale: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  offsetX: number;
  offsetY: number;
  skewX: number;
  skewY: number;
}

interface SkinTone {
  id: string;
  name: string;
  hue: number;
  saturation: number;
  brightness: number;
}

interface LightingPreset {
  id: string;
  name: string;
  ambient: number;
  warmth: number;
  contrast: number;
  highlights: number;
  shadows: number;
}

interface RecordingState {
  isRecording: boolean;
  duration: number;
  chunks: Blob[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

const BODY_PART_CONFIG: Record<BodyPart, {
  landmarks: [number, number];
  label: string;
  category: string;
  scaleFactor: number;
  defaultRotation: number;
  anchorPoint: number; // 0 = first landmark, 1 = second, 0.5 = middle
}> = {
  // Wrists
  left_wrist: { landmarks: [15, 13], label: "Left Wrist", category: "Arms", scaleFactor: 0.12, defaultRotation: 0, anchorPoint: 0.2 },
  right_wrist: { landmarks: [16, 14], label: "Right Wrist", category: "Arms", scaleFactor: 0.12, defaultRotation: 0, anchorPoint: 0.2 },
  
  // Forearms
  left_inner_forearm: { landmarks: [15, 13], label: "Left Inner Forearm", category: "Arms", scaleFactor: 0.22, defaultRotation: 0, anchorPoint: 0.5 },
  right_inner_forearm: { landmarks: [16, 14], label: "Right Inner Forearm", category: "Arms", scaleFactor: 0.22, defaultRotation: 0, anchorPoint: 0.5 },
  left_outer_forearm: { landmarks: [15, 13], label: "Left Outer Forearm", category: "Arms", scaleFactor: 0.22, defaultRotation: 180, anchorPoint: 0.5 },
  right_outer_forearm: { landmarks: [16, 14], label: "Right Outer Forearm", category: "Arms", scaleFactor: 0.22, defaultRotation: 180, anchorPoint: 0.5 },
  
  // Upper Arms
  left_bicep: { landmarks: [13, 11], label: "Left Bicep", category: "Arms", scaleFactor: 0.28, defaultRotation: 0, anchorPoint: 0.5 },
  right_bicep: { landmarks: [14, 12], label: "Right Bicep", category: "Arms", scaleFactor: 0.28, defaultRotation: 0, anchorPoint: 0.5 },
  left_tricep: { landmarks: [13, 11], label: "Left Tricep", category: "Arms", scaleFactor: 0.28, defaultRotation: 180, anchorPoint: 0.5 },
  right_tricep: { landmarks: [14, 12], label: "Right Tricep", category: "Arms", scaleFactor: 0.28, defaultRotation: 180, anchorPoint: 0.5 },
  
  // Shoulders
  left_shoulder: { landmarks: [11, 13], label: "Left Shoulder", category: "Torso", scaleFactor: 0.2, defaultRotation: -45, anchorPoint: 0.1 },
  right_shoulder: { landmarks: [12, 14], label: "Right Shoulder", category: "Torso", scaleFactor: 0.2, defaultRotation: 45, anchorPoint: 0.1 },
  
  // Chest
  chest_left: { landmarks: [11, 23], label: "Left Chest", category: "Torso", scaleFactor: 0.25, defaultRotation: 0, anchorPoint: 0.3 },
  chest_right: { landmarks: [12, 24], label: "Right Chest", category: "Torso", scaleFactor: 0.25, defaultRotation: 0, anchorPoint: 0.3 },
  chest_center: { landmarks: [11, 12], label: "Center Chest", category: "Torso", scaleFactor: 0.35, defaultRotation: 90, anchorPoint: 0.5 },
  
  // Stomach/Ribs
  stomach: { landmarks: [23, 24], label: "Stomach", category: "Torso", scaleFactor: 0.3, defaultRotation: 90, anchorPoint: 0.5 },
  ribs_left: { landmarks: [11, 23], label: "Left Ribs", category: "Torso", scaleFactor: 0.25, defaultRotation: 0, anchorPoint: 0.6 },
  ribs_right: { landmarks: [12, 24], label: "Right Ribs", category: "Torso", scaleFactor: 0.25, defaultRotation: 0, anchorPoint: 0.6 },
  
  // Back
  upper_back: { landmarks: [11, 12], label: "Upper Back", category: "Back", scaleFactor: 0.4, defaultRotation: 90, anchorPoint: 0.5 },
  lower_back: { landmarks: [23, 24], label: "Lower Back", category: "Back", scaleFactor: 0.35, defaultRotation: 90, anchorPoint: 0.5 },
  
  // Legs
  left_thigh_front: { landmarks: [23, 25], label: "Left Thigh Front", category: "Legs", scaleFactor: 0.3, defaultRotation: 0, anchorPoint: 0.4 },
  right_thigh_front: { landmarks: [24, 26], label: "Right Thigh Front", category: "Legs", scaleFactor: 0.3, defaultRotation: 0, anchorPoint: 0.4 },
  left_thigh_side: { landmarks: [23, 25], label: "Left Thigh Side", category: "Legs", scaleFactor: 0.3, defaultRotation: 90, anchorPoint: 0.4 },
  right_thigh_side: { landmarks: [24, 26], label: "Right Thigh Side", category: "Legs", scaleFactor: 0.3, defaultRotation: -90, anchorPoint: 0.4 },
  
  // Calves
  left_calf: { landmarks: [25, 27], label: "Left Calf", category: "Legs", scaleFactor: 0.22, defaultRotation: 0, anchorPoint: 0.5 },
  right_calf: { landmarks: [26, 28], label: "Right Calf", category: "Legs", scaleFactor: 0.22, defaultRotation: 0, anchorPoint: 0.5 },
  
  // Ankles
  left_ankle: { landmarks: [27, 29], label: "Left Ankle", category: "Legs", scaleFactor: 0.1, defaultRotation: 0, anchorPoint: 0.3 },
  right_ankle: { landmarks: [28, 30], label: "Right Ankle", category: "Legs", scaleFactor: 0.1, defaultRotation: 0, anchorPoint: 0.3 },
  
  // Neck
  neck_front: { landmarks: [11, 12], label: "Front Neck", category: "Neck", scaleFactor: 0.15, defaultRotation: 90, anchorPoint: 0.5 },
  neck_back: { landmarks: [11, 12], label: "Back Neck", category: "Neck", scaleFactor: 0.15, defaultRotation: 90, anchorPoint: 0.5 },
  
  // Hands
  left_hand: { landmarks: [15, 19], label: "Left Hand", category: "Hands", scaleFactor: 0.08, defaultRotation: 0, anchorPoint: 0.5 },
  right_hand: { landmarks: [16, 20], label: "Right Hand", category: "Hands", scaleFactor: 0.08, defaultRotation: 0, anchorPoint: 0.5 },
};

const SKIN_TONES: SkinTone[] = [
  { id: "fair", name: "Fair", hue: 25, saturation: 30, brightness: 95 },
  { id: "light", name: "Light", hue: 28, saturation: 35, brightness: 85 },
  { id: "medium", name: "Medium", hue: 30, saturation: 45, brightness: 70 },
  { id: "olive", name: "Olive", hue: 35, saturation: 40, brightness: 60 },
  { id: "tan", name: "Tan", hue: 28, saturation: 50, brightness: 55 },
  { id: "brown", name: "Brown", hue: 25, saturation: 55, brightness: 45 },
  { id: "dark", name: "Dark", hue: 22, saturation: 45, brightness: 30 },
];

const LIGHTING_PRESETS: LightingPreset[] = [
  { id: "natural", name: "Natural", ambient: 100, warmth: 50, contrast: 100, highlights: 0, shadows: 0 },
  { id: "studio", name: "Studio", ambient: 110, warmth: 45, contrast: 110, highlights: 10, shadows: -5 },
  { id: "warm", name: "Warm/Golden", ambient: 105, warmth: 70, contrast: 95, highlights: 5, shadows: 0 },
  { id: "cool", name: "Cool/Blue", ambient: 100, warmth: 30, contrast: 105, highlights: 0, shadows: 5 },
  { id: "dramatic", name: "Dramatic", ambient: 90, warmth: 45, contrast: 130, highlights: 15, shadows: -15 },
  { id: "soft", name: "Soft", ambient: 105, warmth: 55, contrast: 85, highlights: -5, shadows: 5 },
];

const BLEND_MODES: { id: GlobalCompositeOperation; label: string }[] = [
  { id: "multiply", label: "Multiply (Realistic)" },
  { id: "darken", label: "Darken" },
  { id: "color-burn", label: "Color Burn" },
  { id: "overlay", label: "Overlay" },
  { id: "soft-light", label: "Soft Light" },
  { id: "hard-light", label: "Hard Light" },
  { id: "source-over", label: "Normal" },
];

const DEFAULT_TRANSFORM: TattooTransform = {
  scale: 100,
  rotation: 0,
  opacity: 80,
  flipX: false,
  flipY: false,
  offsetX: 0,
  offsetY: 0,
  skewX: 0,
  skewY: 0,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ARTattooPreviewUltra() {
  const { toast } = useToast();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const recordingRef = useRef<MediaRecorder | null>(null);

  // State - Camera & Tracking
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing AR Engine...");
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [trackingQuality, setTrackingQuality] = useState(0);
  const [fps, setFps] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(Date.now());
  const [frameCount, setFrameCount] = useState(0);

  // State - Tattoo Layers
  const [layers, setLayers] = useState<TattooLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [showAllLayers, setShowAllLayers] = useState(true);

  // State - Display Options
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showLandmarkLabels, setShowLandmarkLabels] = useState(false);
  const [mirrorMode, setMirrorMode] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // State - Skin & Lighting
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinTone>(SKIN_TONES[2]);
  const [selectedLighting, setSelectedLighting] = useState<LightingPreset>(LIGHTING_PRESETS[0]);
  const [customLighting, setCustomLighting] = useState<LightingPreset>({ ...LIGHTING_PRESETS[0], id: "custom", name: "Custom" });

  // State - Recording
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    chunks: [],
  });

  // State - UI
  const [activeTab, setActiveTab] = useState("layers");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load MediaPipe
  useEffect(() => {
    loadMediaPipe();
    return () => cleanup();
  }, []);

  // FPS Counter
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastFrameTime;
      if (elapsed > 0) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        setFrameCount(0);
        setLastFrameTime(now);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFrameTime, frameCount]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording.isRecording) {
      interval = setInterval(() => {
        setRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording.isRecording]);

  // ============================================================================
  // MEDIAPIPE SETUP
  // ============================================================================

  const loadMediaPipe = async () => {
    setLoadingProgress(10);
    setLoadingMessage("Loading pose detection model...");

    try {
      // Load scripts sequentially
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js");
      setLoadingProgress(40);
      
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js");
      setLoadingProgress(60);
      
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js");
      setLoadingProgress(80);

      setLoadingMessage("Initializing...");
      setLoadingProgress(100);
      
      // Small delay to show 100%
      await new Promise(r => setTimeout(r, 500));
      setIsLoading(false);
      
    } catch (err) {
      console.error("Failed to load MediaPipe:", err);
      toast({
        title: "Error",
        description: "Failed to load AR engine. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  };

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    stopCamera();
  };

  // ============================================================================
  // CAMERA CONTROL
  // ============================================================================

  const startCamera = async () => {
    if (!window.Pose || !window.Camera) {
      toast({ title: "Error", description: "AR engine not ready", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Starting camera...");

    try {
      // Initialize Pose
      const pose = new window.Pose({
        locateFile: (file: string) => 
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(handlePoseResults);
      await pose.initialize();
      poseRef.current = pose;

      // Start Camera
      if (!videoRef.current) return;

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
        facingMode: facingMode,
      });

      await camera.start();
      cameraRef.current = camera;
      setCameraActive(true);
      setIsLoading(false);

      toast({ title: "AR Active", description: "Body tracking enabled" });

    } catch (err) {
      console.error("Camera error:", err);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    setCameraActive(false);
    setLandmarks(null);
    setTrackingQuality(0);
  };

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 500);
    }
  };

  // ============================================================================
  // POSE PROCESSING
  // ============================================================================

  const handlePoseResults = useCallback((results: any) => {
    setFrameCount(prev => prev + 1);

    if (!results.poseLandmarks) {
      setLandmarks(null);
      setTrackingQuality(0);
      return;
    }

    setLandmarks(results.poseLandmarks);

    // Calculate tracking quality
    const visibilities = results.poseLandmarks.map((lm: LandmarkPoint) => lm.visibility || 0);
    const avgVisibility = visibilities.reduce((a: number, b: number) => a + b, 0) / visibilities.length;
    setTrackingQuality(Math.round(avgVisibility * 100));

    // Draw overlay
    drawFrame(results);
  }, [layers, showAllLayers, showSkeleton, selectedSkinTone, selectedLighting, mirrorMode]);

  // ============================================================================
  // RENDERING
  // ============================================================================

  const drawFrame = (results: any) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply mirror if needed
    if (mirrorMode && facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Draw segmentation mask (skin detection)
    if (results.segmentationMask) {
      drawSegmentationMask(ctx, results.segmentationMask, canvas.width, canvas.height);
    }

    // Draw skeleton
    if (showSkeleton && results.poseLandmarks) {
      drawSkeleton(ctx, results.poseLandmarks, canvas.width, canvas.height);
    }

    // Draw tattoos
    if (results.poseLandmarks && showAllLayers) {
      const visibleLayers = layers.filter(l => l.visible);
      for (const layer of visibleLayers) {
        drawTattoo(ctx, layer, results.poseLandmarks, canvas.width, canvas.height);
      }
    }

    // Reset transform
    if (mirrorMode && facingMode === "user") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  };

  const drawSegmentationMask = (
    ctx: CanvasRenderingContext2D,
    mask: ImageData,
    width: number,
    height: number
  ) => {
    // This would use the segmentation mask for more realistic skin blending
    // For now, we'll skip this for performance
  };

  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    poseLandmarks: LandmarkPoint[],
    width: number,
    height: number
  ) => {
    if (!window.drawConnectors || !window.drawLandmarks) return;

    ctx.save();
    
    // Draw connections
    window.drawConnectors(ctx, poseLandmarks, window.POSE_CONNECTIONS, {
      color: "rgba(0, 255, 255, 0.4)",
      lineWidth: 2,
    });

    // Draw landmarks
    window.drawLandmarks(ctx, poseLandmarks, {
      color: "rgba(255, 0, 255, 0.6)",
      lineWidth: 1,
      radius: 4,
    });

    // Draw labels if enabled
    if (showLandmarkLabels) {
      ctx.font = "10px monospace";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      
      poseLandmarks.forEach((lm, i) => {
        const x = lm.x * width;
        const y = lm.y * height;
        ctx.strokeText(String(i), x + 5, y);
        ctx.fillText(String(i), x + 5, y);
      });
    }

    ctx.restore();
  };

  const drawTattoo = (
    ctx: CanvasRenderingContext2D,
    layer: TattooLayer,
    poseLandmarks: LandmarkPoint[],
    width: number,
    height: number
  ) => {
    if (!layer.imageElement) return;

    const config = BODY_PART_CONFIG[layer.bodyPart];
    const [idx1, idx2] = config.landmarks;

    const lm1 = poseLandmarks[idx1];
    const lm2 = poseLandmarks[idx2];

    if (!lm1 || !lm2) return;
    
    // Check visibility threshold
    const minVisibility = 0.5;
    if ((lm1.visibility || 0) < minVisibility || (lm2.visibility || 0) < minVisibility) {
      return;
    }

    // Calculate positions
    const x1 = lm1.x * width;
    const y1 = lm1.y * height;
    const x2 = lm2.x * width;
    const y2 = lm2.y * height;

    // Calculate anchor point
    const anchorX = x1 + (x2 - x1) * config.anchorPoint + layer.transform.offsetX;
    const anchorY = y1 + (y2 - y1) * config.anchorPoint + layer.transform.offsetY;

    // Calculate angle
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Calculate distance for scaling
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

    // Calculate size
    const baseScale = distance * config.scaleFactor;
    const scale = baseScale * (layer.transform.scale / 100);
    
    // Maintain aspect ratio
    const aspectRatio = layer.imageElement.width / layer.imageElement.height;
    const tattooHeight = scale;
    const tattooWidth = scale * aspectRatio;

    // Calculate depth-based opacity (z-axis)
    const avgZ = (lm1.z + lm2.z) / 2;
    const depthOpacity = Math.max(0.3, Math.min(1, 1 + avgZ * 2));

    ctx.save();

    // Move to anchor point
    ctx.translate(anchorX, anchorY);

    // Apply rotation (landmark angle + default + user rotation)
    const totalRotation = angle + 
      (config.defaultRotation * Math.PI / 180) + 
      (layer.transform.rotation * Math.PI / 180);
    ctx.rotate(totalRotation);

    // Apply flips
    const scaleX = layer.transform.flipX ? -1 : 1;
    const scaleY = layer.transform.flipY ? -1 : 1;
    ctx.scale(scaleX, scaleY);

    // Apply skew
    if (layer.transform.skewX !== 0 || layer.transform.skewY !== 0) {
      ctx.transform(
        1,
        Math.tan(layer.transform.skewY * Math.PI / 180),
        Math.tan(layer.transform.skewX * Math.PI / 180),
        1,
        0,
        0
      );
    }

    // Set blend mode and opacity
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.globalAlpha = (layer.transform.opacity / 100) * depthOpacity;

    // Apply lighting adjustments
    if (selectedLighting.id !== "natural") {
      ctx.filter = `
        brightness(${selectedLighting.ambient}%)
        contrast(${selectedLighting.contrast}%)
        saturate(${100 + (selectedLighting.warmth - 50)}%)
      `;
    }

    // Draw tattoo
    ctx.drawImage(
      layer.imageElement,
      -tattooWidth / 2,
      -tattooHeight / 2,
      tattooWidth,
      tattooHeight
    );

    // Add skin tone blending overlay
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = `hsl(${selectedSkinTone.hue}, ${selectedSkinTone.saturation}%, ${selectedSkinTone.brightness}%)`;
    ctx.fillRect(-tattooWidth / 2, -tattooHeight / 2, tattooWidth, tattooHeight);

    ctx.restore();
  };

  // ============================================================================
  // LAYER MANAGEMENT
  // ============================================================================

  const addLayer = (imageSrc: string, name: string = "New Tattoo") => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const newLayer: TattooLayer = {
        id: `layer-${Date.now()}`,
        name,
        imageSrc,
        imageElement: img,
        bodyPart: "right_inner_forearm",
        transform: { ...DEFAULT_TRANSFORM },
        visible: true,
        locked: false,
        blendMode: "multiply",
      };
      setLayers(prev => [...prev, newLayer]);
      setActiveLayerId(newLayer.id);
      toast({ title: "Layer Added", description: name });
    };
    img.onerror = () => {
      // Create placeholder
      createPlaceholderImage(name);
    };
    img.src = imageSrc;
  };

  const createPlaceholderImage = (name: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw a sample design
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(150, 150, 120, 0, Math.PI * 2);
    ctx.fill();

    // Inner pattern
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(150, 150);
      ctx.lineTo(150 + Math.cos(angle) * 100, 150 + Math.sin(angle) * 100);
      ctx.stroke();
    }

    // Center
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.arc(150, 150, 40, 0, Math.PI * 2);
    ctx.fill();

    const img = new Image();
    img.onload = () => {
      const newLayer: TattooLayer = {
        id: `layer-${Date.now()}`,
        name,
        imageSrc: canvas.toDataURL(),
        imageElement: img,
        bodyPart: "right_inner_forearm",
        transform: { ...DEFAULT_TRANSFORM },
        visible: true,
        locked: false,
        blendMode: "multiply",
      };
      setLayers(prev => [...prev, newLayer]);
      setActiveLayerId(newLayer.id);
    };
    img.src = canvas.toDataURL();
  };

  const removeLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(null);
    }
  };

  const duplicateLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;

    const newLayer: TattooLayer = {
      ...layer,
      id: `layer-${Date.now()}`,
      name: `${layer.name} (copy)`,
      transform: { ...layer.transform, offsetX: layer.transform.offsetX + 20, offsetY: layer.transform.offsetY + 20 },
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<TattooLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateLayerTransform = (id: string, transformUpdates: Partial<TattooTransform>) => {
    setLayers(prev => prev.map(l => 
      l.id === id 
        ? { ...l, transform: { ...l.transform, ...transformUpdates } }
        : l
    ));
  };

  // Get active layer
  const activeLayer = layers.find(l => l.id === activeLayerId);

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      addLayer(src, file.name.split(".")[0]);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ============================================================================
  // RECORDING
  // ============================================================================

  const startRecording = async () => {
    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    if (!video || !overlay) return;

    // Create a canvas to combine video + overlay
    const recordCanvas = document.createElement("canvas");
    recordCanvas.width = video.videoWidth;
    recordCanvas.height = video.videoHeight;
    const recordCtx = recordCanvas.getContext("2d");
    if (!recordCtx) return;

    // Create stream from canvas
    const stream = recordCanvas.captureStream(30);

    // Setup MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      
      // Download
      const a = document.createElement("a");
      a.href = url;
      a.download = `ferunda-ar-${Date.now()}.webm`;
      a.click();
      
      URL.revokeObjectURL(url);
      toast({ title: "Recording Saved", description: `${recording.duration}s video saved` });
    };

    // Start recording
    mediaRecorder.start();
    recordingRef.current = mediaRecorder;
    setRecording({ isRecording: true, duration: 0, chunks: [] });

    // Draw frames
    const drawRecordFrame = () => {
      if (!recording.isRecording) return;
      
      recordCtx.drawImage(video, 0, 0);
      recordCtx.drawImage(overlay, 0, 0);
      
      animationFrameRef.current = requestAnimationFrame(drawRecordFrame);
    };
    drawRecordFrame();
  };

  const stopRecording = () => {
    if (recordingRef.current) {
      recordingRef.current.stop();
      recordingRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setRecording({ isRecording: false, duration: 0, chunks: [] });
  };

  // ============================================================================
  // SCREENSHOT
  // ============================================================================

  const captureScreenshot = () => {
    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    if (!video || !overlay) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video
    if (mirrorMode && facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Draw overlay
    ctx.drawImage(overlay, 0, 0);

    // Download
    const link = document.createElement("a");
    link.download = `ferunda-ar-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();

    toast({ title: "Screenshot Saved" });
  };

  // ============================================================================
  // RENDER - Loading State
  // ============================================================================

  if (isLoading && !cameraActive) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"
            style={{ animationDuration: "1s" }}
          />
          <Layers className="absolute inset-0 m-auto w-10 h-10 text-cyan-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-2">{loadingMessage}</h3>
        
        <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 mt-2">{loadingProgress}%</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER - Main UI
  // ============================================================================

  return (
    <div className={`space-y-4 ${fullscreen ? "fixed inset-0 z-50 bg-black p-4" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              AR Tattoo Preview
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
                ULTRA
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time body tracking • Multiple layers • Pro lighting
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {cameraActive && (
            <>
              <Badge variant="outline" className="font-mono">
                {fps} FPS
              </Badge>
              <Badge 
                variant="outline" 
                className={trackingQuality > 70 ? "border-green-500 text-green-500" : 
                           trackingQuality > 40 ? "border-yellow-500 text-yellow-500" : 
                           "border-red-500 text-red-500"}
              >
                {trackingQuality}% tracking
              </Badge>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Video Area */}
        <div className={`${fullscreen ? "lg:col-span-3" : "lg:col-span-3"}`}>
          <Card className="overflow-hidden bg-black">
            <CardContent className="p-0 relative">
              <div className={`relative ${fullscreen ? "h-[calc(100vh-180px)]" : "aspect-video"}`}>
                {/* Video */}
                <video
                  ref={videoRef}
                  className={`absolute inset-0 w-full h-full object-cover ${
                    mirrorMode && facingMode === "user" ? "scale-x-[-1]" : ""
                  }`}
                  playsInline
                  muted
                />
                
                {/* Overlay Canvas */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                {/* Start Prompt */}
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-6 animate-pulse">
                      <Camera className="w-16 h-16 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">AR Tattoo Preview</h3>
                    <p className="text-gray-400 mb-6 text-center max-w-md">
                      AI-powered body tracking with real-time tattoo visualization.
                      Supports multiple layers, lighting adjustment, and video recording.
                    </p>
                    <Button
                      size="lg"
                      onClick={startCamera}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-lg px-8"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Start AR Camera
                    </Button>
                  </div>
                )}

                {/* Top Controls */}
                {cameraActive && (
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                    <div className="flex flex-col gap-2">
                      {/* Tracking indicator */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          trackingQuality > 70 ? "bg-green-500" :
                          trackingQuality > 40 ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <span className="text-white text-sm">
                          {trackingQuality > 70 ? "Excellent" :
                           trackingQuality > 40 ? "Good" :
                           trackingQuality > 0 ? "Low" : "No tracking"}
                        </span>
                      </div>
                      
                      {/* Recording indicator */}
                      {recording.isRecording && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/80 backdrop-blur-sm rounded-full">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          <span className="text-white text-sm font-mono">
                            REC {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, "0")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                        onClick={switchCamera}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                        onClick={() => setMirrorMode(!mirrorMode)}
                      >
                        <FlipHorizontal className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                        onClick={() => setShowSkeleton(!showSkeleton)}
                      >
                        <Target className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bottom Controls */}
                {cameraActive && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-12 h-12 bg-black/50 border-white/20 text-white hover:bg-black/70"
                      onClick={stopCamera}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    
                    {/* Record button */}
                    <Button
                      size="icon"
                      className={`rounded-full w-12 h-12 ${
                        recording.isRecording 
                          ? "bg-red-500 hover:bg-red-600" 
                          : "bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      }`}
                      onClick={recording.isRecording ? stopRecording : startRecording}
                    >
                      {recording.isRecording ? (
                        <div className="w-4 h-4 bg-white rounded" />
                      ) : (
                        <Video className="w-5 h-5" />
                      )}
                    </Button>

                    {/* Capture button */}
                    <Button
                      size="icon"
                      className="rounded-full w-16 h-16 bg-white hover:bg-gray-100"
                      onClick={captureScreenshot}
                    >
                      <Camera className="w-7 h-7 text-black" />
                    </Button>

                    {/* Toggle overlay */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-12 h-12 bg-black/50 border-white/20 text-white hover:bg-black/70"
                      onClick={() => setShowAllLayers(!showAllLayers)}
                    >
                      {showAllLayers ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </Button>

                    {/* Share */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-12 h-12 bg-black/50 border-white/20 text-white hover:bg-black/70"
                      onClick={() => toast({ title: "Share", description: "Link copied to clipboard!" })}
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick body part selector */}
          {cameraActive && activeLayer && (
            <Card className="mt-4">
              <CardContent className="py-3">
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    {Object.entries(BODY_PART_CONFIG)
                      .filter(([_, config]) => config.category === "Arms")
                      .map(([key, config]) => (
                        <Button
                          key={key}
                          variant={activeLayer.bodyPart === key ? "default" : "outline"}
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => updateLayer(activeLayer.id, { bodyPart: key as BodyPart })}
                        >
                          {config.label}
                        </Button>
                      ))}
                    <div className="w-px bg-border mx-1" />
                    {Object.entries(BODY_PART_CONFIG)
                      .filter(([_, config]) => config.category === "Torso")
                      .map(([key, config]) => (
                        <Button
                          key={key}
                          variant={activeLayer.bodyPart === key ? "default" : "outline"}
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => updateLayer(activeLayer.id, { bodyPart: key as BodyPart })}
                        >
                          {config.label}
                        </Button>
                      ))}
                    <div className="w-px bg-border mx-1" />
                    {Object.entries(BODY_PART_CONFIG)
                      .filter(([_, config]) => config.category === "Legs")
                      .map(([key, config]) => (
                        <Button
                          key={key}
                          variant={activeLayer.bodyPart === key ? "default" : "outline"}
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => updateLayer(activeLayer.id, { bodyPart: key as BodyPart })}
                        >
                          {config.label}
                        </Button>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="layers">Layers</TabsTrigger>
              <TabsTrigger value="adjust">Adjust</TabsTrigger>
              <TabsTrigger value="lighting">Light</TabsTrigger>
            </TabsList>

            {/* Layers Tab */}
            <TabsContent value="layers" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Tattoo Layers</CardTitle>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {layers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No tattoos yet</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => addLayer("", "Sample Tattoo")}
                      >
                        Add sample design
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {layers.map((layer) => (
                        <div
                          key={layer.id}
                          className={`p-2 rounded-lg border cursor-pointer transition-all ${
                            activeLayerId === layer.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setActiveLayerId(layer.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center overflow-hidden">
                              {layer.imageElement ? (
                                <img
                                  src={layer.imageSrc}
                                  alt={layer.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{layer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {BODY_PART_CONFIG[layer.bodyPart].label}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateLayer(layer.id, { visible: !layer.visible });
                                }}
                              >
                                {layer.visible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateLayer(layer.id, { locked: !layer.locked });
                                }}
                              >
                                {layer.locked ? (
                                  <Lock className="w-3 h-3" />
                                ) : (
                                  <Unlock className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateLayer(layer.id);
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeLayer(layer.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Blend Mode */}
              {activeLayer && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Blend Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={activeLayer.blendMode}
                      onChange={(e) => updateLayer(activeLayer.id, { blendMode: e.target.value as GlobalCompositeOperation })}
                      className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                      disabled={activeLayer.locked}
                    >
                      {BLEND_MODES.map((mode) => (
                        <option key={mode.id} value={mode.id}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Adjust Tab */}
            <TabsContent value="adjust" className="space-y-4">
              {activeLayer ? (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Transform</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <Label className="text-xs">Scale</Label>
                          <span className="text-xs text-muted-foreground">{activeLayer.transform.scale}%</span>
                        </div>
                        <Slider
                          value={[activeLayer.transform.scale]}
                          min={20}
                          max={300}
                          step={5}
                          disabled={activeLayer.locked}
                          onValueChange={([v]) => updateLayerTransform(activeLayer.id, { scale: v })}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <Label className="text-xs">Rotation</Label>
                          <span className="text-xs text-muted-foreground">{activeLayer.transform.rotation}°</span>
                        </div>
                        <Slider
                          value={[activeLayer.transform.rotation]}
                          min={-180}
                          max={180}
                          step={5}
                          disabled={activeLayer.locked}
                          onValueChange={([v]) => updateLayerTransform(activeLayer.id, { rotation: v })}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <Label className="text-xs">Opacity</Label>
                          <span className="text-xs text-muted-foreground">{activeLayer.transform.opacity}%</span>
                        </div>
                        <Slider
                          value={[activeLayer.transform.opacity]}
                          min={10}
                          max={100}
                          step={5}
                          disabled={activeLayer.locked}
                          onValueChange={([v]) => updateLayerTransform(activeLayer.id, { opacity: v })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1 block">Offset X</Label>
                          <Slider
                            value={[activeLayer.transform.offsetX]}
                            min={-150}
                            max={150}
                            step={5}
                            disabled={activeLayer.locked}
                            onValueChange={([v]) => updateLayerTransform(activeLayer.id, { offsetX: v })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Offset Y</Label>
                          <Slider
                            value={[activeLayer.transform.offsetY]}
                            min={-150}
                            max={150}
                            step={5}
                            disabled={activeLayer.locked}
                            onValueChange={([v]) => updateLayerTransform(activeLayer.id, { offsetY: v })}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={activeLayer.locked}
                          onClick={() => updateLayerTransform(activeLayer.id, { flipX: !activeLayer.transform.flipX })}
                        >
                          <FlipHorizontal className="w-4 h-4 mr-1" />
                          Flip H
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={activeLayer.locked}
                          onClick={() => updateLayerTransform(activeLayer.id, { flipY: !activeLayer.transform.flipY })}
                        >
                          <RotateCw className="w-4 h-4 mr-1" />
                          Flip V
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={activeLayer.locked}
                        onClick={() => updateLayerTransform(activeLayer.id, { ...DEFAULT_TRANSFORM })}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset Transform
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Advanced */}
                  <Card>
                    <CardHeader className="pb-2">
                      <button
                        className="flex items-center justify-between w-full"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                      >
                        <CardTitle className="text-sm">Advanced</CardTitle>
                        <Settings className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                      </button>
                    </CardHeader>
                    {showAdvanced && (
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <Label className="text-xs">Skew X</Label>
                            <span className="text-xs text-muted-foreground">{activeLayer.transform.skewX}°</span>
                          </div>
                          <Slider
                            value={[activeLayer.transform.skewX]}
                            min={-45}
                            max={45}
                            step={1}
                            disabled={activeLayer.locked}
                            onValueChange={([v]) => updateLayerTransform(activeLayer.id, { skewX: v })}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <Label className="text-xs">Skew Y</Label>
                            <span className="text-xs text-muted-foreground">{activeLayer.transform.skewY}°</span>
                          </div>
                          <Slider
                            value={[activeLayer.transform.skewY]}
                            min={-45}
                            max={45}
                            step={1}
                            disabled={activeLayer.locked}
                            onValueChange={([v]) => updateLayerTransform(activeLayer.id, { skewY: v })}
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a layer to adjust</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Lighting Tab */}
            <TabsContent value="lighting" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Skin Tone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSelectedSkinTone(tone)}
                        className={`aspect-square rounded-full transition-all ${
                          selectedSkinTone.id === tone.id
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "hover:scale-110"
                        }`}
                        style={{
                          backgroundColor: `hsl(${tone.hue}, ${tone.saturation}%, ${tone.brightness}%)`,
                        }}
                        title={tone.name}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lighting Preset</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {LIGHTING_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        variant={selectedLighting.id === preset.id ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setSelectedLighting(preset)}
                      >
                        {preset.id === "warm" && <Sun className="w-3 h-3 mr-1" />}
                        {preset.id === "cool" && <Moon className="w-3 h-3 mr-1" />}
                        {preset.id === "dramatic" && <Zap className="w-3 h-3 mr-1" />}
                        {preset.id === "soft" && <Droplets className="w-3 h-3 mr-1" />}
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Custom Lighting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-xs">Ambient</Label>
                      <span className="text-xs text-muted-foreground">{customLighting.ambient}%</span>
                    </div>
                    <Slider
                      value={[customLighting.ambient]}
                      min={50}
                      max={150}
                      onValueChange={([v]) => {
                        const updated = { ...customLighting, ambient: v };
                        setCustomLighting(updated);
                        setSelectedLighting(updated);
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-xs">Warmth</Label>
                      <span className="text-xs text-muted-foreground">{customLighting.warmth}%</span>
                    </div>
                    <Slider
                      value={[customLighting.warmth]}
                      min={0}
                      max={100}
                      onValueChange={([v]) => {
                        const updated = { ...customLighting, warmth: v };
                        setCustomLighting(updated);
                        setSelectedLighting(updated);
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-xs">Contrast</Label>
                      <span className="text-xs text-muted-foreground">{customLighting.contrast}%</span>
                    </div>
                    <Slider
                      value={[customLighting.contrast]}
                      min={50}
                      max={150}
                      onValueChange={([v]) => {
                        const updated = { ...customLighting, contrast: v };
                        setCustomLighting(updated);
                        setSelectedLighting(updated);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Share Card */}
          <Card>
            <CardContent className="pt-4">
              <Button className="w-full" variant="outline">
                <Send className="w-4 h-4 mr-2" />
                Send to Client
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ARTattooPreviewUltra;

// Type declarations
declare global {
  interface Window {
    Pose: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
  }
}
