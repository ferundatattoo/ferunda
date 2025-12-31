import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Sparkles, Play, Pause, RotateCcw, Check,
  ChevronRight, ChevronLeft, Camera, Mic, Sun,
  Volume2, Upload, Download, Share2, Instagram,
  Clock, Zap, Eye, Settings, Wand2, Film,
  Loader2, CheckCircle, Circle, AlertCircle,
  Smartphone, Monitor, Music, Type, Palette,
  Scissors, Send, Calendar, Hash, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TrendData {
  id: string;
  title: string;
  platform: "tiktok" | "instagram" | "both";
  viral_score: number;
  audio_name: string | null;
  suggested_script: {
    scenes: Array<{
      order: number;
      duration: string;
      visual: string;
      action: string;
      text_overlay?: string;
    }>;
  };
  hashtags: string[];
  best_posting_times: string[];
}

interface RecordedClip {
  sceneIndex: number;
  blob: Blob | null;
  url: string | null;
  duration: number;
  recorded: boolean;
}

interface EditSettings {
  audioEnabled: boolean;
  autoTransitions: boolean;
  textOverlays: boolean;
  colorGrading: "none" | "warm" | "cool" | "dramatic" | "vintage";
  aspectRatio: "9:16" | "1:1" | "4:5";
  exportQuality: "720p" | "1080p" | "4k";
}

type WizardStep = "select" | "prepare" | "record" | "edit" | "publish";

const CHECKLIST_ITEMS = [
  { id: "lighting", icon: Sun, label: "Iluminación", description: "Luz natural o ring light posicionada" },
  { id: "space", icon: Camera, label: "Espacio", description: "Área limpia y estética visible" },
  { id: "camera", icon: Smartphone, label: "Cámara", description: "Teléfono cargado y estable" },
  { id: "audio", icon: Volume2, label: "Audio", description: "Ambiente silencioso o música lista" }
];

const COLOR_PRESETS = [
  { id: "none", label: "Original", preview: "bg-gray-500" },
  { id: "warm", label: "Warm", preview: "bg-gradient-to-br from-orange-400 to-yellow-300" },
  { id: "cool", label: "Cool", preview: "bg-gradient-to-br from-blue-400 to-cyan-300" },
  { id: "dramatic", label: "Dramatic", preview: "bg-gradient-to-br from-gray-900 to-gray-600" },
  { id: "vintage", label: "Vintage", preview: "bg-gradient-to-br from-amber-600 to-orange-300" }
];

