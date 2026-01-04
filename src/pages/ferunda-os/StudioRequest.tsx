import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { DossierHeader, ActionBar, ThreeOptionsList } from "@/components/ferunda-os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Palette, Clock } from "lucide-react";
import { toast } from "sonner";

interface BookingRequest {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  service_type: string;
  status: string;
  created_at: string;
  route: string;
  brief: Record<string, unknown>;
  estimated_hours: number | null;
  fit_score: number | null;
  assigned_artist_id: string | null;
  preferred_time_notes: string | null;
  reference_images: string[] | null;
}

interface ArtistProfile {
  id: string;
  display_name: string | null;
  specialty_styles: string[] | null;
}

export default function StudioRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaceId } = useWorkspace(user?.id ?? null);
  
  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  useEffect(() => {
    if (id && workspaceId) {
      fetchRequest();
      fetchArtists();
    }
  }, [id, workspaceId]);

  const fetchRequest = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setRequest(data as BookingRequest);
      setSelectedArtist(data.assigned_artist_id);
    }
    setLoading(false);
  };

  const fetchArtists = async () => {
    if (!workspaceId) return;
    
    const { data } = await supabase
      .from("artist_profiles")
      .select("id, display_name, styles")
      .eq("workspace_id", workspaceId) as { data: ArtistProfile[] | null };

    if (data) setArtists(data);
  };

  const handleAssignArtist = async () => {
    if (!id || !selectedArtist) return;

    const { error } = await supabase
      .from("booking_requests")
      .update({ 
        assigned_artist_id: selectedArtist,
        status: "pending_artist_acceptance"
      })
      .eq("id", id);

    if (error) {
      toast.error("Error al asignar artista");
      return;
    }
    
    toast.success("Artista asignado");
    fetchRequest();
  };

  const handleSendToArtist = async () => {
    if (!request?.assigned_artist_id) return;
    
    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "pending_artist_acceptance" })
      .eq("id", id);

    if (error) {
      toast.error("Error al enviar solicitud");
      return;
    }
    
    toast.success("Enviado al artista");
    navigate("/studio/inbox");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Solicitud no encontrada</div>
      </div>
    );
  }

  const brief = request.brief as Record<string, unknown>;

  const artistOptions = artists.slice(0, 3).map((artist) => ({
    id: artist.id,
    label: artist.display_name || "Artista",
    sublabel: artist.specialty_styles?.join(", ") || "Sin estilos definidos",
  }));

  const actions = [];
  
  if (request.assigned_artist_id) {
    actions.push({
      label: "Enviar a artista",
      onClick: handleSendToArtist,
      disabled: request.status === "pending_artist_acceptance",
      variant: 'primary' as const,
    });
  } else if (selectedArtist) {
    actions.push({
      label: "Asignar artista",
      onClick: handleAssignArtist,
      variant: 'primary' as const,
    });
  }
  
  actions.push({
    label: "Archivar",
    onClick: () => {},
    variant: 'secondary' as const,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-24">
      {/* Back button */}
      <div className="container mx-auto px-6 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/studio/inbox")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Header */}
      <div className="container mx-auto px-6 py-6">
        <DossierHeader
          title={request.client_name || "Cliente sin nombre"}
          status={request.status as any}
          date={request.created_at}
          subtitle={`${request.service_type} · ${request.route === "direct" ? "Directa" : "Solicitud"}`}
        />
      </div>

      {/* Content */}
      <main className="container mx-auto px-6 space-y-6">
        {/* Client Info */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Información del cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{request.client_email || "No proporcionado"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="text-sm">{request.client_phone || "No proporcionado"}</p>
              </div>
            </div>
            {request.preferred_time_notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notas de disponibilidad</p>
                <p className="text-sm">{request.preferred_time_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brief */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Brief del tatuaje
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {brief.description && (
              <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="text-sm">{String(brief.description)}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              {brief.size && (
                <div>
                  <p className="text-xs text-muted-foreground">Tamaño</p>
                  <p className="text-sm">{String(brief.size)}</p>
                </div>
              )}
              {brief.placement && (
                <div>
                  <p className="text-xs text-muted-foreground">Ubicación</p>
                  <p className="text-sm">{String(brief.placement)}</p>
                </div>
              )}
              {brief.style && (
                <div>
                  <p className="text-xs text-muted-foreground">Estilo</p>
                  <p className="text-sm">{String(brief.style)}</p>
                </div>
              )}
            </div>
            {request.estimated_hours && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Estimado: {request.estimated_hours} horas</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reference Images */}
        {request.reference_images && request.reference_images.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Referencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {request.reference_images.map((img, idx) => (
                  <div key={idx} className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img src={img} alt={`Referencia ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assign Artist */}
        {!request.assigned_artist_id && artistOptions.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Asignar artista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThreeOptionsList
                options={artistOptions}
                selectedId={selectedArtist || undefined}
                onSelect={setSelectedArtist}
              />
            </CardContent>
          </Card>
        )}
      </main>

      {/* Action Bar */}
      <ActionBar actions={actions} />
    </div>
  );
}
