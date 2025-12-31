import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Mic, MicOff, Loader2, 
  Sparkles, Calendar, CreditCard, Image as ImageIcon,
  ChevronDown, Volume2, VolumeX, Maximize2, Minimize2,
  AlertTriangle, CheckCircle, Thermometer, Zap, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'image' | 'video' | 'heatmap' | 'calendar' | 'payment' | 'analysis' | 'variations';
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

export const FerundaAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [memory, setMemory] = useState<ConversationMemory>({});
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize with greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = memory.clientName 
        ? `¡Hola de nuevo, ${memory.clientName}! ${memory.previousTattoos?.length ? `Vi que tu último tatuaje fue ${memory.previousTattoos[0]} – ¿continuamos esa línea?` : '¿En qué puedo ayudarte hoy?'}`
        : '¡Hola! Soy Ferunda Agent, tu asistente experto en tatuajes. Especializado en micro-realismo y geométrico ultra-clean. ¿Tienes alguna idea de tatuaje en mente?';
      
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

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
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

  const speakMessage = (text: string) => {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() && !uploadedImage) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: imagePreview ? [{ type: 'image', url: imagePreview }] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedImage(null);
    setImagePreview(null);
    setIsLoading(true);

    try {
      // Upload image if present
      let imageUrl = null;
      if (uploadedImage) {
        const fileName = `agent-uploads/${Date.now()}-${uploadedImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reference-images')
          .upload(fileName, uploadedImage);
        
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('reference-images')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      // Call Ferunda Agent
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ferunda-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          message: inputValue,
          imageUrl,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          memory
        })
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del agente');
      }

      const data = await response.json();
      
      // Update memory if provided
      if (data.updatedMemory) {
        setMemory(prev => ({ ...prev, ...data.updatedMemory }));
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        attachments: data.attachments,
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak if enabled
      if (isSpeaking && data.message) {
        speakMessage(data.message);
      }

    } catch (error) {
      console.error('Agent error:', error);
      toast.error('Error al comunicarse con el agente');
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, hubo un error. ¿Podrías intentarlo de nuevo?',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderAttachment = (attachment: Message['attachments'][0]) => {
    switch (attachment.type) {
      case 'image':
        return (
          <img 
            src={attachment.url} 
            alt="Attachment" 
            className="max-w-full rounded-lg max-h-48 object-cover"
          />
        );
      case 'video':
        return (
          <div className="space-y-2">
            {attachment.label && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Zap className="w-3 h-3" />
                {attachment.label}
              </div>
            )}
            <video 
              src={attachment.url} 
              controls 
              className="max-w-full rounded-lg max-h-48"
              poster="/placeholder.svg"
            />
          </div>
        );
      case 'heatmap':
        const movementRisk = attachment.data?.movementRisk || 5;
        const riskColor = movementRisk > 7 ? 'from-red-500 to-red-600' 
                       : movementRisk > 4 ? 'from-amber-500 to-orange-500'
                       : 'from-emerald-500 to-green-500';
        return (
          <div className={`bg-gradient-to-r ${riskColor} p-4 rounded-lg text-white`}>
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4" />
              <span className="font-semibold text-sm">Simulación 3D - {attachment.data?.detectedZone || 'Zona detectada'}</span>
            </div>
            <div className="text-xs space-y-1 mb-3">
              <div className="flex justify-between">
                <span>Riesgo de distorsión:</span>
                <span className="font-bold">{movementRisk}/10</span>
              </div>
            </div>
            {attachment.data?.riskZones?.map((zone: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-white/90 text-xs py-1 border-t border-white/20">
                <span className="capitalize">{zone.zone?.replace(/_/g, ' ')}</span>
                <span className="flex items-center gap-1">
                  {zone.risk > 7 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  {zone.risk}/10
                </span>
              </div>
            ))}
          </div>
        );
      case 'analysis':
        const styleMatch = attachment.data?.styleMatch || 0;
        const matchColor = styleMatch > 85 ? 'text-emerald-500' 
                        : styleMatch > 60 ? 'text-amber-500' 
                        : 'text-red-500';
        return (
          <div className="bg-secondary/50 border border-border p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Análisis de Referencia</span>
              </div>
              <span className={`font-bold text-lg ${matchColor}`}>{styleMatch}%</span>
            </div>
            {attachment.data?.detectedStyles && (
              <div className="flex flex-wrap gap-1 mb-2">
                {attachment.data.detectedStyles.map((style: string, i: number) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {style}
                  </span>
                ))}
              </div>
            )}
            {attachment.data?.adjustments && (
              <p className="text-xs text-muted-foreground">{attachment.data.adjustments}</p>
            )}
          </div>
        );
      case 'variations':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="w-4 h-4 text-primary" />
              Variaciones Generadas
            </div>
            <div className="grid grid-cols-3 gap-2">
              {attachment.data?.images?.map((img: string, i: number) => (
                <img key={i} src={img} alt={`Variación ${i+1}`} className="rounded-lg aspect-square object-cover" />
              ))}
            </div>
            {attachment.data?.notes && (
              <p className="text-xs text-muted-foreground">{attachment.data.notes}</p>
            )}
          </div>
        );
      case 'calendar':
        return (
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">Slots Disponibles</span>
              {attachment.data?.deposit && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Depósito: ${attachment.data.deposit}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {attachment.data?.slots?.map((slot: any, i: number) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-left"
                  onClick={() => toast.success(`Slot seleccionado: ${slot.formatted || slot}`)}
                >
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
            {attachment.data?.slot && (
              <p className="text-xs text-muted-foreground mb-2">
                Slot: {attachment.data.slot}
              </p>
            )}
            <Button 
              variant="default" 
              size="sm"
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={() => window.open(attachment.data?.paymentUrl, '_blank')}
            >
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
      'generate_design_variations': { icon: <Palette className="w-3 h-3" />, label: 'Generando', color: 'bg-amber-500/20 text-amber-500' },
      'log_agent_decision': { icon: <Sparkles className="w-3 h-3" />, label: 'Registrando', color: 'bg-gray-500/20 text-gray-500' }
    };

    const config = toolConfig[toolCall.name] || { icon: <Sparkles className="w-3 h-3" />, label: toolCall.name, color: 'bg-primary/20 text-primary' };

    return (
      <Badge 
        variant="outline"
        className={`text-xs border-0 ${config.color} ${toolCall.status === 'completed' ? 'opacity-100' : 'opacity-70'}`}
      >
        {toolCall.status === 'pending' ? <Loader2 className="w-3 h-3 animate-spin" /> : config.icon}
        <span className="ml-1">{config.label}</span>
        {toolCall.status === 'completed' && <CheckCircle className="w-3 h-3 ml-1" />}
      </Badge>
    );
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform"
          >
            <MessageCircle className="w-7 h-7 text-primary-foreground" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
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
              isExpanded 
                ? 'inset-4' 
                : 'bottom-6 right-6 w-[400px] h-[600px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Ferunda Agent</h3>
                  <p className="text-xs text-muted-foreground">Micro-realismo & Geométrico</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => isSpeaking ? stopSpeaking() : speakMessage(messages[messages.length - 1]?.content || '')}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
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
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      
                      {/* Tool calls */}
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {message.toolCalls.map((tc, i) => (
                            <React.Fragment key={i}>
                              {renderToolCall(tc)}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((att, i) => (
                            <div key={i}>{renderAttachment(att)}</div>
                          ))}
                        </div>
                      )}

                      <span className="text-[10px] opacity-50 mt-1 block">
                        {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl rounded-bl-md p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analizando...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-border">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-16 rounded-lg" />
                  <button
                    onClick={() => {
                      setUploadedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-destructive-foreground" />
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button
                  variant={isListening ? 'default' : 'ghost'}
                  size="icon"
                  onClick={toggleVoice}
                  className="shrink-0"
                  disabled={!recognitionRef.current}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe tu idea de tatuaje..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || (!inputValue.trim() && !uploadedImage)}
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

export default FerundaAgent;
