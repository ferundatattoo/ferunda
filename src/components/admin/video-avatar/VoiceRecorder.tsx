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
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);

    // Update waveform visualization
    const newWaveform = [...waveformData.slice(1), average / 255];
    setWaveformData(newWaveform);

    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  }, [isRecording, waveformData]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Set up recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start waveform animation
      updateWaveform();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      cleanup();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
        updateWaveform();
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      }
      setIsPaused(!isPaused);
    }
  };

  const resetRecording = () => {
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setWaveformData(new Array(50).fill(0));
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
