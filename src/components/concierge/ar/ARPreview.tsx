// =============================================================================
// AR PREVIEW - Unified AR preview component with quick and tracking modes
// Now powered by Ethereal AI for enhanced analysis
// =============================================================================

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  Loader2,
  Download,
  Sparkles,
  RefreshCw,
  Target,
  Image,
  Upload,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGrokAR } from '@/hooks/useGrokAR';

import type { ARPreviewProps, BodyPart, TattooTransform } from '@/types/concierge';
import { BODY_PART_OPTIONS, ANIMATION_VARIANTS } from '../constants';
import { useARCanvas } from '../hooks/useARCanvas';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useCamera } from '../hooks/useCamera';
import {
  TransformControls,
  FeedbackButtons,
  ConciergeErrorBoundary,
  ARErrorFallback,
} from '../shared';

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

interface ARHeaderProps {
  mode: 'quick' | 'tracking';
  hasTracking: boolean;
  isTrackingLoading: boolean;
  fps: number;
  onClose: () => void;
}

const ARHeader = memo(function ARHeader({ mode, hasTracking, isTrackingLoading, fps, onClose }: ARHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border/30">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
            hasTracking ? 'bg-green-500/20' : 'bg-primary/20'
          }`}
          aria-hidden="true"
        >
          {mode === 'tracking' ? (
            hasTracking ? (
              <Target className="w-5 h-5 text-green-500 animate-pulse" />
            ) : isTrackingLoading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-primary" />
            )
          ) : (
            <Image className="w-5 h-5 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-display text-lg text-foreground" id="ar-preview-title">
            {mode === 'tracking' ? 'AR Preview' : 'Quick Preview'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {mode === 'tracking'
              ? hasTracking 
                ? '🟢 Body Tracking Active' 
                : isTrackingLoading 
                  ? 'Activating body tracking...' 
                  : 'Looking for body...'
              : 'Position the design manually'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {mode === 'tracking' && (
          <Badge 
            variant={hasTracking ? 'default' : 'secondary'} 
            className={`text-xs transition-colors ${hasTracking ? 'bg-green-500 text-white' : ''}`}
          >
            {hasTracking ? (
              <><Target className="w-3 h-3 mr-1" /> {fps} FPS</>
            ) : isTrackingLoading ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
            ) : (
              'Waiting...'
            )}
          </Badge>
        )}
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close AR preview">
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
});

interface BodyPartSelectorProps {
  value: BodyPart;
  onChange: (part: BodyPart) => void;
  disabled?: boolean;
}

const BodyPartSelector = memo(function BodyPartSelector({
  value,
  onChange,
  disabled,
}: BodyPartSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Location</Label>
      <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Body part selection">
        {BODY_PART_OPTIONS.map(({ value: partValue, label }) => (
          <Button
            key={partValue}
            variant={value === partValue ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => onChange(partValue)}
            disabled={disabled}
            role="radio"
            aria-checked={value === partValue}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Main ARPreview Component
// -----------------------------------------------------------------------------

function ARPreviewInner({
  isOpen,
  onClose,
  referenceImageUrl,
  onBookingClick,
  onCapture: onCaptureCallback,
  onFeedback,
  suggestedBodyPart,
  mode: initialMode = 'quick',
}: ARPreviewProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ethereal AI for enhanced analysis
  const { analyzeDesign, analyzeBodyPhoto, isAnalyzing: grokAnalyzing } = useGrokAR();

  // State
  const [mode] = useState<'quick' | 'tracking'>(initialMode);
  const [bodyPart, setBodyPart] = useState<BodyPart>('left_inner_forearm');
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [grokInsights, setGrokInsights] = useState<string | null>(null);

  // Hooks
  const {
    canvasRef,
    containerRef,
    transform,
    setTransform,
    designImage,
    isImageLoading,
    loadDesignImage,
    drawCanvas,
    drawWithTracking,
    captureScreenshot,
    resetTransform,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useARCanvas();

  const {
    isLoaded: isMediaPipeLoaded,
    isLoading: isMediaPipeLoading,
    loadError: mediaPipeError,
    hasTracking,
    landmarks,
    fps,
    loadMediaPipe,
    startTracking,
    stopTracking,
  } = useMediaPipe();

  const {
    videoRef,
    isActive: isCameraActive,
    isLoading: isCameraLoading,
    error: cameraError,
    startCamera: startCameraBase,
    stopCamera,
  } = useCamera({
    onStreamReady: () => {
      if (videoRef.current) {
        startTracking(videoRef.current);
      }
    },
  });

  // Load design image on mount and analyze with Ethereal AI
  useEffect(() => {
    if (referenceImageUrl) {
      loadDesignImage(referenceImageUrl);
      
      // Analyze design with Ethereal AI
      analyzeDesign(referenceImageUrl).then((analysis) => {
        if (analysis) {
          setGrokInsights(`${analysis.complexity} design • ~${analysis.estimatedHours}h • Best on: ${analysis.placementRecommendations.slice(0, 2).join(', ')}`);
        }
      });
    }
  }, [referenceImageUrl, loadDesignImage, analyzeDesign]);

  // Parse suggested body part
  useEffect(() => {
    if (suggestedBodyPart) {
      const normalized = suggestedBodyPart.toLowerCase().replace(/\s+/g, '_');
      const matchingPart = BODY_PART_OPTIONS.find(
        (opt) => normalized.includes(opt.value.replace(/_/g, '')) || opt.value.includes(normalized)
      );
      if (matchingPart) {
        setBodyPart(matchingPart.value);
      }
    }
  }, [suggestedBodyPart]);

  // Draw canvas for quick mode
  useEffect(() => {
    if (mode === 'quick' && designImage) {
      drawCanvas({
        backgroundImage: bodyImage,
        showGrid: !bodyImage,
      });
    }
  }, [mode, designImage, bodyImage, transform, drawCanvas]);

  // Draw canvas for tracking mode
  useEffect(() => {
    if (mode === 'tracking' && isCameraActive && designImage && landmarks) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      drawWithTracking(ctx, canvas, landmarks, bodyPart);
    }
  }, [mode, isCameraActive, designImage, landmarks, bodyPart, transform, drawWithTracking, canvasRef, videoRef]);

  // Start camera with MediaPipe loading
  const startCameraAuto = useCallback(async () => {
    console.log('[ARPreview] Starting camera with MediaPipe...');
    if (!isMediaPipeLoaded) {
      console.log('[ARPreview] Loading MediaPipe...');
      const loaded = await loadMediaPipe();
      if (!loaded) {
        console.error('[ARPreview] Failed to load MediaPipe');
        toast({ title: 'Error', description: 'Could not load body tracking', variant: 'destructive' });
        return;
      }
      console.log('[ARPreview] MediaPipe loaded successfully');
    }
    console.log('[ARPreview] Starting camera...');
    await startCameraBase();
    console.log('[ARPreview] Camera started');
  }, [isMediaPipeLoaded, loadMediaPipe, startCameraBase, toast]);

  // AUTO-ACTIVATE: Start camera and MediaPipe automatically when in tracking mode
  useEffect(() => {
    if (mode === 'tracking' && isOpen && !isCameraActive && !isCameraLoading && !isMediaPipeLoading) {
      console.log('[ARPreview] Auto-activating body tracking...');
      startCameraAuto();
    }
  }, [mode, isOpen, isCameraActive, isCameraLoading, isMediaPipeLoading, startCameraAuto]);

  // Handle body image upload
  const handleBodyImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setBodyImage(event.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Handle capture
  const handleCapture = useCallback(() => {
    const dataUrl = captureScreenshot();
    if (dataUrl) {
      onCaptureCallback?.(dataUrl);
      toast({ title: 'Screenshot saved!', description: 'Image has been downloaded' });
    }
  }, [captureScreenshot, onCaptureCallback, toast]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    stopTracking();
    onClose();
  }, [stopCamera, stopTracking, onClose]);

  // Handle transform change
  const handleTransformChange = useCallback((newTransform: TattooTransform) => {
    setTransform(newTransform);
  }, [setTransform]);

  if (!isOpen) return null;

  // Error states
  if (cameraError && mode === 'tracking') {
    return <ARErrorFallback error={new Error(cameraError.message)} errorType="camera" resetError={startCameraAuto} onClose={handleClose} />;
  }

  if (mediaPipeError && mode === 'tracking') {
    return <ARErrorFallback error={new Error(mediaPipeError)} errorType="mediapipe" resetError={loadMediaPipe} onClose={handleClose} />;
  }

  return (
    <AnimatePresence>
      <motion.div {...ANIMATION_VARIANTS.fadeIn} className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true" aria-labelledby="ar-preview-title">
        <ARHeader mode={mode} hasTracking={hasTracking} isTrackingLoading={isMediaPipeLoading || isCameraLoading} fps={fps} onClose={handleClose} />
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div ref={containerRef} className="flex-1 relative bg-background/5 flex items-center justify-center p-4">
            {isImageLoading ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading design...</p>
              </div>
            ) : mode === 'quick' ? (
              <div className="relative w-full h-full max-w-lg max-h-[70vh]">
                <canvas ref={canvasRef} className="w-full h-full border border-border/30 rounded-lg cursor-move touch-none" onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd} role="img" aria-label="AR preview canvas" />
                {!bodyImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 text-center pointer-events-auto">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-foreground mb-2">Upload a body photo</p>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Camera className="w-4 h-4 mr-2" />Upload Photo
                      </Button>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button variant="secondary" size="icon" onClick={resetTransform} title="Reset"><RefreshCw className="w-4 h-4" /></Button>
                  <Button variant="secondary" size="icon" onClick={() => fileInputRef.current?.click()} title="Change photo"><Camera className="w-4 h-4" /></Button>
                  <Button variant="secondary" size="icon" onClick={handleCapture} title="Capture"><Download className="w-4 h-4" /></Button>
                </div>
              </div>
            ) : !isCameraActive ? (
              <div className="text-center space-y-6">
                {designImage && <div className="mx-auto w-48 h-48 border border-border/50 rounded overflow-hidden"><img src={referenceImageUrl} alt="Design reference" className="w-full h-full object-contain bg-background/10" /></div>}
                
                {/* Auto-loading indicator */}
                {(isCameraLoading || isMediaPipeLoading) ? (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <div>
                      <h4 className="text-lg font-display text-foreground mb-2">Activating Body Tracking...</h4>
                      <p className="text-sm text-muted-foreground">
                        {isMediaPipeLoading ? 'Loading AI pose detection...' : 'Starting camera...'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-lg font-display text-foreground mb-2">Activate camera to see the design on your body</h4>
                    <p className="text-sm text-muted-foreground mb-6">We'll use body tracking to position the tattoo</p>
                    <Button onClick={startCameraAuto} disabled={isCameraLoading || isMediaPipeLoading} className="bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
                      <Camera className="w-5 h-5 mr-2" />
                      Activate Camera
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <video ref={videoRef} className="hidden" playsInline muted />
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                
                {/* Live tracking status badge */}
                <div className="absolute top-4 left-4">
                  <Badge 
                    variant={hasTracking ? 'default' : 'secondary'} 
                    className={`text-xs transition-all duration-300 ${
                      hasTracking 
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                        : 'animate-pulse'
                    }`}
                  >
                    <Target className={`w-3 h-3 mr-1 ${hasTracking ? 'animate-pulse' : ''}`} />
                    {hasTracking ? 'Body Tracking Active' : 'Scanning for body...'}
                  </Badge>
                </div>
                
                {/* FPS indicator when tracking */}
                {hasTracking && fps > 0 && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                      {fps} FPS
                    </Badge>
                  </div>
                )}
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button variant="secondary" size="icon" onClick={resetTransform} title="Reset"><RefreshCw className="w-4 h-4" /></Button>
                  <Button variant="secondary" size="icon" onClick={handleCapture} title="Capture"><Download className="w-4 h-4" /></Button>
                </div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBodyImageUpload} />
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border/30 bg-background/95 p-4 space-y-6 overflow-y-auto">
            <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-foreground">{mode === 'tracking' ? 'Body Tracking Active' : 'Ethereal AI Preview'}</p>
                <p className="text-muted-foreground mt-1">
                  {grokAnalyzing ? 'Analyzing design...' : grokInsights || (mode === 'tracking' ? 'Move to see the design follow your body.' : 'Drag the design to position it.')}
                </p>
              </div>
            </div>
            {mode === 'tracking' && <BodyPartSelector value={bodyPart} onChange={setBodyPart} disabled={!isCameraActive} />}
            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adjustments</Label>
              <TransformControls transform={transform} onChange={handleTransformChange} showPosition={mode === 'tracking'} />
            </div>
            <FeedbackButtons onFeedback={onFeedback || (() => {})} captureScreenshot={captureScreenshot} onBookingClick={onBookingClick} onClose={handleClose} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Wrapped with Error Boundary
export const ARPreview = memo(function ARPreview(props: ARPreviewProps) {
  return (
    <ConciergeErrorBoundary fallback={<ARErrorFallback error={null} resetError={() => window.location.reload()} onClose={props.onClose} />}>
      <ARPreviewInner {...props} />
    </ConciergeErrorBoundary>
  );
});

export default ARPreview;
