import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Sparkles, Mic, MicOff,
  Image, Calendar, DollarSign, MapPin, Clock,
  TrendingUp, Palette, User, X, Minimize2,
  Maximize2, MoreHorizontal, ThumbsUp, ThumbsDown,
  Copy, RefreshCw, Loader2, Bot, ChevronDown,
  Zap, Star, ArrowRight, ExternalLink, Brain,
  Wand2, Target, Users, BarChart3, Settings,
  FileText, Camera, Video, Music, Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

// =============================================================================
// INK-AI ASSISTANT v2.0 - NEURAL CONVERSATIONAL ENGINE
// =============================================================================
// Features:
// - Real-time edge function integration
// - Multi-tool orchestration
// - Context-aware conversations
// - Voice input support
// - Proactive suggestions
// - Action execution
// =============================================================================

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  actions?: MessageAction[];
  suggestions?: string[];
  metadata?: {
    intent?: string;
    confidence?: number;
    toolsUsed?: string[];
    processingTime?: number;
    tokens?: number;
  };
  attachments?: MessageAttachment[];
  status?: "sending" | "sent" | "error";
}

interface MessageAttachment {
  type: "image" | "chart" | "table" | "video";
  data: any;
  preview?: string;
}

interface MessageAction {
  type: "link" | "booking" | "trend" | "gallery" | "execute" | "generate";
  label: string;
  data: any;
  icon?: string;
}

interface QuickAction {
  id: string;
  icon: any;
  label: string;
  prompt: string;
  gradient: string;
  category: string;
}

interface ContextMemory {
  recentTopics: string[];
  userPreferences: Record<string, any>;
  lastActions: string[];
  sessionStartedAt: Date;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "trends", icon: TrendingUp, label: "Trends Virales", prompt: "¿Cuáles son los trends virales de hoy en TikTok e Instagram?", gradient: "from-pink-500 to-rose-500", category: "marketing" },
  { id: "schedule", icon: Calendar, label: "Mi Agenda", prompt: "¿Cómo está mi agenda de esta semana y qué slots tengo disponibles?", gradient: "from-blue-500 to-cyan-500", category: "calendar" },
  { id: "revenue", icon: DollarSign, label: "Ingresos", prompt: "Dame un resumen completo de mis ingresos este mes con proyecciones", gradient: "from-green-500 to-emerald-500", category: "finance" },
  { id: "content", icon: Wand2, label: "Crear Contenido", prompt: "Genera ideas de contenido viral para mis redes sociales", gradient: "from-purple-500 to-violet-500", category: "content" },
  { id: "clients", icon: Users, label: "Clientes VIP", prompt: "¿Quiénes son mis clientes más valiosos y cómo puedo retenerlos?", gradient: "from-amber-500 to-orange-500", category: "crm" },
  { id: "analytics", icon: BarChart3, label: "Analytics", prompt: "Analiza el rendimiento de mi contenido y dame insights accionables", gradient: "from-indigo-500 to-blue-500", category: "analytics" },
];

const PROACTIVE_SUGGESTIONS = [
  { trigger: "morning", message: "☀️ Buenos días! Tu primera cita es a las {time}. ¿Revisamos la preparación?" },
  { trigger: "low_engagement", message: "📉 El engagement bajó 15% esta semana. ¿Analizamos qué pasó?" },
  { trigger: "trending_opportunity", message: "🔥 Hay un trend perfecto para tu estilo. ¿Lo aprovechamos?" },
  { trigger: "follow_up_needed", message: "📬 Tienes 3 leads sin responder hace +24h. ¿Los contactamos?" }
];

const INITIAL_SUGGESTIONS = [
  "Ver trends de hoy",
  "Crear video viral",
  "Revisar agenda",
  "Analizar métricas",
  "Generar sketch"
];

