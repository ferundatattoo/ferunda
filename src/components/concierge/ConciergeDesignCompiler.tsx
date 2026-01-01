import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, X, Send, Loader2, ImagePlus, XCircle, 
  Wand2, Eye, CheckCircle, AlertCircle, Info 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";

// Types
type SessionStage = "discovery" | "brief_building" | "design_alignment" | "preview_ready" | "scheduling" | "deposit" | "confirmed";

interface DesignBrief {
  placement_zone?: string;
  size_category?: "small" | "medium" | "large";
  size_cm?: number;
  style_tags?: string[];
  color_mode?: "bg" | "full_color" | "single_accent";
  accent_color?: string;
  concept_summary?: string;
  is_sleeve?: boolean;
  sleeve_type?: "half" | "full" | null;
  sleeve_theme?: string;
  elements_json?: { hero: string[]; secondary: string[]; fillers: string[] };
  references_count?: number;
  placement_photo_present?: boolean;
  existing_tattoos_present?: boolean;
  timeline_preference?: string;
  budget_range?: string;
}

interface ConciergeSession {
  id: string;
  stage: SessionStage;
  design_brief_json: DesignBrief;
  readiness_score: number;
  intent_flags_json: Record<string, boolean>;
  sketch_offer_cooldown_until?: string;
  sketch_offer_declined_count: number;
}

interface ActionCard {
  type: "button" | "wizard" | "chooser";
  label: string;
  action_key: string;
  enabled: boolean;
  reason?: string;
  icon?: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  actions?: ActionCard[];
  timestamp?: Date;
}

// Stage display mapping
const STAGE_LABELS: Record<SessionStage, { label: string; color: string }> = {
  discovery: { label: "Discovery", color: "bg-blue-500/20 text-blue-400" },
  brief_building: { label: "Building Brief", color: "bg-amber-500/20 text-amber-400" },
  design_alignment: { label: "Design Alignment", color: "bg-purple-500/20 text-purple-400" },
  preview_ready: { label: "Preview Ready", color: "bg-green-500/20 text-green-400" },
  scheduling: { label: "Scheduling", color: "bg-cyan-500/20 text-cyan-400" },
  deposit: { label: "Deposit", color: "bg-gold/20 text-gold" },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/20 text-emerald-400" },
};

export function ConciergeDesignCompiler() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<ConciergeSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ file: File; preview: string }[]>([]);
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { fingerprint } = useDeviceFingerprint();
  const { user } = useAuth();
  const workspaceData = useWorkspace(user?.id ?? null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      if (!session) {
        initSession();
      }
    }
  }, [isOpen]);

  // Initialize session
  const initSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-compiler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "create_session",
            workspace_id: workspaceData?.workspaceId,
            client_id: user?.id || fingerprint,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setMessages([
          {
            role: "assistant",
            content: "¡Hola! 🎨 I'm your Design Compiler. Let's create something amazing together.\n\nTell me about the tattoo you're dreaming of - the more detail, the better I can help!",
            actions: data.actions,
          },
        ]);
        setActionCards(data.actions || []);
      }
    } catch (err) {
      console.error("Failed to init session:", err);
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 5 - uploadedImages.length;
    if (remaining <= 0) {
      toast({ title: "Max 5 images", variant: "destructive" });
      return;
    }

    const validFiles: File[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      if (file.size > 8 * 1024 * 1024) continue;
      validFiles.push(file);
    }

    const newImages = validFiles.map((file) => ({
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
  const handleSend = async () => {
    if (!input.trim() && uploadedImages.length === 0) return;
    if (isLoading || !session) return;

    const messageText = input.trim();
    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Upload images
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        for (const img of uploadedImages) {
          const fileName = `design-compiler/${session.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
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

      // Process message
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-compiler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "process_message",
            session_id: session.id,
            message: messageText,
            attachments: imageUrls.length > 0 ? imageUrls : undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Update session
        if (data.session) {
          setSession(data.session);
        }

        // Add assistant response
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response || "Processing your request...",
            actions: data.actions,
          },
        ]);

        // Update action cards
        setActionCards(data.actions || []);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle action card click
  const handleAction = async (actionKey: string) => {
    if (!session) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-compiler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: actionKey,
            session_id: session.id,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.session) setSession(data.session);
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response || "Action completed.",
            actions: data.actions,
          },
        ]);
        
        setActionCards(data.actions || []);

        // Handle navigation for special actions
        if (actionKey === "open_ar_live" && data.ar_url) {
          window.open(data.ar_url, "_blank");
        }
        if (actionKey === "open_codesign" && data.codesign_url) {
          window.open(data.codesign_url, "_blank");
        }
      }
    } catch (err) {
      console.error("Action failed:", err);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Render action cards
  const renderActionCards = () => {
    if (actionCards.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {actionCards.map((action, i) => (
          <Button
            key={i}
            variant={action.enabled ? "default" : "outline"}
            size="sm"
            disabled={!action.enabled}
            onClick={() => handleAction(action.action_key)}
            className="relative"
          >
            {action.action_key === "generate_sketch" && <Wand2 className="w-4 h-4 mr-2" />}
            {action.action_key === "open_ar_live" && <Eye className="w-4 h-4 mr-2" />}
            {action.label}
            {!action.enabled && action.reason && (
              <span className="absolute -top-1 -right-1">
                <Info className="w-3 h-3 text-muted-foreground" />
              </span>
            )}
          </Button>
        ))}
      </div>
    );
  };

  // Readiness meter
  const ReadinessMeter = () => {
    if (!session) return null;
    const score = session.readiness_score;
    const isSleeve = session.design_brief_json?.is_sleeve;
    const threshold = isSleeve ? 0.85 : 0.75;
    const isReady = score >= threshold;

    return (
      <div className="px-4 py-2 bg-secondary/30 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {isSleeve ? "Sleeve" : "Design"} Readiness
          </span>
          <span className="text-xs font-mono">
            {Math.round(score * 100)}%
          </span>
        </div>
        <Progress 
          value={score * 100} 
          className="h-1.5"
        />
        {!isReady && (
          <p className="text-xs text-muted-foreground mt-1">
            {isSleeve 
              ? `Need ${Math.ceil((threshold - score) * 100)}% more (refs, elements, placement photo)`
              : `Add more details to unlock preview`
            }
          </p>
        )}
      </div>
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
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
          >
            <Sparkles className="w-6 h-6" />
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
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/50 to-purple-700/30 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Design Compiler</h3>
                  {session && (
                    <Badge className={STAGE_LABELS[session.stage].color + " text-xs"}>
                      {STAGE_LABELS[session.stage].label}
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Readiness Meter */}
            <ReadinessMeter />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        {msg.actions.map((action, j) => (
                          <Button
                            key={j}
                            variant={action.enabled ? "secondary" : "ghost"}
                            size="sm"
                            disabled={!action.enabled}
                            onClick={() => handleAction(action.action_key)}
                            className="mr-2 mb-1"
                          >
                            {action.label}
                            {!action.enabled && (
                              <span className="ml-1 text-xs opacity-60">({action.reason})</span>
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Image Previews */}
            {uploadedImages.length > 0 && (
              <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-border">
                {uploadedImages.map((img, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img
                      src={img.preview}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                    >
                      <XCircle className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
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
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadedImages.length >= 5}
                >
                  <ImagePlus className="w-5 h-5" />
                </Button>
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your tattoo idea..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && uploadedImages.length === 0)}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ConciergeDesignCompiler;
