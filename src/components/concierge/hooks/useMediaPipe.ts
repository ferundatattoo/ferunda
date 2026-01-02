// =============================================================================
// USE MEDIAPIPE HOOK - MediaPipe pose detection for AR body tracking
// =============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { LandmarkPoint, MediaPipePose, MediaPipePoseOptions } from '@/types/concierge';
import { MEDIAPIPE_URLS } from '../constants';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseMediaPipeOptions {
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  onLandmarksDetected?: (landmarks: LandmarkPoint[]) => void;
  onTrackingLost?: () => void;
}

export interface UseMediaPipeReturn {
  // State
  isLoaded: boolean;
  isLoading: boolean;
  loadError: string | null;
  hasTracking: boolean;
  landmarks: LandmarkPoint[] | null;
  fps: number;

  // Actions
  loadMediaPipe: () => Promise<boolean>;
  startTracking: (videoElement: HTMLVideoElement) => void;
  stopTracking: () => void;
  processFrame: (videoElement: HTMLVideoElement) => Promise<void>;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_OPTIONS: MediaPipePoseOptions = {
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

// -----------------------------------------------------------------------------
// Helper: Load script dynamically
// -----------------------------------------------------------------------------

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useMediaPipe(options: UseMediaPipeOptions = {}): UseMediaPipeReturn {
  const {
    modelComplexity = DEFAULT_OPTIONS.modelComplexity,
    smoothLandmarks = DEFAULT_OPTIONS.smoothLandmarks,
    enableSegmentation = DEFAULT_OPTIONS.enableSegmentation,
    minDetectionConfidence = DEFAULT_OPTIONS.minDetectionConfidence,
    minTrackingConfidence = DEFAULT_OPTIONS.minTrackingConfidence,
    onLandmarksDetected,
    onTrackingLost,
  } = options;

  // State
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasTracking, setHasTracking] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[] | null>(null);
  const [fps, setFps] = useState(0);

  // Refs
  const poseRef = useRef<MediaPipePose | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });
  const isTrackingRef = useRef(false);

  // Load MediaPipe scripts and initialize
  const loadMediaPipe = useCallback(async (): Promise<boolean> => {
    // Already loaded
    if (poseRef.current) return true;

    setIsLoading(true);
    setLoadError(null);

    try {
      // Load scripts if not already present
      if (!(window as any).Pose) {
        await loadScript(MEDIAPIPE_URLS.pose);
        await loadScript(MEDIAPIPE_URLS.camera);

        // Wait for Pose to be available
        await new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max

          const check = () => {
            if (window.Pose) {
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('MediaPipe Pose failed to initialize'));
            } else {
              attempts++;
              setTimeout(check, 100);
            }
          };
          check();
        });
      }

      // Initialize Pose
      const Pose = window.Pose!;
      const pose = new Pose({
        locateFile: (file: string) => `${MEDIAPIPE_URLS.filesBase}${file}`,
      });

      pose.setOptions({
        modelComplexity,
        smoothLandmarks,
        enableSegmentation,
        minDetectionConfidence,
        minTrackingConfidence,
      });

      pose.onResults((results: { poseLandmarks?: LandmarkPoint[] }) => {
        if (results.poseLandmarks) {
          const landmarkData = results.poseLandmarks as LandmarkPoint[];
          setLandmarks(landmarkData);
          setHasTracking(true);
          onLandmarksDetected?.(landmarkData);

          // FPS counter
          fpsCounterRef.current.count++;
          const now = Date.now();
          if (now - fpsCounterRef.current.lastTime >= 1000) {
            setFps(fpsCounterRef.current.count);
            fpsCounterRef.current.count = 0;
            fpsCounterRef.current.lastTime = now;
          }
        } else {
          setHasTracking(false);
          setLandmarks(null);
          onTrackingLost?.();
        }
      });

      await pose.initialize();
      poseRef.current = pose;
      setIsLoaded(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error loading MediaPipe';
      console.error('[useMediaPipe] Load error:', message);
      setLoadError(message);
      setIsLoading(false);
      return false;
    }
  }, [
    modelComplexity,
    smoothLandmarks,
    enableSegmentation,
    minDetectionConfidence,
    minTrackingConfidence,
    onLandmarksDetected,
    onTrackingLost,
  ]);

  // Process a single frame
  const processFrame = useCallback(async (videoElement: HTMLVideoElement): Promise<void> => {
    if (!poseRef.current) return;

    try {
      await poseRef.current.send({ image: videoElement });
    } catch (error) {
      console.error('[useMediaPipe] Frame processing error:', error);
    }
  }, []);

  // Start continuous tracking
  const startTracking = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (!poseRef.current || isTrackingRef.current) return;

      isTrackingRef.current = true;

      const loop = async () => {
        if (!isTrackingRef.current) return;

        await processFrame(videoElement);
        animationFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    },
    [processFrame]
  );

  // Stop tracking
  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setHasTracking(false);
    setLandmarks(null);
    setFps(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isLoaded,
    isLoading,
    loadError,
    hasTracking,
    landmarks,
    fps,
    loadMediaPipe,
    startTracking,
    stopTracking,
    processFrame,
  };
}

export default useMediaPipe;
