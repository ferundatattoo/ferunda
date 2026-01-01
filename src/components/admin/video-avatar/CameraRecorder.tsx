import { useState, useRef, useEffect, useCallback } from "react";
import { Video, Square, Circle, RotateCcw, Play, Pause, CheckCircle, Camera, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CameraRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  minDuration?: number; // Minimum recording duration in seconds (default 120 = 2 min)
  maxDuration?: number; // Maximum recording duration in seconds (default 300 = 5 min)
}

const CameraRecorder = ({ 
  onRecordingComplete, 
  minDuration = 120, 
  maxDuration = 300 
}: CameraRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isRecordingRef.current = false;
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      stopCamera();
    };
  }, [cleanup, stopCamera]);

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && duration >= maxDuration) {
      stopRecording();
    }
  }, [duration, maxDuration, isRecording]);

  const startCamera = async () => {
    try {
      setPermissionError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setPermissionError('Camera access denied. Please allow camera and microphone access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          setPermissionError('No camera found. Please connect a camera and try again.');
        } else {
          setPermissionError(`Camera error: ${error.message}`);
        }
      } else {
        setPermissionError('Could not access camera. Please check your browser settings.');
      }
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      await startCamera();
      if (!streamRef.current) return;
    }

    // 3-2-1 countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);

    // Determine best supported MIME type
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, 
      MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined
    );
    
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      setVideoBlob(blob);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      onRecordingComplete(blob);
    };

    mediaRecorder.start(1000); // Collect data every second
    
    isRecordingRef.current = true;
    setIsRecording(true);
    setDuration(0);
    setVideoBlob(null);
    setVideoUrl(null);

    // Start timer
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsPaused(false);
      cleanup();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        isRecordingRef.current = true;
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        isRecordingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setIsPaused(!isPaused);
    }
  };

  const resetRecording = () => {
    cleanup();
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setVideoBlob(null);
    setVideoUrl(null);
    setPermissionError(null);
    chunksRef.current = [];
    // Keep camera active for re-recording
  };

  const togglePreviewPlayback = () => {
    if (previewRef.current) {
      if (isPlaying) {
        previewRef.current.pause();
      } else {
        previewRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isMinDurationMet = duration >= minDuration;
  const progressPercent = Math.min((duration / maxDuration) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Permission Error */}
      {permissionError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive">{permissionError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startCamera}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Area */}
      <div className="relative rounded-xl overflow-hidden bg-ink-black aspect-video">
        {/* Live camera feed */}
        {!videoBlob && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "w-full h-full object-cover transform -scale-x-100",
              !cameraActive && "hidden"
            )}
          />
        )}

        {/* Recorded video preview */}
        {videoBlob && videoUrl && (
          <video
            ref={previewRef}
            src={videoUrl}
            playsInline
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-cover"
          />
        )}

        {/* Camera not active placeholder */}
        {!cameraActive && !videoBlob && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Camera not active</p>
            <Button onClick={startCamera} variant="outline">
              <Video className="w-4 h-4 mr-2" />
              Activate Camera
            </Button>
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-ink-black/80 flex items-center justify-center">
            <span className="text-8xl font-bold text-needle-blue animate-pulse">
              {countdown}
            </span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-sm">
            <Circle className={cn("w-3 h-3 fill-current", !isPaused && "animate-pulse")} />
            {isPaused ? "PAUSED" : "REC"} {formatTime(duration)}
          </div>
        )}

        {/* Recording complete overlay */}
        {videoBlob && !isRecording && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              {formatTime(duration)} recorded
            </div>
          </div>
        )}
      </div>

      {/* Progress bar (visible while recording) */}
      {isRecording && (
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {isMinDurationMet ? (
                <span className="text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Minimum reached
                </span>
              ) : (
                `Min: ${formatTime(minDuration)}`
              )}
            </span>
            <span>Max: {formatTime(maxDuration)}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Start recording button */}
        {cameraActive && !isRecording && !videoBlob && (
          <Button
            onClick={startRecording}
            size="lg"
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
          >
            <Circle className="w-8 h-8 fill-current" />
          </Button>
        )}

        {/* Recording controls */}
        {isRecording && (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              size="lg"
              className="w-14 h-14 rounded-full"
            >
              {isPaused ? (
                <Circle className="w-6 h-6 fill-current text-red-500" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </Button>
            <Button
              onClick={stopRecording}
              size="lg"
              className={cn(
                "w-16 h-16 rounded-full",
                isMinDurationMet 
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              <Square className="w-6 h-6 fill-current" />
            </Button>
          </>
        )}

        {/* Preview controls */}
        {videoBlob && !isRecording && (
          <>
            <Button
              onClick={togglePreviewPlayback}
              variant="outline"
              size="lg"
              className="w-14 h-14 rounded-full"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>
            <Button
              onClick={resetRecording}
              variant="outline"
              size="lg"
              className="w-14 h-14 rounded-full"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 bg-iron-dark rounded-lg border border-border/30">
        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Video className="w-4 h-4 text-needle-blue" />
          Recording Tips
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Look directly at the camera and speak naturally</li>
          <li>• Good lighting (face the light, not the window)</li>
          <li>• Plain background works best</li>
          <li>• Include varied expressions (smiling, serious, etc.)</li>
          <li>• Record 2-5 minutes for best avatar quality</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraRecorder;
