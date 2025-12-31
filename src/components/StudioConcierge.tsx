import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  RefreshCw,
  ImagePlus,
  XCircle,
  TrendingUp,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { TattooBriefCard, type TattooBrief } from "@/components/TattooBriefCard";
import ConciergeEntry from "@/components/concierge/ConciergeEntry";
import { ConciergeARPreview } from "@/components/concierge/ConciergeARPreview";
import { toast } from "@/hooks/use-toast";

// ============================================================================
// ENHANCED TYPES & UTILITIES
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  metadata?: {
    sentiment?: { overall: number; urgency: number };
    intent?: { primary: string; confidence: number };
  };
}

interface ConciergeContext {
  mode: 'explore' | 'qualify' | 'commit' | 'prepare' | 'aftercare' | 'rebook';
  tattoo_brief_id?: string;
  booking_id?: string;
  client_name?: string;
  client_email?: string;
}

interface ConversationAnalytics {
  messageCount: number;
  userMessages: number;
  avgSentiment: number;
  avgUrgency: number;
  topIntents: Map<string, number>;
}

type ConciergePhase = 'entry' | 'conversation' | 'blocked';

// Message analyzer for client-side insights
class MessageAnalyzer {
  static analyzeSentiment(message: string): { overall: number; urgency: number } {
    const positiveWords = ['love', 'great', 'perfect', 'excited', 'amazing', 'beautiful'];
    const negativeWords = ['worried', 'concerned', 'problem', 'issue', 'difficult'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'soon', 'quickly'];
    
    const words = message.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;
    const urgentCount = words.filter(w => urgentWords.includes(w)).length;
    
    const overall = (positiveCount - negativeCount) / Math.max(words.length, 1);
    const urgency = Math.min(urgentCount / 3, 1);
    
    return {
      overall: Math.max(-1, Math.min(1, overall)),
      urgency
    };
  }
  
