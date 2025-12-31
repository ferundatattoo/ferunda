import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, RotateCcw, ZoomIn, ZoomOut, 
  Move, Share2, Download, Sparkles, Layers,
  Palette, Sun, Contrast, Image, X, Check,
  ChevronLeft, ChevronRight, Smartphone, Maximize2,
  FlipHorizontal, FlipVertical, Eye, EyeOff,
  Loader2, RefreshCw, Send, MessageSquare,
  Grid3X3, Sliders, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DesignItem {
  id: string;
  name: string;
  thumbnail: string;
  fullImage: string;
  category: string;
  style: string;
}

interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
}

interface AdjustmentState {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

const SAMPLE_DESIGNS: DesignItem[] = [
  { id: "1", name: "Micro Rose", thumbnail: "🌹", fullImage: "/placeholder.svg", category: "floral", style: "micro-realism" },
  { id: "2", name: "Geometric Lion", thumbnail: "🦁", fullImage: "/placeholder.svg", category: "animals", style: "geometric" },
  { id: "3", name: "Fine Line Butterfly", thumbnail: "🦋", fullImage: "/placeholder.svg", category: "nature", style: "fine-line" },
  { id: "4", name: "Portrait Study", thumbnail: "👤", fullImage: "/placeholder.svg", category: "portraits", style: "realism" },
  { id: "5", name: "Botanical Sleeve", thumbnail: "🌿", fullImage: "/placeholder.svg", category: "floral", style: "botanical" },
  { id: "6", name: "Abstract Waves", thumbnail: "🌊", fullImage: "/placeholder.svg", category: "abstract", style: "abstract" },
];

export function ARTattooPreview() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<DesignItem | null>(null);
  const [uploadedDesign, setUploadedDesign] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showDesignOverlay, setShowDesignOverlay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("designs");
  
  const [transform, setTransform] = useState<TransformState>({
    x: 50,
    y: 50,
    scale: 30,
    rotation: 0,
    opacity: 85,
    flipX: false,
    flipY: false
  });

