// =============================================================================
// USE AR CANVAS HOOK - Shared AR canvas drawing and manipulation logic
// =============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TattooTransform, BodyPart, LandmarkPoint } from '@/types/concierge';
import { DEFAULT_TRANSFORM } from '@/types/concierge';
import { BODY_PART_CONFIG } from '../constants';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseARCanvasOptions {
  initialTransform?: TattooTransform;
  onTransformChange?: (transform: TattooTransform) => void;
}

export interface UseARCanvasReturn {
  // Refs
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;

  // State
  transform: TattooTransform;
  setTransform: React.Dispatch<React.SetStateAction<TattooTransform>>;
  isDragging: boolean;
  designImage: HTMLImageElement | null;
  isImageLoading: boolean;

  // Actions
  loadDesignImage: (url: string) => Promise<HTMLImageElement | null>;
  drawCanvas: (options: DrawCanvasOptions) => void;
  drawDesignOverlay: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  drawWithTracking: (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    landmarks: LandmarkPoint[],
    bodyPart: BodyPart
  ) => void;
  captureScreenshot: (filename?: string) => string | null;
  resetTransform: () => void;

  // Drag handlers
  handleDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleDragMove: (e: React.MouseEvent | React.TouchEvent) => void;
  handleDragEnd: () => void;
}

export interface DrawCanvasOptions {
  backgroundImage?: string | null;
  backgroundColor?: string;
  showGrid?: boolean;
  landmarks?: LandmarkPoint[] | null;
  bodyPart?: BodyPart;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useARCanvas(options: UseARCanvasOptions = {}): UseARCanvasReturn {
  const { initialTransform = DEFAULT_TRANSFORM, onTransformChange } = options;

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // State
  const [transform, setTransform] = useState<TattooTransform>(initialTransform);
  const [isDragging, setIsDragging] = useState(false);
  const [designImage, setDesignImage] = useState<HTMLImageElement | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Notify parent of transform changes
  useEffect(() => {
    onTransformChange?.(transform);
  }, [transform, onTransformChange]);

  // Load design image
  const loadDesignImage = useCallback(async (url: string): Promise<HTMLImageElement | null> => {
    if (!url) return null;

    setIsImageLoading(true);

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        setDesignImage(img);
        setIsImageLoading(false);
        resolve(img);
      };

      img.onerror = () => {
        console.error('[useARCanvas] Failed to load image:', url);
        setIsImageLoading(false);
        resolve(null);
      };

      img.src = url;
    });
  }, []);

  // Draw design overlay (simple mode - no tracking)
  const drawDesignOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
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

      ctx.drawImage(designImage, -designWidth / 2, -designHeight / 2, designWidth, designHeight);

      ctx.restore();
    },
    [designImage, transform]
  );

  // Draw with body tracking (MediaPipe landmarks)
  const drawWithTracking = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      landmarks: LandmarkPoint[],
      bodyPart: BodyPart
    ) => {
      if (!designImage) return;

      const config = BODY_PART_CONFIG[bodyPart];
      if (!config || config.landmarks.length < 2) return;

      const lm1 = landmarks[config.landmarks[0]];
      const lm2 = landmarks[config.landmarks[1]];

      if (!lm1 || !lm2 || lm1.visibility < 0.5 || lm2.visibility < 0.5) return;

      // Calculate position (mirrored for front-facing camera)
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
      ctx.rotate(angle + (transform.rotation * Math.PI) / 180);

      const aspectRatio = designImage.height / designImage.width;
      const drawWidth = tattooSize;
      const drawHeight = tattooSize * aspectRatio;

      ctx.drawImage(designImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      ctx.restore();
    },
    [designImage, transform]
  );

  // Draw full canvas
  const drawCanvas = useCallback(
    (canvasOptions: DrawCanvasOptions) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const {
        backgroundImage,
        backgroundColor = '#1a1a2e',
        showGrid = false,
        landmarks,
        bodyPart,
      } = canvasOptions;

      // Set canvas size from container
      const containerWidth = containerRef.current?.clientWidth || 400;
      const containerHeight = containerRef.current?.clientHeight || 500;
      canvas.width = containerWidth;
      canvas.height = containerHeight;

      // Clear with background color
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid if no background image
      if (showGrid && !backgroundImage) {
        ctx.strokeStyle = '#333';
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
      }

      // Draw background image if provided
      if (backgroundImage) {
        const bgImg = new Image();
        bgImg.onload = () => {
          const scale = Math.min(canvas.width / bgImg.width, canvas.height / bgImg.height);
          const x = (canvas.width - bgImg.width * scale) / 2;
          const y = (canvas.height - bgImg.height * scale) / 2;
          ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);

          // Draw design overlay after background loads
          if (landmarks && bodyPart) {
            drawWithTracking(ctx, canvas, landmarks, bodyPart);
          } else {
            drawDesignOverlay(ctx, canvas);
          }
        };
        bgImg.src = backgroundImage;
      } else {
        // Draw design overlay immediately
        if (landmarks && bodyPart) {
          drawWithTracking(ctx, canvas, landmarks, bodyPart);
        } else {
          drawDesignOverlay(ctx, canvas);
        }
      }
    },
    [drawDesignOverlay, drawWithTracking]
  );

  // Capture screenshot
  const captureScreenshot = useCallback(
    (filename?: string): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const dataUrl = canvas.toDataURL('image/png');

      // Trigger download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename || `ar-preview-${Date.now()}.png`;
      link.click();

      return dataUrl;
    },
    []
  );

  // Reset transform
  const resetTransform = useCallback(() => {
    setTransform(DEFAULT_TRANSFORM);
  }, []);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      dragStartRef.current = {
        x: clientX - transform.offsetX,
        y: clientY - transform.offsetY,
      };
    },
    [transform.offsetX, transform.offsetY]
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      setTransform((t) => ({
        ...t,
        offsetX: clientX - dragStartRef.current.x,
        offsetY: clientY - dragStartRef.current.y,
      }));
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    canvasRef,
    containerRef,
    transform,
    setTransform,
    isDragging,
    designImage,
    isImageLoading,
    loadDesignImage,
    drawCanvas,
    drawDesignOverlay,
    drawWithTracking,
    captureScreenshot,
    resetTransform,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}

export default useARCanvas;
