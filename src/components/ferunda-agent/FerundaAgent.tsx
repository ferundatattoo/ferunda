import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Mic, MicOff, Loader2, 
  Sparkles, Calendar, CreditCard, Image as ImageIcon,
  ChevronDown, Volume2, VolumeX, Maximize2, Minimize2,
  AlertTriangle, CheckCircle, Thermometer, Zap, Palette,
  Video, Download, Share2, Play, Pause, RotateCcw, Eye,
  WifiOff, XCircle, Activity, Clock, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ARPreview } from '@/components/concierge';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'backend' | 'ui'; // Track message origin
  attachments?: {
    type: 'image' | 'video' | 'heatmap' | 'calendar' | 'payment' | 'analysis' | 'variations' | 'avatar_video' | 'ar_preview';
    url?: string;
    data?: any;
    label?: string;
  }[];
  toolCalls?: {
    name: string;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
  }[];
}

interface ConversationMemory {
  clientName?: string;
  previousTattoos?: string[];
  preferences?: string[];
  skinTone?: string;
  lastAnalysis?: any;
}

type AssistantMode = 'concierge' | 'luna';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONVERSATION_ID_KEY = 'ferunda_conversation_id';
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds

// Critical functions that must be available for chat to work properly
const CRITICAL_FUNCTIONS = ['studio-concierge', 'chat-upload-url', 'chat-session'];

// Error messages map for user-friendly feedback
const ERROR_MESSAGES: Record<string, { title: string; description: string; action: string }> = {
  'Upload URL timeout': {
    title: 'Servicio de imágenes lento',
    description: 'El servidor de subida no respondió.',
    action: 'Intenta de nuevo o describe tu imagen.',
  },
  'Network error': {
    title: 'Sin conexión',
    description: 'No hay conexión a internet.',
    action: 'Verifica tu conexión.',
  },
  'Stream timeout': {
    title: 'Respuesta lenta',
    description: 'El asistente tardó demasiado.',
    action: 'Intenta con un mensaje más corto.',
  },
  'Function not deployed': {
    title: 'Servicio no disponible',
    description: 'Un servicio necesario no está activo.',
    action: 'Espera unos segundos e intenta de nuevo.',
  },
  'default': {
    title: 'Algo salió mal',
    description: 'Ocurrió un error inesperado.',
    action: 'Intenta de nuevo.',
  },
};

// Diagnostics state interface
interface DiagnosticsState {
  currentPhase: string;
  phaseStartTime: number | null;
  elapsedMs: number;
  lastError: string | null;
  functionsHealth: Record<string, { ok: boolean; latency: number; error?: string }> | null;
  activeRequests: number;
}

// Helper to get user-friendly error details
const getErrorDetails = (error: unknown): { title: string; description: string; action: string } => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  for (const [key, details] of Object.entries(ERROR_MESSAGES)) {
    if (key !== 'default' && errorMsg.toLowerCase().includes(key.toLowerCase())) {
      return details;
    }
  }
  
  return ERROR_MESSAGES['default'];
};

// ============================================================================
// INTENT DETECTION
// ============================================================================

const CONCIERGE_PATTERNS = [
  /\b(book|booking|reserv|cita|agendar|schedule|appointment)\b/i,
  /\b(quiero|want|need).*(tattoo|tatuaje|tatuar)/i,
  /\b(new|nuevo|nueva).*(tattoo|tatuaje|design|diseño)/i,
  /\b(cover.?up|cover|cubrir|tapar)\b/i,
  /\b(touch.?up|retouch|retoque|retocar)\b/i,
  /\b(full|half|quarter).*(sleeve|espalda|back)\b/i,
  /\b(reference|referencia|ejemplo|idea|imagen|image|photo|foto)\b/i,
];

const LUNA_PATTERNS = [
  /\b(how much|cuánto|precio|price|cost|costo)\b.*\?/i,
  /\b(where|dónde|ubicación|location|address|dirección)\b.*\?/i,
  /\b(when|cuándo|horario|hours|schedule|disponibilidad)\b.*\?/i,
  /\b(policy|políticas|cancel|cancela|deposit|depósito)\b/i,
  /\b(heal|sanar|aftercare|cuidado)\b/i,
];

