import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  Clock, 
  Mail, 
  MessageSquare, 
  Check,
  X,
  ChevronRight,
  User,
  ImageIcon,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";

interface EscalationBrief {
  reason: string;
  summary: string;
  reference_images_count: number;
  escalated_at: string;
  conversation_id?: string;
}

interface EscalationTicket {
  id: string;
  client_name: string | null;
  client_email: string | null;
  urgency: string | null;
  brief: EscalationBrief;
  created_at: string;
  status: string;
}

const urgencyConfig: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", label: "Alta" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", label: "Media" },
  low: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Baja" },
};

const reasonLabels: Record<string, string> = {
  frustrated: "Cliente frustrado",
  complex_request: "Solicitud compleja",
  prefers_human: "Prefiere hablar con humano",
  technical_issue: "Problema técnico",
  other: "Otro",
};

const EscalationQueue = forwardRef<HTMLDivElement>((_, ref) => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<EscalationTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<EscalationTicket | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchEscalations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('escalations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: 'status=eq.escalated'
        },
        () => {
          fetchEscalations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEscalations = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("id, client_name, client_email, urgency, brief, created_at, status")
        .in("status", ["escalated", "contacted", "resolved"])
        .eq("route", "concierge_escalation")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Parse brief JSON and filter valid escalations
      const parsed = (data || []).map((ticket: any) => ({
        ...ticket,
        brief: typeof ticket.brief === 'string' ? JSON.parse(ticket.brief) : ticket.brief
      })).filter((t: any) => t.brief?.reason);

      setTickets(parsed);
    } catch (err) {
      console.error("Error fetching escalations:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las escalaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    setLoadingConversation(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setConversationMessages(data || []);
    } catch (err) {
      console.error("Error loading conversation:", err);
    } finally {
      setLoadingConversation(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("booking_requests")
        .update({ status: newStatus })
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Ticket marcado como ${newStatus === 'contacted' ? 'contactado' : 'resuelto'}`,
      });

      fetchEscalations();
      setSelectedTicket(null);
    } catch (err) {
      console.error("Error updating ticket:", err);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectTicket = (ticket: EscalationTicket) => {
    setSelectedTicket(ticket);
    setResponseNote("");
    if (ticket.brief?.conversation_id) {
      loadConversation(ticket.brief.conversation_id);
    } else {
      setConversationMessages([]);
    }
  };

  const pendingCount = tickets.filter(t => t.status === 'escalated').length;
  const contactedCount = tickets.filter(t => t.status === 'contacted').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display tracking-wide">Escalaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tickets de clientes que necesitan atención humana
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEscalations}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/10">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Mail className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contactedCount}</p>
              <p className="text-xs text-muted-foreground">Contactados</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">Resueltos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
            <h3 className="font-medium text-lg">¡Todo al día!</h3>
            <p className="text-muted-foreground text-sm mt-1">
              No hay escalaciones pendientes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {tickets.map((ticket, index) => {
              const urgency = urgencyConfig[ticket.urgency || 'medium'];
              const isResolved = ticket.status === 'resolved';
              const isContacted = ticket.status === 'contacted';
              
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      isResolved ? 'opacity-60' : ''
                    } ${selectedTicket?.id === ticket.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleSelectTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={`${urgency.bg} ${urgency.color} text-xs`}
                            >
                              {urgency.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {reasonLabels[ticket.brief?.reason] || ticket.brief?.reason}
                            </Badge>
                            {isContacted && (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                                Contactado
                              </Badge>
                            )}
                            {isResolved && (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                Resuelto
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium truncate">
                              {ticket.client_name || 'Sin nombre'}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <a 
                              href={`mailto:${ticket.client_email}`}
                              className="text-primary hover:underline truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {ticket.client_email}
                            </a>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {ticket.brief?.summary}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                            </div>
                            {ticket.brief?.reference_images_count > 0 && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                {ticket.brief.reference_images_count} imagen(es)
                              </div>
                            )}
                            {ticket.brief?.conversation_id && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Ver chat
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>Escalación de {selectedTicket.client_name || selectedTicket.client_email}</span>
                  <Badge 
                    variant="outline" 
                    className={`${urgencyConfig[selectedTicket.urgency || 'medium'].bg} ${urgencyConfig[selectedTicket.urgency || 'medium'].color}`}
                  >
                    {urgencyConfig[selectedTicket.urgency || 'medium'].label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Client Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedTicket.client_name || 'No proporcionado'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${selectedTicket.client_email}`} className="font-medium text-primary hover:underline">
                      {selectedTicket.client_email}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Razón</p>
                    <p className="font-medium">{reasonLabels[selectedTicket.brief?.reason] || selectedTicket.brief?.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="font-medium">{format(new Date(selectedTicket.created_at), 'PPp')}</p>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <p className="text-sm font-medium mb-2">Resumen de la conversación</p>
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-sm">{selectedTicket.brief?.summary}</p>
                  </div>
                </div>

                {/* Conversation */}
                {selectedTicket.brief?.conversation_id && (
                  <div>
                    <p className="text-sm font-medium mb-2">Historial del chat</p>
                    {loadingConversation ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 p-4 bg-secondary/30 rounded-lg">
                        {conversationMessages.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No se encontraron mensajes
                          </p>
                        ) : (
                          conversationMessages.map((msg) => (
                            <div 
                              key={msg.id} 
                              className={`text-sm p-2 rounded ${
                                msg.role === 'user' 
                                  ? 'bg-primary/10 ml-8' 
                                  : 'bg-muted mr-8'
                              }`}
                            >
                              <p className="text-xs text-muted-foreground mb-1">
                                {msg.role === 'user' ? 'Cliente' : 'Concierge'}
                              </p>
                              <p>{msg.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Response Note */}
                {selectedTicket.status !== 'resolved' && (
                  <div>
                    <p className="text-sm font-medium mb-2">Notas (opcional)</p>
                    <Textarea 
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      placeholder="Agregar notas sobre la respuesta..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedTicket.status === 'escalated' && (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => updateTicketStatus(selectedTicket.id, 'contacted')}
                        disabled={updating}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Marcar como Contactado
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                        disabled={updating}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Marcar como Resuelto
                      </Button>
                    </>
                  )}
                  {selectedTicket.status === 'contacted' && (
                    <Button 
                      className="flex-1"
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      disabled={updating}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Marcar como Resuelto
                    </Button>
                  )}
                  {selectedTicket.status === 'resolved' && (
                    <p className="text-sm text-muted-foreground text-center w-full py-2">
                      Este ticket ya fue resuelto
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

EscalationQueue.displayName = "EscalationQueue";

export default EscalationQueue;