  static detectIntent(message: string): { primary: string; confidence: number } {
    const intentPatterns = [
      { intent: 'pricing', patterns: ['price', 'cost', 'how much', 'expensive', 'afford'] },
      { intent: 'booking', patterns: ['book', 'appointment', 'schedule', 'available', 'when'] },
      { intent: 'design', patterns: ['design', 'style', 'idea', 'want', 'looking for'] },
      { intent: 'artist', patterns: ['artist', 'who', 'portfolio', 'work', 'experience'] },
      { intent: 'location', patterns: ['where', 'location', 'address', 'studio'] }
    ];
    
    const lowerMessage = message.toLowerCase();
    const matches = intentPatterns
      .map(({ intent, patterns }) => ({
        intent,
        score: patterns.filter(p => lowerMessage.includes(p)).length
      }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);
    
    if (matches.length === 0) {
      return { primary: 'general', confidence: 0.5 };
    }
    
    return {
      primary: matches[0].intent,
      confidence: Math.min(matches[0].score / 3, 1)
    };
  }
}

// Hook for conversation analytics
function useConversationAnalytics(messages: Message[]): ConversationAnalytics | null {
  return useMemo(() => {
    if (messages.length === 0) return null;
    
    const metrics: ConversationAnalytics = {
      messageCount: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      avgSentiment: 0,
      avgUrgency: 0,
      topIntents: new Map<string, number>()
    };
    
    messages.forEach(msg => {
      if (msg.metadata?.sentiment) {
        metrics.avgSentiment += msg.metadata.sentiment.overall;
        metrics.avgUrgency += msg.metadata.sentiment.urgency;
      }
      
      if (msg.metadata?.intent) {
        const count = metrics.topIntents.get(msg.metadata.intent.primary) || 0;
        metrics.topIntents.set(msg.metadata.intent.primary, count + 1);
      }
    });
    
    if (messages.length > 0) {
      metrics.avgSentiment /= messages.length;
      metrics.avgUrgency /= messages.length;
    }
    
    return metrics;
  }, [messages]);
}

const CONCIERGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`;

// AR Preview state interface
interface ARPreviewState {
  isOpen: boolean;
  referenceImageUrl: string;
  suggestedBodyPart?: string;
}

export function StudioConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<ConciergePhase>('entry');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ConciergeContext>({ mode: 'explore' });
  const [tattooBrief, setTattooBrief] = useState<TattooBrief | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // AR Preview state
  const [arPreview, setArPreview] = useState<ARPreviewState>({
    isOpen: false,
    referenceImageUrl: '',
    suggestedBodyPart: undefined
  });
  const [lastReferenceImages, setLastReferenceImages] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { fingerprint } = useDeviceFingerprint();
  
  // Enhanced analytics hook
  const analytics = useConversationAnalytics(messages);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Focus input when in conversation
  useEffect(() => {
    if (isOpen && phase === 'conversation') {
      inputRef.current?.focus();
    }
  }, [isOpen, phase]);
  
  // Create conversation on first message
  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    
    const sessionId = fingerprint || `anon-${Date.now()}`;
    
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        session_id: sessionId,
        concierge_mode: context.mode,
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
    
    setConversationId(data.id);
    return data.id;
  }, [conversationId, fingerprint, context.mode]);
  
  // Fetch tattoo brief if we have an ID
  const fetchBrief = useCallback(async (briefId: string) => {
    const { data } = await supabase
      .from("tattoo_briefs")
      .select("*")
      .eq("id", briefId)
      .single();
    
    if (data) {
      setTattooBrief(data as TattooBrief);
    }
  }, []);
  
  // Handle file selection for image uploads
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const maxImages = 5;
    const currentCount = uploadedImages.length;
    const remainingSlots = maxImages - currentCount;
    
    if (remainingSlots <= 0) {
      toast({
        title: "Límite alcanzado",
        description: "Puedes subir máximo 5 imágenes",
        variant: "destructive"
      });
      return;
    }
    
    const newImages: { file: File; preview: string }[] = [];
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    for (const file of filesToProcess) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Archivo no válido",
          description: `${file.name} no es una imagen`,
          variant: "destructive"
        });
        continue;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Imagen muy grande",
          description: `${file.name} supera los 10MB`,
          variant: "destructive"
        });
        continue;
      }
      
      newImages.push({
        file,
        preview: URL.createObjectURL(file)
      });
    }
    
    setUploadedImages(prev => [...prev, ...newImages]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove an uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };
  
  // Upload images to Supabase storage
  const uploadImagesToStorage = async (): Promise<string[]> => {
    if (uploadedImages.length === 0) return [];
    
    setIsUploading(true);
    const urls: string[] = [];
    
    try {
      for (const { file } of uploadedImages) {
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `concierge/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('reference-images')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('reference-images')
          .getPublicUrl(filePath);
        
