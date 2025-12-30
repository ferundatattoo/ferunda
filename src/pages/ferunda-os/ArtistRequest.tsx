import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { DossierHeader, ActionBar, ThreeOptionsList } from "@/components/ferunda-os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Palette, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

interface BookingRequest {
  id: string;
  client_name: string | null;
  client_email: string | null;
  service_type: string;
  status: string;
  created_at: string;
  route: string;
  brief: Record<string, unknown>;
  estimated_hours: number | null;
  preferred_time_notes: string | null;
  reference_images: string[] | null;
}

export default function ArtistRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaceId, artistId } = useWorkspace(user?.id ?? null);
  
  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setRequest(data as BookingRequest);
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!id || !workspaceId || !artistId) return;

    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "artist_accepted" })
      .eq("id", id);

    if (error) {
      toast.error("Error al aceptar la solicitud");
      return;
    }

    // Create appointment
    const { error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        workspace_id: workspaceId,
        request_id: id,
        artist_profile_id: artistId,
        state: "hold",
        deposit_status: "unpaid",
      });

    if (appointmentError) {
      toast.error("Error al crear la cita");
      return;
    }

    toast.success("Solicitud aceptada");
    navigate("/artist/inbox");
  };

  const handleReject = async () => {
    if (!id) return;

    const { error } = await supabase
      .from("booking_requests")
      .update({ status: "artist_rejected" })
      .eq("id", id);

    if (error) {
      toast.error("Error al rechazar la solicitud");
      return;
    }

    toast.success("Solicitud rechazada");
    navigate("/artist/inbox");
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

  // Generate 3 suggested time slots (placeholder)
  const suggestedSlots = [
    { id: "slot1", title: "Próximo viernes", subtitle: "10:00 - 14:00" },
    { id: "slot2", title: "Sábado siguiente", subtitle: "15:00 - 19:00" },
    { id: "slot3", title: "En dos semanas", subtitle: "11:00 - 15:00" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Back button */}
      <div className="container mx-auto px-6 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/artist/inbox")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Header */}
      <div className="container mx-auto px-6 py-6">
        <DossierHeader
          clientName={request.client_name || "Cliente sin nombre"}
          status={request.status as any}
          createdAt={request.created_at}
          subtitle={`${request.service_type} · ${request.route === "direct" ? "Directa" : "Solicitud"}`}
        />
      </div>

      {/* Content */}
      <main className="container mx-auto px-6 space-y-6">
        {/* Brief */}
        <Card className="border-border/40">
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
          <Card className="border-border/40">
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

        {/* Suggest Time Slots */}
        {request.status === "pending_artist_acceptance" && (
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Horarios sugeridos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThreeOptionsList
                options={suggestedSlots}
                selectedId={selectedSlot || undefined}
                onSelect={setSelectedSlot}
              />
              <p className="text-xs text-muted-foreground mt-4">
                Selecciona un horario para proponer al cliente.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Action Bar */}
      {request.status === "pending_artist_acceptance" && (
        <ActionBar
          primaryAction={{
            label: "Aceptar",
            onClick: handleAccept,
          }}
          secondaryAction={{
            label: "Rechazar",
            onClick: handleReject,
            variant: "outline",
          }}
        />
      )}
    </div>
  );
}
