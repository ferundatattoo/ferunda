import { useState, useEffect, useMemo, forwardRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Instagram, Phone, Globe, 
  Loader2, Send, User, Bot, AlertCircle,
  Clock, Filter, Settings, ChevronRight, RefreshCw, Sparkles
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
import { eventBus } from "@/lib/eventBus";
import { RealtimeInlineStatus } from "@/components/RealtimeStatusBadge";

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
  sender_id: string | null;
  metadata: any;
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

const OmnichannelInbox = forwardRef<HTMLDivElement>((_, ref) => {
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<ConversationGroup | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeView, setActiveView] = useState<"messages" | "settings">("messages");
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription for omnichannel messages
  useEffect(() => {
    const channel = supabase
      .channel('omnichannel-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'omnichannel_messages'
        },
        (payload) => {
          console.log('[Omnichannel] Realtime event:', payload.eventType);
          fetchMessages();
          
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as OmnichannelMessage;
            
            if (newMsg.direction === 'inbound') {
              // Notify via EventBus - message:received
              eventBus.emit('message:received', {
                conversationId: newMsg.conversation_id || newMsg.id,
                channel: newMsg.channel,
                content: newMsg.content || ''
              });
              
              // Emit to Core Bus so Grok can assist
              eventBus.emit('bus:message_received', {
                sessionId: newMsg.conversation_id || newMsg.id,
                content: newMsg.content || '',
                channel: newMsg.channel
              });
              
              toast({
                title: `💬 New ${newMsg.channel} Message`,
                description: newMsg.content?.substring(0, 50) + '...',
              });
            }
            
            // Handle escalations
            if (newMsg.escalated_to_human) {
              eventBus.emit('message:escalated', {
                conversationId: newMsg.conversation_id || newMsg.id,
                reason: newMsg.escalation_reason || 'Manual escalation',
                priority: 'high'
              });
              
              eventBus.emit('escalation:created', {
                requestId: newMsg.id,
                reason: newMsg.escalation_reason || 'Message escalated',
                priority: 'high'
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, toast]);

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
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "instagram":
        return "bg-pink-500/20 text-pink-400 border border-pink-500/30";
      case "web":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
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
      const channel = lastMsg.channel;

      // Emit message:sent event
      eventBus.emit('message:sent', {
        conversationId: selectedConversation.id,
        channel,
        content: replyText
      });

      // For Instagram: use instagram-send function
      if (channel === 'instagram') {
        const inboundMsg = selectedConversation.messages.find(m => m.direction === 'inbound');
        const recipientId = (inboundMsg as any)?.sender_id || lastMsg.metadata?.sender_id;
        
        if (recipientId && recipientId !== 'ferunda_bot') {
          const { data, error } = await supabase.functions.invoke("instagram-send", {
            body: {
              action: 'send_dm',
              recipientId,
              message: replyText
            }
          });

          if (error) throw error;
          
          if (data?.mock) {
            toast({
              title: "📝 Mensaje en cola",
              description: "Instagram no está configurado. Mensaje guardado para revisión manual.",
            });
          } else {
            toast({
              title: "✅ Enviado",
              description: `Mensaje enviado por Instagram`,
            });
          }
        } else {
          throw new Error("No se encontró el ID del destinatario de Instagram");
        }
      } 
      // For WhatsApp: just record (no send API yet)
      else if (channel === 'whatsapp') {
        const { error } = await supabase.from("omnichannel_messages").insert({
          channel: 'whatsapp',
          direction: "outbound",
          content: replyText,
          conversation_id: lastMsg.conversation_id,
          channel_conversation_id: lastMsg.channel_conversation_id,
          booking_id: lastMsg.booking_id,
          client_profile_id: lastMsg.client_profile_id,
          status: "queued",
          metadata: { note: "WhatsApp send not configured - message queued" }
        });

        if (error) throw error;

        toast({
          title: "⚠️ Mensaje guardado",
          description: "WhatsApp no está configurado. Mensaje guardado pero NO enviado.",
          variant: "default"
        });
      }
      // For Web/Other: insert directly
      else {
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
          title: "✅ Respuesta Enviada",
          description: `Mensaje enviado via ${lastMsg.channel}`,
        });
      }

      setReplyText("");
      fetchMessages();
    } catch (error: any) {
      console.error("Failed to send reply:", error);
      toast({
        title: "Error al enviar",
        description: error.message || "No se pudo enviar la respuesta",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-6">
      {/* CRM-Style Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl flex items-center justify-center border border-gold/20">
              <MessageCircle className="w-6 h-6 text-gold" />
            </div>
            <div className="absolute inset-0 bg-gold/10 rounded-xl blur-xl" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-light tracking-tight text-foreground">
              Omnichannel Inbox
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Unified messaging hub for WhatsApp, Instagram, and web
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <RealtimeInlineStatus />
          
          <button
            onClick={() => fetchMessages()}
            className="p-2.5 rounded-lg border border-border/50 text-muted-foreground hover:text-gold hover:border-gold/30 transition-all duration-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <Button 
            variant={activeView === "messages" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setActiveView("messages")}
            className={activeView === "messages" ? "bg-gold text-gold-foreground hover:bg-gold/90" : ""}
          >
            <MessageCircle className="w-4 h-4 mr-2" />Messages
          </Button>
          <Button 
            variant={activeView === "settings" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setActiveView("settings")}
            className={activeView === "settings" ? "bg-gold text-gold-foreground hover:bg-gold/90" : ""}
          >
            <Settings className="w-4 h-4 mr-2" />Integrations
          </Button>
          {escalatedCount > 0 && (
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{escalatedCount} escalated
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Decorative Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-px bg-gradient-to-r from-gold/50 via-border to-transparent origin-left"
      />

      {activeView === "settings" ? (
        <SocialIntegrationSetup />
      ) : (
      <>
      {/* Channel Stats - CRM Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-background border-border/50 hover:border-gold/30 transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-gold/20 to-gold/5 rounded-lg border border-gold/20 group-hover:border-gold/40 transition-colors">
                <MessageCircle className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{messages.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-background border-border/50 hover:border-emerald-500/30 transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                <Phone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{whatsappCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-background border-border/50 hover:border-pink-500/30 transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-pink-500/10 rounded-lg border border-pink-500/20 group-hover:border-pink-500/40 transition-colors">
                <Instagram className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{instagramCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Instagram</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-background border-border/50 hover:border-blue-500/30 transition-all duration-300 group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">{webCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Web Chat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Tabs - CRM Style */}
      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList className="bg-gradient-to-br from-card to-background border border-border/50 p-1">
          <TabsTrigger 
            value="all" 
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold/20 data-[state=active]:to-gold/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30"
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">All</span>
          </TabsTrigger>
          <TabsTrigger 
            value="whatsapp" 
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:border data-[state=active]:border-emerald-500/30"
          >
            <Phone className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger 
            value="instagram" 
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:to-pink-500/10 data-[state=active]:text-pink-400 data-[state=active]:border data-[state=active]:border-pink-500/30"
          >
            <Instagram className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">Instagram</span>
          </TabsTrigger>
          <TabsTrigger 
            value="web" 
            className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-blue-500/10 data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-blue-500/30"
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-medium">Web</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List */}
        <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gold/10 to-transparent rounded-xl flex items-center justify-center border border-gold/20">
                  <MessageCircle className="w-8 h-8 text-gold/50" />
                </div>
                <div className="absolute inset-0 bg-gold/5 rounded-xl blur-xl" />
              </div>
              <h3 className="font-display text-xl text-foreground mb-2">No conversations yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Connect WhatsApp and Instagram to start receiving messages here
              </p>
              <Button 
                variant="outline" 
                className="mt-4 border-gold/30 text-gold hover:bg-gold/10" 
                onClick={() => setActiveView("settings")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Integrations
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {filteredConversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 bg-gradient-to-br from-card to-background border rounded-lg cursor-pointer transition-all duration-300 ${
                    selectedConversation?.id === conversation.id
                      ? "border-gold/50 shadow-lg shadow-gold/5"
                      : conversation.hasEscalation
                      ? "border-red-500/50 bg-red-500/5"
                      : "border-border/50 hover:border-gold/30 hover:shadow-md hover:shadow-gold/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(conversation.channel)}
                      <Badge className={getChannelColor(conversation.channel)}>
                        {conversation.channel}
                      </Badge>
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-gold/20 text-gold border border-gold/30 text-xs">
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
                      <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs">
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
            <Card className="bg-gradient-to-br from-card to-background border-border/50">
              <CardHeader className="pb-3 border-b border-border/50">
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
                            ? "bg-gradient-to-r from-gold/20 to-gold/10 text-foreground border border-gold/20"
                            : "bg-muted border border-border/50"
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
                            <Badge variant="outline" className="text-xs h-4 border-gold/30 text-gold">
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
                          <Badge className="text-xs mt-2 bg-gold/10 text-gold border border-gold/20">
                            {message.ai_intent_detected}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReply()}
                      className="flex-1 border-border/50 focus:border-gold/50"
                    />
                    <Button 
                      onClick={handleReply} 
                      disabled={sending || !replyText.trim()}
                      className="bg-gold text-gold-foreground hover:bg-gold/90"
                    >
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
            <Card className="bg-gradient-to-br from-card to-background border-border/50 h-[500px] flex items-center justify-center">
              <CardContent className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gold/10 to-transparent rounded-xl flex items-center justify-center border border-gold/20">
                    <MessageCircle className="w-8 h-8 text-gold/50" />
                  </div>
                </div>
                <p className="text-muted-foreground">Select a conversation to view the thread</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
});

OmnichannelInbox.displayName = "OmnichannelInbox";

export default OmnichannelInbox;
