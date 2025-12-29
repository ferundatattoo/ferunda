import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, Instagram, Phone, Globe, 
  Loader2, Send, User, Bot, AlertCircle,
  CheckCircle, Clock, Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

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
  booking_id: string | null;
  client_profile_id: string | null;
  created_at: string;
}

const OmnichannelInbox = () => {
  const [messages, setMessages] = useState<OmnichannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<OmnichannelMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
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
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return "text-emerald-400";
      case "negative":
        return "text-destructive";
      case "neutral":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const filteredMessages =
    activeChannel === "all"
      ? messages
      : messages.filter((m) => m.channel === activeChannel);

  const escalatedCount = messages.filter((m) => m.escalated_to_human && m.status !== "resolved").length;
  const whatsappCount = messages.filter((m) => m.channel === "whatsapp").length;
  const instagramCount = messages.filter((m) => m.channel === "instagram").length;
  const webCount = messages.filter((m) => m.channel === "web").length;

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);
    try {
      // Insert reply message
      const { error } = await supabase.from("omnichannel_messages").insert({
        channel: selectedMessage.channel,
        direction: "outbound",
        content: replyText,
        conversation_id: selectedMessage.conversation_id,
        booking_id: selectedMessage.booking_id,
        client_profile_id: selectedMessage.client_profile_id,
        status: "sent",
      });

      if (error) throw error;

      toast({
        title: "Reply Sent",
        description: `Message sent via ${selectedMessage.channel}`,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Omnichannel Inbox</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Unified messaging hub for WhatsApp, Instagram, and web
          </p>
        </div>
        {escalatedCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {escalatedCount} escalated
          </Badge>
        )}
      </div>

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
        {/* Message List */}
        <div className="lg:col-span-2 space-y-2">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">
                Connect WhatsApp and Instagram to receive messages
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setSelectedMessage(message)}
                  className={`p-4 bg-card border rounded-lg cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id
                      ? "border-primary"
                      : message.escalated_to_human
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(message.channel)}
                      <Badge className={getChannelColor(message.channel)}>
                        {message.channel}
                      </Badge>
                      {message.direction === "inbound" ? (
                        <User className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Bot className="w-4 h-4 text-muted-foreground" />
                      )}
                      {message.ai_processed && (
                        <Badge variant="outline" className="text-xs">
                          AI Processed
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">
                    {message.content || "(Media message)"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {message.ai_intent_detected && (
                      <Badge variant="secondary" className="text-xs">
                        {message.ai_intent_detected}
                      </Badge>
                    )}
                    {message.ai_sentiment && (
                      <span className={`text-xs ${getSentimentColor(message.ai_sentiment)}`}>
                        {message.ai_sentiment}
                      </span>
                    )}
                    {message.escalated_to_human && (
                      <Badge variant="destructive" className="text-xs">
                        Escalated
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedMessage ? (
            <Card className="bg-card border-border sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  {getChannelIcon(selectedMessage.channel)}
                  Message Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getChannelColor(selectedMessage.channel)}>
                    {selectedMessage.channel}
                  </Badge>
                  <Badge variant="outline">
                    {selectedMessage.direction}
                  </Badge>
                  {selectedMessage.status && (
                    <Badge variant="secondary">{selectedMessage.status}</Badge>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-foreground">
                    {selectedMessage.content || "(No text content)"}
                  </p>
                </div>

                {selectedMessage.media_urls && selectedMessage.media_urls.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Media</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedMessage.media_urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Media ${i + 1}`}
                          className="rounded-lg w-full h-24 object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedMessage.ai_intent_detected && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">AI Intent</p>
                    <Badge variant="secondary">{selectedMessage.ai_intent_detected}</Badge>
                  </div>
                )}

                {selectedMessage.ai_sentiment && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Sentiment</p>
                    <span className={`text-sm capitalize ${getSentimentColor(selectedMessage.ai_sentiment)}`}>
                      {selectedMessage.ai_sentiment}
                    </span>
                  </div>
                )}

                {selectedMessage.escalation_reason && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {selectedMessage.escalation_reason}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Quick Reply</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleReply()}
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
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a message to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OmnichannelInbox;
