import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  MessageCircle,
  AlertCircle,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Palette,
  Heart,
  Zap,
  LayoutGrid,
  Brain,
  Loader2,
  Sparkles,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useEventBus } from "@/lib/eventBus";
import { useCoreBus } from "@/hooks/useCoreBus";
import CRMOverview from "./CRMOverview";
import ConciergeTestPanel from "./ConciergeTestPanel";

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  activeHealingJourneys: number;
  totalClients: number;
  pendingDeposits: number;
  escalations: number;
  unreadMessages: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

interface CRMBooking {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  preferred_date: string | null;
}

interface CRMChatStats {
  totalConversations: number;
  totalMessages: number;
  conversions: number;
  conversionRate: number;
}

interface UnifiedDashboardProps {
  onNavigate: (tab: string) => void;
}

const UnifiedDashboard = ({ onNavigate }: UnifiedDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    activeHealingJourneys: 0,
    totalClients: 0,
    pendingDeposits: 0,
    escalations: 0,
    unreadMessages: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [crmBookings, setCrmBookings] = useState<CRMBooking[]>([]);
  const [crmChatStats, setCrmChatStats] = useState<CRMChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [classicView, setClassicView] = useState(false);
  const [aiLearningStats, setAiLearningStats] = useState({
    reflectionsCount: 0,
    avgImprovement: 0,
    isAnalyzing: false,
    lastAnalyzedAt: null as Date | null
  });
  const eventBus = useEventBus();
  const { status: coreBusStatus, eventCount: coreBusEventCount, lastEvent: coreBusLastEvent } = useCoreBus();

  useEffect(() => {
    fetchDashboardData();

    // Listen for real-time events
    const unsubscribers = [
      eventBus.on("booking:created", () => fetchDashboardData()),
      eventBus.on("booking:confirmed", () => fetchDashboardData()),
      eventBus.on("escalation:created", () => fetchDashboardData()),
      eventBus.on("message:received", () => fetchDashboardData()),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch bookings stats
      const bookingsResult = await supabase
        .from("bookings")
        .select("id, status, deposit_paid, name, email, scheduled_date, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      const allBookings = (bookingsResult.data || []) as any[];
      
      // Transform for CRM view
      setCrmBookings(allBookings.map((b) => ({
        id: b.id,
        name: b.name || "Unknown",
        email: b.email || "",
        status: b.status || "pending",
        created_at: b.created_at,
        preferred_date: b.scheduled_date,
      })));

      // Fetch escalations
      const escalationResult = await supabase
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "escalated");

      // Fetch healing progress - real query
      const healingResult = await supabase
        .from("healing_progress")
        .select("id", { count: "exact", head: true })
        .eq("requires_attention", true)
        .is("alert_acknowledged_at", null);

      // Fetch client count
      const clientResult = await supabase
        .from("client_profiles")
        .select("id", { count: "exact", head: true });

      // Fetch unread messages from omnichannel
      const messagesResult = await supabase
        .from("omnichannel_messages")
        .select("id", { count: "exact", head: true })
        .eq("direction", "inbound")
        .eq("status", "unread");

      const pendingBookingsCount = allBookings.filter((b: any) => b.status === "pending").length;
      const confirmedBookingsCount = allBookings.filter((b: any) => b.status === "confirmed").length;
      const pendingDepositsCount = allBookings.filter((b: any) => !b.deposit_paid && b.status !== "cancelled").length;

      setStats({
        totalBookings: allBookings?.length || 0,
        pendingBookings: pendingBookingsCount,
        confirmedBookings: confirmedBookingsCount,
        activeHealingJourneys: healingResult.count || 0,
        totalClients: clientResult.count || 0,
        pendingDeposits: pendingDepositsCount,
        escalations: escalationResult.count || 0,
        unreadMessages: messagesResult.count || 0,
      });

      // Fetch AI Learning Stats
      try {
        const { data: reflections, count: reflectionsCount } = await supabase
          .from('agent_self_reflections')
          .select('confidence_delta, created_at', { count: 'exact', head: false })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        if (reflections && reflections.length > 0) {
          const avgDelta = reflections.reduce((sum, r) => sum + (Number(r.confidence_delta) || 0), 0) / reflections.length;
          setAiLearningStats({
            reflectionsCount: reflectionsCount || 0,
            avgImprovement: Math.round(avgDelta * 100),
            isAnalyzing: true,
            lastAnalyzedAt: new Date(reflections[0].created_at)
          });
        }
      } catch (err) {
        console.log('AI Learning stats not available yet');
      }

      // Build recent activity from event history
      const history = eventBus.getHistory();
      const activities: RecentActivity[] = history.slice(0, 10).map((event) => ({
        id: `${event.type}-${event.timestamp.getTime()}`,
        type: event.type,
        description: getActivityDescription(event.type, event.payload),
        timestamp: event.timestamp,
        icon: getActivityIcon(event.type),
        color: getActivityColor(event.type),
      }));
      setRecentActivity(activities);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityDescription = (type: string, payload: any): string => {
    switch (type) {
      case "booking:created":
        return `New booking from ${payload.clientName || payload.clientEmail}`;
      case "booking:confirmed":
        return `Booking confirmed for ${payload.appointmentDate || "upcoming session"}`;
      case "design:approved":
        return "Design approved by client";
      case "healing:started":
        return `Healing journey started for ${payload.clientEmail}`;
      case "escalation:created":
        return `Escalation: ${payload.reason}`;
      default:
        return type.replace(":", " ").replace("_", " ");
    }
  };

  const getActivityIcon = (type: string): React.ReactNode => {
    if (type.startsWith("booking")) return <Calendar className="w-4 h-4" />;
    if (type.startsWith("design")) return <Palette className="w-4 h-4" />;
    if (type.startsWith("healing")) return <Heart className="w-4 h-4" />;
    if (type.startsWith("payment")) return <DollarSign className="w-4 h-4" />;
    if (type.startsWith("message")) return <MessageCircle className="w-4 h-4" />;
    if (type.startsWith("escalation")) return <AlertCircle className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  const getActivityColor = (type: string): string => {
    if (type.includes("created") || type.includes("started")) return "text-green-500";
    if (type.includes("confirmed") || type.includes("approved")) return "text-blue-500";
    if (type.includes("cancelled") || type.includes("rejected")) return "text-red-500";
    if (type.includes("escalation")) return "text-amber-500";
    return "text-muted-foreground";
  };

  const quickActions = [
    { label: "View Pipeline", tab: "pipeline", icon: Calendar, count: stats.pendingBookings },
    { label: "Escalations", tab: "pipeline", icon: AlertCircle, count: stats.escalations },
    { label: "Inbox", tab: "inbox", icon: MessageCircle, count: stats.unreadMessages },
    { label: "Healing", tab: "clients", icon: Heart, count: stats.activeHealingJourneys },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Classic View using CRMOverview
  if (classicView) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Label htmlFor="view-toggle" className="text-sm text-muted-foreground">Vista Clásica</Label>
            <Switch
              id="view-toggle"
              checked={classicView}
              onCheckedChange={setClassicView}
            />
          </div>
        </div>
        <CRMOverview
          bookings={crmBookings}
          chatStats={crmChatStats}
          availabilityCount={0}
          onViewBookings={() => onNavigate("pipeline")}
          onViewConversations={() => onNavigate("inbox")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
          <p className="font-body text-muted-foreground mt-1">
            Vista unificada de tu estudio
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="view-toggle" className="text-sm text-muted-foreground">Vista Clásica</Label>
            <Switch
              id="view-toggle"
              checked={classicView}
              onCheckedChange={setClassicView}
            />
          </div>
          <Badge variant="outline" className="text-gold border-gold/30">
            {new Date().toLocaleDateString("es", { weekday: "long", month: "long", day: "numeric" })}
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      {(stats.escalations > 0 || stats.pendingDeposits > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3"
        >
          {stats.escalations > 0 && (
            <Card className="bg-amber-500/10 border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-colors"
              onClick={() => onNavigate("pipeline")}>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="font-body text-sm">
                  {stats.escalations} escalación{stats.escalations > 1 ? "es" : ""} pendiente{stats.escalations > 1 ? "s" : ""}
                </span>
                <ArrowUpRight className="w-4 h-4 text-amber-500" />
              </CardContent>
            </Card>
          )}
          {stats.pendingDeposits > 0 && (
            <Card className="bg-blue-500/10 border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors"
              onClick={() => onNavigate("pipeline")}>
              <CardContent className="flex items-center gap-3 p-4">
                <DollarSign className="w-5 h-5 text-blue-500" />
                <span className="font-body text-sm">
                  {stats.pendingDeposits} depósito{stats.pendingDeposits > 1 ? "s" : ""} pendiente{stats.pendingDeposits > 1 ? "s" : ""}
                </span>
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Calendar className="w-8 h-8 text-gold" />
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="mt-4">
                <p className="font-display text-3xl text-foreground">{stats.totalBookings}</p>
                <p className="font-body text-sm text-muted-foreground">Bookings Totales</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-amber-500" />
                <span className="text-xs text-muted-foreground">Pendientes</span>
              </div>
              <div className="mt-4">
                <p className="font-display text-3xl text-foreground">{stats.pendingBookings}</p>
                <p className="font-body text-sm text-muted-foreground">Por Confirmar</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <span className="text-xs text-muted-foreground">Confirmados</span>
              </div>
              <div className="mt-4">
                <p className="font-display text-3xl text-foreground">{stats.confirmedBookings}</p>
                <p className="font-body text-sm text-muted-foreground">Listos</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Users className="w-8 h-8 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="mt-4">
                <p className="font-display text-3xl text-foreground">{stats.totalClients}</p>
                <p className="font-body text-sm text-muted-foreground">Clientes</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Learning Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              AI Self-Learning
              <Badge variant="secondary" className="ml-auto text-purple-500 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Quantum Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="font-display text-2xl text-green-500">
                  +{aiLearningStats.avgImprovement}%
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Mejora Semanal
                </p>
              </div>
              <div>
                <p className="font-display text-2xl text-foreground">
                  {aiLearningStats.reflectionsCount}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Reflexiones
                </p>
              </div>
              <div>
                <p className="font-display text-2xl text-blue-500">
                  4x
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Parallel Factor
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Intelligence Nexus - Core Bus Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Intelligence Nexus
              <Badge 
                variant="secondary" 
                className={`ml-auto text-xs ${
                  coreBusStatus === 'connected' 
                    ? 'text-emerald-500 border-emerald-500/30' 
                    : coreBusStatus === 'connecting'
                    ? 'text-amber-500 border-amber-500/30'
                    : 'text-red-500 border-red-500/30'
                }`}
              >
                {coreBusStatus === 'connected' ? (
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    Bus Vivo
                  </>
                ) : coreBusStatus === 'connecting' ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Conectando
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className={`font-display text-2xl ${coreBusStatus === 'connected' ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {coreBusEventCount}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Eventos (sesión)
                </p>
              </div>
              <div>
                <p className="font-display text-2xl text-foreground">
                  {coreBusLastEvent?.type?.replace('bus:', '') || '—'}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Último Evento
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${coreBusStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                  <span className="font-display text-sm text-foreground">Grok</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-display text-sm text-foreground">Lovable AI</span>
                </div>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  AI Providers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Concierge Test Panel */}
      <ConciergeTestPanel />

      {/* Quick Actions & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.tab}
                variant="ghost"
                className="w-full justify-between h-auto py-3"
                onClick={() => onNavigate(action.tab)}
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body">{action.label}</span>
                </div>
                {action.count > 0 && (
                  <Badge variant="secondary">{action.count}</Badge>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Zap className="w-8 h-8 text-muted-foreground/50 mb-3" />
                  <p className="font-body text-sm text-muted-foreground">
                    Sin actividad reciente
                  </p>
                  <p className="font-body text-xs text-muted-foreground/70 mt-1">
                    Las acciones aparecerán aquí en tiempo real
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                    >
                      <div className={`${activity.color}`}>{activity.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleTimeString("es", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedDashboard;
