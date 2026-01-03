import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Mic, MicOff, Loader2, 
  Sparkles, Calendar, CreditCard, Image as ImageIcon,
  ChevronDown, Volume2, VolumeX, Maximize2, Minimize2,
  AlertTriangle, CheckCircle, Thermometer, Zap, Palette,
  Video, Download, Share2, Play, Pause, RotateCcw, Eye,
  WifiOff, XCircle, Activity, Clock, RefreshCw,
  FileText, File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { chatCache } from '@/lib/chatCache';
import { warmUpEdgeFunctions } from '@/lib/edgeWarmUp';

// ============================================================================
// LAZY LOADED COMPONENTS (Fase 7)
// ============================================================================

const ARPreview = lazy(() => 
  import('@/components/concierge/ar/ARPreview').then(m => ({ default: m.ARPreview }))
);

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source?: 'backend' | 'ui';
  attachments?: {
    type: 'image' | 'video' | 'heatmap' | 'calendar' | 'payment' | 'analysis' | 'variations' | 'avatar_video' | 'ar_preview' | 'document';
    url?: string;
    data?: any;
    label?: string;
    fileName?: string;
    mimeType?: string;
  }[];
  toolCalls?: {
    name: string;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
  }[];
}

// File upload types
interface PendingUpload {
  file: globalThis.File;
  category: 'image' | 'document';
  previewUrl?: string;
  fileName: string;
  mimeType: string;
}

const ALLOWED_FILE_TYPES: Record<string, { category: 'image' | 'document'; icon: string; label: string }> = {
  'image/jpeg': { category: 'image', icon: '🖼️', label: 'JPG' },
  'image/png': { category: 'image', icon: '🖼️', label: 'PNG' },
  'image/webp': { category: 'image', icon: '🖼️', label: 'WebP' },
  'image/gif': { category: 'image', icon: '🖼️', label: 'GIF' },
  'application/pdf': { category: 'document', icon: '📄', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'document', icon: '📝', label: 'DOCX' },
  'application/msword': { category: 'document', icon: '📝', label: 'DOC' },
};

const MAX_FILE_SIZE_MB = 10;

interface ConversationMemory {
  clientName?: string;
  previousTattoos?: string[];
  preferences?: string[];
  skinTone?: string;
  lastAnalysis?: any;
}

// Unified mode - ETHEREAL only (Luna deprecated)
type AssistantMode = 'ethereal';
type LoadingPhase = 'thinking' | 'analyzing' | 'slow';

// ============================================================================
// CONSTANTS (Fase 6: Timeouts agresivos)
// ============================================================================

const CONVERSATION_ID_KEY = 'ferunda_conversation_id';
const REQUEST_TIMEOUT_MS = 35000; // Aumentado para Gateway + cold starts
const WATCHDOG_TIMEOUT_MS = 30000; // Aumentado para Gateway
const MAX_MESSAGES_CONTEXT = 10; // Reducido de 20 a 10

// ============================================================================
// LANGUAGE DETECTION (Fase 8: Idioma automático)
// ============================================================================

type DetectedLanguage = 'es' | 'en';

// Detect language from text using pattern matching
function detectLanguageFromText(text: string): DetectedLanguage {
  const spanishPatterns = /\b(hola|quiero|necesito|tatuaje|cuánto|cómo|dónde|cuándo|gracias|por favor|buenos|buenas|qué|tengo|puedo|soy|estoy|reservar|cita|diseño|precio|pregunta|ayuda|busco|mi|para|con|una?|del?|las?|los?|ese?|esta?)\b/i;
  const englishPatterns = /\b(hello|hi|want|need|tattoo|how much|where|when|thanks|please|what|have|can|am|is|are|book|appointment|design|price|question|help|looking|my|for|with|the|this|that)\b/i;
  
  const spanishMatches = (text.match(spanishPatterns) || []).length;
  const englishMatches = (text.match(englishPatterns) || []).length;
  
  // If more Spanish patterns detected, use Spanish
  if (spanishMatches > englishMatches) return 'es';
  if (englishMatches > spanishMatches) return 'en';
  
  // Default based on browser language
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  return browserLang.startsWith('es') ? 'es' : 'en';
}

