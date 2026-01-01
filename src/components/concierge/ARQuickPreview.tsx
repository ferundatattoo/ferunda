import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, X, Loader2, ZoomIn, ZoomOut,
  RotateCw, Download, Sparkles,
  Move, RefreshCw, Image, Upload, Check, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

interface TattooTransform {
  scale: number;
  rotation: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
}

const DEFAULT_TRANSFORM: TattooTransform = {
  scale: 1,
  rotation: 0,
  opacity: 0.85,
  offsetX: 0,
  offsetY: 0,
};

interface ARQuickPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  referenceImageUrl: string;
  onBookingClick?: () => void;
  onFeedback?: (feedback: 'love' | 'refine', screenshotUrl?: string) => void;
}

/**
 * ARQuickPreview - Simple overlay component without pose tracking
 * This is a fallback for when full AR doesn't work or when user just wants
 * to position the design manually on a body photo
 */
export function ARQuickPreview({
  isOpen,
  onClose,
  referenceImageUrl,
  onBookingClick,
  onFeedback
}: ARQuickPreviewProps) {
  const { toast } = useToast();

  // State
  const [designImage, setDesignImage] = useState<HTMLImageElement | null>(null);
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [transform, setTransform] = useState<TattooTransform>(DEFAULT_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load reference/design image
  useEffect(() => {
    if (!referenceImageUrl) return;

    const img = document.createElement("img");
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

  // Draw canvas whenever state changes
  useEffect(() => {
    if (!canvasRef.current || !designImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const containerWidth = containerRef.current?.clientWidth || 400;
    const containerHeight = containerRef.current?.clientHeight || 500;
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw body image if uploaded
    if (bodyImage) {
      const bgImg = document.createElement("img");
      bgImg.onload = () => {
        // Fit body image to canvas
        const scale = Math.min(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const x = (canvas.width - bgImg.width * scale) / 2;
        const y = (canvas.height - bgImg.height * scale) / 2;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
        
        // Draw design overlay
        drawDesign(ctx, canvas);
      };
      bgImg.src = bodyImage;
    } else {
      // Draw placeholder pattern
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Draw design overlay
      drawDesign(ctx, canvas);
    }
  }, [designImage, bodyImage, transform]);

  const drawDesign = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!designImage) return;

    const centerX = canvas.width / 2 + transform.offsetX;
    const centerY = canvas.height / 2 + transform.offsetY;
    
    const baseSize = Math.min(canvas.width, canvas.height) * 0.4;
    const designWidth = baseSize * transform.scale;
    const aspectRatio = designImage.height / designImage.width;
    const designHeight = designWidth * aspectRatio;

    ctx.save();
    ctx.globalAlpha = transform.opacity;
    ctx.translate(centerX, centerY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    
    ctx.drawImage(
      designImage,
      -designWidth / 2,
      -designHeight / 2,
      designWidth,
      designHeight
    );
    ctx.restore();
  };

  // Handle body image upload
  const handleBodyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setBodyImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle mouse/touch drag
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - transform.offsetX, y: clientY - transform.offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setTransform(t => ({
      ...t,
      offsetX: clientX - dragStart.x,
      offsetY: clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Capture screenshot
  const captureScreenshot = useCallback(() => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");
    
    // Create download
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `ar-preview-${Date.now()}.png`;
    link.click();

    toast({ title: "¡Captura guardada!", description: "La imagen se ha descargado" });
    return dataUrl;
  }, [toast]);

  if (!isOpen) return null;

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
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg text-foreground">Vista Previa</h3>
              <p className="text-xs text-muted-foreground">Posiciona el diseño manualmente</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Canvas area */}
          <div 
            ref={containerRef}
            className="flex-1 relative bg-ink-black flex items-center justify-center p-4"
          >
            {isLoading ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando diseño...</p>
              </div>
            ) : (
              <div className="relative w-full h-full max-w-lg max-h-[70vh]">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full border border-border/30 rounded-lg cursor-move touch-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                />
                
                {/* Upload body photo prompt */}
                {!bodyImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 text-center pointer-events-auto">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-foreground mb-2">Sube una foto de tu cuerpo</p>
                      <p className="text-xs text-muted-foreground mb-4">Para ver cómo lucirá el diseño</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Subir Foto
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBodyImageUpload}
                />

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
                    onClick={() => fileInputRef.current?.click()}
                    title="Cambiar foto"
                  >
                    <Camera className="w-4 h-4" />
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
              </div>
            )}
          </div>

          {/* Controls panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/30 bg-background/95 p-4 space-y-6 overflow-y-auto">
            {/* Info alert */}
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Vista simplificada</p>
                <p className="text-muted-foreground mt-1">
                  Arrastra el diseño para posicionarlo. Para AR con tracking de cuerpo, usa la vista completa.
                </p>
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
                  min={0.2}
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
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border/30 space-y-3">
              {/* Feedback buttons */}
              {onFeedback && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      const screenshot = captureScreenshot();
                      onFeedback('love', screenshot);
                    }}
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                  >
                    ❤️ ¡Me encanta!
                  </Button>
                  <Button
                    onClick={() => {
                      const screenshot = captureScreenshot();
                      onFeedback('refine', screenshot);
                      onClose();
                    }}
                    variant="outline"
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                  >
                    🔄 Refinar
                  </Button>
                </div>
              )}

              {onBookingClick && (
                <Button
                  onClick={() => {
                    onBookingClick();
                    onClose();
                  }}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  ¡Reservar ahora!
                </Button>
              )}
              
              <Button
                onClick={onClose}
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

export default ARQuickPreview;