export function ContentWizardAI() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [currentStep, setCurrentStep] = useState<WizardStep>("select");
  const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [editSettings, setEditSettings] = useState<EditSettings>({
    audioEnabled: true,
    autoTransitions: true,
    textOverlays: true,
    colorGrading: "warm",
    aspectRatio: "9:16",
    exportQuality: "1080p"
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");
  const [caption, setCaption] = useState("");
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);
  const [availableTrends, setAvailableTrends] = useState<TrendData[]>([]);

  // Mock trends data
  useEffect(() => {
    const mockTrends: TrendData[] = [
      {
        id: "1",
        title: "POV: Cliente dice 'algo pequeño'",
        platform: "tiktok",
        viral_score: 94,
        audio_name: "Dramatic Sound Effect",
        suggested_script: {
          scenes: [
            { order: 1, duration: "2s", visual: "😮", action: "Tu cara cuando el cliente dice 'quiero algo pequeño'", text_overlay: "POV: Cliente dice 'algo pequeño'" },
            { order: 2, duration: "3s", visual: "📱", action: "Cliente mostrando referencia de manga completa", text_overlay: "La referencia:" },
            { order: 3, duration: "4s", visual: "✨", action: "Montaje rápido del proceso de tatuar", text_overlay: "8 horas después..." },
            { order: 4, duration: "2s", visual: "🎨", action: "Reveal del resultado final", text_overlay: "El resultado" }
          ]
        },
        hashtags: ["#tattoo", "#tattooartist", "#microrealism", "#fyp", "#viral"],
        best_posting_times: ["12:00 PM", "6:00 PM", "9:00 PM"]
      },
      {
        id: "2",
        title: "Microrealism Process Reveal",
        platform: "instagram",
        viral_score: 91,
        audio_name: "Aesthetic Piano",
        suggested_script: {
          scenes: [
            { order: 1, duration: "3s", visual: "🎬", action: "Close-up de tu mano preparando equipo", text_overlay: null },
            { order: 2, duration: "5s", visual: "✍️", action: "Tomas del proceso de tatuar en diferentes ángulos", text_overlay: "Creating..." },
            { order: 3, duration: "2s", visual: "💫", action: "Transición con wipe hacia resultado", text_overlay: null },
            { order: 4, duration: "3s", visual: "🖼️", action: "Resultado final con zoom out lento", text_overlay: "@ferunda" }
          ]
        },
        hashtags: ["#microrealism", "#tattooprocess", "#reels", "#tattoo", "#fineline"],
        best_posting_times: ["10:00 AM", "2:00 PM", "7:00 PM"]
      },
      {
        id: "3",
        title: "La historia detrás del tattoo",
        platform: "both",
        viral_score: 88,
        audio_name: "Emotional Storytelling",
        suggested_script: {
          scenes: [
            { order: 1, duration: "3s", visual: "🎤", action: "Cliente hablando a cámara sobre el significado", text_overlay: "Su historia:" },
            { order: 2, duration: "4s", visual: "📸", action: "Fotos/videos del contexto de la historia", text_overlay: null },
            { order: 3, duration: "5s", visual: "✨", action: "Proceso de creación del tatuaje", text_overlay: "El proceso" },
            { order: 4, duration: "3s", visual: "😢", action: "Reacción emocional del cliente al ver resultado", text_overlay: "Su reacción" }
          ]
        },
        hashtags: ["#tattoostory", "#meaningfultattoo", "#tattooartist", "#emotional", "#storytime"],
        best_posting_times: ["8:00 PM", "9:00 PM", "10:00 PM"]
      }
    ];
    setAvailableTrends(mockTrends);
  }, []);

  // Initialize clips when trend is selected
  useEffect(() => {
    if (selectedTrend) {
      setClips(selectedTrend.suggested_script.scenes.map((scene, i) => ({
        sceneIndex: i,
        blob: null,
        url: null,
        duration: parseInt(scene.duration),
        recorded: false
      })));
      setCaption(`${selectedTrend.hashtags.slice(0, 5).join(" ")}`);
    }
  }, [selectedTrend]);

  // Camera setup
  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1080, height: 1920 },
        audio: true
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Recording functions
  const startRecording = () => {
    if (!cameraStream) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(cameraStream, { mimeType: "video/webm" });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      
      setClips(prev => prev.map((clip, i) => 
        i === currentSceneIndex 
          ? { ...clip, blob, url, recorded: true }
          : clip
      ));
      
      setRecordingTime(0);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);

    // Auto-stop after scene duration
    const sceneDuration = parseInt(selectedTrend?.suggested_script.scenes[currentSceneIndex].duration || "5") * 1000;
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 100);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }, sceneDuration);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retakeClip = () => {
    setClips(prev => prev.map((clip, i) => 
      i === currentSceneIndex 
        ? { ...clip, blob: null, url: null, recorded: false }
        : clip
    ));
  };

  // Processing simulation
  const processVideo = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);

    const steps = [
      { label: "Sincronizando con audio trending", duration: 1500 },
      { label: "Aplicando transiciones", duration: 1200 },
      { label: "Ajustando colores", duration: 1000 },
      { label: "Agregando textos y efectos", duration: 1500 },
      { label: "Renderizando video final", duration: 2000 }
    ];

    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(steps[i].label);
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
      setProcessingProgress(((i + 1) / steps.length) * 100);
    }

    setIsProcessing(false);
    setCurrentStep("publish");
    toast({ title: "Video Ready!", description: "Your content is ready to publish" });
  };

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case "select": return selectedTrend !== null;
      case "prepare": return Object.values(checklist).filter(Boolean).length >= 3;
      case "record": return clips.every(c => c.recorded);
      case "edit": return true;
      case "publish": return caption.length > 0 && selectedPlatforms.length > 0;
      default: return false;
    }
  };

  const nextStep = () => {
    const steps: WizardStep[] = ["select", "prepare", "record", "edit", "publish"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const next = steps[currentIndex + 1];
      setCurrentStep(next);
      
      if (next === "record") {
        setupCamera();
      }
      if (currentStep === "record") {
        stopCamera();
      }
    }
  };

  const prevStep = () => {
    const steps: WizardStep[] = ["select", "prepare", "record", "edit", "publish"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      if (currentStep === "record") {
        stopCamera();
      }
    }
  };

  const allClipsRecorded = clips.every(c => c.recorded);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "select":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-2">Selecciona un Trend</h3>
              <p className="text-muted-foreground">
                Elige el formato viral que quieres recrear
              </p>
            </div>

            <div className="grid gap-4">
              {availableTrends.map((trend) => (
                <Card
                  key={trend.id}
                  className={`cursor-pointer transition-all ${
                    selectedTrend?.id === trend.id 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTrend(trend)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {selectedTrend?.id === trend.id && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                          <h4 className="font-semibold text-foreground">{trend.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {trend.platform}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            {trend.viral_score} viral score
                          </span>
                          <span>{trend.suggested_script.scenes.length} scenes</span>
                        </div>
                      </div>
                      {trend.audio_name && (
                        <Badge className="bg-pink-500/20 text-pink-400 border-0">
                          <Music className="w-3 h-3 mr-1" />
                          {trend.audio_name}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "prepare":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-foreground mb-2">Prepara tu Setup</h3>
              <p className="text-muted-foreground">
                Verifica estos elementos antes de grabar
              </p>
            </div>

            <div className="grid gap-4">
              {CHECKLIST_ITEMS.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all ${
                    checklist[item.id] ? "border-green-500/50 bg-green-500/5" : ""
                  }`}
                  onClick={() => setChecklist(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        checklist[item.id] 
                          ? "bg-green-500/20" 
                          : "bg-secondary"
                      }`}>
                        {checklist[item.id] ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <item.icon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{item.label}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        checklist[item.id] 
                          ? "border-green-500 bg-green-500" 
                          : "border-muted-foreground"
                      }`}>
                        {checklist[item.id] && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Pro Tip</h4>
                  <p className="text-sm text-muted-foreground">
                    La iluminación natural de una ventana funciona mejor que luz artificial para mostrar detalles del tattoo
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "record":
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-foreground mb-2">Graba tus Clips</h3>
              <p className="text-muted-foreground">
                Escena {currentSceneIndex + 1} de {clips.length}
              </p>
            </div>

            {/* Progress */}
            <div className="flex gap-2 mb-4">
              {clips.map((clip, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSceneIndex(i)}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    clip.recorded 
                      ? "bg-green-500" 
                      : i === currentSceneIndex 
                        ? "bg-primary" 
                        : "bg-secondary"
                  }`}
                />
              ))}
            </div>

            {/* Camera Preview */}
            <div className="relative aspect-[9/16] max-h-[500px] bg-black rounded-2xl overflow-hidden mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">
                    {(recordingTime / 1000).toFixed(1)}s
                  </span>
                </div>
              )}

              {/* Scene info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                    {selectedTrend?.suggested_script.scenes[currentSceneIndex].visual}
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-1">
                      {selectedTrend?.suggested_script.scenes[currentSceneIndex].duration}
                    </Badge>
                    {selectedTrend?.suggested_script.scenes[currentSceneIndex].text_overlay && (
                      <p className="text-xs text-white/70">
                        Text: "{selectedTrend?.suggested_script.scenes[currentSceneIndex].text_overlay}"
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-white text-sm">
                  {selectedTrend?.suggested_script.scenes[currentSceneIndex].action}
                </p>
              </div>

              {/* Recorded overlay */}
              {clips[currentSceneIndex]?.recorded && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                    <p className="text-white font-medium">Clip Recorded</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retakeClip}
                      className="mt-3"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                disabled={currentSceneIndex === 0}
                onClick={() => setCurrentSceneIndex(prev => prev - 1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              {!clips[currentSceneIndex]?.recorded && (
                <Button
                  size="lg"
                  className={`w-20 h-20 rounded-full ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600" 
                      : "bg-primary hover:bg-primary/90"
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <div className="w-6 h-6 bg-white rounded" />
                  ) : (
                    <Camera className="w-8 h-8" />
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                disabled={currentSceneIndex === clips.length - 1}
                onClick={() => setCurrentSceneIndex(prev => prev + 1)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* All recorded indicator */}
            {allClipsRecorded && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-400 font-medium">All clips recorded!</p>
                <p className="text-sm text-muted-foreground">Ready to process with AI</p>
              </div>
            )}
          </div>
        );

      case "edit":
        return (
          <div className="space-y-6">
            {isProcessing ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                  <div 
                    className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" 
                  />
                  <Wand2 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Processing with AI</h3>
                <p className="text-muted-foreground mb-6">{processingStep}</p>
                <Progress value={processingProgress} className="max-w-md mx-auto" />
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Personaliza tu Video</h3>
                  <p className="text-muted-foreground">
                    Ajusta los settings antes de procesar
                  </p>
                </div>

                <div className="grid gap-6">
                  {/* Audio */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Music className="w-5 h-5 text-primary" />
                          <div>
                            <h4 className="font-medium text-foreground">Audio Trending</h4>
                            <p className="text-sm text-muted-foreground">{selectedTrend?.audio_name}</p>
                          </div>
                        </div>
                        <Switch
                          checked={editSettings.audioEnabled}
                          onCheckedChange={(v) => setEditSettings(prev => ({ ...prev, audioEnabled: v }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transitions */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Scissors className="w-5 h-5 text-primary" />
                          <div>
                            <h4 className="font-medium text-foreground">Auto Transitions</h4>
                            <p className="text-sm text-muted-foreground">Smooth cuts between clips</p>
                          </div>
                        </div>
                        <Switch
                          checked={editSettings.autoTransitions}
                          onCheckedChange={(v) => setEditSettings(prev => ({ ...prev, autoTransitions: v }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Text Overlays */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Type className="w-5 h-5 text-primary" />
                          <div>
                            <h4 className="font-medium text-foreground">Text Overlays</h4>
                            <p className="text-sm text-muted-foreground">Add suggested captions</p>
                          </div>
                        </div>
                        <Switch
                          checked={editSettings.textOverlays}
                          onCheckedChange={(v) => setEditSettings(prev => ({ ...prev, textOverlays: v }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Color Grading */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        Color Grading
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        {COLOR_PRESETS.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => setEditSettings(prev => ({ ...prev, colorGrading: preset.id as any }))}
                            className={`flex-1 p-3 rounded-lg border transition-all ${
                              editSettings.colorGrading === preset.id
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className={`w-full h-8 rounded ${preset.preview} mb-2`} />
                            <span className="text-xs text-muted-foreground">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quality */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Monitor className="w-5 h-5 text-primary" />
                          <div>
                            <h4 className="font-medium text-foreground">Export Quality</h4>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {["720p", "1080p", "4k"].map(q => (
                            <Button
                              key={q}
                              size="sm"
                              variant={editSettings.exportQuality === q ? "default" : "outline"}
                              onClick={() => setEditSettings(prev => ({ ...prev, exportQuality: q as any }))}
                            >
                              {q}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700"
                  size="lg"
                  onClick={processVideo}
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  Process with AI Magic
                </Button>
              </>
            )}
          </div>
        );

      case "publish":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Video Ready!</h3>
              <p className="text-muted-foreground">
                Preview and publish your content
              </p>
            </div>

            {/* Video Preview */}
            <div className="aspect-[9/16] max-h-[400px] bg-gradient-to-br from-pink-500/20 to-violet-500/20 rounded-2xl mx-auto flex items-center justify-center border border-border">
              <div className="text-center">
                <Play className="w-16 h-16 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Video Preview</p>
              </div>
            </div>

            {/* Caption */}
            <div>
              <Label className="text-foreground mb-2 block">Caption</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your caption..."
                rows={3}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTrend?.hashtags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs cursor-pointer"
                    onClick={() => setCaption(prev => prev.includes(tag) ? prev : `${prev} ${tag}`)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div>
              <Label className="text-foreground mb-3 block">Platforms</Label>
              <div className="flex gap-3">
                {[
                  { id: "instagram", label: "Instagram Reels", icon: Instagram, gradient: "from-pink-500 to-purple-500" },
                  { id: "tiktok", label: "TikTok", icon: Video, gradient: "from-cyan-400 to-pink-500" }
                ].map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => {
                      setSelectedPlatforms(prev => 
                        prev.includes(platform.id) 
                          ? prev.filter(p => p !== platform.id)
                          : [...prev, platform.id]
                      );
                    }}
                    className={`flex-1 p-4 rounded-xl border transition-all ${
                      selectedPlatforms.includes(platform.id)
                        ? `border-transparent bg-gradient-to-r ${platform.gradient} text-white`
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <platform.icon className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">{platform.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule or Publish */}
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" size="lg" className="w-full">
                <Calendar className="w-5 h-5 mr-2" />
                Schedule
              </Button>
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700"
              >
                <Send className="w-5 h-5 mr-2" />
                Publish Now
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
          <Video className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Content Wizard AI</h2>
        <p className="text-muted-foreground">
          Create viral content with AI-guided recording and editing
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { key: "select", label: "Select", icon: Sparkles },
          { key: "prepare", label: "Prepare", icon: Settings },
          { key: "record", label: "Record", icon: Camera },
          { key: "edit", label: "Edit", icon: Wand2 },
          { key: "publish", label: "Publish", icon: Send }
        ].map((step, i, arr) => {
          const isActive = step.key === currentStep;
          const isPast = arr.findIndex(s => s.key === currentStep) > i;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex flex-col items-center ${
                isActive ? "text-primary" : isPast ? "text-green-500" : "text-muted-foreground"
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : isPast 
                      ? "bg-green-500/20 text-green-500"
                      : "bg-secondary"
                }`}>
                  {isPast ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className="text-xs">{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  isPast ? "bg-green-500" : "bg-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep !== "publish" && !isProcessing && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === "select"}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700"
          >
            {currentStep === "record" ? "Process Video" : "Continue"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default ContentWizardAI;