// Get browser language preference
function getBrowserLanguage(): DetectedLanguage {
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  return browserLang.startsWith('es') ? 'es' : 'en';
}

// Instant greeting based on language
const getInstantGreeting = (lang: DetectedLanguage): string => {
  return lang === 'es' 
    ? 'Bienvenido. Soy tu enlace exclusivo con el arte de Ferunda. ¿Qué visión traes hoy?'
    : 'Welcome. I\'m your exclusive link to Ferunda\'s art. What vision do you bring today?';
};

// Critical functions for health check - now using ai-router
const CRITICAL_FUNCTIONS = ['ai-router', 'chat-upload-url', 'chat-session'];

// Error messages map
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
// INTENT DETECTION - All requests go through ETHEREAL (unified)
// ============================================================================

// DEPRECATED: Luna patterns - all messages now go through unified AI Router
// Keeping for reference only
const BOOKING_PATTERNS = [
  /\b(book|booking|reserv|cita|agendar|schedule|appointment)\b/i,
  /\b(quiero|want|need).*(tattoo|tatuaje|tatuar)/i,
  /\b(new|nuevo|nueva).*(tattoo|tatuaje|design|diseño)/i,
  /\b(cover.?up|cover|cubrir|tapar)\b/i,
  /\b(touch.?up|retouch|retoque|retocar)\b/i,
  /\b(full|half|quarter).*(sleeve|espalda|back)\b/i,
  /\b(reference|referencia|ejemplo|idea|imagen|image|photo|foto)\b/i,
];

// Helper to detect request type for AI Router
function detectRequestType(message: string, hasImage: boolean): 'chat' | 'vision' | 'booking' {
  if (hasImage) return 'vision';
  
  const lowerMessage = message.toLowerCase().trim();
  const hasBookingIntent = BOOKING_PATTERNS.some(p => p.test(lowerMessage));
  
  return hasBookingIntent ? 'booking' : 'chat';
}

// ============================================================================
// IMAGE COMPRESSION VIVO (2MB target with progressive quality)
// ============================================================================

const TARGET_SIZE_MB = 2;
const TARGET_SIZE_BYTES = TARGET_SIZE_MB * 1024 * 1024;

interface CompressionResult {
  file: globalThis.File;
  originalSize: number;
  finalSize: number;
  wasCompressed: boolean;
}

