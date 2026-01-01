import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, Pause, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  minDuration?: number; // Minimum recording duration in seconds
}

const VoiceRecorder = ({ onRecordingComplete, minDuration = 60 }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0));
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Use ref for immediate access to recording state (fixes async timing issue)
  const isRecordingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateWaveform = useCallback(() => {
    // Use ref instead of state for immediate check
    if (!analyserRef.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    // Update waveform visualization
    setWaveformData(prev => [...prev.slice(1), average / 255]);

    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = async () => {
    try {
      setPermissionError(null);
      console.log("[VoiceRecorder] Requesting microphone permission...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      console.log("[VoiceRecorder] Microphone access granted");
      streamRef.current = stream;

      // Set up audio analysis FIRST
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Determine best supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }
      console.log("[VoiceRecorder] Using MIME type:", mimeType || "default");

      // Set up recorder
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        console.log("[VoiceRecorder] Data available:", e.data.size, "bytes");
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("[VoiceRecorder] Recording stopped, processing chunks:", chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob);
      };

      mediaRecorder.onerror = (event) => {
        console.error("[VoiceRecorder] MediaRecorder error:", event);
        setPermissionError("Recording failed. Please try again.");
        cleanup();
        isRecordingRef.current = false;
        setIsRecording(false);
      };

      // CRITICAL: Set ref to true BEFORE starting to ensure waveform works
      isRecordingRef.current = true;
      
      // Start recording with timeslice for regular data chunks
      mediaRecorder.start(500);
      console.log("[VoiceRecorder] MediaRecorder started, state:", mediaRecorder.state);
      
      // Update state AFTER recorder is confirmed started
      setIsRecording(true);
      setDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start waveform animation - this now works because isRecordingRef.current is true
      requestAnimationFrame(updateWaveform);
      
    } catch (error) {
      console.error('[VoiceRecorder] Error accessing microphone:', error);
      isRecordingRef.current = false;
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setPermissionError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
        } else if (error.name === 'NotFoundError') {
          setPermissionError('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          setPermissionError('Microphone is in use by another application. Please close other apps and try again.');
        } else {
          setPermissionError(`Microphone error: ${error.message}`);
        }
      } else {
        setPermissionError('Could not access microphone. Please check your browser settings.');
      }
    }
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
        requestAnimationFrame(updateWaveform);
      } else {
        mediaRecorderRef.current.pause();
        isRecordingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
    setAudioBlob(null);
    setAudioUrl(null);
    setWaveformData(new Array(50).fill(0));
    setPermissionError(null);
    chunksRef.current = [];
  };

  const playPreview = () => {
    if (audioUrl) {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isMinDurationMet = duration >= minDuration;

  return (
    <div className="bg-ink-black rounded-xl p-6 border border-border/30">
      {/* Permission Error */}
      {permissionError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm text-destructive">{permissionError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPermissionError(null)}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Waveform Visualization */}
      <div className="h-24 flex items-center justify-center gap-0.5 mb-6">
        {waveformData.map((level, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-75",
              isRecording && !isPaused
                ? "bg-needle-blue"
                : audioBlob
                  ? "bg-green-500/50"
                  : "bg-muted-foreground/30"
            )}
            style={{
              height: `${Math.max(4, level * 80)}px`,
              opacity: isRecording && !isPaused ? 1 : 0.5
            }}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <span className={cn(
          "font-mono text-4xl font-bold",
          isRecording && !isPaused ? "text-needle-blue" : "text-foreground"
        )}>
          {formatTime(duration)}
        </span>
        <p className="text-sm text-muted-foreground mt-1">
          {isMinDurationMet ? (
            <span className="text-green-500 flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Minimum duration met
            </span>
          ) : (
            `Record at least ${formatTime(minDuration)} for best quality`
          )}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording && !audioBlob && (
          <Button
            onClick={startRecording}
            size="lg"
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
          >
            <Mic className="w-8 h-8" />
          </Button>
        )}

        {isRecording && (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              size="lg"
              className="w-14 h-14 rounded-full"
            >
              {isPaused ? (
                <Mic className="w-6 h-6" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </Button>
            <Button
              onClick={stopRecording}
              size="lg"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
            >
              <Square className="w-6 h-6 fill-current" />
            </Button>
          </>
        )}

        {audioBlob && !isRecording && (
          <>
            <Button
              onClick={playPreview}
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
      <div className="mt-6 p-4 bg-iron-dark rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-2">Tips for Best Results</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Record at least 1 minute of natural speech</li>
          <li>• Speak clearly in a quiet environment</li>
          <li>• Include varied tones (questions, statements)</li>
          <li>• Keep a consistent distance from the microphone</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceRecorder;