        urls.push(publicUrl);
      }
      
      // Clear uploaded images after successful upload
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
      setUploadedImages([]);
      
      return urls;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle entry from new ConciergeEntry component
  const handleEntryProceed = async (userIntent: string, imageUrls: string[] = []) => {
    // Store the user's intent and go directly to conversation
    setSelectedEntryId(userIntent);
    setPhase('conversation');

    // Track reference images for AR preview
    if (imageUrls.length > 0) {
      setLastReferenceImages(imageUrls);
    }

    // SANITIZED: Do NOT inject [Reference images attached: N] into user message content
    // This was contaminating training matches and causing generic responses
    // Images are passed separately via referenceImages parameter
    const messageContent = userIntent;

    // Create enhanced message with analysis
    const sentiment = MessageAnalyzer.analyzeSentiment(messageContent);
    const intent = MessageAnalyzer.detectIntent(messageContent);

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      metadata: { sentiment, intent }
    };
    setMessages([userMessage]);
    await sendMessage(messageContent, [], 0, imageUrls);
  };
  
  // Open AR Preview from reference image
  const handleOpenARPreview = useCallback((imageUrl: string, bodyPart?: string) => {
    setArPreview({
      isOpen: true,
      referenceImageUrl: imageUrl,
      suggestedBodyPart: bodyPart
    });
  }, []);
  
  // Handle AR to booking conversion
  const handleARBookingClick = useCallback(() => {
    // Send a message indicating interest after AR preview
    const bookingMessage: Message = {
      role: 'user',
      content: "I love how it looks! I want to proceed with booking.",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, bookingMessage]);
    sendMessage("I love how it looks! I want to proceed with booking.", messages, 0, []);
  }, [messages]);
  
  // Detect AR offer in assistant messages
  const detectAROfferInMessage = useCallback((content: string): { hasOffer: boolean; bodyPart?: string } => {
    const arPatterns = [
      /ver en ar/i,
      /ar preview/i,
      /realidad aumentada/i,
      /how.*look.*on your body/i,
      /how.*it.*look.*on you/i,
      /see.*how.*would look/i,
      /visualiz.*in real-time/i,
      /📱.*ar/i,
      /🔥.*ar/i
    ];
    
    const hasOffer = arPatterns.some(pattern => pattern.test(content));
    
    // Try to extract body part
    const bodyPartPatterns = [
      /forearm/i, /brazo/i, /bicep/i, /chest/i, /pecho/i,
      /back/i, /espalda/i, /thigh/i, /muslo/i, /calf/i, /pantorrilla/i
    ];
    
    let bodyPart: string | undefined;
    for (const pattern of bodyPartPatterns) {
      const match = content.match(pattern);
      if (match) {
        bodyPart = match[0].toLowerCase();
        break;
      }
    }
    
    return { hasOffer, bodyPart };
  }, []);
  
  // Send message to concierge with retry logic
  const sendMessage = async (
    content: string,
    currentMessages: Message[],
    retryCount: number = 0,
    referenceImages: string[] = []
  ) => {
    const MAX_RETRIES = 3;

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setTypingIndicator(true);
    setError(null);

    try {
      const convId = await ensureConversation();

      // Add metadata to current message
      const sentiment = MessageAnalyzer.analyzeSentiment(content);
      const intent = MessageAnalyzer.detectIntent(content);

      const allMessages = [...currentMessages, {
        role: "user" as const,
        content,
        timestamp: new Date(),
        metadata: { sentiment, intent }
      }];

      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      };

      if (fingerprint) {
        headers["x-device-fingerprint"] = fingerprint;
      }

      console.log("[StudioConcierge] Sending to backend:", {
        hasFingerprint: !!fingerprint,
        hasConversationId: !!convId,
        messagesCount: allMessages.length,
        referenceImagesCount: referenceImages.length,
        referenceImagesUrls: referenceImages,
        analytics: analytics ? {
          messageCount: analytics.messageCount,
          avgSentiment: analytics.avgSentiment,
          avgUrgency: analytics.avgUrgency
        } : null
      });

      const response = await fetch(CONCIERGE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          referenceImages,
          context,
          conversationId: convId,
          analytics: analytics ? {
            messageCount: analytics.messageCount,
            avgSentiment: analytics.avgSentiment,
            avgUrgency: analytics.avgUrgency,
            topIntents: Object.fromEntries(analytics.topIntents)
          } : null
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        console.error("[StudioConcierge] Non-OK response", response.status, bodyText);
        
        // Retry on 5xx errors
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
          console.log(`[StudioConcierge] Retrying... attempt ${retryCount + 1}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return sendMessage(content, currentMessages, retryCount + 1);
        }
        
        throw new Error(
          `Assistant backend error (${response.status}). ${bodyText ? bodyText.slice(0, 200) : ""}`.trim()
        );
      }

      // Parse context from header (and keep a local copy so we don't rely on stale React state)
      let nextContext: ConciergeContext = context;
      const contextHeader = response.headers.get("X-Concierge-Context");
      if (contextHeader) {
        try {
          const parsedContext = JSON.parse(contextHeader) as Partial<ConciergeContext>;
          nextContext = { ...context, ...parsedContext };
          setContext(nextContext);

          // Fetch updated brief if ID changed
          if (
            parsedContext.tattoo_brief_id &&
            parsedContext.tattoo_brief_id !== context.tattoo_brief_id
          ) {
            await fetchBrief(parsedContext.tattoo_brief_id);
          }
        } catch (e) {
          console.error("Failed to parse context header:", e);
        }
      }

      // Stream the response
      setTypingIndicator(false);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  assistantContent += delta;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { 
                      role: "assistant", 
                      content: assistantContent,
                      timestamp: new Date()
                    };
                    return updated;
                  });
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Refresh brief after response using the latest context we know about
      if (nextContext.tattoo_brief_id) {
        await fetchBrief(nextContext.tattoo_brief_id);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('[StudioConcierge] Request aborted');
        return;
      }
      console.error("Concierge error:", err);
      setError("Something went wrong. Please try again!");
    } finally {
      setIsLoading(false);
      setTypingIndicator(false);
    }
  };

  
  // Handle send
  const handleSend = async () => {
    if ((!input.trim() && uploadedImages.length === 0) || isLoading || isUploading) return;

    const baseText = input.trim();
    setInput("");

    const imageUrls = await uploadImagesToStorage();
    const content = baseText + (imageUrls.length > 0 ? `\n\n[Reference images attached: ${imageUrls.length}]` : "");

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    await sendMessage(content, messages, 0, imageUrls);
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Reset conversation
  const handleReset = () => {
    setMessages([]);
    setPhase('entry');
    setContext({ mode: 'explore' });
    setTattooBrief(null);
    setConversationId(null);
    setError(null);
    setBlockedMessage(null);
    setSelectedEntryId(null);
  };
  
  return (
    <>
      {/* AR Preview Modal */}
      <ConciergeARPreview
        isOpen={arPreview.isOpen}
        onClose={() => setArPreview(prev => ({ ...prev, isOpen: false }))}
        referenceImageUrl={arPreview.referenceImageUrl}
        onBookingClick={handleARBookingClick}
        suggestedBodyPart={arPreview.suggestedBodyPart}
        conversationId={conversationId || undefined}
      />
      {/* Floating button - dark editorial style */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-foreground text-background shadow-2xl shadow-foreground/20 flex items-center justify-center transition-all duration-300 hover:shadow-foreground/40"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Chat window - dark editorial aesthetic */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-background border border-border shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          >
            {/* Header - editorial style */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-foreground/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground tracking-tight">Studio Concierge</h3>
                    <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">
                      {phase === 'entry' && "How can I help?"}
                      {phase === 'blocked' && "Let's explore options"}
                      {phase === 'conversation' && (
                        <>
                          {context.mode === 'explore' && "Discovering your vision"}
                          {context.mode === 'qualify' && "Building your plan"}
                          {context.mode === 'commit' && "Ready to book"}
                          {context.mode === 'prepare' && "Session prep"}
                          {context.mode === 'aftercare' && "Healing support"}
                          {context.mode === 'rebook' && "Next steps"}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Analytics toggle - only show in conversation */}
                  {phase === 'conversation' && analytics && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      title="View conversation insights"
                      className={`text-muted-foreground hover:text-foreground hover:bg-secondary ${showAnalytics ? 'bg-secondary' : ''}`}
                    >
                      <TrendingUp className="w-4 h-4" />
                    </Button>
                  )}
                  {(phase !== 'entry') && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleReset}
                      title="Start over"
                      className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Analytics panel - collapsible */}
              <AnimatePresence>
                {showAnalytics && analytics && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="px-4 py-2 bg-secondary/30 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Messages:</span>
                        <span className="text-foreground font-medium">{analytics.messageCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sentiment:</span>
                        <span className={`font-medium ${analytics.avgSentiment > 0 ? 'text-green-500' : analytics.avgSentiment < 0 ? 'text-red-500' : 'text-foreground'}`}>
                          {analytics.avgSentiment > 0 ? '😊 Positive' : analytics.avgSentiment < 0 ? '😟 Concerned' : '😐 Neutral'}
                        </span>
                      </div>
                      {analytics.avgUrgency > 0.3 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Urgency:</span>
                          <span className="text-amber-500 font-medium">⚡ High</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Messages column */}
              <div className={`flex-1 flex flex-col ${tattooBrief ? 'border-r border-border' : ''}`}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Entry screen - new conversational intro */}
                  {phase === 'entry' && (
                    <ConciergeEntry onProceed={handleEntryProceed} />
                  )}
                  
                  {/* Blocked state */}
                  {phase === 'blocked' && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto bg-secondary flex items-center justify-center mb-4">
                          <Sparkles className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-display text-xl text-foreground mb-2">
                          A Quick Note
                        </h4>
                      </div>

                      <div className="bg-secondary/50 border border-border p-4">
                        <p className="text-sm text-foreground font-body leading-relaxed">
                          {blockedMessage}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            setPhase('conversation');
                            const msg: Message = { role: 'user', content: "Can you help me explore alternatives?" };
                            setMessages([msg]);
                            sendMessage("Can you help me explore alternatives?", []);
                          }}
                          className="w-full bg-foreground text-background hover:bg-foreground/90"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Explore Alternatives
                        </Button>
                        
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="w-full border-border hover:border-foreground/50"
                        >
                          Start Over
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Conversation - Messages */}
                  {phase === 'conversation' && messages.map((message, index) => {
                    const arOffer = message.role === 'assistant' ? detectAROfferInMessage(message.content) : { hasOffer: false };
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] ${
                          message.role === 'user' 
                            ? 'bg-foreground text-background px-4 py-3'
                            : 'bg-card border border-border text-foreground px-4 py-3'
                        }`}>
                          <p className="text-sm font-body whitespace-pre-wrap">{message.content}</p>
                          
                          {/* AR Preview button - show when AI offers AR */}
                          {arOffer.hasOffer && lastReferenceImages.length > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenARPreview(lastReferenceImages[0], arOffer.bodyPart)}
                              className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Ver en AR
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Enhanced loading/typing indicator */}
                  {(isLoading || typingIndicator) && (
                    <motion.div 
                      className="flex justify-start"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="bg-card border border-border px-4 py-3 flex items-center gap-2">
                        {typingIndicator ? (
                          <div className="flex gap-1">
                            <motion.span 
                              className="w-2 h-2 bg-muted-foreground rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                            />
                            <motion.span 
                              className="w-2 h-2 bg-muted-foreground rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                            />
                            <motion.span 
                              className="w-2 h-2 bg-muted-foreground rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                            />
                          </div>
                        ) : (
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {typingIndicator ? 'Thinking...' : 'Processing...'}
                        </span>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Error message */}
                  {error && (
                    <div className="text-center py-2">
                      <p className="text-sm text-destructive font-body">{error}</p>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input - show on entry and conversation */}
                {(phase === 'entry' || phase === 'conversation') && (
                  <div className="p-4 border-t border-border bg-card space-y-3">
                    {/* Image previews */}
                    {uploadedImages.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {uploadedImages.map((img, index) => (
                          <div key={index} className="relative w-14 h-14 group">
                            <img
                              src={img.preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover border border-border"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {uploadedImages.length < 5 && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-14 h-14 border border-dashed border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                          >
                            <ImagePlus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <div className="flex gap-2">
                      {/* Image upload button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading || uploadedImages.length >= 5}
                        title="Subir imagen de referencia"
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
                      >
                        <ImagePlus className="w-5 h-5" />
                      </Button>
                      
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (phase === 'entry' && (input.trim() || uploadedImages.length > 0)) {
                              const imageUrls = await uploadImagesToStorage();
                              handleEntryProceed(input.trim() || "I'd like to share some reference images with you", imageUrls);
                              setInput("");
                            } else if (phase === 'conversation') {
                              handleSend();
                            }
                          }
                        }}
                        placeholder={phase === 'entry' ? "Or type anything here..." : "Type your message..."}
                        className="flex-1 bg-background border-border focus:border-foreground/50 font-body"
                        disabled={isLoading || isUploading}
                      />
                      <Button 
                        onClick={async () => {
                          if (phase === 'entry' && (input.trim() || uploadedImages.length > 0)) {
                            const imageUrls = await uploadImagesToStorage();
                            handleEntryProceed(input.trim() || "I'd like to share some reference images with you", imageUrls);
                            setInput("");
                          } else if (phase === 'conversation') {
                            handleSend();
                          }
                        }}
                        disabled={(!input.trim() && uploadedImages.length === 0) || isLoading || isUploading}
                        size="icon"
                        className="bg-foreground text-background hover:bg-foreground/90"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Brief card column (shown when we have data) */}
              {tattooBrief && (
                <div className="w-[200px] p-3 overflow-y-auto bg-secondary/30">
                  <TattooBriefCard 
                    brief={tattooBrief} 
                    compact
                    isEditable={false}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default StudioConcierge;
