import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DossierHeader, ActionBar, ThreeOptionsList } from "@/components/ferunda-os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ChangeProposal {
  id: string;
  type: string;
  status: string;
  created_at: string;
  proposed_options: Array<{
    id?: string;
    start_at?: string;
    end_at?: string;
    reason?: string;
  }>;
  message: string | null;
  expires_at: string | null;
  appointments: {
    id: string;
    start_at: string | null;
    end_at: string | null;
    booking_requests: {
      client_name: string | null;
      service_type: string;
    } | null;
  } | null;
}

export default function ArtistChangeProposal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [proposal, setProposal] = useState<ChangeProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [counterMessage, setCounterMessage] = useState("");
  const [showCounter, setShowCounter] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProposal();
    }
  }, [id]);

  const fetchProposal = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from("change_proposals")
      .select(`
        *,
        appointments (
          id,
          start_at,
          end_at,
          booking_requests (
            client_name,
            service_type
          )
        )
      `)
      .eq("id", id)
      .single();

    if (data) {
      setProposal(data as unknown as ChangeProposal);
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!id || !selectedOption || !proposal) return;

    const selectedProposalOption = proposal.proposed_options.find(
      (opt) => opt.id === selectedOption || opt.start_at === selectedOption
    );

    // Update proposal status
    const { error: proposalError } = await supabase
      .from("change_proposals")
      .update({ 
        status: "accepted",
        responded_at: new Date().toISOString()
      })
      .eq("id", id);

    if (proposalError) {
      toast.error("Error al aceptar la propuesta");
      return;
    }

    // Update appointment with new time
    if (proposal.appointments?.id && selectedProposalOption?.start_at) {
      await supabase
        .from("appointments")
        .update({
          start_at: selectedProposalOption.start_at,
          end_at: selectedProposalOption.end_at,
        })
        .eq("id", proposal.appointments.id);
    }

    toast.success("Propuesta aceptada. Calendario actualizado.");
    navigate("/artist/inbox");
  };

  const handleReject = async () => {
    if (!id) return;

    const { error } = await supabase
      .from("change_proposals")
      .update({ 
        status: "rejected",
        responded_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast.error("Error al rechazar la propuesta");
      return;
    }

    toast.success("Propuesta rechazada");
    navigate("/artist/inbox");
  };

  const handleCounterPropose = async () => {
    if (!id || !counterMessage.trim()) return;

    const { error } = await supabase
      .from("change_proposals")
      .update({ 
        status: "counter_proposed",
        response_message: counterMessage,
        responded_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      toast.error("Error al enviar contra-propuesta");
      return;
    }

    toast.success("Contra-propuesta enviada al estudio");
    navigate("/artist/inbox");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Propuesta no encontrada</div>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    reschedule: "Reagendar",
    duration_change: "Cambio de duración",
    service_change: "Cambio de servicio",
    info_request: "Solicitud de información",
  };

  const options = proposal.proposed_options.map((opt, idx) => ({
    id: opt.id || opt.start_at || `option-${idx}`,
    label: opt.start_at 
      ? format(parseISO(opt.start_at), "EEEE d 'de' MMMM", { locale: es })
      : `Opción ${idx + 1}`,
    sublabel: opt.start_at && opt.end_at
      ? `${format(parseISO(opt.start_at), "HH:mm")} - ${format(parseISO(opt.end_at), "HH:mm")}`
      : opt.reason || "",
  }));

  const actions = proposal.status === "pending_artist" && !showCounter ? [
    {
      label: "Aceptar",
      onClick: handleAccept,
      disabled: !selectedOption,
      variant: 'primary' as const,
    },
    {
      label: "Contra-proponer",
      onClick: () => setShowCounter(true),
      variant: 'secondary' as const,
    },
  ] : [];

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
          title={proposal.appointments?.booking_requests?.client_name || "Cliente"}
          status={proposal.status as any}
          date={proposal.created_at}
          subtitle={typeLabels[proposal.type] || proposal.type}
        />
      </div>

      {/* Content */}
      <main className="container mx-auto px-6 space-y-6">
        {/* Current Appointment */}
        {proposal.appointments?.start_at && (
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Cita actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {format(parseISO(proposal.appointments.start_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {proposal.appointments.booking_requests?.service_type}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Studio Message */}
        {proposal.message && (
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mensaje del estudio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{proposal.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Proposed Options */}
        {options.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Opciones propuestas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThreeOptionsList
                options={options}
                selectedId={selectedOption || undefined}
                onSelect={setSelectedOption}
              />
            </CardContent>
          </Card>
        )}

        {/* Counter Propose */}
        {showCounter && (
          <Card className="border-border/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tu contra-propuesta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                placeholder="Describe tu propuesta alternativa..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleCounterPropose}
                  disabled={!counterMessage.trim()}
                  className="flex-1"
                >
                  Enviar contra-propuesta
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCounter(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Action Bar */}
      {actions.length > 0 && <ActionBar actions={actions} />}

      {/* Reject button (separate, less prominent) */}
      {proposal.status === "pending_artist" && !showCounter && (
        <div className="fixed bottom-28 left-0 right-0 px-6">
          <div className="container mx-auto max-w-2xl">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-destructive"
              onClick={handleReject}
            >
              Rechazar propuesta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
