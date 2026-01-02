import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Instagram, Phone, Globe, 
  Loader2, Send, User, Bot, AlertCircle,
  Clock, Filter, Settings, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import SocialIntegrationSetup from "./SocialIntegrationSetup";

interface OmnichannelMessage {
  id: string;
  channel: string;
  direction: string;
  content: string | null;
  message_type: string | null;
  media_urls: string[] | null;
  status: string | null;
  ai_intent_detected: string | null;
  ai_sentiment: string | null;
  ai_processed: boolean | null;
  ai_response_generated: boolean | null;
  escalated_to_human: boolean | null;
  escalation_reason: string | null;
  conversation_id: string | null;
  channel_conversation_id: string | null;
  booking_id: string | null;
  client_profile_id: string | null;
  created_at: string;
}

interface ConversationGroup {
  id: string;
  channel: string;
  messages: OmnichannelMessage[];
  lastMessage: OmnichannelMessage;
  unreadCount: number;
  hasEscalation: boolean;
}

const OmnichannelInbox = () => {
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeView, setActiveView] = useState<"messages" | "settings">("messages");
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("omnichannel_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.warn("Omnichannel messages fetch warning:", error.message);
        setMessages([]);
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Group messages by conversation
  const conversations = useMemo(() => {
    const groups = new Map<string, OmnichannelMessage[]>();
    
    messages.forEach(msg => {
      const key = msg.channel_conversation_id || msg.conversation_id || msg.id;
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, msg]);
    });
    
    const conversationList: ConversationGroup[] = [];
    
    groups.forEach((msgs, id) => {
      // Sort messages by date ascending within conversation
      const sortedMsgs = [...msgs].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      const lastMessage = sortedMsgs[sortedMsgs.length - 1];
      const unreadCount = msgs.filter(m => m.status === "unread" && m.direction === "inbound").length;
      const hasEscalation = msgs.some(m => m.escalated_to_human && m.status !== "resolved");
      
      conversationList.push({
        id,
        channel: lastMessage.channel,
        messages: sortedMsgs,
        lastMessage,
        unreadCount,
        hasEscalation,
      });
    });
    
    // Sort by last message date descending
    return conversationList.sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  }, [messages]);

  const filteredConversations = activeChannel === "all"
    ? conversations
    : conversations.filter((c) => c.channel === activeChannel);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <Phone className="w-4 h-4 text-emerald-400" />;
      case "instagram":
        return <Instagram className="w-4 h-4 text-pink-400" />;
      case "web":
        return <Globe className="w-4 h-4 text-blue-400" />;
      default:
        return <MessageCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return "bg-emerald-500/20 text-emerald-400";
      case "instagram":
        return "bg-pink-500/20 text-pink-400";
      case "web":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const escalatedCount = conversations.filter((c) => c.hasEscalation).length;
  const whatsappCount = messages.filter((m) => m.channel === "whatsapp").length;
  const instagramCount = messages.filter((m) => m.channel === "instagram").length;
  const webCount = messages.filter((m) => m.channel === "web").length;

  const handleReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;

    setSending(true);
    try {
      const lastMsg = selectedConversation.lastMessage;
      // Insert reply message
      const { error } = await supabase.from("omnichannel_messages").insert({
        channel: lastMsg.channel,
        direction: "outbound",
        content: replyText,
        conversation_id: lastMsg.conversation_id,
        channel_conversation_id: lastMsg.channel_conversation_id,
        booking_id: lastMsg.booking_id,
        client_profile_id: lastMsg.client_profile_id,
        status: "sent",
      });

      if (error) throw error;

      toast({
        title: "Reply Sent",
        description: `Message sent via ${lastMsg.channel}`,
      });

      setReplyText("");
      fetchMessages();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-foreground">Omnichannel Inbox</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Unified messaging hub for WhatsApp, Instagram, and web
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={activeView === "messages" ? "default" : "outline"} size="sm" onClick={() => setActiveView("messages")}>
            <MessageCircle className="w-4 h-4 mr-2" />Messages
          </Button>
          <Button variant={activeView === "settings" ? "default" : "outline"} size="sm" onClick={() => setActiveView("settings")}>
            <Settings className="w-4 h-4 mr-2" />Integrations
          </Button>
          {escalatedCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{escalatedCount} escalated
            </Badge>
          )}
        </div>
      </div>

      {activeView === "settings" ? (
        <SocialIntegrationSetup />
      ) : (
      <>
      {/* Channel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <MessageCircle className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{messages.length}</p>
                <p className="text-xs text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Phone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{whatsappCount}</p>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <Instagram className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{instagramCount}</p>
                <p className="text-xs text-muted-foreground">Instagram</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{webCount}</p>
                <p className="text-xs text-muted-foreground">Web Chat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Tabs */}
      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList className="bg-muted">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="w-4 h-4" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="web" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Web
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List */}
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">
                Connect WhatsApp and Instagram to receive messages
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 bg-card border rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? "border-primary"
                      : conversation.hasEscalation
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(conversation.channel)}
                      <Badge className={getChannelColor(conversation.channel)}>
                        {conversation.channel}
                      </Badge>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="text-xs">
                          {conversation.unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.lastMessage.created_at), "MMM d, h:mm a")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">
                    {conversation.lastMessage.content || "(Media message)"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {conversation.messages.length} messages
                    </span>
                    {conversation.hasEscalation && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Escalated
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Conversation Thread */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  {getChannelIcon(selectedConversation.channel)}
                  Conversation Thread
                  <Badge className={getChannelColor(selectedConversation.channel)}>
                    {selectedConversation.channel}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === "outbound" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg p-3 ${
                          message.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.direction === "inbound" ? (
                            <User className="w-3 h-3" />
                          ) : (
                            <Bot className="w-3 h-3" />
                          )}
                          <span className="text-xs opacity-70">
                            {format(new Date(message.created_at), "h:mm a")}
                          </span>
                          {message.ai_processed && (
                            <Badge variant="outline" className="text-xs h-4">
                              AI
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{message.content || "(Media)"}</p>
                        {message.media_urls && message.media_urls.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {message.media_urls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Media ${i + 1}`}
                                className="rounded w-full h-20 object-cover"
                              />
                            ))}
                          </div>
                        )}
                        {message.ai_intent_detected && (
                          <Badge variant="secondary" className="text-xs mt-2">
                            {message.ai_intent_detected}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReply()}
                      className="flex-1"
                    />
                    <Button onClick={handleReply} disabled={sending || !replyText.trim()}>
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border h-[500px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view the thread</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default OmnichannelInbox;
