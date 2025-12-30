import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { TattooBriefCard, type TattooBrief } from "@/components/TattooBriefCard";
import PreGateQuestions from "@/components/concierge/PreGateQuestions";
import ConciergeEntry from "@/components/concierge/ConciergeEntry";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PreGateResponses {
  wantsColor?: boolean;
  isCoverUp?: boolean;
  isTouchUp?: boolean;
  isRework?: boolean;
  isRepeatDesign?: boolean;
  is18Plus?: boolean;
}

interface ConciergeContext {
  mode: 'explore' | 'qualify' | 'commit' | 'prepare' | 'aftercare' | 'rebook';
  tattoo_brief_id?: string;
  booking_id?: string;
  client_name?: string;
  client_email?: string;
  pre_gate_passed?: boolean;
  pre_gate_responses?: PreGateResponses;
}

type ConciergePhase = 'entry' | 'pre-gate' | 'conversation' | 'blocked';

const CONCIERGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`;

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fingerprint } = useDeviceFingerprint();
  
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
  
  // Store pre-gate responses
  const storePreGateResponses = useCallback(async (
    convId: string, 
    responses: PreGateResponses, 
    passed: boolean,
    blockedBy: string[],
    blockReasons: any[]
  ) => {
    const sessionId = fingerprint || `anon-${Date.now()}`;
    
    await supabase.from("pre_gate_responses").insert([{
      conversation_id: convId,
      session_id: sessionId,
      responses: responses as any,
      gate_passed: passed,
      blocked_by: blockedBy,
      block_reasons: blockReasons as any
    }]);
  }, [fingerprint]);
  
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
  
  // Handle entry from new ConciergeEntry component
  const handleEntryProceed = async (userIntent: string, skipPreGate?: boolean) => {
    // Store the user's intent
    setSelectedEntryId(userIntent);
    
    if (skipPreGate) {
      // Skip pre-gate for exploration/viewing work
      setPhase('conversation');
      const userMessage: Message = { role: 'user', content: userIntent };
      setMessages([userMessage]);
      await sendMessage(userIntent, []);
    } else {
      // Go through pre-gate questions
      setPhase('pre-gate');
    }
  };
  
  // Handle pre-gate completion
  const handlePreGateComplete = async (result: {
    passed: boolean;
    responses: PreGateResponses;
    blocked_by: string[];
    block_reasons: { question_key: string; reason_code: string; message: string }[];
  }) => {
    const convId = await ensureConversation();
    
    // Store pre-gate responses
    if (convId) {
      await storePreGateResponses(
        convId, 
        result.responses, 
        result.passed, 
        result.blocked_by,
        result.block_reasons
      );
    }
    
    // Update context with pre-gate info
    setContext(prev => ({
      ...prev,
      pre_gate_passed: result.passed,
      pre_gate_responses: result.responses
    }));
    
    if (result.passed) {
      // Proceed to conversation
      setPhase('conversation');
      
      // Use the stored user intent as initial message
      const initialMessage = selectedEntryId || "I'd like to learn more about getting a tattoo.";
      
      const userMessage: Message = { role: 'user', content: initialMessage };
      setMessages([userMessage]);
      await sendMessage(initialMessage, [], result.responses);
    } else {
      // Show blocked state with graceful message
      setPhase('blocked');
      setBlockedMessage(result.block_reasons[0]?.message || "Unfortunately, this type of work isn't something we currently offer.");
    }
  };
  
  // Send message to concierge
  const sendMessage = async (
    content: string, 
    currentMessages: Message[], 
    preGateResponses?: PreGateResponses
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const convId = await ensureConversation();
      
      const allMessages = [...currentMessages, { role: 'user' as const, content }];
      
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      };
      
      if (fingerprint) {
        headers["x-device-fingerprint"] = fingerprint;
      }
      
      console.debug("[StudioConcierge] POST", CONCIERGE_URL, {
        hasFingerprint: !!fingerprint,
        hasConversationId: !!convId,
        messages: allMessages.length,
      });

      const response = await fetch(CONCIERGE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: allMessages,
          context: {
            ...context,
            pre_gate_responses: preGateResponses || context.pre_gate_responses,
          },
          conversationId: convId,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        console.error("[StudioConcierge] Non-OK response", response.status, bodyText);
        throw new Error(
          `Assistant backend error (${response.status}). ${bodyText ? bodyText.slice(0, 200) : ""}`.trim()
        );
      }
      
      // Parse context from header
      const contextHeader = response.headers.get("X-Concierge-Context");
      if (contextHeader) {
        try {
          const newContext = JSON.parse(contextHeader);
          setContext(prev => ({ ...prev, ...newContext }));
          
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
                      {phase === 'pre-gate' && "Quick questions"}
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
                  
                  {/* Pre-gate questions */}
                  {phase === 'pre-gate' && (
                    <PreGateQuestions 
                      onComplete={handlePreGateComplete}
                      onBack={() => setPhase('entry')}
                    />
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
                  {phase === 'conversation' && messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] px-4 py-3 ${
                        message.role === 'user' 
                          ? 'bg-foreground text-background'
                          : 'bg-card border border-border text-foreground'
                      }`}>
                        <p className="text-sm font-body whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border px-4 py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
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
                  <div className="p-4 border-t border-border bg-card">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (phase === 'entry' && input.trim()) {
                              // From entry, go through pre-gate with typed message
                              handleEntryProceed(input.trim(), false);
                              setInput("");
                            } else if (phase === 'conversation') {
                              handleSend();
                            }
                          }
                        }}
                        placeholder={phase === 'entry' ? "Or type anything here..." : "Type your message..."}
                        className="flex-1 bg-background border-border focus:border-foreground/50 font-body"
                        disabled={isLoading}
                      />
                      <Button 
                        onClick={() => {
                          if (phase === 'entry' && input.trim()) {
                            handleEntryProceed(input.trim(), false);
                            setInput("");
                          } else if (phase === 'conversation') {
                            handleSend();
                          }
                        }} 
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className="bg-foreground text-background hover:bg-foreground/90"
                      >
                        <Send className="w-4 h-4" />
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
