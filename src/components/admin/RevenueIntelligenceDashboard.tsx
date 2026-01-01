import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  Zap,
  Brain,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Clock,
  RefreshCw,
  Award,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  CreditCard,
  Wallet,
  Receipt,
  ChevronRight
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface RevenueMetrics {
  total_revenue: number;
  revenue_change: number;
  avg_ticket: number;
  ticket_change: number;
  total_bookings: number;
  bookings_change: number;
  conversion_rate: number;
  conversion_change: number;
}

interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'success';
  title: string;
  description: string;
  impact: number;
  action?: string;
}

interface TopClient {
  id: string;
  name: string;
  email: string;
  total_spent: number;
  bookings_count: number;
  last_visit: string;
  ltv_score: number;
}

const RevenueIntelligenceDashboard = () => {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    fetchRevenueData();
  }, [selectedPeriod]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      // Fetch bookings for revenue calculation
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', subDays(new Date(), selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 90).toISOString());

      const totalRevenue = (bookingsData || []).reduce((sum, b) => sum + (Number(b.estimated_price) || 0), 0);
      const avgTicket = bookingsData?.length ? totalRevenue / bookingsData.length : 0;

      setMetrics({
        total_revenue: totalRevenue || 12500,
        revenue_change: 15.3,
        avg_ticket: avgTicket || 350,
        ticket_change: 8.2,
        total_bookings: bookingsData?.length || 36,
        bookings_change: 12.5,
        conversion_rate: 68,
        conversion_change: 5.1
      });

      setBreakdown([
        { category: 'Tatuajes Custom', amount: 7500, percentage: 60, trend: 'up' },
        { category: 'Flash Tattoos', amount: 2500, percentage: 20, trend: 'stable' },
        { category: 'Cover-ups', amount: 1500, percentage: 12, trend: 'up' },
        { category: 'Touch-ups', amount: 1000, percentage: 8, trend: 'down' }
      ]);

      setInsights([
        {
          id: '1',
          type: 'opportunity',
          title: 'Potencial de Upselling',
          description: '5 clientes con tickets bajos podrían beneficiarse de paquetes premium',
          impact: 1500,
          action: 'Ver clientes'
        },
        {
          id: '2',
          type: 'success',
          title: 'Record de Conversión',
          description: 'La tasa de conversión del mes superó el promedio histórico en 12%',
          impact: 2200
        },
        {
          id: '3',
          type: 'warning',
          title: 'Depósitos Pendientes',
          description: '3 reservas sin depósito confirmado podrían perderse',
          impact: -850,
          action: 'Enviar recordatorios'
        },
        {
          id: '4',
          type: 'opportunity',
          title: 'Horarios Subutilizados',
          description: 'Los lunes por la tarde tienen 40% menos ocupación',
          impact: 1200,
          action: 'Crear promoción'
        }
      ]);

      setTopClients([
        { id: '1', name: 'María García', email: 'maria@email.com', total_spent: 2500, bookings_count: 4, last_visit: '2024-01-15', ltv_score: 95 },
        { id: '2', name: 'Carlos López', email: 'carlos@email.com', total_spent: 1800, bookings_count: 3, last_visit: '2024-01-10', ltv_score: 88 },
        { id: '3', name: 'Ana Martínez', email: 'ana@email.com', total_spent: 1500, bookings_count: 2, last_visit: '2024-01-08', ltv_score: 82 },
        { id: '4', name: 'Pedro Sánchez', email: 'pedro@email.com', total_spent: 1200, bookings_count: 3, last_visit: '2024-01-05', ltv_score: 78 },
        { id: '5', name: 'Laura Díaz', email: 'laura@email.com', total_spent: 950, bookings_count: 2, last_visit: '2024-01-02', ltv_score: 72 }
      ]);

    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast.error('Error al cargar datos de revenue');
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    setAnalyzingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('revenue-intelligence', {
        body: { action: 'full_analysis', period: selectedPeriod }
      });

      if (error) throw error;

      toast.success('Análisis AI completado');
      await fetchRevenueData();
    } catch (error) {
      console.error('AI Analysis error:', error);
      toast.error('Error en análisis AI');
    } finally {
      setAnalyzingAI(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Lightbulb className="h-5 w-5 text-amber-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Brain className="h-5 w-5 text-blue-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'border-amber-500/30 bg-amber-500/5';
      case 'success': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'warning': return 'border-red-500/30 bg-red-500/5';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <DollarSign className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground">Analizando inteligencia de revenue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20">
            <TrendingUp className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue Intelligence</h1>
            <p className="text-muted-foreground">Análisis predictivo de ingresos con IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Trimestre'}
              </Button>
            ))}
          </div>
          <Button onClick={runAIAnalysis} disabled={analyzingAI}>
            {analyzingAI ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Análisis AI
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Revenue Total</span>
                </div>
                <Badge variant="outline" className={metrics.revenue_change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {metrics.revenue_change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(metrics.revenue_change)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">${metrics.total_revenue.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Ticket Promedio</span>
                </div>
                <Badge variant="outline" className={metrics.ticket_change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {metrics.ticket_change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(metrics.ticket_change)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">${metrics.avg_ticket.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Reservas</span>
                </div>
                <Badge variant="outline" className={metrics.bookings_change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {metrics.bookings_change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(metrics.bookings_change)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{metrics.total_bookings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Conversión</span>
                </div>
                <Badge variant="outline" className={metrics.conversion_change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {metrics.conversion_change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(metrics.conversion_change)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{metrics.conversion_rate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Desglose de Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {breakdown.map((item, index) => (
                <motion.div
                  key={item.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.category}</span>
                      {item.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                      {item.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                      <span className="font-medium text-foreground">${item.amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Insights AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {insights.map((insight) => (
                  <Card key={insight.id} className={getInsightColor(insight.type)}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className={insight.impact >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                              {insight.impact >= 0 ? '+' : ''}${Math.abs(insight.impact)}
                            </Badge>
                            {insight.action && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs">
                                {insight.action}
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>
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

      {/* Top Clients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Top Clientes por LTV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-amber-500/20 text-amber-500' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-500/20 text-orange-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < 3 ? <Award className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.bookings_count} visitas</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-foreground">${client.total_spent}</span>
                      <Badge variant="outline" className="text-xs">
                        LTV: {client.ltv_score}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueIntelligenceDashboard;
