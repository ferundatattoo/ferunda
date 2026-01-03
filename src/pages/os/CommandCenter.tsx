import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  MessageSquare,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  Inbox,
  BarChart3,
  Palette,
  Rocket,
  Brain,
  Package,
  Settings,
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceData } from "@/hooks/useFinanceData";
import { BRAND } from "@/config/ethereal-navigation";

export const CommandCenter = () => {
  const navigate = useNavigate();
  const { metrics, loading: metricsLoading } = useFinanceData();
  const [stats, setStats] = useState({
    revenue: 0,
    bookings: 0,
    newClients: 0,
    messages: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const [bookingsRes, conversationsRes] = await Promise.all([
        supabase.from('bookings').select('id, status, deposit_paid, created_at, name').limit(100),
        supabase.from('chat_conversations').select('id, created_at').limit(100)
      ]);

      if (!isMountedRef.current) return;

      const bookings = bookingsRes.data || [];
      const conversations = conversationsRes.data || [];

      setStats({
        revenue: metrics?.totalDepositAmount || 0,
        bookings: bookings.length,
        newClients: bookings.filter(b => b.status === 'pending').length,
        messages: conversations.length
      });

      // Create recent activity from bookings
      const activity = bookings.slice(0, 5).map(b => ({
        type: b.deposit_paid ? 'payment' : 'booking',
        message: b.deposit_paid 
          ? `Depósito recibido de ${b.name || 'Cliente'}` 
          : `Nueva solicitud de ${b.name || 'Cliente'}`,
        time: new Date(b.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
      }));

      setRecentActivity(activity);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [metrics?.totalDepositAmount]);

  // Fetch data only once on mount, then update stats when metrics change
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDashboardData();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update revenue stat when metrics change (without re-fetching everything)
  useEffect(() => {
    if (metrics?.totalDepositAmount !== undefined) {
      setStats(prev => ({ ...prev, revenue: metrics.totalDepositAmount }));
    }
  }, [metrics?.totalDepositAmount]);

  const greeting = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 18 ? "Buenas tardes" : "Buenas noches";

  const statCards = [
    { label: "Revenue", value: `€${stats.revenue.toLocaleString()}`, change: "+12%", up: true, icon: DollarSign, color: "text-success", bgColor: "bg-success/10" },
    { label: "Bookings", value: stats.bookings.toString(), change: "+8%", up: true, icon: Calendar, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "New Clients", value: stats.newClients.toString(), change: "+15%", up: true, icon: Users, color: "text-ai", bgColor: "bg-ai/10" },
    { label: "Messages", value: stats.messages.toString(), change: "+5%", up: true, icon: MessageSquare, color: "text-warning", bgColor: "bg-warning/10" },
  ];

  const aiInsights = [
    { text: `${stats.newClients} leads esperando respuesta`, priority: "high" },
    { text: `€${metrics?.pendingDepositAmount?.toLocaleString() || 0} en depósitos pendientes`, priority: "medium" },
    { text: "Próxima cita en 45 minutos", priority: "low" },
  ];

  const quickLinks = [
    { label: "Inbox", icon: Inbox, path: "/os/inbox", color: "text-primary" },
    { label: "Pipeline", icon: Zap, path: "/os/pipeline", color: "text-ai" },
    { label: "Calendar", icon: Calendar, path: "/os/calendar", color: "text-success" },
    { label: "Clients", icon: Users, path: "/os/clients", color: "text-warning" },
    { label: "Money", icon: DollarSign, path: "/os/money", color: "text-success" },
    { label: "Growth", icon: Rocket, path: "/os/growth", color: "text-ai" },
    { label: "Studio", icon: Palette, path: "/os/studio", color: "text-primary" },
    { label: "Intelligence", icon: Brain, path: "/os/intelligence", color: "text-ai" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground">Aquí está lo que está pasando hoy</p>
        </div>
        <Badge className="bg-gradient-to-r from-ai/20 to-primary/20 text-ai border-ai/20 px-4 py-2">
          <Sparkles className="h-4 w-4 mr-2" />
          {BRAND.name}
        </Badge>
      </motion.div>

      {/* AI Insights Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="backdrop-blur-sm bg-gradient-to-r from-ai/5 to-primary/5 border-ai/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ai to-primary flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">AI Insights</h3>
                  <Badge className="bg-ai/10 text-ai border-ai/20 text-xs">Live</Badge>
                </div>
                <div className="space-y-2">
                  {aiInsights.map((insight, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        insight.priority === 'high' ? 'bg-destructive' : 
                        insight.priority === 'medium' ? 'bg-warning' : 'bg-success'
                      )} />
                      <span className="text-sm text-muted-foreground">{insight.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => navigate('/os/intelligence')}>
                Ver todo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat, i) => (
          <Card key={stat.label} className="backdrop-blur-sm bg-white/60 border-white/20 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(stat.label === 'Revenue' ? '/os/money' : stat.label === 'Bookings' ? '/os/calendar' : stat.label === 'Messages' ? '/os/inbox' : '/os/clients')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    stat.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {stat.up ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {stat.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="backdrop-blur-sm bg-white/60 border-white/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay actividad reciente</p>
                </div>
              ) : (
                recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <div className={cn(
                      "h-2 w-2 rounded-full mt-2 shrink-0",
                      activity.type === 'payment' ? 'bg-success' : 'bg-primary'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <Button variant="ghost" className="w-full mt-2" onClick={() => navigate('/os/inbox')}>
                Ver toda la actividad
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="backdrop-blur-sm bg-white/60 border-white/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Navegación Rápida</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-3">
              {quickLinks.map((link) => (
                <Button 
                  key={link.label}
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2 backdrop-blur-sm bg-white/40 border-white/20 hover:bg-white/60 hover:border-primary/20 transition-all"
                  onClick={() => navigate(link.path)}
                >
                  <link.icon className={cn("h-5 w-5", link.color)} />
                  <span className="text-xs">{link.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CommandCenter;
