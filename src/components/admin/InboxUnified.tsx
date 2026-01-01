import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, MessageCircle, Settings2 } from "lucide-react";
import OmnichannelInbox from "./OmnichannelInbox";
import ConversationsManager from "./ConversationsManager";
import OmnichannelWizard from "./OmnichannelWizard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
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

const InboxUnified = () => {
  const [activeSubTab, setActiveSubTab] = useState("omnichannel");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);

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
      <div>
        <h1 className="font-display text-3xl text-foreground">Inbox</h1>
        <p className="font-body text-muted-foreground mt-1">
          Centro de comunicaciones unificado
        </p>
      </div>

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
