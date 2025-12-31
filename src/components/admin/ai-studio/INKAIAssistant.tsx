import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Sparkles, Mic, MicOff,
  Image, Calendar, DollarSign, MapPin, Clock,
  TrendingUp, Palette, User, X, Minimize2,
  Maximize2, MoreHorizontal, ThumbsUp, ThumbsDown,
  Copy, RefreshCw, Loader2, Bot, ChevronDown,
  Zap, Star, ArrowRight, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: MessageAction[];
  suggestions?: string[];
  metadata?: {
    intent?: string;
    confidence?: number;
    toolsUsed?: string[];
  };
}

interface MessageAction {
  type: "link" | "booking" | "trend" | "gallery";
  label: string;
  data: any;
}

interface QuickAction {
  id: string;
  icon: any;
  label: string;
  prompt: string;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "trends", icon: TrendingUp, label: "Ver Trends", prompt: "¿Cuáles son los trends virales de hoy?", gradient: "from-pink-500 to-rose-500" },
  { id: "schedule", icon: Calendar, label: "Mi Agenda", prompt: "¿Cómo está mi agenda de esta semana?", gradient: "from-blue-500 to-cyan-500" },
  { id: "revenue", icon: DollarSign, label: "Ingresos", prompt: "¿Cuánto he generado este mes?", gradient: "from-green-500 to-emerald-500" },
  { id: "content", icon: Sparkles, label: "Ideas de Contenido", prompt: "Dame ideas de contenido para hoy", gradient: "from-purple-500 to-violet-500" },
];

const INITIAL_SUGGESTIONS = [
  "Ver trends de TikTok",
  "Crear contenido viral",
  "Revisar agenda",
  "Analizar métricas"
];