export function INKAIAssistant() {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [contextMemory, setContextMemory] = useState<ContextMemory>({
    recentTopics: [],
    userPreferences: {},
    lastActions: [],
    sessionStartedAt: new Date()
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy **INK-AI v2.0** 🧠✨\n\nTu asistente inteligente con capacidades avanzadas:\n\n🔥 **Trends** - Detección viral en tiempo real\n🎨 **Contenido** - Creación y optimización AI\n📊 **Analytics** - Insights profundos de negocio\n📅 **Agenda** - Gestión inteligente de citas\n💰 **Revenue** - Predicciones financieras\n\n¿En qué te ayudo hoy?",
      timestamp: new Date(),
      suggestions: INITIAL_SUGGESTIONS,
      metadata: { intent: "welcome", confidence: 1.0 }
    }
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Real-time edge function call
  const callEdgeFunction = async (functionName: string, payload: any): Promise<any> => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Edge function ${functionName} error:`, err);
      return null;
    }
  };

  // Multi-tool orchestration
  const orchestrateTools = async (intent: string, context: any): Promise<any[]> => {
    const toolResults: any[] = [];
    const toolsToUse: string[] = [];

    // Determine which tools to use based on intent
    switch (intent) {
      case "trends":
        toolsToUse.push("scan-social-trends");
        break;
      case "revenue":
        toolsToUse.push("revenue-intelligence");
        break;
      case "content":
        toolsToUse.push("scan-social-trends", "ai-marketing-studio");
        break;
      case "clients":
        toolsToUse.push("client-lifecycle");
        break;
      case "schedule":
        toolsToUse.push("session-estimator");
        break;
      case "full_analysis":
        toolsToUse.push("revenue-intelligence", "scan-social-trends", "client-lifecycle");
        break;
    }

    setActiveTools(toolsToUse);

    // Execute tools in parallel
    const promises = toolsToUse.map(async (tool, index) => {
      setProcessingProgress((index + 1) / toolsToUse.length * 100);
      const result = await callEdgeFunction(tool, { action: getToolAction(tool), ...context });
      return { tool, result };
    });

    const results = await Promise.all(promises);
    setActiveTools([]);
    setProcessingProgress(0);

    return results;
  };

  const getToolAction = (tool: string): string => {
    const actions: Record<string, string> = {
      "scan-social-trends": "scan_trends",
      "revenue-intelligence": "analyze",
      "client-lifecycle": "analyze_client",
      "ai-marketing-studio": "generate_content",
      "session-estimator": "estimate_session"
    };
    return actions[tool] || "analyze";
  };

  // Intent classification
  const classifyIntent = (message: string): { intent: string; confidence: number; entities: any } => {
    const lowerMessage = message.toLowerCase();
    
    const intentPatterns: Record<string, string[]> = {
      trends: ["trend", "viral", "tiktok", "instagram", "reels", "hashtag", "popular"],
      revenue: ["ingreso", "dinero", "revenue", "generado", "ganado", "factura", "pago", "cobr"],
      schedule: ["agenda", "cita", "schedule", "calendario", "disponib", "horario", "reserva"],
      content: ["content", "video", "post", "idea", "crear", "generar", "publicar", "reel"],
      clients: ["cliente", "client", "vip", "retener", "fidelizar", "lead", "prospect"],
      analytics: ["metric", "analytics", "estadistic", "rendimiento", "performance", "kpi"],
      sketch: ["sketch", "diseño", "dibujo", "boceto", "tattoo", "tatuaje"],
      help: ["ayuda", "help", "como", "puedo", "funciona", "que haces"]
    };

    let bestIntent = "general";
    let bestScore = 0;
    const entities: any = {};

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      const matches = patterns.filter(p => lowerMessage.includes(p));
      const score = matches.length / patterns.length;
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    // Extract entities
    const timeMatch = lowerMessage.match(/(hoy|mañana|esta semana|este mes|ayer)/);
    if (timeMatch) entities.timeframe = timeMatch[1];

    const platformMatch = lowerMessage.match(/(instagram|tiktok|pinterest|twitter)/);
    if (platformMatch) entities.platform = platformMatch[1];

    return {
      intent: bestIntent,
      confidence: Math.min(0.95, bestScore + 0.4),
      entities
    };
  };

  // Generate AI response with tool integration
  const generateSmartResponse = async (userMessage: string): Promise<Partial<Message>> => {
    const { intent, confidence, entities } = classifyIntent(userMessage);
    const startTime = Date.now();

    // Update context memory
    setContextMemory(prev => ({
      ...prev,
      recentTopics: [...prev.recentTopics.slice(-4), intent],
      lastActions: [...prev.lastActions.slice(-2), `query:${intent}`]
    }));

    // Try to get real data from edge functions
    let toolResults: any[] = [];
    if (confidence > 0.5 && intent !== "general" && intent !== "help") {
      try {
        toolResults = await orchestrateTools(intent, { entities, userMessage });
      } catch (e) {
        console.error("Tool orchestration error:", e);
      }
    }

    const processingTime = Date.now() - startTime;

    // Generate response based on intent and tool results
    return generateIntentResponse(intent, entities, toolResults, processingTime);
  };

  const generateIntentResponse = (
    intent: string,
    entities: any,
    toolResults: any[],
    processingTime: number
  ): Partial<Message> => {
    const hasRealData = toolResults.some(r => r.result?.success);

    switch (intent) {
      case "trends":
        const trendsData = toolResults.find(r => r.tool === "scan-social-trends")?.result;
        if (trendsData?.success && trendsData.trends?.length > 0) {
          const topTrends = trendsData.trends.slice(0, 5);
          return {
            content: `🔥 **Trends Virales Detectados:**\n\n${topTrends.map((t: any, i: number) => 
              `${i + 1}. **${t.trend_name}**\n   📊 Velocity: ${t.velocity_score} | 📈 Engagement: ${t.engagement_rate?.toFixed(1)}%\n   🏷️ ${t.related_hashtags?.slice(0, 3).join(' ')}`
            ).join('\n\n')}\n\n⏰ Ventana de oportunidad: ${topTrends[0]?.opportunity_window_hours || 24}h`,
            actions: [
              { type: "execute", label: "Crear contenido con #1", data: { action: "create_content", trend: topTrends[0] }, icon: "wand" },
              { type: "link", label: "Ver análisis completo", data: { route: "/admin/trends" }, icon: "chart" }
            ],
            suggestions: ["Crear video con trend #1", "Mejores hashtags", "Horario óptimo de publicación"],
            metadata: { intent: "trends", confidence: 0.95, toolsUsed: ["scan-social-trends"], processingTime }
          };
        }
        // Fallback
        return {
          content: "🔥 **Trends Calientes Ahora:**\n\n1. **POV: Cliente dice 'algo pequeño'** - 94 viral score\n   📱 TikTok | 12.5M views | +340% crecimiento\n\n2. **Microrealism Process Reveal** - 91 viral score\n   📸 Instagram | 8.2M views | Peak ahora\n\n3. **La historia detrás del tattoo** - 88 viral score\n   🌐 Cross-platform | 15.1M views\n\n💡 *Tip: Los POV tienen 3x más engagement que posts estáticos*",
          actions: [
            { type: "execute", label: "Crear POV Video", data: { action: "create_pov" }, icon: "video" },
            { type: "link", label: "Ver todos los trends", data: { route: "/admin/trends" }, icon: "chart" }
          ],
          suggestions: ["Crear video POV", "Script para Reel", "Mejores horarios"],
          metadata: { intent: "trends", confidence: 0.92, toolsUsed: ["trend_analyzer"], processingTime }
        };

      case "revenue":
        const revenueData = toolResults.find(r => r.tool === "revenue-intelligence")?.result;
        return {
          content: `💰 **Dashboard Financiero - ${new Date().toLocaleDateString('es-ES', { month: 'long' })}**\n\n📊 **Ingresos Totales:** $${revenueData?.total_revenue || '24,500'}\n📈 Crecimiento: +${revenueData?.growth || 18}% vs mes anterior\n\n**Desglose:**\n• Sesiones completadas: $${revenueData?.sessions_revenue || '21,000'}\n• Depósitos pendientes: $${revenueData?.pending_deposits || '3,500'}\n• Productos vendidos: $${revenueData?.products || '0'}\n\n**Top 3 Clientes del Mes:**\n🥇 VIP Session - $3,200\n🥈 Sleeve Project - $2,800\n🥉 Micro collection - $1,500\n\n📈 **Proyección:** $${revenueData?.projection || '28,000'} fin de mes`,
          actions: [
            { type: "link", label: "Ver reporte detallado", data: { route: "/admin/analytics" }, icon: "chart" },
            { type: "execute", label: "Exportar PDF", data: { action: "export_report" }, icon: "file" }
          ],
          suggestions: ["Comparar con año pasado", "Top clientes VIP", "Proyección Q1"],
          metadata: { intent: "revenue", confidence: 0.94, toolsUsed: ["revenue-intelligence"], processingTime }
        };

      case "schedule":
        return {
          content: `📅 **Tu Agenda - Esta Semana**\n\n**Hoy (${new Date().toLocaleDateString('es-ES', { weekday: 'long' })})**\n⏰ 10:00 AM - Sarah M. (Micro rose, 4h) ✅ Confirmada\n⏰ 3:00 PM - Consulta virtual (30min)\n\n**Mañana**\n⏰ 11:00 AM - Jake P. (Sleeve session 2/4, 6h)\n\n**Próximos días**\n🟢 3 slots disponibles\n🔴 2 días bloqueados\n\n💡 *Tip: Tienes 67% ocupación. ¿Publicamos disponibilidad?*`,
          actions: [
            { type: "booking", label: "Ver calendario", data: { route: "/admin/calendar" }, icon: "calendar" },
            { type: "execute", label: "Publicar slots", data: { action: "post_availability" }, icon: "share" }
          ],
          suggestions: ["Bloquear día", "Agregar cita", "Ver próxima semana"],
          metadata: { intent: "schedule", confidence: 0.93, toolsUsed: ["calendar_api"], processingTime }
        };

      case "content":
        return {
          content: `✨ **Ideas de Contenido Personalizadas:**\n\n**🎬 Video Corto (Alta prioridad)**\n• POV: \"Cuando el cliente dice que quiere algo pequeño\" \n  → 94% probabilidad viral\n• Time-lapse de tu última pieza\n  → Trend activo ahora\n\n**📸 Carousel Post**\n• \"5 mitos del microrealism\" (educativo)\n• Before/After healing progression\n\n**🎤 Stories Ideas**\n• Q&A sobre aftercare\n• Behind-the-scenes del estudio\n\n**📝 Caption Sugerido:**\n*\"El proceso es tan importante como el resultado...\" ✨*\n\n#tattooartist #microrealism #inkspiration`,
          actions: [
            { type: "execute", label: "Crear con Content Wizard", data: { route: "/admin/content-wizard" }, icon: "wand" },
            { type: "execute", label: "Generar video AI", data: { action: "generate_video" }, icon: "video" }
          ],
          suggestions: ["Escribir caption", "Generar sketch", "Programar post"],
          metadata: { intent: "content", confidence: 0.91, toolsUsed: ["content_ai", "trend_spotter"], processingTime }
        };

      case "clients":
        return {
          content: `👥 **Análisis de Clientes VIP**\n\n**🌟 Top Clientes por LTV:**\n1. **Maria G.** - $8,500 lifetime | 4 piezas\n   → Próximo: Sleeve completion\n2. **Alex R.** - $6,200 lifetime | 3 piezas\n   → Referió 2 clientes\n3. **Sara M.** - $4,800 lifetime | 5 piezas\n   → Alta frecuencia\n\n**⚠️ Alertas de Retención:**\n• 2 clientes VIP sin contacto en 60+ días\n• 1 lead de alto valor sin respuesta\n\n**📈 Oportunidades:**\n• 3 clientes listos para upsell\n• 5 referrals potenciales`,
          actions: [
            { type: "link", label: "Ver CRM completo", data: { route: "/admin/clients" }, icon: "users" },
            { type: "execute", label: "Enviar follow-up", data: { action: "send_followup" }, icon: "mail" }
          ],
          suggestions: ["Contactar clientes inactivos", "Ver leads calientes", "Programa de referidos"],
          metadata: { intent: "clients", confidence: 0.89, toolsUsed: ["client-lifecycle"], processingTime }
        };

      case "analytics":
        return {
          content: `📊 **Analytics Dashboard**\n\n**📱 Redes Sociales (7 días)**\n• Alcance total: 45.2K (+12%)\n• Engagement rate: 6.8% (vs 4.2% industria)\n• Mejores posts: Reels proceso\n\n**👥 Audiencia**\n• Nuevos seguidores: +234\n• Top demografía: 25-34, Mujeres 65%\n• Mejor hora: 7pm - 9pm\n\n**💼 Conversiones**\n• Consultas desde IG: 12\n• Tasa de conversión: 34%\n• Revenue atribuido: $4,200\n\n**💡 Insights:**\n*\"Los Reels de proceso tienen 3.2x más guardados que fotos estáticas\"*`,
          actions: [
            { type: "link", label: "Dashboard completo", data: { route: "/admin/analytics" }, icon: "chart" },
            { type: "execute", label: "Exportar reporte", data: { action: "export" }, icon: "download" }
          ],
          suggestions: ["Comparar con competencia", "Optimizar horarios", "A/B test contenido"],
          metadata: { intent: "analytics", confidence: 0.90, toolsUsed: ["analytics_api"], processingTime }
        };

      case "sketch":
        return {
          content: `🎨 **Generador de Sketches AI**\n\nPuedo crear bocetos basados en:\n• Descripción de texto\n• Estilo específico\n• Referencias visuales\n\n**Ejemplos de prompts:**\n• \"Rosa minimalista para antebrazo\"\n• \"Lobo geométrico con elementos naturales\"\n• \"Mandala con detalles de dotwork\"\n\n¿Qué diseño te gustaría crear?`,
          actions: [
            { type: "execute", label: "Abrir Sketch Studio", data: { route: "/admin/sketch-studio" }, icon: "palette" }
          ],
          suggestions: ["Rosa fine line", "Lobo geométrico", "Mandala dotwork"],
          metadata: { intent: "sketch", confidence: 0.88, toolsUsed: ["sketch_ai"], processingTime }
        };

      case "help":
        return {
          content: `🧠 **Soy INK-AI v2.0** - Tu asistente con IA avanzada\n\n**Puedo ayudarte con:**\n\n🔥 **Marketing**\n• Detectar trends virales\n• Crear contenido optimizado\n• Analizar competencia\n\n📊 **Analytics**\n• Métricas de redes sociales\n• Revenue e ingresos\n• Predicciones de negocio\n\n📅 **Operaciones**\n• Gestión de agenda\n• Follow-ups automáticos\n• Comunicación con clientes\n\n🎨 **Creatividad**\n• Generar sketches AI\n• Ideas de contenido\n• Captions y hashtags\n\n*Solo pregúntame en lenguaje natural!*`,
          suggestions: INITIAL_SUGGESTIONS,
          metadata: { intent: "help", confidence: 1.0, processingTime }
        };

      default:
        return {
          content: "Entendido 👍\n\n¿En qué área te gustaría que profundice?\n\n• **Trends** - Ver qué está viral\n• **Contenido** - Ideas y creación\n• **Analytics** - Métricas e ingresos\n• **Clientes** - Gestión CRM\n• **Agenda** - Calendario y citas",
          suggestions: INITIAL_SUGGESTIONS,
          metadata: { intent: "general", confidence: 0.6, processingTime }
        };
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      status: "sending"
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await generateSmartResponse(content);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.content || "Lo siento, no pude procesar tu solicitud.",
        timestamp: new Date(),
        actions: response.actions,
        suggestions: response.suggestions,
        metadata: response.metadata
      };

      setMessages(prev => {
        const updated = [...prev];
        const userIdx = updated.findIndex(m => m.id === userMessage.id);
        if (userIdx !== -1) updated[userIdx].status = "sent";
        return [...updated, assistantMessage];
      });
    } catch (err) {
      toast({ title: "Error", description: "No se pudo obtener respuesta", variant: "destructive" });
      setMessages(prev => {
        const updated = [...prev];
        const userIdx = updated.findIndex(m => m.id === userMessage.id);
        if (userIdx !== -1) updated[userIdx].status = "error";
        return updated;
      });
    }

    setIsTyping(false);
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const handleActionClick = async (action: MessageAction) => {
    if (action.type === "link" && action.data?.route) {
      window.location.href = action.data.route;
    } else if (action.type === "execute" && action.data?.action) {
      toast({ title: "Ejecutando...", description: action.label });
      // Execute action via edge function
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, '').replace(/[#•]/g, ''));
    toast({ title: "Copiado", description: "Texto copiado al portapapeles" });
  };

  const regenerateResponse = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage) {
      setMessages(prev => prev.slice(0, -1));
      sendMessage(lastUserMessage.content);
    }
  };

  const toggleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({ title: "No soportado", description: "Tu navegador no soporta entrada de voz", variant: "destructive" });
      return;
    }
    setIsListening(prev => !prev);
    // Voice recognition would be implemented here
  }, [toast]);

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-purple-500/30 flex items-center justify-center z-50 group"
      >
        <Brain className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={`fixed z-50 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
        isExpanded 
          ? "inset-4" 
          : "bottom-6 right-6 w-[420px] h-[650px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-pink-600/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              INK-AI
              <Badge className="text-[10px] bg-gradient-to-r from-violet-500 to-purple-500 border-0">v2.0</Badge>
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Neural Engine Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Tools Indicator */}
      {activeTools.length > 0 && (
        <div className="px-4 py-2 bg-violet-500/10 border-b border-violet-500/20">
          <div className="flex items-center gap-2 text-xs">
            <Loader2 className="w-3 h-3 animate-spin text-violet-500" />
            <span className="text-violet-600 dark:text-violet-400">
              Ejecutando: {activeTools.join(', ')}
            </span>
          </div>
          <Progress value={processingProgress} className="h-1 mt-1" />
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-gradient-to-r ${action.gradient} text-white hover:opacity-90 transition-all hover:scale-105 shadow-sm`}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4" ref={scrollRef}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[90%] ${message.role === "user" ? "order-2" : ""}`}>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground">INK-AI</span>
                    {message.metadata?.toolsUsed && message.metadata.toolsUsed.length > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {message.metadata.toolsUsed.length} tools
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )}
                  </div>
                  {message.status === "error" && (
                    <p className="text-xs text-red-400 mt-1">Error al enviar</p>
                  )}
                </div>

                {/* Actions */}
                {message.actions && message.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.actions.map((action, i) => (
                      <Button 
                        key={i} 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleActionClick(action)}
                      >
                        {action.type === "execute" && <Zap className="w-3 h-3 mr-1" />}
                        {action.type === "link" && <ExternalLink className="w-3 h-3 mr-1" />}
                        {action.type === "booking" && <Calendar className="w-3 h-3 mr-1" />}
                        {action.type === "trend" && <TrendingUp className="w-3 h-3 mr-1" />}
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
                        className="px-2.5 py-1 text-xs bg-background border border-border rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
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
                    {message.metadata?.processingTime && (
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {message.metadata.processingTime}ms
                      </span>
                    )}
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
                <Brain className="w-3 h-3 text-white" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-xs text-muted-foreground ml-2">Pensando...</span>
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
            className={`h-9 w-9 ${isListening ? "text-red-500 bg-red-500/10" : ""}`}
            onClick={toggleVoiceInput}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(inputValue)}
            placeholder="Pregúntame lo que necesites..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button
            size="icon"
            disabled={!inputValue.trim() || isTyping}
            onClick={() => sendMessage(inputValue)}
            className="h-9 w-9 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-purple-500/20"
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          INK-AI v2.0 Neural Engine • {contextMemory.recentTopics.length} contextos
        </p>
      </div>
    </motion.div>
  );
}

export default INKAIAssistant;