const compressImage = async (
  file: globalThis.File, 
  maxDimension = 1920, 
  initialQuality = 0.85,
  onProgress?: (progress: number) => void
): Promise<globalThis.File> => {
  // Skip small files
  if (file.size <= TARGET_SIZE_BYTES) {
    onProgress?.(100);
    return file;
  }
  
  onProgress?.(10);
  
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      
      // Calculate scale to fit max dimension
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      onProgress?.(30);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { onProgress?.(100); resolve(file); return; }
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      onProgress?.(50);
      
      // Progressive quality reduction until under 2MB
      let quality = initialQuality;
      let blob: Blob | null = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        blob = await new Promise<Blob | null>((res) => {
          canvas.toBlob((b) => res(b), 'image/jpeg', quality);
        });
        
        if (!blob) break;
        
        onProgress?.(50 + (attempts + 1) * 10);
        
        if (blob.size <= TARGET_SIZE_BYTES) {
          console.log(`[CompressVivo] ✅ Achieved ${(blob.size / 1024).toFixed(0)}KB at quality ${(quality * 100).toFixed(0)}%`);
          break;
        }
        
        // Reduce quality for next attempt
        quality -= 0.15;
        attempts++;
        
        if (quality < 0.3) {
          // Also reduce dimensions if quality is too low
          width = Math.round(width * 0.8);
          height = Math.round(height * 0.8);
          canvas.width = width;
          canvas.height = height;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          quality = 0.7;
        }
      }
      
      if (!blob) { onProgress?.(100); resolve(file); return; }
      
      const compressedFile = new window.File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      
      console.log(`[CompressVivo] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
      onProgress?.(100);
      resolve(compressedFile);
    };
    
    img.onerror = () => { 
      URL.revokeObjectURL(objectUrl); 
      onProgress?.(100);
      resolve(file); 
    };
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
// LOADING PHASE INDICATOR (Fase 6)
// ============================================================================

const LoadingIndicator = React.forwardRef<HTMLDivElement, { phase: LoadingPhase }>(
  ({ phase }, ref) => {
    const phaseText = {
      thinking: 'Pensando...',
      analyzing: 'Analizando tu mensaje...',
      slow: 'Tomando más tiempo de lo usual...',
    };
    
    return (
      <div ref={ref} className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{phaseText[phase]}</span>
      </div>
    );
  }
);
LoadingIndicator.displayName = 'LoadingIndicator';

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
  const [uploadedImage, setUploadedImage] = useState<globalThis.File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<PendingUpload | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{ fileName: string; mimeType: string } | null>(null);
  const [mode] = useState<AssistantMode>('ethereal'); // Always ethereal now
  
  // Fase 8: Language detection
  const [userLanguage, setUserLanguage] = useState<DetectedLanguage>(() => getBrowserLanguage());
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('thinking');
  
  // Fase 2: Pre-uploaded image URL
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isPreUploading, setIsPreUploading] = useState(false);
  
  // Conversation persistence - Fase 1: Generate locally
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try { 
      const stored = localStorage.getItem(CONVERSATION_ID_KEY);
      return stored || crypto.randomUUID();
    } catch { 
      return crypto.randomUUID(); 
    }
  });
  
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
  
  // Streaming optimization refs (Fase 3)
  const contentBufferRef = useRef('');
  const updateScheduledRef = useRef(false);
  const streamingMsgIdRef = useRef<string | null>(null);
  const { fingerprint } = useDeviceFingerprint();
  const { user } = useAuth();
  const { workspaceId } = useWorkspace(user?.id ?? null);

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

  // ============================================================================
  // REALTIME BÁSICO VIVO - Live updates for chats/images
  // ============================================================================
  
  useEffect(() => {
    if (!conversationId || !isOpen) return;
    
    console.log('[RealtimeVivo] 🔌 Subscribing to conversation:', conversationId);
    
    const channel = supabase
      .channel(`concierge-live-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'concierge_messages',
          filter: `session_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[RealtimeVivo] 📨 New message:', payload.new);
          const newMsg = payload.new as any;
          
          // Only add if it's from assistant and not already in messages
          if (newMsg.role === 'assistant') {
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) return prev;
              
              return [...prev, {
                id: newMsg.id,
                role: newMsg.role,
                content: newMsg.content,
                timestamp: new Date(newMsg.created_at),
                source: 'backend' as const,
              }];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'concierge_sessions',
          filter: `id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[RealtimeVivo] 🔄 Session updated:', payload.new);
          // Could update session stage indicator here
        }
      )
      .subscribe((status) => {
        console.log('[RealtimeVivo] Status:', status);
      });
    
    return () => {
      console.log('[RealtimeVivo] 🔌 Unsubscribing');
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOpen]);

  // Fase 1: INSTANT GREETING - No blocking calls
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Show instant greeting immediately in detected language
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getInstantGreeting(userLanguage),
        timestamp: new Date(),
        source: 'ui'
      }]);
      
      // Health check completely in background - no blocking
      checkCriticalFunctions().catch(console.warn);
      
      // Try to load cached conversation
      loadCachedConversation();
    }
  }, [isOpen]);

  // Load cached conversation from IndexedDB
  const loadCachedConversation = async () => {
    if (!conversationId) return;
    try {
      const cached = await chatCache.getConversation(conversationId);
      if (cached && cached.messages.length > 1) {
        setMessages(cached.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
          source: 'backend' as const,
        })));
      }
    } catch {
      // Silently fail
    }
  };

  // Reset conversation for testing new Gateway
  const resetConversation = useCallback(async () => {
    const isDebug = localStorage.getItem('ferunda_debug') === '1';
    if (isDebug) console.log('[Agent] Resetting conversation...');
    
    try {
      localStorage.removeItem(CONVERSATION_ID_KEY);
      await chatCache.clear();
    } catch { /* ignore */ }
    
    const newId = crypto.randomUUID();
    setConversationId(newId);
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      content: getInstantGreeting(userLanguage),
      timestamp: new Date(),
      source: 'ui'
    }]);
    setMemory({});
    
    if (isDebug) console.log('[Agent] New conversation:', newId);
    toast.success('Conversación reiniciada');
  }, []);

  // Health check function with retry support (runs in background only)
  const checkCriticalFunctions = useCallback(async (retryCount = 0): Promise<{ allHealthy: boolean; results: Record<string, { ok: boolean; latency: number; error?: string }> }> => {
    const isDebug = localStorage.getItem('ferunda_debug') === '1';
    if (isDebug) console.log('[Agent] Background health check...');
    
    const results: Record<string, { ok: boolean; latency: number; error?: string }> = {};
    
    await Promise.all(CRITICAL_FUNCTIONS.map(async (fn) => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          supabase.functions.invoke(fn, { body: { healthCheck: true } }),
          new Promise<{ data: null; error: Error }>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 8000)
          )
        ]);
        // Consider healthy if no error (edge functions may not return explicit status)
        const isOk = !result.error;
        results[fn] = { ok: isOk, latency: Date.now() - start, error: result.error?.message };
      } catch (e) {
        results[fn] = { ok: false, latency: Date.now() - start, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }));
    
    const allHealthy = Object.values(results).every(r => r.ok);
    setFunctionsHealth(results);
    setDiagnostics(prev => ({ ...prev, functionsHealth: results }));
    
    if (!allHealthy && retryCount < 1) {
      await new Promise(r => setTimeout(r, 2000));
      return checkCriticalFunctions(retryCount + 1);
    }
    
    return { allHealthy, results };
  }, []);
  
  // Diagnostics timer
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

  // Fase 6: Progressive loading phase updates
  useEffect(() => {
    if (!isLoading) {
      setLoadingPhase('thinking');
      return;
    }
    const t1 = setTimeout(() => setLoadingPhase('analyzing'), 3000);
    const t2 = setTimeout(() => setLoadingPhase('slow'), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoading]);

  // Parse SSE response with buffer
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
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) fullContent += delta;
            } catch { /* ignore */ }
          }
        }
      }
      
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

  // Ref for auto-scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, shouldAutoScroll]);

  // Track scroll position to determine if user scrolled up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 80;
    setShouldAutoScroll(isNearBottom);
  }, []);

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

  // ============================================================================
  // SIGNED URL UPLOAD (V2 - AbortController compatible)
  // ============================================================================
  
  const uploadFileWithSignedUrl = async (
    file: File, 
    timeoutMs: number = 25000,
    signal?: AbortSignal
  ): Promise<{ publicUrl: string }> => {
    console.log('[UploadV2] Starting signed URL upload:', file.name);
    
    // Step 1: Get signed URL from edge function
    const signedUrlController = new AbortController();
    const signedUrlTimeout = setTimeout(() => signedUrlController.abort(), 10000);
    
    try {
      const { data: signedData, error: signedError } = await supabase.functions.invoke('chat-upload-url', {
        body: {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          conversationId: conversationId || 'anonymous',
        },
      });
      
      clearTimeout(signedUrlTimeout);
      
      if (signedError || !signedData?.uploadUrl) {
        console.error('[UploadV2] signed_url_failed:', signedError);
        throw new Error('No se pudo obtener URL de subida');
      }
      
      console.log('[UploadV2] signed_url_ok');
      
      // Step 2: PUT file to signed URL (this RESPECTS AbortController)
      const putController = new AbortController();
      const putTimeout = setTimeout(() => putController.abort(), timeoutMs);
      
      // Combine external signal with our timeout
      if (signal) {
        signal.addEventListener('abort', () => putController.abort());
      }
      
      const putResponse = await fetch(signedData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        signal: putController.signal,
      });
      
      clearTimeout(putTimeout);
      
      if (!putResponse.ok) {
        console.error('[UploadV2] put_failed:', putResponse.status);
        throw new Error(`Upload failed: ${putResponse.status}`);
      }
      
      console.log('[UploadV2] put_ok:', signedData.publicUrl);
      return { publicUrl: signedData.publicUrl };
      
    } catch (e) {
      clearTimeout(signedUrlTimeout);
      if (e instanceof Error && e.name === 'AbortError') {
        console.warn('[UploadV2] Upload aborted/timeout');
        throw new Error('Upload timeout - intenta de nuevo');
      }
      throw e;
    }
  };

  // Fase 2: Pre-upload image immediately after selection (using V2)
  const preUploadImage = async (file: File): Promise<string | null> => {
    if (!fingerprint) return null;
    
    try {
      setIsPreUploading(true);
      const result = await uploadFileWithSignedUrl(file, 20000);
      console.log('[Agent] Pre-upload complete:', result.publicUrl);
      return result.publicUrl;
    } catch (e) {
      console.warn('[Agent] Pre-upload failed:', e);
      return null;
    } finally {
      setIsPreUploading(false);
    }
  };

  // Unified file upload handler (images + documents)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    
    // Check HEIC (not supported)
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
    if (isHeic) {
      toast.error('Formato HEIC no compatible.', {
        description: 'En iPhone: Compartir → Opciones → "Más compatible" o envíala como JPG/PNG.'
      });
      return;
    }

    // Check file size (10MB limit)
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Archivo muy grande (máx ${MAX_FILE_SIZE_MB}MB)`);
      return;
    }

    // Check if file type is allowed
    const fileTypeInfo = ALLOWED_FILE_TYPES[file.type];
    if (!fileTypeInfo) {
      toast.error('Formato no válido.', {
        description: 'Usa JPG, PNG, WebP, GIF, PDF o DOCX.'
      });
      return;
    }

    console.log(`[Agent] File selected: ${file.name} (${fileTypeInfo.label}, ${(file.size / 1024).toFixed(0)}KB)`);

    if (fileTypeInfo.category === 'image') {
      // Image handling with compression + progress
      setIsUploading(true);
      setUploadProgress(0);
      
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      
      // Compress with progress callback
      const compressed = await compressImage(file, 1920, 0.85, (progress) => {
        setUploadProgress(Math.min(progress * 0.6, 60)); // 0-60% for compression
      });
      
      if (compressed.size > 2 * 1024 * 1024) {
        toast.error('No pude comprimirla lo suficiente (máx 2MB).', {
          description: 'Prueba una captura de pantalla o recorta la imagen antes de subirla.',
          action: {
            label: 'Intenta de nuevo',
            onClick: () => fileInputRef.current?.click(),
          },
        });
        setImagePreview(null);
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(65);
      setUploadedImage(compressed);
      setUploadedFile({
        file: compressed,
        category: 'image',
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
      });
      setDocumentPreview(null);
      
      // Pre-upload with progress
      setUploadProgress(70);
      const preUploadedUrl = await preUploadImage(compressed);
      if (preUploadedUrl) {
        setPendingImageUrl(preUploadedUrl);
        setUploadProgress(100);
        toast.success('Imagen lista', { description: `${(compressed.size / 1024).toFixed(0)}KB subidos a Supabase` });
      } else {
        setUploadProgress(0);
        toast.error('Error al subir imagen', { 
          description: 'No se pudo subir a Supabase.',
          action: {
            label: 'Intenta de nuevo',
            onClick: () => fileInputRef.current?.click(),
          },
        });
        setImagePreview(null);
        setUploadedImage(null);
        setUploadedFile(null);
      }
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } else {
      // Document handling (PDF/DOCX) - no compression
      setDocumentPreview({ fileName: file.name, mimeType: file.type });
      setImagePreview(null);
      setUploadedImage(null);
      setPendingImageUrl(null);
      setUploadedFile({
        file,
        category: 'document',
        fileName: file.name,
        mimeType: file.type,
      });
      console.log(`[Agent] Document ready: ${file.name}`);
    }
  };

  // Legacy alias
  const handleImageUpload = handleFileUpload;

  // Fase 3: Optimized streaming update with requestAnimationFrame
  const scheduleStreamUpdate = useCallback((msgId: string, content: string) => {
    contentBufferRef.current = content;
    streamingMsgIdRef.current = msgId;
    
    if (!updateScheduledRef.current) {
      updateScheduledRef.current = true;
      requestAnimationFrame(() => {
        setMessages(prev => prev.map(m => 
          m.id === streamingMsgIdRef.current ? { ...m, content: contentBufferRef.current } : m
        ));
        updateScheduledRef.current = false;
      });
    }
  }, []);

  const sendMessage = async () => {
    if (!inputValue.trim() && !uploadedImage && !uploadedFile) return;
    if (!isOnline) {
      toast.error('Sin conexión a internet');
      return;
    }

    const fileToUpload = uploadedImage;
    const docToUpload = uploadedFile?.category === 'document' ? uploadedFile : null;
    const messageText = inputValue;
    const previewSnapshot = imagePreview;
    const docPreviewSnapshot = documentPreview;
    const preUploadedImageUrl = pendingImageUrl;

    // Detect request type for AI Router
    const hasImage = !!preUploadedImageUrl || !!fileToUpload;
    const requestType = detectRequestType(messageText, hasImage);
    
    // Detect language from message (updates state for future messages)
    if (messageText.trim()) {
      const detectedLang = detectLanguageFromText(messageText);
      setUserLanguage(detectedLang);
      console.log(`[ETHEREAL] Detected language: ${detectedLang}`);
    }
    
    console.log(`[ETHEREAL] Request type: ${requestType}, language: ${userLanguage}`);

    // Determine attachment type
    let attachments: Message['attachments'] = undefined;
    if (previewSnapshot) {
      attachments = [{ type: 'image', url: previewSnapshot }];
    } else if (docPreviewSnapshot) {
      attachments = [{ 
        type: 'document', 
        fileName: docPreviewSnapshot.fileName, 
        mimeType: docPreviewSnapshot.mimeType,
        label: docPreviewSnapshot.fileName
      }];
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText || (docPreviewSnapshot ? `📄 ${docPreviewSnapshot.fileName}` : '📷 Imagen compartida'),
      timestamp: new Date(),
      source: 'ui',
      attachments
    };

    // Clear UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedImage(null);
    setUploadedFile(null);
    setImagePreview(null);
    setDocumentPreview(null);
    setPendingImageUrl(null);
    setIsLoading(true);
    setLoadingPhase('thinking');

    // Fase 6: Shorter watchdog timeout
    const watchdogTimeout = setTimeout(() => {
      console.warn('[Agent] Watchdog timeout - forcing UI unlock');
      setIsLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error('La respuesta tardó demasiado. Puedes intentar de nuevo.');
    }, WATCHDOG_TIMEOUT_MS);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      console.log('[Agent] Request timeout - aborting');
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      // Use pre-uploaded URL if available, otherwise upload now
      let imageUrl: string | null = preUploadedImageUrl;

      if (fileToUpload && !imageUrl) {
        console.log('[Agent] Phase: signed_url_upload (V2)');
        setDiagnostics(prev => ({ ...prev, currentPhase: 'signed_url_upload', phaseStartTime: Date.now(), activeRequests: prev.activeRequests + 1 }));
        setIsUploading(true);
        setUploadProgress(30);

        try {
          setUploadProgress(50);
          
          const uploadResult = await uploadFileWithSignedUrl(fileToUpload, 20000, controller.signal);
          imageUrl = uploadResult.publicUrl;
          
          setUploadProgress(100);
          setDiagnostics(prev => ({ ...prev, currentPhase: 'upload_complete' }));
          console.log('[Agent] Phase: upload_complete', { url: imageUrl });
          
          setMessages(prev => prev.map(m => 
            m.id === userMessage.id && m.attachments?.[0]
              ? { ...m, attachments: [{ ...m.attachments[0], url: imageUrl! }] }
              : m
          ));
        } catch (uploadError) {
          const errorDetails = getErrorDetails(uploadError);
          console.error('[Agent] Image upload failed:', uploadError);
          setDiagnostics(prev => ({ ...prev, lastError: errorDetails.title }));
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '⚠️ No pude subir la imagen. ¿Puedes describir qué contiene o intentar de nuevo?',
            timestamp: new Date(),
            source: 'ui'
          }]);
          
          toast.warning('Error al subir imagen', { 
            description: 'Intenta de nuevo o describe tu imagen.',
            action: {
              label: 'Intenta de nuevo',
              onClick: () => fileInputRef.current?.click(),
            },
          });
        } finally {
          setIsUploading(false);
          setDiagnostics(prev => ({ ...prev, activeRequests: Math.max(0, prev.activeRequests - 1) }));
        }
      }

      console.log('[Agent] Phase: invoke_concierge', { hasImage: !!imageUrl, hasDoc: !!docToUpload });
      setDiagnostics(prev => ({ ...prev, currentPhase: 'invoke_concierge', phaseStartTime: Date.now(), activeRequests: prev.activeRequests + 1 }));
      
      // Handle document upload and parsing
      let documentContext: { fileName: string; extractedText: string; mimeType: string; wordCount?: number } | undefined;
      
      if (docToUpload) {
        setLoadingPhase('analyzing');
        console.log('[Agent] Phase: document_upload (V2)');
        
        try {
          // Upload document using signed URL (V2)
          const uploadResult = await uploadFileWithSignedUrl(docToUpload.file, 25000, controller.signal);
          const docPublicUrl = uploadResult.publicUrl;
          
          console.log('[Agent] Document uploaded:', docPublicUrl);
          
          // Parse document using supabase.functions.invoke (more stable than fetch)
          console.log('[Agent] Phase: document_parse');
          const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-document', {
            body: {
              fileUrl: docPublicUrl,
              mimeType: docToUpload.mimeType,
              fileName: docToUpload.fileName,
            },
          });
          
          if (!parseError && parseResult?.success && parseResult?.extractedText) {
            documentContext = {
              fileName: docToUpload.fileName,
              extractedText: parseResult.extractedText,
              mimeType: docToUpload.mimeType,
              wordCount: parseResult.wordCount,
            };
            console.log(`[Agent] Document parsed: ${parseResult.wordCount} words`);
          } else {
            console.warn('[Agent] Document parse failed:', parseError || parseResult);
            toast.info('Subí el documento pero no pude leer su contenido.', { 
              description: 'Puedes describirme qué contiene.'
            });
          }
        } catch (docError) {
          console.error('[Agent] Document processing error:', docError);
          toast.warning('No pude procesar el documento.', { 
            description: 'Intenta de nuevo o describe su contenido.' 
          });
        }
      }
      
      // Fase 6: Reduced message context
      const conciergeMessages = [
        ...messages.filter(m => m.source === 'backend' || m.role === 'user').slice(-MAX_MESSAGES_CONTEXT).map((m) => ({ 
          role: m.role, 
          content: m.content 
        })),
        { role: 'user', content: messageText || (documentContext ? `Documento compartido: ${documentContext.fileName}` : 'Image shared') }
      ];
      
      // Use unified AI Router
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-device-fingerprint': fingerprint || 'unknown',
          },
          body: JSON.stringify({
            type: imageUrl ? 'vision' : requestType,
            messages: conciergeMessages,
            imageUrl,
            conversationId,
            fingerprint,
            workspaceId, // Include workspace for session creation
            stream: true,
            language: userLanguage, // Pass detected language to AI
            context: documentContext ? { document: documentContext } : undefined,
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Concierge error: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let fullContent = '';
      let sseBuffer = '';
      let arAction: { imageUrl: string; bodyPart?: string } | null = null;
      
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
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(dataStr);
                
                if (parsed.type === 'ar_action' && parsed.arReferenceImage) {
                  arAction = {
                    imageUrl: parsed.arReferenceImage,
                    bodyPart: parsed.suggestedBodyPart
                  };
                  continue;
                }
                
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  // Fase 3: Optimized update
                  scheduleStreamUpdate(assistantMsgId, fullContent);
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
        
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

      // Final update
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content: fullContent || 'Recibí tu mensaje.' } : m
      ));

      // Fase 4: Cache the conversation
      try {
        await chatCache.saveConversation(conversationId!, [...messages, userMessage, {
          id: assistantMsgId,
          role: 'assistant' as const,
          content: fullContent,
          timestamp: new Date(),
        }]);
      } catch { /* ignore cache errors */ }

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
    return 'ETHEREAL';
  };

  return (
    <>
      {/* AR Preview Modal - Lazy loaded */}
      {showARPreview && arPreviewData && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
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
        </Suspense>
      )}

      {/* Floating Button - Fase 5: Warm-up on hover */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            onMouseEnter={warmUpEdgeFunctions}
            onTouchStart={warmUpEdgeFunctions}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform group"
            data-ferunda-agent="true"
          >
            <MessageCircle className="w-7 h-7 text-primary-foreground group-hover:scale-110 transition-transform" />
            <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-primary-foreground bg-primary/80 px-1.5 rounded-full whitespace-nowrap">
              Grok Vivo
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
                  <h3 className="font-semibold text-foreground tracking-wide">Studio Concierge Vivo</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">{getModeLabel()}</p>
                    {!isOnline && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400 border-red-500/30">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                    {/* Degraded badge only in debug mode */}
                    {localStorage.getItem('ferunda_debug') === '1' && functionsHealth && !Object.values(functionsHealth).every(r => r.ok) && (
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
                {/* Reset button in debug mode */}
                {localStorage.getItem('ferunda_debug') === '1' && (
                  <Button variant="ghost" size="icon" onClick={resetConversation} title="Reset conversation">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Diagnostics moved to /dev page */}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" onScrollCapture={handleScroll}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-secondary-foreground rounded-bl-md'
                    }`}>
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {message.toolCalls.map((tc, i) => (
                            <React.Fragment key={i}>{renderToolCall(tc)}</React.Fragment>
                          ))}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.attachments?.map((att, i) => (
                        <div key={i} className="mt-3">{renderAttachment(att)}</div>
                      ))}
                      <p className="text-[10px] opacity-50 mt-1">
                        {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                {/* Fase 6: Progressive loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md px-4 py-3">
                      <LoadingIndicator phase={loadingPhase} />
                    </div>
                  </motion.div>
                )}
                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-border">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-16 rounded-lg object-cover" />
                  <button
                    onClick={() => { setImagePreview(null); setUploadedImage(null); setUploadedFile(null); setPendingImageUrl(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                  {isPreUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    </div>
                  )}
                  {pendingImageUrl && !isPreUploading && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Preview */}
            {documentPreview && (
              <div className="px-4 py-2 border-t border-border">
                <div className="relative inline-flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                  {documentPreview.mimeType === 'application/pdf' ? (
                    <FileText className="w-5 h-5 text-red-500" />
                  ) : (
                    <File className="w-5 h-5 text-blue-500" />
                  )}
                  <span className="text-sm text-foreground truncate max-w-[150px]">{documentPreview.fileName}</span>
                  <button
                    onClick={() => { setDocumentPreview(null); setUploadedFile(null); }}
                    className="ml-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Progress Vivo */}
            {isUploading && (
              <div className="px-4 py-2 border-t border-border bg-primary/5">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {uploadProgress < 60 ? 'Comprimiendo imagen...' : 
                     uploadProgress < 90 ? 'Subiendo a storage...' : 
                     'Finalizando...'}
                  </span>
                  <span className="text-xs font-medium text-primary ml-auto">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={handleFileUpload}
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoice}
                  className={`shrink-0 ${isListening ? 'text-primary' : ''}`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || (!inputValue.trim() && !uploadedImage && !uploadedFile)}
                  size="icon"
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Alias for ETHEREAL branding
export const EtherealAgent = FerundaAgent;

export default FerundaAgent;
