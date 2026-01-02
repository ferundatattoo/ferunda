// =============================================================================
// USE CAMERA HOOK - Camera access and stream management
// =============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: CameraError) => void;
}

export interface UseCameraReturn {
  // Refs
  videoRef: React.RefObject<HTMLVideoElement>;

  // State
  stream: MediaStream | null;
  isActive: boolean;
  isLoading: boolean;
  error: CameraError | null;
  hasPermission: boolean | null;

  // Actions
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  switchCamera: () => Promise<boolean>;
  captureFrame: () => ImageData | null;
}

export interface CameraError {
  code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NOT_SUPPORTED' | 'UNKNOWN';
  message: string;
  originalError?: Error;
}

// -----------------------------------------------------------------------------
// Helper: Parse MediaDevice error
// -----------------------------------------------------------------------------

function parseCameraError(error: unknown): CameraError {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          code: 'PERMISSION_DENIED',
          message: 'Camera access denied. Please allow camera access in your browser settings.',
          originalError: error,
        };
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          code: 'NOT_FOUND',
          message: 'No camera found on this device.',
          originalError: error,
        };
      case 'NotSupportedError':
        return {
          code: 'NOT_SUPPORTED',
          message: 'Camera is not supported in this browser.',
          originalError: error,
        };
      default:
        return {
          code: 'UNKNOWN',
          message: error.message || 'Unknown camera error',
          originalError: error,
        };
    }
  }

  return {
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Unknown camera error',
    originalError: error instanceof Error ? error : undefined,
  };
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    facingMode: initialFacingMode = 'user',
    width = 1280,
    height = 720,
    onStreamReady,
    onError,
  } = options;

  // State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setIsActive(false);
    setIsLoading(false);
  }, []);

  // Start camera
  const startCamera = useCallback(async (): Promise<boolean> => {
    // Check if MediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const cameraError: CameraError = {
        code: 'NOT_SUPPORTED',
        message: 'Camera access is not supported in this browser.',
      };
      setError(cameraError);
      onError?.(cameraError);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream if any
      stopCamera();

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
      setHasPermission(true);
      setIsLoading(false);

      onStreamReady?.(mediaStream);
      return true;
    } catch (err) {
      const cameraError = parseCameraError(err);
      setError(cameraError);
      setIsLoading(false);

      if (cameraError.code === 'PERMISSION_DENIED') {
        setHasPermission(false);
      }

      onError?.(cameraError);
      return false;
    }
  }, [facingMode, width, height, stopCamera, onStreamReady, onError]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async (): Promise<boolean> => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (isActive) {
      stopCamera();
      return startCamera();
    }

    return true;
  }, [facingMode, isActive, stopCamera, startCamera]);

  // Capture current frame
  const captureFrame = useCallback((): ImageData | null => {
    if (!videoRef.current || !isActive) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    stream,
    isActive,
    isLoading,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    switchCamera,
    captureFrame,
  };
}

export default useCamera;