  const [adjustments, setAdjustments] = useState<AdjustmentState>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedDesign(event.target?.result as string);
      setSelectedDesign(null);
    };
    reader.readAsDataURL(file);
  };

  const savePreview = () => toast({ title: "Saved!", description: "Preview saved to your gallery" });
  const shareWithClient = () => toast({ title: "Share Link Created", description: "Link copied! Send to client." });

  const resetTransform = () => {
    setTransform({ x: 50, y: 50, scale: 30, rotation: 0, opacity: 85, flipX: false, flipY: false });
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });
  };

  const currentDesignSrc = uploadedDesign || (selectedDesign ? selectedDesign.fullImage : null);

  const designStyle: React.CSSProperties = {
    position: "absolute",
    left: `${transform.x}%`,
    top: `${transform.y}%`,
    transform: `translate(-50%, -50%) scale(${transform.scale / 100}) rotate(${transform.rotation}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
    opacity: transform.opacity / 100,
    filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px)`,
    mixBlendMode: "multiply",
    pointerEvents: "none",
    maxWidth: "80%",
    maxHeight: "80%"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            AR Tattoo Preview
          </h2>
          <p className="text-muted-foreground mt-1">Preview tattoo designs in real-time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetTransform}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
          <Button onClick={shareWithClient}><Share2 className="w-4 h-4 mr-2" />Share</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div ref={containerRef} className="relative aspect-[4/3] bg-black">
                <canvas ref={canvasRef} className="hidden" />
                
                {cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : capturedImage ? (
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                    <Camera className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-4">Start camera to preview</p>
                    <Button onClick={startCamera}><Camera className="w-4 h-4 mr-2" />Start Camera</Button>
                  </div>
                )}

                {currentDesignSrc && showDesignOverlay && (cameraActive || capturedImage) && (
                  <div 
                    className="absolute inset-0 overflow-hidden cursor-move"
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onMouseMove={(e) => {
                      if (!isDragging) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTransform(prev => ({
                        ...prev,
                        x: ((e.clientX - rect.left) / rect.width) * 100,
                        y: ((e.clientY - rect.top) / rect.height) * 100
                      }));
                    }}
                  >
                    <div 
                      style={designStyle}
                      className="w-48 h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-6xl">{selectedDesign?.thumbnail || "🎨"}</span>
                    </div>
                  </div>
                )}

                {(cameraActive || capturedImage) && currentDesignSrc && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm">AR Active</span>
                  </div>
                )}

                {(cameraActive || capturedImage) && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    {cameraActive ? (
                      <>
                        <Button variant="outline" size="icon" className="rounded-full bg-black/50 border-white/20 text-white" onClick={stopCamera}>
                          <X className="w-5 h-5" />
                        </Button>
                        <Button size="lg" className="rounded-full w-16 h-16 bg-white hover:bg-gray-100" onClick={captureImage}>
                          <Camera className="w-6 h-6 text-black" />
                        </Button>
                        <Button variant="outline" size="icon" className="rounded-full bg-black/50 border-white/20 text-white" onClick={() => setShowDesignOverlay(!showDesignOverlay)}>
                          {showDesignOverlay ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" className="bg-black/50 border-white/20 text-white" onClick={() => { setCapturedImage(null); startCamera(); }}>
                          <RefreshCw className="w-4 h-4 mr-2" />Retake
                        </Button>
                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" onClick={savePreview}>
                          <Save className="w-4 h-4 mr-2" />Save
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="designs" className="flex-1"><Grid3X3 className="w-4 h-4 mr-1" />Designs</TabsTrigger>
              <TabsTrigger value="adjust" className="flex-1"><Sliders className="w-4 h-4 mr-1" />Adjust</TabsTrigger>
            </TabsList>

            <TabsContent value="designs" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Select Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {SAMPLE_DESIGNS.map(design => (
                      <button
                        key={design.id}
                        onClick={() => { setSelectedDesign(design); setUploadedDesign(null); }}
                        className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center text-2xl ${
                          selectedDesign?.id === design.id ? "border-primary ring-2 ring-primary/20 bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {design.thumbnail}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Upload Custom Design
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjust" className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Transform</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Size</Label>
                      <span className="text-xs text-muted-foreground">{transform.scale}%</span>
                    </div>
                    <Slider value={[transform.scale]} min={10} max={100} step={1} onValueChange={([v]) => setTransform(prev => ({ ...prev, scale: v }))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Rotation</Label>
                      <span className="text-xs text-muted-foreground">{transform.rotation}°</span>
                    </div>
                    <Slider value={[transform.rotation]} min={-180} max={180} step={1} onValueChange={([v]) => setTransform(prev => ({ ...prev, rotation: v }))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Opacity</Label>
                      <span className="text-xs text-muted-foreground">{transform.opacity}%</span>
                    </div>
                    <Slider value={[transform.opacity]} min={20} max={100} step={1} onValueChange={([v]) => setTransform(prev => ({ ...prev, opacity: v }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setTransform(prev => ({ ...prev, flipX: !prev.flipX }))}>
                      <FlipHorizontal className="w-4 h-4 mr-1" />Flip H
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setTransform(prev => ({ ...prev, flipY: !prev.flipY }))}>
                      <FlipVertical className="w-4 h-4 mr-1" />Flip V
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Color Adjustments</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs flex items-center gap-1"><Sun className="w-3 h-3" />Brightness</Label>
                      <span className="text-xs text-muted-foreground">{adjustments.brightness}%</span>
                    </div>
                    <Slider value={[adjustments.brightness]} min={50} max={150} step={1} onValueChange={([v]) => setAdjustments(prev => ({ ...prev, brightness: v }))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs flex items-center gap-1"><Contrast className="w-3 h-3" />Contrast</Label>
                      <span className="text-xs text-muted-foreground">{adjustments.contrast}%</span>
                    </div>
                    <Slider value={[adjustments.contrast]} min={50} max={150} step={1} onValueChange={([v]) => setAdjustments(prev => ({ ...prev, contrast: v }))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs flex items-center gap-1"><Palette className="w-3 h-3" />Saturation</Label>
                      <span className="text-xs text-muted-foreground">{adjustments.saturation}%</span>
                    </div>
                    <Slider value={[adjustments.saturation]} min={0} max={200} step={1} onValueChange={([v]) => setAdjustments(prev => ({ ...prev, saturation: v }))} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default ARTattooPreview;
