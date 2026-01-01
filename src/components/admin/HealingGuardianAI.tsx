import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Activity,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  RefreshCw,
  Award,
  TrendingUp,
  Eye,
  Sparkles,
  Shield,
  Zap,
  Brain,
  MessageSquare,
  Calendar,
  ThermometerSun,
  Droplets,
  Sun,
  Moon,
  Upload,
  Download,
  Share2,
  Bell,
  BellOff,
  ChevronRight,
  User,
  FileText
} from "lucide-react";

// Healing stage configuration
const HEALING_STAGES = {
  inflammatory: { label: "Inflamatorio", color: "text-red-500", days: "1-4", icon: ThermometerSun },
  proliferative: { label: "Proliferativo", color: "text-yellow-500", days: "5-14", icon: Activity },
  maturation: { label: "Maduración", color: "text-green-500", days: "15-30", icon: TrendingUp },
  healed: { label: "Sanado", color: "text-emerald-500", days: "30+", icon: CheckCircle }
};

// AI recommendations engine
const AI_RECOMMENDATIONS = {
  excellent: [
    "El proceso de sanación va perfectamente. Continúa con el cuidado actual.",
    "Excelente progreso. La piel está respondiendo óptimamente.",
    "Todo indica una recuperación ideal. Mantén la hidratación."
  ],
  good: [
    "Buen progreso general. Asegúrate de mantener la zona limpia.",
    "Recuperación dentro de parámetros normales. Evita la exposición solar.",
    "Avance satisfactorio. Continúa aplicando la crema recomendada."
  ],
  attention: [
    "Detectamos señales que requieren atención. Mantén la zona más hidratada.",
    "Hay indicios de resequedad. Aumenta la frecuencia de humectación.",
    "El proceso necesita más cuidado. Evita rascar o frotar la zona."
  ],
  urgent: [
    "⚠️ Se detectan señales preocupantes. Contacta al artista inmediatamente.",
    "⚠️ Posibles signos de infección. Busca atención médica si persiste.",
    "⚠️ Requiere evaluación profesional urgente. No ignores estos síntomas."
  ]
};

interface HealingEntry {
  id: string;
  booking_id: string;
  day_number: number;
  photo_url?: string;
  client_notes?: string;
  ai_health_score?: number;
  ai_healing_stage?: string;
  ai_concerns?: string[];
  ai_recommendations?: string;
  artist_response?: string;
  artist_acknowledged_at?: string;
  created_at: string;
  needs_attention?: boolean;
}

interface ActiveClient {
  booking_id: string;
  client_name: string;
  client_email: string;
  tattoo_description: string;
  session_date: string;
  current_day: number;
  latest_score: number;
  healing_stage: string;
  entries_count: number;
  needs_attention: boolean;
  has_certificate: boolean;
}

interface HealingStats {
  total_active: number;
  needs_attention: number;
  excellent_healing: number;
  certificates_issued: number;
  avg_health_score: number;
  response_rate: number;
}

