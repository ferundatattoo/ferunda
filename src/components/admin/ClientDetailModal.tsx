import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Loader2, User, FileText, Brain, Calendar, Edit2, Save, X,
  Mail, Instagram, DollarSign, Star, AlertCircle, Trash2
} from "lucide-react";

interface ClientProfile {
  id: string;
  email: string;
  email_hash: string;
  full_name: string | null;
  instagram_handle: string | null;
  preferred_styles: string[] | null;
  allergies: string[] | null;
  skin_type: string | null;
  medical_notes: string | null;
  communication_style: string | null;
  session_count: number | null;
  lifetime_value: number | null;
  lead_score: number | null;
  last_session_date: string | null;
  next_recommended_date: string | null;
  ai_persona: unknown | null;
  created_at: string;
}

interface ClientDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientEmail?: string;
  onClientUpdated?: () => void;
}

const STYLE_OPTIONS = [
  "Fine Line", "Micro Realism", "Black & Grey", "Color", "Traditional",
  "Neo Traditional", "Geometric", "Minimalist", "Watercolor", "Blackwork"
];

export const ClientDetailModal = ({ 
  open, 
  onOpenChange,
  clientId,
  clientEmail,
  onClientUpdated
}: ClientDetailModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [editData, setEditData] = useState<Partial<ClientProfile>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open && (clientId || clientEmail)) {
      fetchClientData();
    }
  }, [open, clientId, clientEmail]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // Fetch client profile
      let query = supabase.from("client_profiles").select("*");
      
      if (clientId) {
        query = query.eq("id", clientId);
      } else if (clientEmail) {
        query = query.eq("email", clientEmail.toLowerCase());
      }

      const { data: clientData, error: clientError } = await query.single();
      
      if (clientError && clientError.code !== "PGRST116") throw clientError;
      
      if (clientData) {
        setClient(clientData);
        setEditData(clientData);

        // Fetch related documents
        const { data: docs } = await supabase
          .from("client_documents")
          .select("*")
          .eq("client_profile_id", clientData.id)
          .order("created_at", { ascending: false })
          .limit(20);
        
        setDocuments(docs || []);

        // Fetch related bookings by email
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("id, status, created_at, scheduled_date, tattoo_description, deposit_paid")
          .eq("email", clientData.email)
          .order("created_at", { ascending: false })
          .limit(10);
        
        setBookings(bookingData || []);
      } else {
        setClient(null);
      }
    } catch (error) {
      console.error("Error fetching client:", error);
      toast({ title: "Error", description: "Failed to load client data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!client) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("client_profiles")
        .update({
          full_name: editData.full_name,
          instagram_handle: editData.instagram_handle,
          preferred_styles: editData.preferred_styles,
          allergies: editData.allergies,
          medical_notes: editData.medical_notes,
          communication_style: editData.communication_style,
        })
        .eq("id", client.id);

      if (error) throw error;

      toast({ title: "Success", description: "Client profile updated" });
      setEditing(false);
      await fetchClientData();
      onClientUpdated?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client || !confirm("¿Estás seguro de eliminar este cliente?")) return;
    
    try {
      const { error } = await supabase
        .from("client_profiles")
        .delete()
        .eq("id", client.id);

      if (error) throw error;

      toast({ title: "Success", description: "Client deleted" });
      onOpenChange(false);
      onClientUpdated?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleStyle = (style: string) => {
    const current = editData.preferred_styles || [];
    setEditData(prev => ({
      ...prev,
      preferred_styles: current.includes(style)
        ? current.filter(s => s !== style)
        : [...current, style]
    }));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "bg-emerald-500/20 text-emerald-400",
      pending: "bg-amber-500/20 text-amber-400",
      completed: "bg-blue-500/20 text-blue-400",
      cancelled: "bg-red-500/20 text-red-400",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between font-display">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {loading ? "Loading..." : client?.full_name || client?.email || "Client Details"}
            </div>
            {client && !editing && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !client ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Client not found</p>
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="w-4 h-4" />
                Documentos ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="bookings" className="gap-2">
                <Calendar className="w-4 h-4" />
                Bookings ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Brain className="w-4 h-4" />
                Insights
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <TabsContent value="profile" className="space-y-4 m-0">
                {editing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={editData.full_name || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Instagram</Label>
                        <Input
                          value={editData.instagram_handle || ""}
                          onChange={(e) => setEditData(prev => ({ ...prev, instagram_handle: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Estilos Preferidos</Label>
                      <div className="flex flex-wrap gap-2">
                        {STYLE_OPTIONS.map((style) => (
                          <Badge
                            key={style}
                            variant={(editData.preferred_styles || []).includes(style) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleStyle(style)}
                          >
                            {style}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notas Médicas</Label>
                      <Textarea
                        value={editData.medical_notes || ""}
                        onChange={(e) => setEditData(prev => ({ ...prev, medical_notes: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => { setEditing(false); setEditData(client); }}>
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                        <Save className="w-4 h-4 mr-1" />
                        Guardar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Contact Info */}
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{client.email}</span>
                        </div>
                        {client.instagram_handle && (
                          <div className="flex items-center gap-2 text-sm">
                            <Instagram className="w-4 h-4 text-muted-foreground" />
                            <span>@{client.instagram_handle}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                          <p className="text-xl font-bold">{client.session_count || 0}</p>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                          <p className="text-xl font-bold">${(client.lifetime_value || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">LTV</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <Star className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                          <p className="text-xl font-bold">{client.lead_score || 0}</p>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Styles */}
                    {client.preferred_styles && client.preferred_styles.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Estilos Preferidos</p>
                        <div className="flex flex-wrap gap-1">
                          {client.preferred_styles.map((style) => (
                            <Badge key={style} variant="secondary">{style}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Allergies */}
                    {client.allergies && client.allergies.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          <p className="text-sm text-destructive">Alergias</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {client.allergies.map((allergy) => (
                            <Badge key={allergy} variant="destructive">{allergy}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medical Notes */}
                    {client.medical_notes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Notas Médicas</p>
                        <p className="text-sm bg-muted/50 rounded p-3">{client.medical_notes}</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="documents" className="m-0">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No documents yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="bg-muted/30">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{doc.file_name || "Document"}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(doc.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{doc.document_type || "file"}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bookings" className="m-0">
                {bookings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No bookings yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <Card key={booking.id} className="bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(booking.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{booking.tattoo_description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="insights" className="m-0">
                {client.ai_persona ? (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-primary" />
                        <p className="font-medium">AI Persona Insights</p>
                      </div>
                      <pre className="text-xs bg-background/50 rounded p-3 overflow-auto max-h-60">
                        {JSON.stringify(client.ai_persona, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AI insights yet</p>
                    <p className="text-sm mt-1">Insights are generated from conversations</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;