function detectMode(message: string, currentMode: AssistantMode): AssistantMode {
  const lowerMessage = message.toLowerCase().trim();
  const conciergeScore = CONCIERGE_PATTERNS.filter(p => p.test(lowerMessage)).length;
  const lunaScore = LUNA_PATTERNS.filter(p => p.test(lowerMessage)).length;
  
  if (conciergeScore > lunaScore && conciergeScore >= 1) return 'concierge';
  if (lunaScore > conciergeScore && lunaScore >= 1) return 'luna';
  if (currentMode === 'concierge' && message.length > 50) return 'concierge';
  
  return currentMode;
}

// ============================================================================
// IMAGE COMPRESSION
// ============================================================================

const compressImage = async (file: File, maxDimension = 2048, quality = 0.85): Promise<File> => {
  if (file.size < 500 * 1024) return file;
  
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(`[Compress] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
};

// ============================================================================
// AVATAR VIDEO PLAYER
// ============================================================================

const AvatarVideoPlayer: React.FC<{ data: any }> = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoStatus, setVideoStatus] = useState(data?.status || 'generating');
  const [videoUrl, setVideoUrl] = useState(data?.videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoStatus === 'generating' && data?.videoId) {
      const pollInterval = setInterval(async () => {
        try {
          const { data: videoData } = await supabase
            .from('ai_avatar_videos')
            .select('status, video_url')
            .eq('id', data.videoId)
            .single();
          if (videoData?.status === 'ready' && videoData.video_url) {
            setVideoStatus('ready');
            setVideoUrl(videoData.video_url);
            clearInterval(pollInterval);
          }
        } catch { /* polling */ }
      }, 2000);
      return () => clearInterval(pollInterval);
    }
  }, [data?.videoId, videoStatus]);

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ferunda-avatar-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Video descargado');
    } catch { toast.error('Error al descargar'); }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-primary/20 border border-primary/30 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-primary/20">
        <Video className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Video Personalizado</span>
        {videoStatus === 'generating' && (
          <Badge variant="outline" className="ml-auto text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Generando...
          </Badge>
        )}
        {videoStatus === 'ready' && (
          <Badge variant="outline" className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Listo
          </Badge>
        )}
      </div>
      <div className="relative aspect-video bg-black/50 flex items-center justify-center">
        {videoStatus === 'generating' ? (
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Creando video con avatar AI...</p>
          </div>
        ) : videoUrl ? (
          <>
            <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" onEnded={() => setIsPlaying(false)} />
            <button
              onClick={() => { if (videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); setIsPlaying(!isPlaying); } }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 group"
            >
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                {isPlaying ? <Pause className="w-6 h-6 text-black" /> : <Play className="w-6 h-6 text-black ml-1" />}
              </div>
            </button>
          </>
        ) : <RotateCcw className="w-8 h-8 text-muted-foreground animate-spin" />}
      </div>
      <div className="p-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={handleDownload} disabled={videoStatus === 'generating'}>
          <Download className="w-4 h-4 mr-1" />
          Descargar
        </Button>
        <Button size="sm" variant="outline" onClick={() => { if (videoUrl) { navigator.clipboard.writeText(videoUrl); toast.success('Link copiado'); } }}>
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FerundaAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useAIVoice, setUseAIVoice] = useState(false);
  const [memory, setMemory] = useState<ConversationMemory>({});
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mode, setMode] = useState<AssistantMode>('concierge'); // Start in concierge mode
  
  // Conversation persistence
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try { return localStorage.getItem(CONVERSATION_ID_KEY); } catch { return null; }
  });
  const [initialGreetingFetched, setInitialGreetingFetched] = useState(false);
  
  // Upload progress
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // AR Preview state
  const [showARPreview, setShowARPreview] = useState(false);
  const [arPreviewData, setARPreviewData] = useState<{ imageUrl: string; bodyPart?: string; sketchId?: string } | null>(null);
  
  // Offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Health check + diagnostics state
  const [functionsHealth, setFunctionsHealth] = useState<Record<string, { ok: boolean; latency: number; error?: string }> | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    currentPhase: 'idle',
    phaseStartTime: null,
    elapsedMs: 0,
    lastError: null,
    functionsHealth: null,
    activeRequests: 0,
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { fingerprint } = useDeviceFingerprint();

  // Save conversationId to localStorage whenever it changes
  useEffect(() => {
    if (conversationId) {
      try { localStorage.setItem(CONVERSATION_ID_KEY, conversationId); } catch { /* ignore */ }
    }
  }, [conversationId]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Health check function with retry support
  const checkCriticalFunctions = useCallback(async (retryCount = 0): Promise<{ allHealthy: boolean; results: Record<string, { ok: boolean; latency: number; error?: string }> }> => {
    const isDebug = localStorage.getItem('ferunda_debug') === '1' || new URLSearchParams(window.location.search).get('debug') === '1';
    if (isDebug) console.log('[Agent] Running health check on critical functions...');
    
    const results: Record<string, { ok: boolean; latency: number; error?: string }> = {};
    
    await Promise.all(CRITICAL_FUNCTIONS.map(async (fn) => {
      const start = Date.now();
      try {
        // Increased timeout from 3s to 10s for cold starts
        const result = await Promise.race([
          supabase.functions.invoke(fn, { body: { healthCheck: true } }),
          new Promise<{ data: null; error: Error }>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 10000)
          )
        ]);
        // Check both error and data.status for degraded state
        const isOk = !result.error && result.data?.status !== 'degraded';
        results[fn] = { ok: isOk, latency: Date.now() - start, error: result.error?.message };
      } catch (e) {
        results[fn] = { ok: false, latency: Date.now() - start, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }));
    
    const allHealthy = Object.values(results).every(r => r.ok);
    if (isDebug) console.log('[Agent] Health check complete:', { allHealthy, results });
    
    setFunctionsHealth(results);
    setDiagnostics(prev => ({ ...prev, functionsHealth: results }));
    
    // Auto-retry once if degraded (with backoff)
    if (!allHealthy && retryCount < 1) {
      if (isDebug) console.log('[Agent] Health degraded, retrying in 3s...');
      await new Promise(r => setTimeout(r, 3000));
      return checkCriticalFunctions(retryCount + 1);
    }
    
    return { allHealthy, results };
  }, []);

  // Fetch initial greeting from backend when chat opens (NO hardcoded greeting)
  useEffect(() => {
    if (isOpen && messages.length === 0 && !initialGreetingFetched && fingerprint) {
      setInitialGreetingFetched(true);
      // Run health check in background (don't block greeting)
      checkCriticalFunctions();
      fetchInitialGreeting();
    }
  }, [isOpen, messages.length, initialGreetingFetched, fingerprint, checkCriticalFunctions]);
  
  // Diagnostics timer - update elapsed time while active
  useEffect(() => {
    if (diagnostics.currentPhase !== 'idle' && diagnostics.phaseStartTime) {
      const interval = setInterval(() => {
        setDiagnostics(prev => ({
          ...prev,
          elapsedMs: Date.now() - (prev.phaseStartTime || Date.now())
        }));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [diagnostics.currentPhase, diagnostics.phaseStartTime]);

  const fetchInitialGreeting = async () => {
    if (!fingerprint) return;
    
    console.log('[Agent] Fetching initial greeting from backend...');
    setIsLoading(true);
    
    // Master timeout - guarantees UI is never blocked indefinitely
    const masterTimeout = setTimeout(() => {
      console.warn('[Agent] Master timeout reached (15s) - forcing UI unlock');
      setIsLoading(false);
      if (messages.length === 0) {
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '¡Hola! ¿En qué puedo ayudarte con tu próximo tatuaje?',
          timestamp: new Date(),
          source: 'ui'
        }]);
      }
    }, 15000);
    
    try {
      // Step 1: Create conversation with short timeout (5s)
      let convId = conversationId;
      if (!convId) {
        console.log('[Agent] Creating new conversation...');
        try {
          const convPromise = supabase.functions.invoke('chat-session', {
            body: { session_id: fingerprint, mode: 'explore' },
            headers: { 'x-device-fingerprint': fingerprint }
          });
          
          const convResult = await Promise.race([
            convPromise,
            new Promise<{ data: null; error: Error }>((_, reject) => 
              setTimeout(() => reject(new Error('Conversation creation timeout')), 5000)
            )
          ]);
          
          if (!convResult.error && convResult.data?.conversation_id) {
            convId = convResult.data.conversation_id;
            setConversationId(convId);
            console.log('[Agent] Conversation created:', convId);
          }
        } catch (convError) {
          console.warn('[Agent] Conversation creation failed, continuing without:', convError);
          // Continue without conversationId - backend can handle this
        }
      }

      // Step 2: Request greeting with AbortController (10s timeout)
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const greetingTimeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-device-fingerprint': fingerprint,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hola' }],
            conversationId: convId || undefined,
            mode: 'explore',
          }),
          signal: controller.signal
        }
      );

      clearTimeout(greetingTimeout);

      if (!response.ok) {
        throw new Error(`Greeting request failed: ${response.status}`);
      }

      // Parse SSE response for greeting
      const greeting = await parseSSEResponse(response);
      
      if (greeting) {
        clearTimeout(masterTimeout);
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
          source: 'backend'
        }]);
      }
    } catch (error) {
      console.error('[Agent] Greeting fetch error:', error);
      clearTimeout(masterTimeout);
      // Fallback to a simple generic greeting
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '¡Hola! ¿En qué puedo ayudarte hoy?',
        timestamp: new Date(),
        source: 'ui'
      }]);
    } finally {
      clearTimeout(masterTimeout);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Parse SSE response with buffer for robust handling
  const parseSSEResponse = async (response: Response): Promise<string> => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let fullContent = '';
    let sseBuffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      
      // Process any remaining buffer
      if (sseBuffer.startsWith('data: ')) {
        const dataStr = sseBuffer.slice(6).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
          } catch { /* ignore */ }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Voice recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speakMessage = async (text: string) => {
    if (useAIVoice) {
      try {
        const response = await supabase.functions.invoke('elevenlabs-voice', {
          body: { action: 'generate_speech', voiceId: 'EXAVITQu4vr4xnSDxMaL', text: text.substring(0, 500) }
        });
        if (response.data instanceof Blob) {
          const audioUrl = URL.createObjectURL(response.data);
          const audio = new Audio(audioUrl);
          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); };
          await audio.play();
          return;
        }
      } catch { /* fallback */ }
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      synthRef.current = new SpeechSynthesisUtterance(text);
      synthRef.current.lang = 'es-ES';
      synthRef.current.onstart = () => setIsSpeaking(true);
      synthRef.current.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(synthRef.current);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Image upload with compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    
    const MAX_SIZE_MB = 8;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato no válido. Usa JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Imagen muy grande (máx ${MAX_SIZE_MB}MB)`);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(30);
    
    try {
      const compressed = await compressImage(file);
      setUploadedImage(compressed);
      setUploadProgress(100);
      
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressed);
      
      console.log(`[Agent] Image ready: ${(compressed.size / 1024).toFixed(0)}KB`);
    } catch {
      toast.error('Error procesando imagen');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() && !uploadedImage) return;
    if (!isOnline) {
      toast.error('Sin conexión a internet');
      return;
    }

    // Snapshot file before clearing UI
    const fileToUpload = uploadedImage;
    const messageText = inputValue;
    const previewSnapshot = imagePreview;

    // Detect mode based on intent
    const detectedMode = detectMode(messageText, mode);
    if (detectedMode !== mode) {
      console.log(`[Agent] Mode: ${mode} → ${detectedMode}`);
      setMode(detectedMode);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText || '📷 Imagen compartida',
      timestamp: new Date(),
      source: 'ui',
      attachments: previewSnapshot ? [{ type: 'image', url: previewSnapshot }] : undefined
    };

    // Clear UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedImage(null);
    setImagePreview(null);
    setIsLoading(true);

    // =========================================================================
    // WATCHDOG: Force UI unlock after 30 seconds no matter what
    // =========================================================================
    const watchdogTimeout = setTimeout(() => {
      console.warn('[Agent] Watchdog timeout (30s) - forcing UI unlock');
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error('La respuesta tardó demasiado. Puedes intentar de nuevo.');
    }, 30000);

    // Abort controller for timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      console.log('[Agent] Request timeout - aborting');
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      // Upload image if present - using direct Supabase storage upload
      let imageUrl: string | null = null;

      if (fileToUpload) {
        console.log('[Agent] Phase: direct_upload');
        setDiagnostics(prev => ({ ...prev, currentPhase: 'direct_upload', phaseStartTime: Date.now(), activeRequests: prev.activeRequests + 1 }));
        setIsUploading(true);
        setUploadProgress(30);

        try {
          // Generate unique path for the image
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const ext = fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
          const sanitizedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
          const folder = fingerprint || 'anonymous';
          const filePath = `${folder}/${timestamp}-${randomSuffix}.${sanitizedExt}`;
          
          console.log('[Agent] Uploading to path:', filePath, 'size:', fileToUpload.size);
          setUploadProgress(50);
          
          // Direct upload to Supabase storage with retry
          const uploadWithRetry = async (attempt = 1): Promise<string> => {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-uploads')
              .upload(filePath, fileToUpload, {
                contentType: fileToUpload.type || 'image/jpeg',
                upsert: false,
              });
            
            if (uploadError) {
              console.error(`[Agent] Upload attempt ${attempt} failed:`, uploadError);
              if (attempt < 2) {
                await new Promise(r => setTimeout(r, 1000));
                return uploadWithRetry(attempt + 1);
              }
              throw uploadError;
            }
            
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('chat-uploads')
              .getPublicUrl(uploadData.path);
            
            if (!urlData?.publicUrl) {
              throw new Error('No se pudo obtener URL pública');
            }
            
            return urlData.publicUrl;
          };
          
          imageUrl = await uploadWithRetry();
          setUploadProgress(100);
          setDiagnostics(prev => ({ ...prev, currentPhase: 'upload_complete' }));
          console.log('[Agent] Phase: upload_complete', { size: fileToUpload.size, url: imageUrl });
          
          // Update user message with real image URL (instead of preview blob)
          setMessages(prev => prev.map(m => 
            m.id === userMessage.id && m.attachments?.[0]
              ? { ...m, attachments: [{ ...m.attachments[0], url: imageUrl! }] }
              : m
          ));
        } catch (uploadError) {
          const errorDetails = getErrorDetails(uploadError);
          console.error('[Agent] Image upload failed:', uploadError);
          setDiagnostics(prev => ({ ...prev, lastError: errorDetails.title }));
          
          // Add assistant message explaining the failure
          const failMsgId = crypto.randomUUID();
          setMessages(prev => [...prev, {
            id: failMsgId,
            role: 'assistant',
            content: '⚠️ No pude analizar la imagen porque hubo un error al subirla. ¿Puedes describir qué contiene o intentar de nuevo?',
            timestamp: new Date(),
            source: 'ui'
          }]);
          
          toast.warning(errorDetails.title, { description: `${errorDetails.description} ${errorDetails.action}` });
          // Continue without image - don't block the chat
        } finally {
          setIsUploading(false);
          setDiagnostics(prev => ({ ...prev, activeRequests: Math.max(0, prev.activeRequests - 1) }));
        }
      }

      console.log('[Agent] Phase: invoke_concierge');
      setDiagnostics(prev => ({ ...prev, currentPhase: 'invoke_concierge', phaseStartTime: Date.now(), activeRequests: prev.activeRequests + 1 }));
      
      // Build messages array - send last 20 messages for better context
      const conciergeMessages = [
        ...messages.filter(m => m.source === 'backend' || m.role === 'user').slice(-20).map((m) => ({ 
          role: m.role, 
          content: m.content 
        })),
        { role: 'user', content: messageText || 'Image shared' }
      ];
      
      // Map UI mode to concierge mode
      const conciergeMode = mode === 'luna' ? 'qualify' : 'explore';
      
      // Call Studio Concierge with SSE streaming
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-device-fingerprint': fingerprint || 'unknown',
          },
          body: JSON.stringify({
            messages: conciergeMessages,
            referenceImages: imageUrl ? [imageUrl] : [],
            conversationId: conversationId,
            mode: conciergeMode,
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Concierge error: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      // Handle SSE streaming response with robust parsing
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let fullContent = '';
      let sseBuffer = '';
      let arAction: { imageUrl: string; bodyPart?: string } | null = null;
      
      // Create placeholder message for streaming
      const assistantMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        source: 'backend'
      }]);

      console.log('[Agent] Phase: stream_open');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[Agent] Phase: stream_done');
            break;
          }

          sseBuffer += decoder.decode(value, { stream: true });
          
          // Process complete lines only
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(dataStr);
                
                // Handle action events (AR preview, buttons)
                if (parsed.type === 'ar_action' && parsed.arReferenceImage) {
                  arAction = {
                    imageUrl: parsed.arReferenceImage,
                    bodyPart: parsed.suggestedBodyPart
                  };
                  continue;
                }
                
                // Handle streaming content
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  // Update message in real-time
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMsgId ? { ...m, content: fullContent } : m
                  ));
                }
              } catch {
                // Ignore parse errors for malformed SSE chunks
              }
            }
          }
        }
        
        // Process any remaining buffer content
        if (sseBuffer.startsWith('data: ')) {
          const dataStr = sseBuffer.slice(6).trim();
          if (dataStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
              }
            } catch { /* ignore */ }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Final update with complete content
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content: fullContent || 'Recibí tu mensaje.' } : m
      ));

      // Handle AR preview action if detected
      if (arAction) {
        setTimeout(() => {
          setARPreviewData(arAction);
          setShowARPreview(true);
          toast.success('✨ AR Preview listo');
        }, 500);
      }

      if (useAIVoice && fullContent) speakMessage(fullContent);

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log('[Agent] Phase: stream_abort');
        toast.error('La respuesta tardó demasiado. Intenta de nuevo.');
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Lo siento, tardé mucho en responder. ¿Podrías intentarlo de nuevo?',
          timestamp: new Date(),
          source: 'ui'
        }]);
      } else {
        console.error('[Agent] Phase: stream_error', error);
        toast.error('Error de conexión. Reintentando...');
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Lo siento, hubo un error. ¿Podrías intentarlo de nuevo?',
          timestamp: new Date(),
          source: 'ui'
        }]);
        const errorDetails = getErrorDetails(error);
        setDiagnostics(prev => ({ ...prev, lastError: errorDetails.title }));
        toast.error(errorDetails.title, {
          description: `${errorDetails.description} ${errorDetails.action}`,
          duration: 6000,
        });
      }
    } finally {
      clearTimeout(watchdogTimeout);
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
      setDiagnostics(prev => ({ 
        ...prev, 
        currentPhase: 'idle', 
        phaseStartTime: null, 
        activeRequests: 0 
      }));
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render attachment
  const renderAttachment = (attachment: NonNullable<Message['attachments']>[0]) => {
    switch (attachment.type) {
      case 'image':
        return <img src={attachment.url} alt="Attachment" className="max-w-full rounded-lg max-h-48 object-cover" />;
      case 'video':
        return (
          <div className="space-y-2">
            {attachment.label && <div className="flex items-center gap-2 text-xs text-primary font-medium"><Zap className="w-3 h-3" />{attachment.label}</div>}
            <video src={attachment.url} controls className="max-w-full rounded-lg max-h-48" />
          </div>
        );
      case 'heatmap':
        const movementRisk = attachment.data?.movementRisk || 5;
        const riskColor = movementRisk > 7 ? 'from-red-500 to-red-600' : movementRisk > 4 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-green-500';
        return (
          <div className={`bg-gradient-to-r ${riskColor} p-4 rounded-lg text-white`}>
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4" />
              <span className="font-semibold text-sm">Simulación 3D - {attachment.data?.detectedZone || 'Zona detectada'}</span>
            </div>
            <div className="text-xs"><span>Riesgo de distorsión:</span> <span className="font-bold">{movementRisk}/10</span></div>
          </div>
        );
      case 'analysis':
        const styleMatch = attachment.data?.styleMatch || 0;
        const matchColor = styleMatch > 85 ? 'text-emerald-500' : styleMatch > 60 ? 'text-amber-500' : 'text-red-500';
        return (
          <div className="bg-secondary/50 border border-border p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Análisis de Referencia</span></div>
              <span className={`font-bold text-lg ${matchColor}`}>{styleMatch}%</span>
            </div>
            {attachment.data?.detectedStyles && (
              <div className="flex flex-wrap gap-1">
                {attachment.data.detectedStyles.map((style: string, i: number) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{style}</span>
                ))}
              </div>
            )}
          </div>
        );
      case 'ar_preview':
        return (
          <div className="bg-gradient-to-br from-purple-900/30 to-primary/20 border border-primary/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Vista Previa AR</span>
            </div>
            {attachment.url && <img src={attachment.url} alt="Diseño" className="w-full rounded-lg mb-3 max-h-48 object-contain bg-black/20" />}
            <Button
              onClick={() => { setARPreviewData({ imageUrl: attachment.url || '', bodyPart: attachment.data?.bodyPart }); setShowARPreview(true); }}
              className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver en mi cuerpo (AR)
            </Button>
          </div>
        );
      case 'avatar_video':
        return <AvatarVideoPlayer data={attachment.data} />;
      case 'calendar':
        return (
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">Slots Disponibles</span>
            </div>
            <div className="space-y-2">
              {attachment.data?.slots?.map((slot: any, i: number) => (
                <Button key={i} variant="outline" size="sm" className="w-full justify-start" onClick={() => toast.success(`Slot: ${slot.formatted || slot}`)}>
                  {slot.formatted || slot}
                </Button>
              ))}
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">Link de Depósito</span>
            </div>
            <Button variant="default" size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={() => window.open(attachment.data?.paymentUrl, '_blank')}>
              Pagar Depósito ${attachment.data?.amount}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const renderToolCall = (toolCall: NonNullable<Message['toolCalls']>[0]) => {
    const toolConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      'analysis_reference': { icon: <ImageIcon className="w-3 h-3" />, label: 'Analizando', color: 'bg-blue-500/20 text-blue-500' },
      'viability_simulator': { icon: <Zap className="w-3 h-3" />, label: 'Simulando 3D', color: 'bg-purple-500/20 text-purple-500' },
      'check_calendar': { icon: <Calendar className="w-3 h-3" />, label: 'Calendario', color: 'bg-green-500/20 text-green-500' },
      'create_deposit_link': { icon: <CreditCard className="w-3 h-3" />, label: 'Pago', color: 'bg-emerald-500/20 text-emerald-500' },
      'generate_ar_sketch': { icon: <Eye className="w-3 h-3" />, label: 'AR Sketch', color: 'bg-purple-500/20 text-purple-500' },
    };
    const config = toolConfig[toolCall.name] || { icon: <Sparkles className="w-3 h-3" />, label: toolCall.name, color: 'bg-primary/20 text-primary' };

    return (
      <Badge variant="outline" className={`text-xs border-0 ${config.color}`}>
        {toolCall.status === 'pending' ? <Loader2 className="w-3 h-3 animate-spin" /> : config.icon}
        <span className="ml-1">{config.label}</span>
        {toolCall.status === 'completed' && <CheckCircle className="w-3 h-3 ml-1" />}
      </Badge>
    );
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'concierge': return 'Reservas';
      case 'luna': return 'Preguntas';
      default: return 'Concierge';
    }
  };

  return (
    <>
      {/* AR Preview Modal */}
      {showARPreview && arPreviewData && (
        <ARPreview
          isOpen={showARPreview}
          onClose={() => setShowARPreview(false)}
          referenceImageUrl={arPreviewData.imageUrl}
          suggestedBodyPart={arPreviewData.bodyPart}
          mode="tracking"
          onBookingClick={() => { setShowARPreview(false); toast.success('¡Genial! Te ayudo a reservar'); }}
          onCapture={() => toast.success('Captura guardada')}
          onFeedback={(feedback) => { toast.info(feedback === 'love' ? 'Perfecto!' : 'Refinando...'); setShowARPreview(false); }}
        />
      )}

      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform group"
          >
            <MessageCircle className="w-7 h-7 text-primary-foreground group-hover:scale-110 transition-transform" />
            <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-primary-foreground bg-primary/80 px-1.5 rounded-full whitespace-nowrap">
              Chat
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className={`fixed z-50 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
              isExpanded ? 'inset-4' : 'bottom-6 right-6 w-[400px] h-[600px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Ferunda Concierge</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{getModeLabel()}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400">
                      ✨ AI
                    </Badge>
                    {!isOnline && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400 border-red-500/30">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                    {functionsHealth && !Object.values(functionsHealth).every(r => r.ok) && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer"
                        onClick={() => checkCriticalFunctions()}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Degradado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => isSpeaking ? stopSpeaking() : speakMessage(messages[messages.length - 1]?.content || '')}>
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* DEV Diagnostics Panel - Only shown with debug flag */}
            {(localStorage.getItem('ferunda_debug') === '1' || new URLSearchParams(window.location.search).get('debug') === '1') && diagnostics.currentPhase !== 'idle' && (
              <div className="absolute top-14 right-2 bg-black/90 text-xs text-green-400 p-2 rounded font-mono max-w-[180px] z-50 border border-green-500/30">
                <div className="flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span className="font-semibold">Diagnostics</span>
                </div>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Phase:</span>
                    <span className="text-cyan-400">{diagnostics.currentPhase}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Elapsed:</span>
                    <span className={diagnostics.elapsedMs > 5000 ? 'text-amber-400' : ''}>{diagnostics.elapsedMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span>{diagnostics.activeRequests}</span>
                  </div>
                  {diagnostics.lastError && (
                    <div className="text-red-400 mt-1 truncate">⚠ {diagnostics.lastError}</div>
                  )}
                </div>
                {diagnostics.functionsHealth && (
                  <div className="mt-1 pt-1 border-t border-green-500/30 space-y-0.5">
                    {Object.entries(diagnostics.functionsHealth).map(([fn, status]) => (
                      <div key={fn} className={`flex justify-between text-[9px] ${status.ok ? 'text-green-400' : 'text-red-400'}`}>
                        <span>{fn.replace('studio-', '').replace('chat-', '')}</span>
                        <span>{status.ok ? `✓${status.latency}ms` : '✗'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md' 
                        : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
                    } p-3`}>
                      {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
                      
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {message.toolCalls.map((tc, i) => <React.Fragment key={i}>{renderToolCall(tc)}</React.Fragment>)}
                        </div>
                      )}

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((att, i) => <div key={i}>{renderAttachment(att)}</div>)}
                        </div>
                      )}

                      <span className="text-[10px] opacity-50 mt-1 block">
                        {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {isUploading ? 'Subiendo imagen...' : 'Pensando...'}
                        </span>
                      </div>
                      {isUploading && uploadProgress > 0 && (
                        <Progress value={uploadProgress} className="mt-2 h-1" />
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-border bg-muted/30">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-16 rounded-lg object-cover" />
                  <button
                    onClick={() => { setUploadedImage(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="shrink-0"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isLoading ? "Esperando respuesta..." : "Escribe tu mensaje..."}
                  disabled={!isOnline}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoice}
                  disabled={isLoading}
                  className={`shrink-0 ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || (!inputValue.trim() && !uploadedImage)}
                  size="icon"
                  className="shrink-0 bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FerundaAgent;
