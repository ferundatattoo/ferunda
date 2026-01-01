import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestCard, ProposalCard, EmptyState } from "@/components/ferunda-os";
import { Inbox, GitPullRequest, Heart } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BookingRequest {
  id: string;
  client_name: string | null;
  client_email: string | null;
  service_type: string;
  status: string;
  created_at: string;
  route: string;
  brief: Record<string, unknown>;
}

interface ChangeProposal {
  id: string;
  type: string;
  status: string;
  created_at: string;
  proposed_options: unknown[];
  message: string | null;
  expires_at: string | null;
  appointments: {
    id: string;
    start_at: string | null;
    booking_requests: BookingRequest | null;
  } | null;
}

interface AftercareAppointment {
  id: string;
  state: string;
  start_at: string | null;
  booking_requests: BookingRequest | null;
}

export default function ArtistInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaceId, artistId, loading: workspaceLoading } = useWorkspace(user?.id ?? null);
  
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [aftercare, setAftercare] = useState<AftercareAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId && user?.id) {
      fetchData();
      return;
    }

    if (!workspaceLoading && !workspaceId) {
      setLoading(false);
      navigate("/workspace-switch", { replace: true });
    }
  }, [workspaceId, user?.id, workspaceLoading, navigate]);

  const fetchData = async () => {
    if (!workspaceId || !user?.id) return;
    
    setLoading(true);
    
    // Fetch requests assigned to this artist
    const { data: requestsData } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("assigned_artist_id", artistId)
      .in("status", ["pending_artist_acceptance", "artist_accepted", "deposit_pending"])
      .order("created_at", { ascending: false });

    // Fetch change proposals for this artist
    const { data: proposalsData } = await supabase
      .from("change_proposals")
      .select(`
        *,
        appointments (
          id,
          start_at,
          booking_requests (*)
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("artist_profile_id", artistId || "")
      .in("status", ["pending_artist", "pending_studio"])
      .order("created_at", { ascending: false });

    // Fetch aftercare appointments
    const { data: aftercareData } = await supabase
      .from("appointments")
      .select(`
        *,
        booking_requests (*)
      `)
      .eq("workspace_id", workspaceId)
      .eq("artist_profile_id", artistId || "")
      .eq("state", "confirmed")
      .order("start_at", { ascending: false })
      .limit(10);

    if (requestsData) setRequests(requestsData as BookingRequest[]);
    if (proposalsData) setProposals(proposalsData as unknown as ChangeProposal[]);
    if (aftercareData) {
      // Filter to only show completed appointments (for aftercare)
      const completed = (aftercareData as AftercareAppointment[]).filter(a => {
        if (!a.start_at) return false;
        return new Date(a.start_at) < new Date();
      });
      setAftercare(completed);
    }
    
    setLoading(false);
  };

  const handleRequestClick = (id: string) => {
    navigate(`/artist/request/${id}`);
  };

  const handleProposalClick = (id: string) => {
    navigate(`/artist/change-proposal/${id}`);
  };

  if (workspaceLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Mi bandeja
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl w-full justify-start gap-4 h-auto p-2">
            <TabsTrigger 
              value="requests" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 pb-4 text-sm font-normal"
            >
              <Inbox className="w-4 h-4 mr-2" />
              Solicitudes
              {requests.length > 0 && (
                <span className="ml-2 text-xs bg-foreground text-background px-2 py-0.5 rounded-full">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="proposals" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 pb-4 text-sm font-normal"
            >
              <GitPullRequest className="w-4 h-4 mr-2" />
              Cambios sugeridos
              {proposals.length > 0 && (
                <span className="ml-2 text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full">
                  {proposals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="aftercare" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 pb-4 text-sm font-normal"
            >
              <Heart className="w-4 h-4 mr-2" />
              Aftercare
              {aftercare.length > 0 && (
                <span className="ml-2 text-xs bg-rose-500/20 text-rose-600 px-2 py-0.5 rounded-full">
                  {aftercare.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-8 space-y-4">
            {requests.length === 0 ? (
              <EmptyState
                title="Sin solicitudes asignadas"
                description="Las solicitudes que te asigne el estudio aparecerán aquí."
              />
            ) : (
              <div className="grid gap-4">
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    id={request.id}
                    clientName={request.client_name || "Cliente sin nombre"}
                    serviceType={request.service_type}
                    status={request.status as any}
                    createdAt={request.created_at}
                    onClick={() => handleRequestClick(request.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="proposals" className="mt-8 space-y-4">
            {proposals.length === 0 ? (
              <EmptyState
                title="Sin cambios pendientes"
                description="El estudio no ha sugerido cambios a tu calendario."
              />
            ) : (
              <div className="grid gap-4">
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    id={proposal.id}
                    type={proposal.type as any}
                    status={proposal.status as any}
                    createdAt={proposal.created_at}
                    appointmentTitle={proposal.appointments?.booking_requests?.client_name || "Cita"}
                    currentDate={proposal.appointments?.start_at || undefined}
                    proposedDate={
                      Array.isArray(proposal.proposed_options) && proposal.proposed_options[0]
                        ? (proposal.proposed_options[0] as { start_at?: string }).start_at
                        : undefined
                    }
                    expiresAt={proposal.expires_at}
                    onClick={() => handleProposalClick(proposal.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="aftercare" className="mt-8 space-y-4">
            {aftercare.length === 0 ? (
              <EmptyState
                title="Sin seguimientos"
                description="Tus citas completadas aparecerán aquí para seguimiento."
              />
            ) : (
              <div className="grid gap-4">
                {aftercare.map((appointment) => (
                  <RequestCard
                    key={appointment.id}
                    id={appointment.id}
                    clientName={appointment.booking_requests?.client_name || "Cliente"}
                    serviceType={appointment.booking_requests?.service_type || "custom"}
                    status="aftercare"
                    createdAt={appointment.start_at || ""}
                    onClick={() => navigate(`/artist/aftercare/${appointment.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
