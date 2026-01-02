import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Mic, MicOff, Loader2, 
  Sparkles, Calendar, CreditCard, Image as ImageIcon,
  ChevronDown, Volume2, VolumeX, Maximize2, Minimize2,
  AlertTriangle, CheckCircle, Thermometer, Zap, Palette,
  Video, Download, Share2, Play, Pause, RotateCcw, Eye,
  WifiOff, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConciergeARPreview } from '@/components/concierge/ConciergeARPreview';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

type AssistantMode = 'grok' | 'concierge' | 'luna';

// ============================================================================
// INTENT DETECTION - From UnifiedConcierge (best feature)
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
  /^(hi|hello|hola|hey|buenos|good)\b/i,
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
// IMAGE COMPRESSION - From UnifiedConcierge (best feature)
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
// AVATAR VIDEO PLAYER - Grok feature
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
// MAIN COMPONENT - Unified with best features from both
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
  const [mode, setMode] = useState<AssistantMode>('grok');
  
  // Upload progress - from UnifiedConcierge
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // AR Preview state
  const [showARPreview, setShowARPreview] = useState(false);
  const [arPreviewData, setARPreviewData] = useState<{ imageUrl: string; bodyPart?: string; sketchId?: string } | null>(null);
  
  // Offline detection - from UnifiedConcierge
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const { fingerprint } = useDeviceFingerprint();

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

  // Initialize with greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = memory.clientName 
        ? `¡Hola de nuevo, ${memory.clientName}! ¿En qué puedo ayudarte hoy?`
        : '¡Hola! Soy tu asistente experto en tatuajes. Especializado en micro-realismo y geométrico ultra-clean. ¿Tienes alguna idea de tatuaje en mente?';
      
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, memory]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Voice recognition setup - Grok feature
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

  // Image upload with compression - from UnifiedConcierge
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate
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
    
    // Compress
    setIsUploading(true);
    setUploadProgress(30);
    
    try {
      const compressed = await compressImage(file);
      setUploadedImage(compressed);
      setUploadProgress(100);
      
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressed);
      
      toast.success(`Imagen lista (${(compressed.size / 1024).toFixed(0)}KB)`);
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

    // Detect mode based on intent
    const detectedMode = detectMode(inputValue, mode);
    if (detectedMode !== mode) {
      console.log(`[Agent] Mode: ${mode} → ${detectedMode}`);
      setMode(detectedMode);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue || '📷 Imagen compartida',
      timestamp: new Date(),
      attachments: imagePreview ? [{ type: 'image', url: imagePreview }] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedImage(null);
    setImagePreview(null);
    setIsLoading(true);

    try {
      // Upload image if present (robust signed upload)
      let imageUrl: string | null = null;

      if (uploadedImage) {
        setIsUploading(true);
        setUploadProgress(30);

        const { data: signedData, error: signedError } = await supabase.functions.invoke('chat-upload-url', {
          body: {
            filename: uploadedImage.name,
            contentType: uploadedImage.type || 'image/jpeg',
            conversationId: fingerprint || undefined,
          },
        });

        if (signedError || !signedData?.uploadUrl || !signedData?.publicUrl) {
          throw new Error(signedError?.message || 'No se pudo crear URL de subida');
        }

        setUploadProgress(60);

        const uploadResponse = await fetch(signedData.uploadUrl, {
          method: 'PUT',
          body: uploadedImage,
          headers: {
            'Content-Type': uploadedImage.type || 'image/jpeg',
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Error subiendo imagen: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        imageUrl = signedData.publicUrl;
        setUploadProgress(100);
        setIsUploading(false);
      }

      // Call Ferunda Agent (Grok-powered) via backend function
      const { data, error } = await supabase.functions.invoke('ferunda-agent', {
        headers: {
          'x-device-fingerprint': fingerprint || '',
        },
        body: {
          message: inputValue,
          imageUrl,
          mode: detectedMode,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
          memory,
        },
      });

      if (error) throw new Error(error.message || 'Error en la respuesta');
      if (!data) throw new Error('Respuesta vacía');
      // data already parsed by supabase.functions.invoke

      
      if (data.updatedMemory) setMemory(prev => ({ ...prev, ...data.updatedMemory }));

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        attachments: data.attachments,
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-open AR preview if suggested
      if (data.attachments?.some((a: any) => a.type === 'ar_preview')) {
        const arAttach = data.attachments.find((a: any) => a.type === 'ar_preview');
        if (arAttach) {
          setTimeout(() => {
            setARPreviewData({
              imageUrl: arAttach.url || arAttach.data?.sketchUrl,
              bodyPart: arAttach.data?.bodyPart
            });
            setShowARPreview(true);
            toast.success('✨ AR Preview listo');
          }, 1500);
        }
      }

      if (useAIVoice && data.message) speakMessage(data.message);

    } catch (error) {
      console.error('Agent error:', error);
      toast.error('Error de conexión. Reintentando...');
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, hubo un error. ¿Podrías intentarlo de nuevo?',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render attachment - Grok feature with rich types
  const renderAttachment = (attachment: Message['attachments'][0]) => {
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

  const renderToolCall = (toolCall: Message['toolCalls'][0]) => {
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
      case 'concierge': return 'Booking Mode';
      case 'luna': return 'Quick Q&A';
      default: return 'Grok AI';
    }
  };

  return (
    <>
      {/* AR Preview Modal */}
      {showARPreview && arPreviewData && (
        <ConciergeARPreview
          isOpen={showARPreview}
          onClose={() => setShowARPreview(false)}
          referenceImageUrl={arPreviewData.imageUrl}
          suggestedBodyPart={arPreviewData.bodyPart}
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
              Grok AI
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
                  <h3 className="font-semibold text-foreground">Grok Concierge Vivo</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{getModeLabel()}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-blue-400">
                      ⚡ Grok
                    </Badge>
                    {!isOnline && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400 border-red-500/30">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Offline
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
                        <span className="text-sm text-muted-foreground">Analizando con Grok...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Upload Progress */}
            {isUploading && (
              <div className="px-4 py-2 border-t border-border bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Procesando imagen...
                </div>
                <Progress value={uploadProgress} className="h-1" />
              </div>
            )}

            {/* Image Preview - inline with input, not blocking */}
            {imagePreview && !isLoading && (
              <div className="px-4 py-2 border-t border-border flex items-center gap-2">
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                  <button
                    onClick={() => { setUploadedImage(null); setImagePreview(null); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                    type="button"
                  >
                    <XCircle className="w-3 h-3 text-destructive-foreground" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">Imagen lista · Escribe un mensaje y envía</span>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex items-center justify-between mb-2 text-xs">
                <button
                  onClick={() => setUseAIVoice(!useAIVoice)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
                    useAIVoice ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {useAIVoice ? <><Volume2 className="w-3 h-3" /><span>Voz AI activa</span></> : <><VolumeX className="w-3 h-3" /><span>Voz AI</span></>}
                </button>
                {isSpeaking && (
                  <button onClick={stopSpeaking} className="flex items-center gap-1 text-destructive">
                    <Pause className="w-3 h-3" /><span>Detener</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0" disabled={isUploading}>
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button variant={isListening ? 'default' : 'ghost'} size="icon" onClick={toggleVoice} className="shrink-0" disabled={!recognitionRef.current}>
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe tu idea de tatuaje..."
                  className="flex-1"
                  disabled={isLoading || !isOnline}
                />
                <Button onClick={sendMessage} disabled={isLoading || (!inputValue.trim() && !uploadedImage) || !isOnline} size="icon" className="shrink-0">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
