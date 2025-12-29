import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;
const SESSION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-session`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SessionData {
  token: string;
  sessionId: string;
  expiresAt: number;
}

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey there! 💫 I'm Luna, Ferunda's assistant. I help manage her schedule and answer questions about her work. Whether you're curious about her style, pricing, or want to start your tattoo journey — I'm here for you. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session token
  const initializeSession = useCallback(async () => {
    if (sessionData || isInitializing) return;
    
    setIsInitializing(true);
    try {
      const resp = await fetch(`${SESSION_URL}?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (resp.ok) {
        const data = await resp.json();
        setSessionData(data);
        console.log("Session initialized:", data.sessionId.substring(0, 8) + "...");
      }
    } catch (err) {
      console.error("Failed to initialize session:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [sessionData, isInitializing]);

  // Listen for external open events
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('openLunaChat', handleOpenChat);
    return () => window.removeEventListener('openLunaChat', handleOpenChat);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      initializeSession();
    }
  }, [isOpen, initializeSession]);

  // Start a new conversation when chat opens and session is ready
  const startConversation = useCallback(async () => {
    if (conversationId || !sessionData) return;
    
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ session_id: sessionData.sessionId, message_count: 0 })
        .select("id")
        .single();
      
      if (error) throw error;
      setConversationId(data.id);
    } catch {
      // Silent fail - don't break chat for analytics issues
    }
  }, [conversationId, sessionData]);

  useEffect(() => {
    if (isOpen && !conversationId && sessionData) {
      startConversation();
    }
  }, [isOpen, conversationId, sessionData, startConversation]);

  // Track message
  const trackMessage = async (role: "user" | "assistant", content: string) => {
    if (!conversationId) return;
    
    try {
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        role,
        content,
      });
      
      // Update message count
      await supabase
        .from("chat_conversations")
        .update({ message_count: messages.length + 1 })
        .eq("id", conversationId);
    } catch {
      // Silent fail
    }
  };

  // Track conversion
  const trackConversion = async (conversionType: string) => {
    if (!conversationId) return;
    
    try {
      await supabase
        .from("chat_conversations")
        .update({ 
          converted: true, 
          conversion_type: conversionType,
          ended_at: new Date().toISOString()
        })
        .eq("id", conversationId);
    } catch {
      // Silent fail
    }
  };

  // Check if message mentions booking/contact and track as conversion hint
  const checkForConversionSignals = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("book") || lowerText.includes("consultation") || 
        lowerText.includes("appointment") || lowerText.includes("schedule")) {
      trackConversion("booking_interest");
    }
  };

  const streamChat = async (userMessages: Message[]) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    };
    
    // Include signed session token if available
    if (sessionData?.token) {
      headers["x-session-token"] = sessionData.token;
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to get response");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          /* ignore */
        }
      }
    }

    return assistantContent;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Track user message
    await trackMessage("user", userMessage.content);
    checkForConversionSignals(userMessage.content);

    try {
      const response = await streamChat(newMessages.slice(1)); // Skip initial greeting
      // Track assistant response
      if (response) {
        await trackMessage("assistant", response);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Sorry, I had trouble responding. Feel free to use the booking form or reach out via WhatsApp!";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-primary-foreground text-primary flex items-center justify-center shadow-lg hover:shadow-xl transition-all border border-border"
            aria-label="Chat with Luna"
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
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-100px)] bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-body text-sm font-medium text-foreground">Luna</h3>
                  <p className="font-body text-xs text-muted-foreground">Ferunda's Assistant • Online</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl font-body text-sm ${
                      message.role === "user"
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-accent text-foreground rounded-bl-md"
                    }`}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-accent">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background/95 backdrop-blur-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Luna anything..."
                  disabled={isLoading}
                  className="flex-1 bg-accent border-none py-3 px-4 rounded-full font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistant;
