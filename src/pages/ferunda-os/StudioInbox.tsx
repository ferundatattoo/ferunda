import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestCard, EmptyState } from "@/components/ferunda-os";
import { Inbox, Clock, CreditCard, Calendar } from "lucide-react";
import { format, isTomorrow, parseISO } from "date-fns";
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
  estimated_hours: number | null;
  fit_score: number | null;
  assigned_artist_id: string | null;
}

interface Appointment {
  id: string;
  start_at: string | null;
  state: string;
  deposit_status: string;
  request_id: string | null;
  booking_requests: BookingRequest | null;
}

export default function StudioInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaceId, loading: workspaceLoading } = useWorkspace(user?.id ?? null);
  
  const [activeTab, setActiveTab] = useState("new");
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId]);

  const fetchData = async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    
    // Fetch booking requests
    const { data: requestsData } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    // Fetch appointments with their requests
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select(`
        *,
        booking_requests (*)
      `)
      .eq("workspace_id", workspaceId)
      .order("start_at", { ascending: true });

    if (requestsData) setRequests(requestsData as BookingRequest[]);
    if (appointmentsData) setAppointments(appointmentsData as Appointment[]);
    
    setLoading(false);
  };

  // Filter requests by tab
  const newRequests = requests.filter(r => r.status === "new" || r.status === "brief_in_progress");
  const pendingArtist = requests.filter(r => 
    r.status === "pending_artist_acceptance" || 
    r.status === "artist_counter_proposed"
  );
  const depositPending = appointments.filter(a => 
    a.deposit_status === "unpaid" && a.state !== "cancelled"
  );
  const tomorrowAppointments = appointments.filter(a => 
    a.start_at && isTomorrow(parseISO(a.start_at)) && a.state === "confirmed"
  );

  const handleRequestClick = (id: string) => {
    navigate(`/studio/request/${id}`);
  };

  if (workspaceLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Bandeja de entrada
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-transparent border-b border-border/40 w-full justify-start gap-8 h-auto p-0 rounded-none">
            <TabsTrigger 
              value="new" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 pb-4 text-sm font-normal"
            >
              <Inbox className="w-4 h-4 mr-2" />
              Nuevas
              {newRequests.length > 0 && (
                <span className="ml-2 text-xs bg-foreground text-background px-2 py-0.5 rounded-full">
                  {newRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 pb-4 text-sm font-normal"
            >
              <Clock className="w-4 h-4 mr-2" />
              Pendiente artista
              {pendingArtist.length > 0 && (
                <span className="ml-2 text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full">
                  {pendingArtist.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="deposit" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 pb-4 text-sm font-normal"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Depósito pendiente
              {depositPending.length > 0 && (
                <span className="ml-2 text-xs bg-rose-500/20 text-rose-600 px-2 py-0.5 rounded-full">
                  {depositPending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="tomorrow" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 pb-4 text-sm font-normal"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Mañana
              {tomorrowAppointments.length > 0 && (
                <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">
                  {tomorrowAppointments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-8 space-y-4">
            {newRequests.length === 0 ? (
              <EmptyState
                title="Sin solicitudes nuevas"
                description="Tu bandeja está lista. Las nuevas solicitudes aparecerán aquí."
              />
            ) : (
              <div className="grid gap-4">
                {newRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    id={request.id}
                    clientName={request.client_name || "Cliente sin nombre"}
                    serviceType={request.service_type}
                    status={request.status as any}
                    createdAt={request.created_at}
                    estimatedHours={request.estimated_hours ?? undefined}
                    onClick={() => handleRequestClick(request.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-8 space-y-4">
            {pendingArtist.length === 0 ? (
              <EmptyState
                title="Sin pendientes"
                description="No hay solicitudes esperando respuesta del artista."
              />
            ) : (
              <div className="grid gap-4">
                {pendingArtist.map((request) => (
                  <RequestCard
                    key={request.id}
                    id={request.id}
                    clientName={request.client_name || "Cliente sin nombre"}
                    serviceType={request.service_type}
                    status={request.status as any}
                    createdAt={request.created_at}
                    estimatedHours={request.estimated_hours ?? undefined}
                    onClick={() => handleRequestClick(request.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deposit" className="mt-8 space-y-4">
            {depositPending.length === 0 ? (
              <EmptyState
                title="Depósitos al día"
                description="Todas las citas tienen su depósito pagado."
              />
            ) : (
              <div className="grid gap-4">
                {depositPending.map((appointment) => (
                  <RequestCard
                    key={appointment.id}
                    id={appointment.id}
                    clientName={appointment.booking_requests?.client_name || "Cliente"}
                    serviceType={appointment.booking_requests?.service_type || "custom"}
                    status="deposit_pending"
                    createdAt={appointment.booking_requests?.created_at || ""}
                    onClick={() => navigate(`/studio/appointment/${appointment.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tomorrow" className="mt-8 space-y-4">
            {tomorrowAppointments.length === 0 ? (
              <EmptyState
                title="Agenda libre mañana"
                description="No hay citas programadas para mañana."
              />
            ) : (
              <div className="grid gap-4">
                {tomorrowAppointments.map((appointment) => (
                  <RequestCard
                    key={appointment.id}
                    id={appointment.id}
                    clientName={appointment.booking_requests?.client_name || "Cliente"}
                    serviceType={appointment.booking_requests?.service_type || "custom"}
                    status="confirmed"
                    createdAt={appointment.start_at || ""}
                    onClick={() => navigate(`/studio/appointment/${appointment.id}`)}
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
