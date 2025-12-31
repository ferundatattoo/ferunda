import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Instagram, 
  Mail, 
  Send, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Bot,
  User,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SocialMessage {
  id: string;
  channel_id: string;
  sender_name: string;
  sender_avatar: string | null;
  message_type: string;
  content: string;
  media_urls: string[] | null;
  direction: 'inbound' | 'outbound';
  status: string;
  escalation_reason: string | null;
  agent_response: string | null;
  sentiment_score: number | null;
  booking_intent_score: number | null;
  revenue_prediction: number | null;
  created_at: string;
  social_channels?: {
    channel_type: string;
    account_username: string;
  };
}

interface SocialInboxProps {
  workspaceId?: string;
}

export function SocialInbox({ workspaceId }: SocialInboxProps) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SocialMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'escalated'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'instagram' | 'tiktok' | 'email'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('social_messages_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_messages' },
        () => {
          fetchMessages();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('social_messages')
        .select(`
          *,
          social_channels (
            channel_type,
            account_username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages((data as SocialMessage[]) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      // Insert reply message
      const { error } = await supabase
        .from('social_messages')
        .insert({
          workspace_id: workspaceId,
          channel_id: selectedMessage.channel_id,
          thread_id: selectedMessage.id,
          sender_name: 'Ferunda Team',
          message_type: 'text',
          content: replyText,
          direction: 'outbound',
          status: 'human_replied'
        });

      if (error) throw error;

      // Update original message status
      await supabase
        .from('social_messages')
        .update({ status: 'human_replied', replied_at: new Date().toISOString() })
        .eq('id', selectedMessage.id);

      toast({ title: 'Reply sent successfully' });
      setReplyText('');
      fetchMessages();
    } catch (error) {
      toast({ title: 'Error sending reply', variant: 'destructive' });
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />;
      case 'tiktok': return <MessageSquare className="h-4 w-4 text-cyan-500" />;
      case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'agent_replied':
        return <Badge className="bg-green-500/20 text-green-500">Agent Replied</Badge>;
      case 'human_replied':
        return <Badge className="bg-blue-500/20 text-blue-500">Human Replied</Badge>;
      case 'escalated':
        return <Badge variant="destructive">Escalated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredMessages = messages.filter(m => {
    if (filter === 'pending' && m.status !== 'pending') return false;
    if (filter === 'escalated' && m.status !== 'escalated') return false;
    if (channelFilter !== 'all' && m.social_channels?.channel_type !== channelFilter) return false;
    return m.direction === 'inbound';
  });

  const stats = {
    total: messages.filter(m => m.direction === 'inbound').length,
    pending: messages.filter(m => m.status === 'pending').length,
    escalated: messages.filter(m => m.status === 'escalated').length,
    avgRevenue: messages.reduce((sum, m) => sum + (m.revenue_prediction || 0), 0) / messages.length || 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.escalated}</p>
                <p className="text-xs text-muted-foreground">Escalated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">${Math.round(stats.avgRevenue)}</p>
                <p className="text-xs text-muted-foreground">Avg. Revenue Prediction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="escalated">Escalated</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs value={channelFilter} onValueChange={(v) => setChannelFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All Channels</TabsTrigger>
            <TabsTrigger value="instagram">
              <Instagram className="h-4 w-4 mr-1" /> IG
            </TabsTrigger>
            <TabsTrigger value="tiktok">TikTok</TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-1" /> Email
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button variant="outline" size="sm" onClick={fetchMessages}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message List */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <AnimatePresence>
                {filteredMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-4 border-b border-border/50 cursor-pointer hover:bg-accent/50 transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={message.sender_avatar || ''} />
                        <AvatarFallback>
                          {message.sender_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getChannelIcon(message.social_channels?.channel_type || '')}
                          <span className="font-medium truncate">{message.sender_name}</span>
                          {getStatusBadge(message.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.content}
                        </p>
                        
                        {message.media_urls && message.media_urls.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {message.media_urls.slice(0, 3).map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt=""
                                className="h-12 w-12 rounded object-cover"
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{new Date(message.created_at).toLocaleString()}</span>
                          {message.booking_intent_score && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {Math.round(message.booking_intent_score * 100)}% intent
                            </span>
                          )}
                          {message.revenue_prediction && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${message.revenue_prediction}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2" />
                  <p>No messages found</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedMessage ? 'Message Detail' : 'Select a message'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedMessage.sender_avatar || ''} />
                    <AvatarFallback>
                      {selectedMessage.sender_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedMessage.sender_name}</p>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(selectedMessage.social_channels?.channel_type || '')}
                      <span className="text-sm text-muted-foreground">
                        {selectedMessage.social_channels?.account_username}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                  
                  {selectedMessage.media_urls && selectedMessage.media_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedMessage.media_urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="max-h-48 rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Insights */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Sentiment</p>
                    <p className="text-lg font-bold">
                      {selectedMessage.sentiment_score 
                        ? `${Math.round(selectedMessage.sentiment_score * 100)}%`
                        : '-'
                      }
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Booking Intent</p>
                    <p className="text-lg font-bold">
                      {selectedMessage.booking_intent_score
                        ? `${Math.round(selectedMessage.booking_intent_score * 100)}%`
                        : '-'
                      }
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Revenue Pred.</p>
                    <p className="text-lg font-bold">
                      {selectedMessage.revenue_prediction
                        ? `$${selectedMessage.revenue_prediction}`
                        : '-'
                      }
                    </p>
                  </div>
                </div>

                {/* Agent Response */}
                {selectedMessage.agent_response && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-500">Agent Response</span>
                    </div>
                    <p className="text-sm">{selectedMessage.agent_response}</p>
                  </div>
                )}

                {/* Escalation Reason */}
                {selectedMessage.escalation_reason && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-500">Escalation Reason</span>
                    </div>
                    <p className="text-sm">{selectedMessage.escalation_reason}</p>
                  </div>
                )}

                {/* Reply */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                  />
                  <Button onClick={sendReply} disabled={!replyText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <User className="h-12 w-12 mb-4" />
                <p>Select a message to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
