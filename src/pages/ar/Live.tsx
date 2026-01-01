import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Loader2, ArrowLeft, Camera, Video, Square, 
  RotateCcw, ZoomIn, ZoomOut, Sun, Droplets, Lock,
  Share2, Download, Maximize2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ARAssets {
  overlay_url: string;
  anchors: { x: number; y: number }[];
  shader_params?: Record<string, number>;
}

export default function ARLive() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");

  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [assets, setAssets] = useState<ARAssets | null>(null);
  
  // Controls
  const [opacity, setOpacity] = useState(85);
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [relightIntensity, setRelightIntensity] = useState(50);
  const [inkDiffusion, setInkDiffusion] = useState(30);
  const [anchorLocked, setAnchorLocked] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (sessionId) {
      initAR();
    }
  }, [sessionId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording) {
      interval = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 10) {
            stopRecording();
            return 10;
          }
          return t + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const initAR = async () => {
    setLoading(true);
    try {
      // Fetch AR pack for this session
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-compiler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "ar_live_init",
            session_id: sessionId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.assets) {
          setAssets(data.assets);
        }
      }
    } catch (err) {
      console.error("Failed to init AR:", err);
      toast({ title: "Failed to load AR assets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        renderLoop();
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      toast({ title: "Camera access required", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current || !assets) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Draw overlay (simplified - real version would use WebGPU + landmarks)
    if (assets.overlay_url) {
      const overlayImg = new Image();
      overlayImg.crossOrigin = "anonymous";
      overlayImg.src = assets.overlay_url;

      if (overlayImg.complete) {
        ctx.save();

        // Apply transforms
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale / 100, scale / 100);

        // Apply opacity and effects
        ctx.globalAlpha = opacity / 100;

        // Cinematic mode - add subtle color grading
        if (cinematicMode) {
          ctx.filter = `contrast(1.1) saturate(1.15)`;
        }

        // Draw overlay
        const imgWidth = overlayImg.width * 0.5;
        const imgHeight = overlayImg.height * 0.5;
        ctx.drawImage(
          overlayImg,
          -imgWidth / 2,
          -imgHeight / 2,
          imgWidth,
          imgHeight
        );

        ctx.restore();
      }
    }

    // Continue render loop
    if (cameraActive) {
      requestAnimationFrame(renderLoop);
    }
  };

  const startRecording = () => {
    if (!canvasRef.current) return;

    const stream = canvasRef.current.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recordingChunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordingChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: "video/webm" });
      saveRecording(blob);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);
    setRecordingTime(0);
    toast({ title: "Recording started (max 10s)" });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const saveRecording = async (blob: Blob) => {
    try {
      const fileName = `ar-live/${sessionId}/${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from("ar-recordings")
        .upload(fileName, blob);

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("ar-recordings").getPublicUrl(data.path);

      // Log recording
      await supabase.from("ar_live_records").insert({
        ar_live_session_id: sessionId,
        video_url: urlData.publicUrl,
        duration_seconds: recordingTime,
      });

      toast({ title: "Recording saved!" });
    } catch (err) {
      console.error("Failed to save recording:", err);
      toast({ title: "Failed to save recording", variant: "destructive" });
    }
  };

  const downloadFrame = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `ar-preview-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const sharePreview = async () => {
    if (!canvasRef.current) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((b) => resolve(b!), "image/png");
      });

      if (navigator.share) {
        await navigator.share({
          files: [new File([blob], "ar-preview.png", { type: "image/png" })],
          title: "AR Tattoo Preview",
        });
      } else {
        downloadFrame();
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No session specified</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading AR assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-lg text-white">AR Try-On</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={sharePreview} className="text-white">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={downloadFrame} className="text-white">
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main View */}
      <div className="flex-1 relative">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">AR Tattoo Preview</h2>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Point your camera at the area where you want to see the tattoo
              </p>
              <Button onClick={startCamera} size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Start Camera
              </Button>
            </motion.div>
          </div>
        )}

        {/* Recording Indicator */}
        {recording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
            <Badge variant="destructive" className="animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block" />
              REC {recordingTime}s / 10s
            </Badge>
          </div>
        )}
      </div>

      {/* Controls Panel */}
      {cameraActive && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-6 px-4"
        >
          <div className="max-w-lg mx-auto space-y-4">
            {/* Quick Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={recording ? "destructive" : "secondary"}
                size="icon"
                onClick={recording ? stopRecording : startRecording}
                className="w-14 h-14 rounded-full"
              >
                {recording ? <Square className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-2 gap-4 text-white">
              <div className="space-y-2">
                <Label className="text-xs text-white/70 flex items-center gap-2">
                  <ZoomIn className="w-3 h-3" /> Scale
                </Label>
                <Slider
                  value={[scale]}
                  onValueChange={([v]) => setScale(v)}
                  min={50}
                  max={200}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white/70 flex items-center gap-2">
                  <RotateCcw className="w-3 h-3" /> Rotation
                </Label>
                <Slider
                  value={[rotation]}
                  onValueChange={([v]) => setRotation(v)}
                  min={-180}
                  max={180}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white/70 flex items-center gap-2">
                  <Sun className="w-3 h-3" /> Opacity
                </Label>
                <Slider
                  value={[opacity]}
                  onValueChange={([v]) => setOpacity(v)}
                  min={20}
                  max={100}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white/70 flex items-center gap-2">
                  <Droplets className="w-3 h-3" /> Ink Diffusion
                </Label>
                <Slider
                  value={[inkDiffusion]}
                  onValueChange={([v]) => setInkDiffusion(v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="anchor"
                  checked={anchorLocked}
                  onCheckedChange={setAnchorLocked}
                />
                <Label htmlFor="anchor" className="text-white/70 text-sm flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Lock
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="cinematic"
                  checked={cinematicMode}
                  onCheckedChange={setCinematicMode}
                />
                <Label htmlFor="cinematic" className="text-white/70 text-sm flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" /> Cinematic
                </Label>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
