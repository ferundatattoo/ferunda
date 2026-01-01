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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useEventBus } from "@/lib/eventBus";

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
  const [loading, setLoading] = useState(true);
  const eventBus = useEventBus();

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
        .select("id, status, deposit_paid");

      const bookings = bookingsResult.data || [];
      const pendingBookings = bookings.filter((b: any) => b.status === "pending").length;
      const confirmedBookings = bookings.filter((b: any) => b.status === "confirmed").length;
      const pendingDeposits = bookings.filter((b: any) => !b.deposit_paid && b.status !== "cancelled").length;

      // Fetch escalations
      const escalationResult = await supabase
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "escalated");

      // Fetch healing progress - simplified to avoid type issues
      const healingCount = 0; // TODO: fetch when healing_progress table is used

      // Fetch client count
      const clientResult = await supabase
        .from("client_profiles")
        .select("id", { count: "exact", head: true });

      setStats({
        totalBookings: bookings?.length || 0,
        pendingBookings,
        confirmedBookings,
        activeHealingJourneys: healingCount,
        totalClients: clientResult.count || 0,
        pendingDeposits,
        escalations: escalationResult.count || 0,
        unreadMessages: 0,
      });

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
        <Badge variant="outline" className="text-gold border-gold/30">
          {new Date().toLocaleDateString("es", { weekday: "long", month: "long", day: "numeric" })}
        </Badge>
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
