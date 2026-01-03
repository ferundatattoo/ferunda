import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, MessageCircle, Settings2, Radio, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
import OmnichannelInbox from "./OmnichannelInbox";
import ConversationsManager from "./ConversationsManager";
import OmnichannelWizard from "./OmnichannelWizard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useModuleRealtime } from "@/hooks/useGlobalRealtime";

interface ChatConversation {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  converted: boolean;
  conversion_type: string | null;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  conversions: number;
  conversionRate: number;
  commonQuestions: { question: string; count: number }[];
}

interface DiagnosticCounts {
  chatConversations: number;
  chatMessages: number;
  omnichannelMessages: number;
  lastChatMessage: string | null;
  lastOmnichannelMessage: string | null;
  errors: string[];
}

const InboxUnified = () => {
  const [activeSubTab, setActiveSubTab] = useState("omnichannel");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCounts | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);

  // Real-time connection with auto-refresh
  const handleRealtimeUpdate = useCallback(() => {
    if (activeSubTab === "luna") {
      fetchAnalytics();
    }
    fetchDiagnostics();
  }, [activeSubTab]);

  const realtimeState = useModuleRealtime('inbox', handleRealtimeUpdate);

  // Fetch diagnostics on mount
  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    const errors: string[] = [];
    let chatConversations = 0;
    let chatMessages = 0;
    let omnichannelMessages = 0;
    let lastChatMessage: string | null = null;
    let lastOmnichannelMessage: string | null = null;

    try {
      const { count: convCount, error: convErr } = await supabase
        .from("chat_conversations")
        .select("*", { count: "exact", head: true });
      if (convErr) errors.push(`chat_conversations: ${convErr.message}`);
      else chatConversations = convCount || 0;
    } catch (e: any) {
      errors.push(`chat_conversations: ${e.message}`);
    }

    try {
      const { count: msgCount, data: lastMsg, error: msgErr } = await supabase
        .from("chat_messages")
        .select("created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(1);
      if (msgErr) errors.push(`chat_messages: ${msgErr.message}`);
      else {
        chatMessages = msgCount || 0;
        lastChatMessage = lastMsg?.[0]?.created_at || null;
      }
    } catch (e: any) {
      errors.push(`chat_messages: ${e.message}`);
    }

    try {
      const { count: omniCount, data: lastOmni, error: omniErr } = await supabase
        .from("omnichannel_messages")
        .select("created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(1);
      if (omniErr) errors.push(`omnichannel_messages: ${omniErr.message}`);
      else {
        omnichannelMessages = omniCount || 0;
        lastOmnichannelMessage = lastOmni?.[0]?.created_at || null;
      }
    } catch (e: any) {
      errors.push(`omnichannel_messages: ${e.message}`);
    }

    setDiagnostics({
      chatConversations,
      chatMessages,
      omnichannelMessages,
      lastChatMessage,
      lastOmnichannelMessage,
      errors,
    });
  };

  useEffect(() => {
    if (activeSubTab === "luna") {
      fetchAnalytics();
    }
  }, [activeSubTab]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: convData, error: convError } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (convError) throw convError;
      setConversations(convData || []);

      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(500);

      if (msgError) throw msgError;

      const totalConversations = convData?.length || 0;
      const totalMessages = msgData?.length || 0;
      const conversions = convData?.filter((c) => c.converted).length || 0;
      const conversionRate =
        totalConversations > 0
          ? Math.round((conversions / totalConversations) * 100)
          : 0;

      const questionCounts: Record<string, number> = {};
      const keywords = [
        "price",
        "cost",
        "book",
        "appointment",
        "style",
        "pain",
        "healing",
        "time",
        "color",
        "size",
      ];

      msgData?.forEach((msg) => {
        const lowerContent = msg.content.toLowerCase();
        keywords.forEach((keyword) => {
          if (lowerContent.includes(keyword)) {
            questionCounts[keyword] = (questionCounts[keyword] || 0) + 1;
          }
        });
      });

      const commonQuestions = Object.entries(questionCounts)
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setChatStats({
        totalConversations,
        totalMessages,
        conversions,
        conversionRate,
        commonQuestions,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (
    conversationId: string
  ): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar mensajes.",
        variant: "destructive",
      });
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Inbox</h1>
          <p className="font-body text-muted-foreground mt-1">
            Centro de comunicaciones unificado
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Diagnostics Toggle */}
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <Database className="w-3 h-3 mr-1" />
            Diagnóstico
          </Badge>
          {/* Realtime Status Indicator */}
          <Badge 
            variant="outline" 
            className={`${
              realtimeState.status === 'connected' 
                ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
            }`}
          >
            <Radio className="w-3 h-3 mr-1" />
            {realtimeState.status === 'connected' ? 'Live' : 'Connecting...'}
          </Badge>
        </div>
      </div>

      {/* Diagnostics Panel */}
      {showDiagnostics && diagnostics && (
        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Estado de datos en tiempo real</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">chat_conversations</p>
                <p className="font-mono text-lg">{diagnostics.chatConversations}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">chat_messages</p>
                <p className="font-mono text-lg">{diagnostics.chatMessages}</p>
                {diagnostics.lastChatMessage && (
                  <p className="text-xs text-muted-foreground">
                    Último: {new Date(diagnostics.lastChatMessage).toLocaleString('es')}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">omnichannel_messages</p>
                <p className="font-mono text-lg">{diagnostics.omnichannelMessages}</p>
                {diagnostics.lastOmnichannelMessage && (
                  <p className="text-xs text-muted-foreground">
                    Último: {new Date(diagnostics.lastOmnichannelMessage).toLocaleString('es')}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Realtime</p>
                <div className="flex items-center gap-1">
                  {realtimeState.status === 'connected' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className={realtimeState.status === 'connected' ? 'text-green-500' : 'text-yellow-500'}>
                    {realtimeState.status === 'connected' ? 'Conectado' : 'Conectando...'}
                  </span>
                </div>
              </div>
            </div>
            {diagnostics.errors.length > 0 && (
              <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                <p className="font-medium text-destructive mb-1">Errores de acceso:</p>
                {diagnostics.errors.map((err, i) => (
                  <p key={i} className="text-destructive/80">{err}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1">
          <TabsTrigger value="omnichannel" className="flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            <span>Omnichannel</span>
          </TabsTrigger>
          <TabsTrigger value="luna" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>Luna Chats</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Setup</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="omnichannel" className="mt-6">
          <OmnichannelInbox />
        </TabsContent>

        <TabsContent value="luna" className="mt-6">
          <ConversationsManager
            conversations={conversations}
            stats={chatStats}
            loading={loading}
            onLoadMessages={loadConversationMessages}
          />
        </TabsContent>

        <TabsContent value="setup" className="mt-6">
          {workspace.workspaceId ? (
            <OmnichannelWizard 
              workspaceId={workspace.workspaceId}
              onComplete={() => setActiveSubTab("omnichannel")}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No hay workspace activo
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InboxUnified;
