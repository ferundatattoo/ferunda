import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  ChevronRight,
  Calendar,
  Palette,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { TattooBriefCard, type TattooBrief } from "@/components/TattooBriefCard";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConciergeContext {
  mode: 'explore' | 'qualify' | 'commit' | 'prepare' | 'aftercare' | 'rebook';
  tattoo_brief_id?: string;
  booking_id?: string;
  client_name?: string;
  client_email?: string;
}

const ENTRY_OPTIONS = [
  { id: 'new', label: 'New tattoo idea', icon: Palette, description: "Let's plan your next piece" },
  { id: 'coverup', label: 'Cover-up', icon: RefreshCw, description: "Transform existing ink" },
  { id: 'touchup', label: 'Touch-up', icon: Calendar, description: "Refresh a previous tattoo" },
  { id: 'consult', label: 'Not sure yet', icon: HelpCircle, description: "Just want to explore" },
];

const CONCIERGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`;

export function StudioConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [showEntry, setShowEntry] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ConciergeContext>({ mode: 'explore' });
  const [tattooBrief, setTattooBrief] = useState<TattooBrief | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fingerprint } = useDeviceFingerprint();
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && !showEntry) {
      inputRef.current?.focus();
    }
  }, [isOpen, showEntry]);
  
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
  
  // Handle entry option selection
  const handleEntrySelect = async (optionId: string) => {
    setShowEntry(false);
    
    let initialMessage = "";
    switch (optionId) {
      case 'new':
        initialMessage = "I have a new tattoo idea I'd like to explore!";
        break;
      case 'coverup':
        initialMessage = "I'm looking to cover up an existing tattoo.";
        break;
      case 'touchup':
        initialMessage = "I need a touch-up on a previous tattoo.";
        break;
      case 'consult':
        initialMessage = "I'm not sure what I want yet, just exploring.";
        break;
    }
    
    // Add the initial message and get AI response
    const userMessage: Message = { role: 'user', content: initialMessage };
    setMessages([userMessage]);
    await sendMessage(initialMessage, []);
  };
  
  // Send message to concierge
  const sendMessage = async (content: string, currentMessages: Message[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const convId = await ensureConversation();
      
      const allMessages = [...currentMessages, { role: 'user' as const, content }];
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY || "",
      };
      
      if (fingerprint) {
        headers["x-device-fingerprint"] = fingerprint;
      }
      
      const response = await fetch(CONCIERGE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: allMessages,
          context,
          conversationId: convId
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to get response");
      }
      
      // Parse context from header
      const contextHeader = response.headers.get("X-Concierge-Context");
      if (contextHeader) {
        try {
          const newContext = JSON.parse(contextHeader);
          setContext(newContext);
          
          // Fetch updated brief if ID changed
          if (newContext.tattoo_brief_id && newContext.tattoo_brief_id !== context.tattoo_brief_id) {
            await fetchBrief(newContext.tattoo_brief_id);
          }
        } catch (e) {
          console.error("Failed to parse context header:", e);
        }
      }
      
      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let assistantContent = "";
      setMessages(prev => [...prev, { role: 'assistant', content: "" }]);
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                    return updated;
                  });
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
      
      // Refresh brief after response
      if (context.tattoo_brief_id) {
        await fetchBrief(context.tattoo_brief_id);
      }
      
    } catch (err) {
      console.error("Concierge error:", err);
      setError("Something went wrong. Please try again!");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle send
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const content = input.trim();
    setInput("");
    
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    await sendMessage(content, messages);
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
    setShowEntry(true);
    setContext({ mode: 'explore' });
    setTattooBrief(null);
    setConversationId(null);
    setError(null);
  };
  
  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Studio Concierge</h3>
                  <p className="text-xs text-muted-foreground">
                    {context.mode === 'explore' && "Let's discover your vision"}
                    {context.mode === 'qualify' && "Building your tattoo plan"}
                    {context.mode === 'commit' && "Ready to book"}
                    {context.mode === 'prepare' && "Session prep"}
                    {context.mode === 'aftercare' && "Healing support"}
                    {context.mode === 'rebook' && "Next steps"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleReset}
                    title="Start over"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Messages column */}
              <div className={`flex-1 flex flex-col ${tattooBrief ? 'border-r border-border' : ''}`}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Entry screen */}
                  {showEntry && (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <h4 className="text-lg font-medium text-foreground mb-2">
                          Hey! 👋 What brings you here?
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          I'll help you plan your tattoo in about 2 minutes.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {ENTRY_OPTIONS.map((option) => (
                          <motion.button
                            key={option.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleEntrySelect(option.id)}
                            className="w-full p-4 rounded-xl bg-card hover:bg-accent border border-border hover:border-primary/50 text-left flex items-center gap-4 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <option.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Messages */}
                  {!showEntry && messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  
                  {/* Error message */}
                  {error && (
                    <div className="text-center py-2">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input */}
                {!showEntry && (
                  <div className="p-4 border-t border-border bg-card">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={isLoading}
                      />
                      <Button 
                        onClick={handleSend} 
                        disabled={!input.trim() || isLoading}
                        size="icon"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Brief card column (shown when we have data) */}
              {tattooBrief && (
                <div className="w-[200px] p-3 overflow-y-auto bg-muted/30">
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
