import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  Bot,
  ImagePlus,
  XCircle,
  Calendar,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";
import ConciergeEntry from "@/components/concierge/ConciergeEntry";
import { ConciergeARPreview } from "@/components/concierge/ConciergeARPreview";
import { ARQuickPreview } from "@/components/concierge/ARQuickPreview";

// ============================================================================
// TYPES
// ============================================================================

type AssistantMode = "luna" | "concierge";
type ConversationPhase = "entry" | "conversation" | "blocked";

interface Message {
  role: "user" | "assistant";
  content: string;
  mode?: AssistantMode;
  timestamp?: Date;
}

interface ARPreviewState {
  isOpen: boolean;
  referenceImageUrl: string;
  suggestedBodyPart?: string;
  useFullAR: boolean;
}

// ============================================================================
// INTENT DETECTION - Auto-switch between Luna & Concierge
// ============================================================================

const CONCIERGE_PATTERNS = [
  // Booking intents
  /\b(book|booking|reserv|cita|agendar|schedule|appointment)\b/i,
  /\b(quiero|want|need).*(tattoo|tatuaje|tatuar)/i,
  /\b(new|nuevo|nueva).*(tattoo|tatuaje|design|diseño)/i,
  // Project intents
  /\b(cover.?up|cover|cubrir|tapar)\b/i,
  /\b(touch.?up|retouch|retoque|retocar)\b/i,
  /\b(start|begin|iniciar|comenzar|empezar).*(project|proyecto|tattoo)/i,
  // Size/placement discussions
  /\b(full|half|quarter).*(sleeve|espalda|back)\b/i,
  /\b(manga|sleeve|brazo|arm|espalda|back|chest|pecho)\b.*\d+/i,
  // Reference images mentioned
  /\b(reference|referencia|ejemplo|idea|imagen|image|photo|foto)\b/i,
];

const LUNA_PATTERNS = [
  // Quick questions
  /\b(how much|cuánto|precio|price|cost|costo)\b.*\?/i,
  /\b(where|dónde|ubicación|location|address|dirección)\b.*\?/i,
  /\b(when|cuándo|horario|hours|schedule|disponibilidad)\b.*\?/i,
  /\b(what|qué|cual|which).*(style|estilo|do you|haces)\b.*\?/i,
  // FAQ patterns
  /\b(do you|can you|puedes|haces)\b.*\?$/i,
  /\b(policy|políticas|cancel|cancela|deposit|depósito)\b/i,
  /\b(heal|sanar|aftercare|cuidado)\b/i,
  /\b(first.?time|primera.?vez|virgin|nuevo cliente)\b/i,
  // Casual chat
  /^(hi|hello|hola|hey|buenos|good)\b/i,
  /\b(thanks|gracias|thank you)\b/i,
];

