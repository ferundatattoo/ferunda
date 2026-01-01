import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Inbox, Search, Filter, Star, Archive, Trash2, 
  MessageSquare, Instagram, Mail, Phone, MoreVertical,
  Clock, CheckCircle2, AlertCircle, Sparkles, Send, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  status: string | null;
  deposit_paid: boolean | null;
}

const OSInbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, created_at, name, email, status, deposit_paid')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (mode: string | null) => {
    switch (mode) {
      case 'instagram': return Instagram;
      case 'email': return Mail;
      case 'phone': return Phone;
      default: return MessageSquare;
    }
  };

  const getStatusBadge = (conv: Conversation) => {
    if (conv.deposit_paid) {
      return <Badge className="bg-success/10 text-success border-success/20">Confirmado</Badge>;
    }
    if (conv.status === 'pending') {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Pendiente</Badge>;
    }
    return <Badge variant="outline">Nuevo</Badge>;
  };

  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'unread') return !conv.deposit_paid;
    if (activeTab === 'archived') return conv.deposit_paid;
    return true;
  });

  const stats = {
    total: conversations.length,
    unread: conversations.filter(c => !c.deposit_paid).length,
    resolved: conversations.filter(c => c.deposit_paid).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <Inbox className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Mensajes unificados de todos los canales
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchConversations} disabled={loading} className="shadow-sm">
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Badge className="bg-ai/10 text-ai border-ai/20">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Assisted
          </Badge>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Inbox className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                  <p className="text-sm text-muted-foreground">Sin leer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">Resueltos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar conversaciones..." 
            className="pl-10 bg-card/50 backdrop-blur-xl border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" className="bg-card/50 backdrop-blur-xl border-border/50 shadow-sm">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-secondary/50">
                <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-primary/20">Todo</TabsTrigger>
                <TabsTrigger value="unread" className="flex-1 data-[state=active]:bg-primary/20">Sin leer</TabsTrigger>
                <TabsTrigger value="archived" className="flex-1 data-[state=active]:bg-primary/20">Archivo</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay conversaciones</p>
                </div>
              ) : (
                filteredConversations.map((conv, index) => {
                  return (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-start gap-3 p-4 cursor-pointer border-b border-border/50 hover:bg-secondary/50 transition-all",
                        selectedConversation === conv.id && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="p-2 rounded-lg shrink-0 bg-primary/10">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate">{conv.name || `#${conv.id.slice(0, 8)}`}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(conv.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {conv.email || 'Nueva consulta de tatuaje...'}
                        </p>
                        <div className="mt-2">
                          {getStatusBadge(conv)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversation Detail */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Conversación #{selectedConversation.slice(0, 8)}</CardTitle>
                    <CardDescription>Canal: Web Chat</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Star className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Archive className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[350px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {/* Sample messages */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary shrink-0" />
                    <div className="max-w-[70%]">
                      <div className="bg-secondary rounded-2xl rounded-tl-sm p-3">
                        <p className="text-sm">Hola! Estoy interesado en un tatuaje de manga japonesa. ¿Tienen disponibilidad?</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">10:30 AM</p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[70%]">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3">
                        <p className="text-sm">¡Hola! Claro que sí. Ferunda es especialista en estilo japonés. ¿Tienes alguna referencia visual?</p>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Badge variant="outline" className="text-xs bg-ai/5 text-ai border-ai/20">
                          <Sparkles className="w-2 h-2 mr-1" />
                          AI
                        </Badge>
                        <p className="text-xs text-muted-foreground">10:32 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/50 p-4">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Escribe un mensaje..." className="flex-1 bg-secondary/50 border-border/50" />
                    <Button size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Selecciona una conversación</p>
                <p className="text-sm">para ver los mensajes</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OSInbox;