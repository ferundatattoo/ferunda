import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import LuxuryTattooPlan from "./LuxuryTattooPlan";
import type { BookingState } from "@/pages/LuxuryBooking";
import type { TattooBrief } from "@/components/TattooBriefCard";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LuxuryConciergeScreenProps {
  bookingState: BookingState;
  updateBookingState: (updates: Partial<BookingState>) => void;
  onComplete: () => void;
  onBack: () => void;
}

const CONCIERGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`;

const LuxuryConciergeScreen = ({ 
  bookingState, 
  updateBookingState, 
  onComplete,
  onBack 
}: LuxuryConciergeScreenProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tattooBrief, setTattooBrief] = useState<TattooBrief | null>(bookingState.tattooBrief);
  const [conversationId, setConversationId] = useState<string | null>(bookingState.conversationId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fingerprint } = useDeviceFingerprint();

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "What kind of tattoo are you considering?"
      }]);
    }
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create conversation
  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    
    const sessionId = fingerprint || `anon-${Date.now()}`;
    
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        session_id: sessionId,
        concierge_mode: 'qualify',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
    
    setConversationId(data.id);
    updateBookingState({ conversationId: data.id });
    return data.id;
  }, [conversationId, fingerprint, updateBookingState]);

  // Fetch tattoo brief
  const fetchBrief = useCallback(async (briefId: string) => {
    const { data } = await supabase
      .from("tattoo_briefs")
      .select("*")
      .eq("id", briefId)
      .single();
    
    if (data) {
      setTattooBrief(data as TattooBrief);
      updateBookingState({ tattooBrief: data as TattooBrief });
    }
  }, [updateBookingState]);

  // Send message
  const sendMessage = async (content: string) => {
    setIsLoading(true);
    
    try {
      const convId = await ensureConversation();
      const allMessages = [...messages, { role: 'user' as const, content }];
      
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
          context: { mode: 'qualify', tattoo_brief_id: tattooBrief?.id },
          conversationId: convId
        })
      });
      
      if (!response.ok) throw new Error("Failed to get response");
      
      // Parse context from header
      const contextHeader = response.headers.get("X-Concierge-Context");
      if (contextHeader) {
        try {
          const newContext = JSON.parse(contextHeader);
          if (newContext.tattoo_brief_id) {
            await fetchBrief(newContext.tattoo_brief_id);
          }
        } catch (e) {
          console.error("Failed to parse context:", e);
        }
      }
      
      // Stream response
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
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  assistantContent += text;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                    return updated;
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
      
      // Refresh brief after response
      if (tattooBrief?.id) {
        await fetchBrief(tattooBrief.id);
      }
      
    } catch (err) {
      console.error("Concierge error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const content = input.trim();
    setInput("");
    
    setMessages(prev => [...prev, { role: 'user', content }]);
    await sendMessage(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if brief is complete enough to proceed
  const canProceed = tattooBrief && 
    tattooBrief.style && 
    tattooBrief.placement && 
    tattooBrief.size_estimate_inches_min;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Chat Panel - 60% on desktop */}
      <div className="flex-1 lg:w-[60%] flex flex-col bg-secondary/20">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-display text-2xl text-foreground">Studio Concierge</h2>
            <p className="text-xs text-muted-foreground font-body tracking-wide">
              Building your plan
            </p>
          </div>
        </div>
        
        {/* Messages - off-white background, generous spacing */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div className={`inline-block max-w-[80%] ${
                message.role === 'user' 
                  ? 'bg-foreground text-background px-5 py-3' 
                  : 'text-foreground'
              }`}>
                {/* Assistant messages: max 2 sentences, no bold, no emojis */}
                <p className="text-sm font-body leading-relaxed">
                  {message.content}
                </p>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <div className="text-left">
              <div className="inline-block">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="p-6 border-t border-border bg-background">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-secondary/30 border-border focus:border-foreground/30 font-body"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tattoo Plan Panel - 40% on desktop */}
      <div className="lg:w-[40%] border-l border-border bg-background p-6 lg:overflow-y-auto">
        <LuxuryTattooPlan
          brief={tattooBrief}
          onConfirm={canProceed ? onComplete : undefined}
        />
      </div>
    </div>
  );
};

export default LuxuryConciergeScreen;