function detectMode(message: string, currentMode: AssistantMode): AssistantMode {
  const lowerMessage = message.toLowerCase().trim();
  
  // Strong concierge signals
  const conciergeScore = CONCIERGE_PATTERNS.filter(p => p.test(lowerMessage)).length;
  const lunaScore = LUNA_PATTERNS.filter(p => p.test(lowerMessage)).length;
  
  // If clear winner, switch
  if (conciergeScore > lunaScore && conciergeScore >= 1) {
    return "concierge";
  }
  if (lunaScore > conciergeScore && lunaScore >= 1) {
    return "luna";
  }
  
  // If in concierge and user seems to be continuing project discussion, stay there
  if (currentMode === "concierge" && message.length > 50) {
    return "concierge";
  }
  
  // Default: maintain current mode
  return currentMode;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnifiedConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>("entry");
  const [mode, setMode] = useState<AssistantMode>("luna");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ file: File; preview: string }[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  // AR Preview
  const [arPreview, setArPreview] = useState<ARPreviewState>({
    isOpen: false,
    referenceImageUrl: "",
    useFullAR: true,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { fingerprint } = useDeviceFingerprint();
  const { user } = useAuth();
  const workspaceData = useWorkspace(user?.id ?? null);
  
  // Workspace-aware greeting
  const greeting = useMemo(() => {
    const isStudio = workspaceData?.workspaceType === "studio";
    
    if (mode === "luna") {
      return isStudio
        ? "Hey! 💫 I'm the studio assistant. Quick questions, availability, pricing - I'm here for you. What's on your mind?"
        : "Hey there! 💫 I'm Luna, Ferunda's assistant. Whether you're curious about style, pricing, or availability - I'm here for you. What's on your mind?";
    }
    return isStudio
      ? "¡Hola! 🎨 Let's create something amazing together. Tell me about the tattoo you're dreaming of - any artist preference?"
      : "¡Hola! 🎨 Let's create something amazing together. Tell me about the tattoo you're dreaming of.";
  }, [mode, workspaceData?.workspaceType]);
  
  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Focus input
  useEffect(() => {
    if (isOpen && phase === "conversation") {
      inputRef.current?.focus();
    }
  }, [isOpen, phase]);
  
  // Reset on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: greeting, mode }]);
    }
  }, [isOpen, greeting, mode, messages.length]);
  
  // Create conversation
  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-session?action=conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-fingerprint": fingerprint || "",
          },
          body: JSON.stringify({
            session_id: fingerprint || `anon-${Date.now()}`,
            mode,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation_id);
        return data.conversation_id;
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
    return null;
  }, [conversationId, fingerprint, mode]);
  
  // Handle entry selection (from ConciergeEntry component)
  const handleEntryProceed = useCallback((userIntent: string, imageUrls?: string[]) => {
    // Determine mode based on intent
    const isConciergeIntent = /tattoo|idea|cover|work|exploring/i.test(userIntent);
    const newMode = isConciergeIntent ? "concierge" : "luna";
    
    setMode(newMode);
    setPhase("conversation");
    
    // Send the user's intent as first message
    handleSend(userIntent);
  }, []);
  
  // File upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const remaining = 5 - uploadedImages.length;
    if (remaining <= 0) {
      toast({ title: "Max 5 images", variant: "destructive" });
      return;
    }
    
    const newImages = Array.from(files).slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    
    setUploadedImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };
  
  // Send message
  const handleSend = async (overrideMessage?: string) => {
    const messageText = overrideMessage || input.trim();
    if (!messageText && uploadedImages.length === 0) return;
    if (isLoading) return;
    
    // Auto-detect mode switch
    const detectedMode = detectMode(messageText, mode);
    if (detectedMode !== mode) {
      console.log(`Mode switch: ${mode} → ${detectedMode}`);
      setMode(detectedMode);
    }
    
    const userMessage: Message = { role: "user", content: messageText, mode: detectedMode };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      await ensureConversation();
      
      // Upload images if any
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        for (const img of uploadedImages) {
          const fileName = `concierge/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
          const { data, error } = await supabase.storage
            .from("chat-uploads")
            .upload(fileName, img.file);
          
          if (!error && data) {
            const { data: urlData } = supabase.storage.from("chat-uploads").getPublicUrl(data.path);
            imageUrls.push(urlData.publicUrl);
          }
        }
        setUploadedImages([]);
      }
      
      // Choose endpoint based on mode
      const endpoint = detectedMode === "concierge"
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "x-device-fingerprint": fingerprint || "",
        },
        body: JSON.stringify({
          messages: messages.filter(m => m.mode === detectedMode || !m.mode).slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })).concat({ role: "user", content: messageText }),
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          workspace_id: workspaceData?.workspaceId,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to get response");
      }
      
      // Handle streaming for Luna, JSON for Concierge
      if (detectedMode === "luna" && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant") {
                      return prev.slice(0, -1).concat({ role: "assistant", content: assistantContent, mode: detectedMode });
                    }
                    return [...prev, { role: "assistant", content: assistantContent, mode: detectedMode }];
                  });
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      } else {
        // Concierge returns JSON
        const data = await response.json();
        const assistantContent = data.response || data.message || "I understand. Let me help you with that.";
        
        setMessages((prev) => [...prev, { role: "assistant", content: assistantContent, mode: detectedMode }]);
        
        // Check for AR offer in response
        if (data.arReferenceImage || data.sketchUrl) {
          setArPreview({
            isOpen: false,
            referenceImageUrl: data.arReferenceImage || data.sketchUrl,
            useFullAR: true,
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble responding. Please try again!", mode },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Open AR Preview
  const handleOpenARPreview = (useFullAR = true) => {
    if (arPreview.referenceImageUrl) {
      setArPreview((prev) => ({ ...prev, isOpen: true, useFullAR }));
    }
  };
  
  // Close everything
  const handleClose = () => {
    setIsOpen(false);
    setPhase("entry");
    setMessages([]);
    setConversationId(null);
    setUploadedImages([]);
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
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            aria-label="Chat with assistant"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-100px)] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  mode === "concierge" 
                    ? "bg-gradient-to-br from-primary/30 to-primary/10" 
                    : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                }`}>
                  {mode === "concierge" ? (
                    <Bot className="w-5 h-5 text-primary" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-foreground">
                    {mode === "concierge" ? "Studio Concierge" : "Luna"}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {mode === "concierge" ? (
                      <>
                        <Calendar className="w-3 h-3" /> Booking assistant
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3 h-3" /> Quick answers
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {phase === "entry" ? (
              <ConciergeEntry onProceed={handleEntryProceed} />
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </motion.div>
                  )}
                  
                  {/* AR Preview Button */}
                  {arPreview.referenceImageUrl && !arPreview.isOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenARPreview(true)}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Ver en AR Preview
                      </Button>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Image Previews */}
                {uploadedImages.length > 0 && (
                  <div className="px-4 pb-2 flex gap-2 flex-wrap">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16">
                        <img
                          src={img.preview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-border bg-card/50">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0"
                    >
                      <ImagePlus className="w-5 h-5" />
                    </Button>
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || (!input.trim() && uploadedImages.length === 0)}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR Preview Modals */}
      {arPreview.isOpen && arPreview.useFullAR && (
        <ConciergeARPreview
          isOpen={arPreview.isOpen}
          onClose={() => setArPreview((prev) => ({ ...prev, isOpen: false }))}
          referenceImageUrl={arPreview.referenceImageUrl}
          onBookingClick={() => {
            setArPreview((prev) => ({ ...prev, isOpen: false }));
            toast({ title: "¡Excelente! Let's continue with your booking." });
          }}
        />
      )}
      
      {arPreview.isOpen && !arPreview.useFullAR && (
        <ARQuickPreview
          isOpen={arPreview.isOpen}
          onClose={() => setArPreview((prev) => ({ ...prev, isOpen: false }))}
          referenceImageUrl={arPreview.referenceImageUrl}
        />
      )}
    </>
  );
}

export default UnifiedConcierge;