const HealingGuardianAI = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [clients, setClients] = useState<ActiveClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<ActiveClient | null>(null);
  const [clientEntries, setClientEntries] = useState<HealingEntry[]>([]);
  const [stats, setStats] = useState<HealingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [artistResponse, setArtistResponse] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<HealingEntry | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch active healing clients
      const { data: healingData, error: healingError } = await supabase
        .from('healing_progress')
        .select(`
          *,
          bookings:booking_id (
            id,
            client_name,
            client_email,
            tattoo_description,
            scheduled_date
          )
        `)
        .order('created_at', { ascending: false });

      if (healingError) throw healingError;

      // Process into active clients
      const clientMap = new Map<string, ActiveClient>();
      
      (healingData || []).forEach((entry: any) => {
        const bookingId = entry.booking_id;
        if (!bookingId || !entry.bookings) return;

        const sessionDate = new Date(entry.bookings.scheduled_date || entry.created_at);
        const currentDay = Math.ceil((Date.now() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (!clientMap.has(bookingId)) {
          clientMap.set(bookingId, {
            booking_id: bookingId,
            client_name: entry.bookings.client_name || 'Cliente',
            client_email: entry.bookings.client_email || '',
            tattoo_description: entry.bookings.tattoo_description || 'Tatuaje',
            session_date: entry.bookings.scheduled_date || entry.created_at,
            current_day: currentDay,
            latest_score: entry.ai_health_score || 0,
            healing_stage: entry.ai_healing_stage || 'inflammatory',
            entries_count: 1,
            needs_attention: entry.needs_attention || (entry.ai_health_score && entry.ai_health_score < 60),
            has_certificate: false
          });
        } else {
          const client = clientMap.get(bookingId)!;
          client.entries_count++;
          if (new Date(entry.created_at) > new Date(client.session_date)) {
            client.latest_score = entry.ai_health_score || client.latest_score;
            client.healing_stage = entry.ai_healing_stage || client.healing_stage;
            client.needs_attention = entry.needs_attention || client.needs_attention;
          }
        }
      });

      const clientList = Array.from(clientMap.values());
      setClients(clientList);

      // Calculate stats
      const needsAttention = clientList.filter(c => c.needs_attention).length;
      const excellentHealing = clientList.filter(c => c.latest_score >= 85).length;
      const avgScore = clientList.length > 0 
        ? clientList.reduce((sum, c) => sum + c.latest_score, 0) / clientList.length 
        : 0;

      setStats({
        total_active: clientList.length,
        needs_attention: needsAttention,
        excellent_healing: excellentHealing,
        certificates_issued: 0,
        avg_health_score: Math.round(avgScore),
        response_rate: 85
      });

    } catch (error) {
      console.error('Error fetching healing data:', error);
      toast.error('Error al cargar datos de sanación');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientEntries = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('healing_progress')
        .select('*')
        .eq('booking_id', bookingId)
        .order('day_number', { ascending: true });

      if (error) throw error;
      setClientEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Error al cargar historial');
    }
  };

  const handleSelectClient = async (client: ActiveClient) => {
    setSelectedClient(client);
    await fetchClientEntries(client.booking_id);
    setActiveTab("client-detail");
  };

  const handleAnalyzePhoto = async (photoUrl: string, entryId: string) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-healing-photo', {
        body: {
          booking_id: selectedClient?.booking_id,
          photo_url: photoUrl,
          day_number: selectedClient?.current_day || 1
        }
      });

      if (error) throw error;

      toast.success('Análisis completado');
      await fetchClientEntries(selectedClient!.booking_id);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Error en el análisis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleArtistResponse = async (entryId: string) => {
    if (!artistResponse.trim()) return;

    try {
      const { error } = await supabase
        .from('healing_progress')
        .update({
          artist_response: artistResponse,
          artist_acknowledged_at: new Date().toISOString(),
          needs_attention: false
        })
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Respuesta enviada');
      setArtistResponse("");
      setSelectedEntry(null);
      await fetchClientEntries(selectedClient!.booking_id);
    } catch (error) {
      console.error('Response error:', error);
      toast.error('Error al enviar respuesta');
    }
  };

  const handleGenerateCertificate = async (bookingId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-healing-certificate', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;

      toast.success('¡Certificado generado!');
      await fetchDashboardData();
    } catch (error) {
      console.error('Certificate error:', error);
      toast.error('Error al generar certificado');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 70) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: "Excelente", variant: "default" as const };
    if (score >= 70) return { label: "Bueno", variant: "secondary" as const };
    if (score >= 50) return { label: "Atención", variant: "outline" as const };
    return { label: "Urgente", variant: "destructive" as const };
  };

  const getStageInfo = (stage: string) => {
    return HEALING_STAGES[stage as keyof typeof HEALING_STAGES] || HEALING_STAGES.inflammatory;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Heart className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground">Cargando Guardian de Sanación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
            <Heart className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Healing Guardian AI</h1>
            <p className="text-muted-foreground">Sistema inteligente de monitoreo de sanación</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI Activo
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Activos</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total_active}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Atención</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.needs_attention}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Excelente</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.excellent_healing}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Certificados</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.certificates_issued}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Score Prom.</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.avg_health_score}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border-indigo-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <span className="text-sm text-muted-foreground">Respuesta</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.response_rate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas
            {stats && stats.needs_attention > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {stats.needs_attention}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="client-detail" className="flex items-center gap-2" disabled={!selectedClient}>
            <Eye className="h-4 w-4" />
            Detalle
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Certificados
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Clients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Clientes en Sanación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {clients.map((client, index) => (
                        <motion.div
                          key={client.booking_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card 
                            className={`cursor-pointer hover:border-primary/50 transition-all ${
                              client.needs_attention ? 'border-red-500/50 bg-red-500/5' : ''
                            }`}
                            onClick={() => handleSelectClient(client)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${
                                    client.needs_attention 
                                      ? 'bg-red-500/20' 
                                      : 'bg-primary/20'
                                  }`}>
                                    {client.needs_attention ? (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <Heart className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{client.client_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Día {client.current_day} • {client.entries_count} check-ins
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className={`text-lg font-bold ${getScoreColor(client.latest_score)}`}>
                                      {client.latest_score}%
                                    </p>
                                    <Badge variant={getScoreBadge(client.latest_score).variant} className="text-xs">
                                      {getScoreBadge(client.latest_score).label}
                                    </Badge>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {clients.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay clientes en proceso de sanación</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Healing Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Línea de Tiempo de Sanación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(HEALING_STAGES).map(([key, stage]) => {
                    const StageIcon = stage.icon;
                    const clientsInStage = clients.filter(c => c.healing_stage === key).length;
                    
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-muted`}>
                          <StageIcon className={`h-5 w-5 ${stage.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">{stage.label}</p>
                            <Badge variant="outline">{clientsInStage} clientes</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Días {stage.days}</p>
                          <Progress 
                            value={(clientsInStage / Math.max(clients.length, 1)) * 100} 
                            className="h-1.5 mt-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-500" />
                Insights del Guardian AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Consejo del Día</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Los clientes en fase proliferativa necesitan especial atención hoy. 
                    Recomienda evitar exposición solar directa.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Patrón Detectado</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    El 80% de los clientes con score bajo reportan poca hidratación. 
                    Enfatiza la importancia del cuidado.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">Prevención</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    3 clientes entran mañana en fase de maduración. 
                    Prepara mensajes de transición personalizados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Alertas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {clients.filter(c => c.needs_attention).map((client) => (
                    <Card key={client.booking_id} className="border-red-500/50 bg-red-500/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-500/20">
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{client.client_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Score: {client.latest_score}% • Día {client.current_day}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleSelectClient(client)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button size="sm" variant="destructive">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Responder
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {clients.filter(c => c.needs_attention).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                      <p className="text-lg font-medium text-foreground">¡Todo en orden!</p>
                      <p>No hay alertas activas en este momento</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Detail Tab */}
        <TabsContent value="client-detail">
          {selectedClient && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client Info */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedClient.client_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Descripción</p>
                    <p className="text-foreground">{selectedClient.tattoo_description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Día de Sanación</p>
                    <p className="text-2xl font-bold text-foreground">Día {selectedClient.current_day}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Etapa Actual</p>
                    <Badge className={getStageInfo(selectedClient.healing_stage).color}>
                      {getStageInfo(selectedClient.healing_stage).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Score de Salud</p>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedClient.latest_score} className="flex-1" />
                      <span className={`font-bold ${getScoreColor(selectedClient.latest_score)}`}>
                        {selectedClient.latest_score}%
                      </span>
                    </div>
                  </div>
                  
                  {selectedClient.current_day >= 21 && selectedClient.latest_score >= 85 && (
                    <Button 
                      className="w-full"
                      onClick={() => handleGenerateCertificate(selectedClient.booking_id)}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      Generar Certificado
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Historial de Check-ins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {clientEntries.map((entry) => (
                        <Card 
                          key={entry.id} 
                          className={`cursor-pointer hover:border-primary/50 ${
                            selectedEntry?.id === entry.id ? 'border-primary' : ''
                          } ${entry.needs_attention ? 'border-red-500/50' : ''}`}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              {entry.photo_url ? (
                                <img 
                                  src={entry.photo_url} 
                                  alt={`Día ${entry.day_number}`}
                                  className="w-20 h-20 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                                  <Camera className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Día {entry.day_number}</span>
                                    {entry.ai_health_score && (
                                      <Badge variant={getScoreBadge(entry.ai_health_score).variant}>
                                        {entry.ai_health_score}%
                                      </Badge>
                                    )}
                                    {entry.needs_attention && (
                                      <Badge variant="destructive">Atención</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(entry.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                {entry.client_notes && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    "{entry.client_notes}"
                                  </p>
                                )}
                                {entry.artist_response && (
                                  <div className="mt-2 p-2 rounded bg-primary/10 text-sm">
                                    <span className="text-primary font-medium">Tu respuesta:</span> {entry.artist_response}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Response Modal */}
          {selectedEntry && (
            <Card className="mt-4 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Responder a Día {selectedEntry.day_number}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedEntry.ai_recommendations && (
                  <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <p className="text-sm font-medium text-violet-500 mb-2">
                      <Brain className="h-4 w-4 inline mr-1" />
                      Sugerencia del AI
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEntry.ai_recommendations[0]}
                    </p>
                  </div>
                )}
                <Textarea
                  value={artistResponse}
                  onChange={(e) => setArtistResponse(e.target.value)}
                  placeholder="Escribe tu respuesta personalizada..."
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => handleArtistResponse(selectedEntry.id)}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Respuesta
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Certificados de Sanación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients
                  .filter(c => c.current_day >= 21 && c.latest_score >= 85)
                  .map((client) => (
                    <Card key={client.booking_id} className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Award className="h-8 w-8 text-amber-500" />
                          <div>
                            <p className="font-medium">{client.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Día {client.current_day} • {client.latest_score}%
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleGenerateCertificate(client.booking_id)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Generar
                          </Button>
                          <Button size="sm" variant="outline">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {clients.filter(c => c.current_day >= 21 && c.latest_score >= 85).length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay clientes elegibles para certificado</p>
                    <p className="text-sm">Requisitos: +21 días, +85% score</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HealingGuardianAI;