export function INKAIAssistant() {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy INK-AI, tu asistente creativo. 🎨\n\nPuedo ayudarte con:\n• Detectar trends virales\n• Crear contenido para redes\n• Gestionar tu agenda\n• Analizar métricas\n\n¿En qué te puedo ayudar hoy?",
      timestamp: new Date(),
      suggestions: INITIAL_SUGGESTIONS
    }
  ]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Simulate AI response with context-aware replies
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      const response = generateAIResponse(content);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        actions: response.actions,
        suggestions: response.suggestions,
        metadata: response.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      toast({ title: "Error", description: "Could not get response", variant: "destructive" });
    }

    setIsTyping(false);
  };

  const generateAIResponse = (userMessage: string): Partial<Message> => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Trends
    if (lowerMessage.includes("trend") || lowerMessage.includes("viral")) {
      return {
        content: "🔥 **Trends Calientes Ahora:**\n\n1. **POV: Cliente dice 'algo pequeño'** - 94 viral score\n   TikTok | 12.5M views\n\n2. **Microrealism Process Reveal** - 91 viral score\n   Instagram | 8.2M views\n\n3. **La historia detrás del tattoo** - 88 viral score\n   Ambas plataformas | 15.1M views\n\n¿Quieres que te prepare un script para alguno de estos?",
        actions: [
          { type: "trend", label: "Crear contenido con #1", data: { trendId: "1" } },
          { type: "link", label: "Ver todos los trends", data: { route: "/admin/trends" } }
        ],
        suggestions: ["Crear video POV", "Ver más trends", "Mejores horarios"],
        metadata: { intent: "trends", confidence: 0.95, toolsUsed: ["trend_spotter"] }
      };
    }

    // Schedule/Agenda
    if (lowerMessage.includes("agenda") || lowerMessage.includes("cita") || lowerMessage.includes("schedule")) {
      return {
        content: "📅 **Tu agenda esta semana:**\n\n**Hoy (Martes)**\n• 10:00 AM - Sarah M. (Micro rose, 4h)\n• 3:00 PM - Consulta virtual\n\n**Miércoles**\n• 11:00 AM - Jake P. (Sleeve session 2/4)\n\n**Jueves**\n• Día libre 🎉\n\n**Viernes**\n• 9:00 AM - VIP Client (Full day)\n\nTienes 3 slots disponibles esta semana. ¿Quieres que publique disponibilidad?",
        actions: [
          { type: "booking", label: "Ver calendario completo", data: { route: "/admin/calendar" } },
          { type: "link", label: "Publicar disponibilidad", data: { action: "post_availability" } }
        ],
        suggestions: ["Bloquear día", "Agregar cita", "Ver siguiente semana"],
        metadata: { intent: "schedule", confidence: 0.92, toolsUsed: ["calendar_api"] }
      };
    }

    // Revenue/Money
    if (lowerMessage.includes("ingreso") || lowerMessage.includes("dinero") || lowerMessage.includes("revenue") || lowerMessage.includes("generado")) {
      return {
        content: "💰 **Resumen Financiero - Diciembre:**\n\n**Ingresos totales:** $24,500\n📈 +18% vs mes anterior\n\n**Desglose:**\n• Sesiones completadas: $21,000\n• Depósitos pendientes: $3,500\n\n**Top clientes:**\n1. VIP Session - $3,200\n2. Sleeve Project - $2,800\n3. Micro collection - $1,500\n\n**Proyección fin de mes:** $28,000",
        actions: [
          { type: "link", label: "Ver reporte completo", data: { route: "/admin/analytics" } }
        ],
        suggestions: ["Comparar con año pasado", "Proyección Q1", "Exportar reporte"],
        metadata: { intent: "revenue", confidence: 0.94, toolsUsed: ["analytics_api"] }
      };
    }

    // Content ideas
    if (lowerMessage.includes("content") || lowerMessage.includes("idea") || lowerMessage.includes("video") || lowerMessage.includes("post")) {
      return {
        content: "✨ **Ideas de contenido para hoy:**\n\n**🎬 Video Corto (Reels/TikTok)**\n• POV del proceso de tu última pieza\n• Before/After de un coverup\n\n**📸 Carousel Post**\n• \"5 cosas que no sabías del microrealism\"\n• Progreso de healing de un cliente\n\n**🎤 Story Ideas**\n• Q&A sobre aftercare\n• Tour del estudio\n\n**🔥 Trend adaptable:**\n\"La historia detrás del tattoo\" está viral - ¿tienes un cliente con buena historia?",
        actions: [
          { type: "trend", label: "Crear con Content Wizard", data: { route: "/admin/content-wizard" } },
          { type: "link", label: "Ver calendario editorial", data: { route: "/admin/content" } }
        ],
        suggestions: ["Escribir caption", "Mejores hashtags", "Horario óptimo"],
        metadata: { intent: "content", confidence: 0.91, toolsUsed: ["content_ai", "trend_spotter"] }
      };
    }

    // Default response
    return {
      content: "Entendido! 👍\n\nPuedo ayudarte con varias cosas:\n\n• **Trends** - Ver qué está viral ahora\n• **Contenido** - Ideas y creación de videos\n• **Agenda** - Tu calendario y citas\n• **Analytics** - Métricas e ingresos\n• **Clientes** - Gestión de consultas\n\n¿Qué te gustaría explorar?",
      suggestions: ["Ver trends", "Crear contenido", "Mi agenda", "Analizar métricas"],
      metadata: { intent: "general", confidence: 0.7 }
    };
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied!", description: "Message copied to clipboard" });
  };

  const regenerateResponse = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      setMessages(prev => prev.slice(0, -1));
      sendMessage(lastUserMessage.content);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-purple-500/30 flex items-center justify-center z-50"
      >
        <Bot className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`fixed z-50 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden ${
        isExpanded 
          ? "inset-4" 
          : "bottom-6 right-6 w-[400px] h-[600px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-violet-600/10 to-purple-600/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              INK-AI
              <Badge variant="secondary" className="text-xs">Pro</Badge>
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-border">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-gradient-to-r ${action.gradient} text-white hover:opacity-90 transition-opacity`}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4" style={{ height: isExpanded ? "calc(100% - 200px)" : "380px" }}>
        <div className="space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${message.role === "user" ? "order-2" : ""}`}>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground">INK-AI</span>
                  </div>
                )}
                
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>

                {/* Actions */}
                {message.actions && message.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.actions.map((action, i) => (
                      <Button key={i} variant="outline" size="sm" className="text-xs h-7">
                        {action.type === "trend" && <Zap className="w-3 h-3 mr-1" />}
                        {action.type === "link" && <ExternalLink className="w-3 h-3 mr-1" />}
                        {action.type === "booking" && <Calendar className="w-3 h-3 mr-1" />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {message.suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(suggestion)}
                        className="px-2.5 py-1 text-xs bg-background border border-border rounded-full hover:bg-secondary transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message actions */}
                {message.role === "assistant" && message.id !== "welcome" && (
                  <div className="flex items-center gap-1 mt-2 opacity-0 hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyMessage(message.content)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={regenerateResponse}>
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ThumbsUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={isListening ? "text-red-500" : ""}
            onClick={() => setIsListening(!isListening)}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(inputValue)}
            placeholder="Ask INK-AI anything..."
            className="flex-1"
          />
          <Button
            size="icon"
            disabled={!inputValue.trim() || isTyping}
            onClick={() => sendMessage(inputValue)}
            className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          INK-AI puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </motion.div>
  );
}

export default INKAIAssistant;
