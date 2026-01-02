import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Search, Filter, Star, Archive, MoreVertical,
  Send, Paperclip, Smile, Sparkles, User, Clock,
  Phone, Mail, Instagram, MessageCircle, ChevronRight,
  AlertCircle, TrendingUp, CheckCircle, RefreshCw,
  Copy, Edit, Zap, ThumbsUp, ThumbsDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Conversation {
  id: string;
  name: string;
  email: string;
  channel: 'instagram' | 'whatsapp' | 'email' | 'web' | 'tiktok';
  lastMessage: string;
  time: string;
  unread: boolean;
  starred: boolean;
  // AI Triage
  intent: 'booking' | 'inquiry' | 'followup' | 'complaint' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'high' | 'medium' | 'low';
  readiness: number; // 0-100
}

interface Message {
  id: string;
  content: string;
  sender: 'client' | 'studio' | 'artist' | 'ai';
  time: string;
}

interface DraftReply {
  id: string;
  persona: 'studio' | 'artist' | 'hybrid';
  content: string;
  tone: string;
}

interface ClientCard {
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
  totalSpent: number;
  noShows: number;
  reschedules: number;
  lastVisit?: string;
  tags: string[];
  timeline: { date: string; event: string }[];
}

export default function InboxPremium() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draftReplies, setDraftReplies] = useState<DraftReply[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [replyMode, setReplyMode] = useState<'auto' | 'studio' | 'artist' | 'hybrid'>('auto');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      const convs: Conversation[] = (data || []).map(b => ({
        id: b.id,
        name: b.name || 'Unknown',
        email: b.email || '',
        channel: 'web' as const,
        lastMessage: b.tattoo_description?.substring(0, 80) || 'New inquiry',
        time: format(new Date(b.created_at), 'h:mm a'),
        unread: b.status === 'pending',
        starred: b.deposit_paid || false,
        intent: 'booking' as const,
        sentiment: 'positive' as const,
        urgency: b.deposit_paid ? 'high' : 'medium' as const,
        readiness: b.deposit_paid ? 90 : 60
      }));

      setConversations(convs);
      if (convs.length > 0 && !selectedConversation) {
        selectConversation(convs[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    // Mock messages
    setMessages([
      { id: '1', content: 'Hi! I\'m interested in getting a geometric sleeve tattoo. Do you have availability next month?', sender: 'client', time: '2:30 PM' },
      { id: '2', content: 'Hello! Thank you for reaching out. We\'d love to help you with your geometric sleeve. Could you share some reference images?', sender: 'studio', time: '2:45 PM' },
      { id: '3', content: 'Sure! Here are some ideas I found on Pinterest. I really like the sacred geometry style.', sender: 'client', time: '3:00 PM' },
    ]);
    generateDraftReplies();
  };

  const generateDraftReplies = () => {
    setGenerating(true);
    setTimeout(() => {
      setDraftReplies([
        {
          id: 'studio',
          persona: 'studio',
          content: 'Great references! For a geometric sleeve of this complexity, we recommend scheduling a consultation first. Our artist Ferunda specializes in sacred geometry. Available slots: Jan 15, 17, or 20. The deposit is $200 to secure your spot.',
          tone: 'Professional & efficient'
        },
        {
          id: 'artist',
          persona: 'artist',
          content: 'Love these references! 🔥 Sacred geometry is my specialty - the interconnected patterns in your examples would flow beautifully as a sleeve. I\'d suggest we start with the shoulder and work down. When can you come in so we can map out the flow together?',
          tone: 'Creative & personal'
        },
        {
          id: 'hybrid',
          persona: 'hybrid',
          content: 'These are stunning references! The sacred geometry style you\'ve chosen is one of our favorites. Let\'s set up a consultation to discuss the design flow and placement. We have openings next week - would you prefer morning or afternoon?',
          tone: 'Warm & actionable'
        }
      ]);
      setGenerating(false);
    }, 1500);
  };

  const getChannelIcon = (channel: Conversation['channel']) => {
    switch (channel) {
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />;
      case 'whatsapp': return <Phone className="h-4 w-4 text-green-500" />;
      case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'tiktok': return <MessageCircle className="h-4 w-4 text-black" />;
      default: return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getUrgencyBadge = (urgency: Conversation['urgency']) => {
    const colors = {
      high: 'bg-destructive/10 text-destructive',
      medium: 'bg-warning/10 text-warning',
      low: 'bg-muted text-muted-foreground'
    };
    return <Badge className={cn("text-[10px]", colors[urgency])}>{urgency}</Badge>;
  };

  const getSentimentIcon = (sentiment: Conversation['sentiment']) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="h-3 w-3 text-success" />;
      case 'negative': return <ThumbsDown className="h-3 w-3 text-destructive" />;
      default: return null;
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === 'unread' && !c.unread) return false;
    if (activeTab === 'starred' && !c.starred) return false;
    return true;
  });

  const clientCard: ClientCard = selectedConversation ? {
    name: selectedConversation.name,
    email: selectedConversation.email,
    totalBookings: 2,
    totalSpent: 850,
    noShows: 0,
    reschedules: 1,
    lastVisit: 'Nov 15, 2025',
    tags: ['Geometric', 'Full sleeve', 'Returning'],
    timeline: [
      { date: 'Dec 28', event: 'Sent inquiry' },
      { date: 'Nov 15', event: 'Completed session' },
      { date: 'Oct 20', event: 'Paid deposit $200' },
    ]
  } : null;

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              Inbox
            </h2>
            <Badge variant="secondary">{conversations.filter(c => c.unread).length} new</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-2">
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
            <TabsTrigger value="starred" className="text-xs">Starred</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-colors",
                  selectedConversation?.id === conv.id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
                      {conv.name[0]}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      {getChannelIcon(conv.channel)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={cn("font-medium text-sm truncate", conv.unread && "font-semibold")}>
                        {conv.name}
                      </p>
                      <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getUrgencyBadge(conv.urgency)}
                      {getSentimentIcon(conv.sentiment)}
                      <div className="flex-1" />
                      {conv.starred && <Star className="h-3 w-3 text-warning fill-warning" />}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Conversation View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
                  {selectedConversation.name[0]}
                </div>
                <div>
                  <p className="font-medium">{selectedConversation.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{selectedConversation.intent}</span>
                    <span>•</span>
                    <span>Readiness: {selectedConversation.readiness}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Star className={cn("h-4 w-4", selectedConversation.starred && "fill-warning text-warning")} />
                </Button>
                <Button variant="ghost" size="sm">
                  <Archive className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Create Booking</DropdownMenuItem>
                    <DropdownMenuItem>Block</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.sender === 'client' ? "justify-start" : "justify-end"
                    )}
                  >
                    <div className={cn(
                      "max-w-[70%] p-3 rounded-2xl",
                      msg.sender === 'client' 
                        ? "bg-muted rounded-tl-sm" 
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                    )}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        msg.sender === 'client' ? "text-muted-foreground" : "text-primary-foreground/70"
                      )}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Draft Replies */}
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">AI Draft Replies</span>
                </div>
                <div className="flex items-center gap-1">
                  {(['auto', 'studio', 'artist', 'hybrid'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={replyMode === mode ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs capitalize"
                      onClick={() => setReplyMode(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>

              {generating ? (
                <div className="flex items-center justify-center h-24">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {draftReplies.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => {
                        setSelectedDraft(draft.id);
                        setReplyText(draft.content);
                      }}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        selectedDraft === draft.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{draft.persona}</Badge>
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs line-clamp-2">{draft.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{draft.tone}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[80px] pr-20 resize-none"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button className="gradient-primary text-white h-10">
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Inbox className="h-12 w-12 mx-auto mb-3" />
              <p>Select a conversation to view</p>
            </div>
          </div>
        )}
      </div>

      {/* Client Card GOD Panel */}
      {selectedConversation && clientCard && (
        <div className="w-80 border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Client Card
            </h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Profile */}
              <div className="text-center">
                <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-medium">
                  {clientCard.name[0]}
                </div>
                <p className="font-medium mt-2">{clientCard.name}</p>
                <p className="text-xs text-muted-foreground">{clientCard.email}</p>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-lg font-bold">{clientCard.totalBookings}</p>
                  <p className="text-[10px] text-muted-foreground">Bookings</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-lg font-bold">${clientCard.totalSpent}</p>
                  <p className="text-[10px] text-muted-foreground">Total Spent</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-lg font-bold text-success">{clientCard.noShows}</p>
                  <p className="text-[10px] text-muted-foreground">No-shows</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <p className="text-lg font-bold text-warning">{clientCard.reschedules}</p>
                  <p className="text-[10px] text-muted-foreground">Reschedules</p>
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {clientCard.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Timeline</p>
                <div className="space-y-2">
                  {clientCard.timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                      <div>
                        <p className="text-xs">{item.event}</p>
                        <p className="text-[10px] text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button className="w-full" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Create Booking
            </Button>
            <Button variant="outline" className="w-full" size="sm">
              Send Deposit Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
