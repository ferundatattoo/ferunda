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

// Using concierge_sessions schema
interface EtherealSession {
  id: string;
  stage: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

// Using concierge_messages schema
interface EtherealMessage {
  id: string;
  session_id: string;
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
  conciergeSessionsCount: number;
  conciergeMessagesCount: number;
  omnichannelMessages: number;
  lastConciergeMessage: string | null;
  lastOmnichannelMessage: string | null;
  errors: string[];
}

const InboxUnified = () => {
  const [activeSubTab, setActiveSubTab] = useState("omnichannel");
  const [sessions, setSessions] = useState<EtherealSession[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCounts | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);

  // Real-time connection with auto-refresh
  const handleRealtimeUpdate = useCallback(() => {
    if (activeSubTab === "ethereal") {
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
    let conciergeSessionsCount = 0;
    let conciergeMessagesCount = 0;
    let omnichannelMessages = 0;
    let lastConciergeMessage: string | null = null;
    let lastOmnichannelMessage: string | null = null;

    try {
      const { count: sessionCount, error: sessionErr } = await supabase
        .from("concierge_sessions")
        .select("*", { count: "exact", head: true });
      if (sessionErr) errors.push(`concierge_sessions: ${sessionErr.message}`);
      else conciergeSessionsCount = sessionCount || 0;
    } catch (e: any) {
      errors.push(`concierge_sessions: ${e.message}`);
    }

    try {
      const { count: msgCount, data: lastMsg, error: msgErr } = await supabase
        .from("concierge_messages")
        .select("created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(1);
      if (msgErr) errors.push(`concierge_messages: ${msgErr.message}`);
      else {
        conciergeMessagesCount = msgCount || 0;
        lastConciergeMessage = lastMsg?.[0]?.created_at || null;
      }
    } catch (e: any) {
      errors.push(`concierge_messages: ${e.message}`);
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
      conciergeSessionsCount,
      conciergeMessagesCount,
      omnichannelMessages,
      lastConciergeMessage,
      lastOmnichannelMessage,
      errors,
    });
  };

  useEffect(() => {
    if (activeSubTab === "ethereal") {
      fetchAnalytics();
    }
  }, [activeSubTab]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Load from concierge_sessions (modern table)
      const { data: sessionData, error: sessionError } = await supabase
        .from("concierge_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (sessionError) throw sessionError;
      setSessions(sessionData || []);

      // Load user messages from concierge_messages
      const { data: msgData, error: msgError } = await supabase
        .from("concierge_messages")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(500);

      if (msgError) throw msgError;

      const totalConversations = sessionData?.length || 0;
      const totalMessages = msgData?.length || 0;
      const conversions = sessionData?.filter((s) => s.stage === 'confirmed').length || 0;
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
        const lowerContent = (msg.content || '').toLowerCase();
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

  const loadSessionMessages = async (
    sessionId: string
  ): Promise<EtherealMessage[]> => {
    try {
      const { data, error } = await supabase
        .from("concierge_messages")
        .select("*")
        .eq("session_id", sessionId)
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

  // Map sessions to legacy format for ConversationsManager compatibility
  const mappedConversations = sessions.map(s => ({
    id: s.id,
    session_id: s.id,
    started_at: s.created_at,
    ended_at: s.stage === 'confirmed' ? s.updated_at : null,
    message_count: s.message_count,
    converted: s.stage === 'confirmed',
    conversion_type: s.stage === 'confirmed' ? 'booking' : null,
  }));

  // Map messages loader for compatibility
  const loadConversationMessages = async (conversationId: string) => {
    const msgs = await loadSessionMessages(conversationId);
    return msgs.map(m => ({
      id: m.id,
      conversation_id: m.session_id,
      role: m.role,
      content: m.content || '',
      created_at: m.created_at,
    }));
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
                <p className="text-muted-foreground">concierge_sessions</p>
                <p className="font-mono text-lg">{diagnostics.conciergeSessionsCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">concierge_messages</p>
                <p className="font-mono text-lg">{diagnostics.conciergeMessagesCount}</p>
                {diagnostics.lastConciergeMessage && (
                  <p className="text-xs text-muted-foreground">
                    Último: {new Date(diagnostics.lastConciergeMessage).toLocaleString('es')}
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
          <TabsTrigger value="ethereal" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>ETHEREAL Chats</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Setup</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="omnichannel" className="mt-6">
          <OmnichannelInbox />
        </TabsContent>

        <TabsContent value="ethereal" className="mt-6">
          <ConversationsManager
            conversations={mappedConversations}
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