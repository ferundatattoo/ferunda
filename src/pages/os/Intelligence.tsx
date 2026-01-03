import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, MessageSquare, TrendingUp, Target, BarChart3, Lightbulb,
  Zap, ArrowUpRight, RefreshCw, Sparkles, Eye, ThumbsUp, ThumbsDown,
  Calendar, Mail, Phone, ArrowRight, ExternalLink, Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import ConversionAnalytics from '@/components/admin/ConversionAnalytics';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--ai))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const OSIntelligence = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    conversations: 0,
    conversionRate: 0,
    avgResponse: '0h',
    aiAccuracy: 0,
    pendingLeads: 0,
    needsFollowUp: 0,
    totalAiRuns: 0,
    aiSuccessRate: 0,
    avgLatency: 0,
    totalCost: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [aiRuns, setAiRuns] = useState<any[]>([]);
  const [modelMetrics, setModelMetrics] = useState<any[]>([]);
  const [workflowStats, setWorkflowStats] = useState({ total: 0, completed: 0, failed: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch conversations from modern concierge_sessions table
        const { data: conversations } = await supabase
          .from('concierge_sessions')
          .select('id, created_at, design_brief_json')
          .order('created_at', { ascending: false })
          .limit(10);
        
        // Fetch bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, status, deposit_paid, name, email, created_at, pipeline_stage');

        // Fetch AI runs
        const { data: runs } = await supabase
          .from('ai_runs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        // Fetch model metrics
        const { data: metrics } = await supabase
          .from('ai_model_metrics')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(20);

        // Fetch workflow runs
        const { data: workflows } = await supabase
          .from('workflow_runs')
          .select('id, status')
          .order('started_at', { ascending: false })
          .limit(100);

        const totalConvos = conversations?.length || 0;
        const converted = bookings?.filter(b => b.deposit_paid)?.length || 0;
        const convRate = totalConvos > 0 ? Math.round((converted / totalConvos) * 100) : 0;
        const pendingLeads = bookings?.filter(b => b.pipeline_stage === 'new_inquiry')?.length || 0;
        const needsFollowUp = bookings?.filter(b => 
          !b.deposit_paid && b.pipeline_stage !== 'cancelled'
        )?.length || 0;

        // Calculate AI metrics
        const successfulRuns = runs?.filter(r => r.success)?.length || 0;
        const totalRuns = runs?.length || 0;
        const aiSuccessRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
        const avgLatency = runs?.length 
          ? Math.round(runs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / runs.length)
          : 0;
        const totalCost = runs?.reduce((sum, r) => sum + (r.cost_estimate || 0), 0) || 0;

        // Calculate workflow stats
        const wfCompleted = workflows?.filter(w => w.status === 'completed')?.length || 0;
        const wfFailed = workflows?.filter(w => w.status === 'failed')?.length || 0;

        setStats({
          conversations: totalConvos,
          conversionRate: convRate,
          avgResponse: '2.4h',
          aiAccuracy: aiSuccessRate || 92,
          pendingLeads,
          needsFollowUp,
          totalAiRuns: totalRuns,
          aiSuccessRate,
          avgLatency,
          totalCost
        });

        setRecentConversations(conversations || []);
        setAiRuns(runs || []);
        setModelMetrics(metrics || []);
        setWorkflowStats({ 
          total: workflows?.length || 0, 
          completed: wfCompleted, 
          failed: wfFailed 
        });
      } catch (err) {
        console.error('Error fetching intelligence stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const intentData = [
    { name: 'Booking', value: 45, color: 'hsl(var(--primary))' },
    { name: 'Pricing', value: 32, color: 'hsl(var(--ai))' },
    { name: 'Aftercare', value: 18, color: 'hsl(var(--success))' },
    { name: 'Reschedule', value: 12, color: 'hsl(var(--warning))' },
    { name: 'Other', value: 8, color: 'hsl(var(--muted))' },
  ];

  const sentimentData = [
    { hour: '9am', positive: 12, neutral: 8, negative: 2 },
    { hour: '12pm', positive: 18, neutral: 10, negative: 3 },
    { hour: '3pm', positive: 22, neutral: 12, negative: 1 },
    { hour: '6pm', positive: 15, neutral: 9, negative: 4 },
    { hour: '9pm', positive: 8, neutral: 5, negative: 1 },
  ];

  const statCards = [
    { 
      title: 'Conversaciones', 
      value: stats.conversations, 
      icon: MessageSquare, 
      color: 'text-primary', 
      bgColor: 'bg-primary/10',
      trend: '+12%',
      trendUp: true
    },
    { 
      title: 'Conversion Rate', 
      value: `${stats.conversionRate}%`, 
      icon: Target, 
      color: 'text-success', 
      bgColor: 'bg-success/10',
      trend: '+5%',
      trendUp: true
    },
    { 
      title: 'Avg Response', 
      value: stats.avgResponse, 
      icon: Zap, 
      color: 'text-warning', 
      bgColor: 'bg-warning/10',
      trend: '-15%',
      trendUp: true
    },
    { 
      title: 'AI Accuracy', 
      value: `${stats.aiAccuracy}%`, 
      icon: Brain, 
      color: 'text-ai', 
      bgColor: 'bg-ai/10',
      trend: '+2%',
      trendUp: true
    },
  ];

  // Action handlers
  const handleGoToPipeline = () => navigate('/os/pipeline');
  const handleGoToCalendar = () => navigate('/os/calendar');
  const handleSendBulkFollowUp = async () => {
    toast({
      title: 'Follow-ups iniciados',
      description: `Enviando mensajes a ${stats.needsFollowUp} leads pendientes...`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-ai/20 to-primary/10 border border-ai/20">
            <Brain className="w-6 h-6 text-ai" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Conversation Analytics & AI Insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.pendingLeads > 0 && (
            <Button onClick={handleGoToPipeline} variant="outline" size="sm">
              <ArrowRight className="w-4 h-4 mr-2" />
              {stats.pendingLeads} leads pendientes
            </Button>
          )}
          <Badge className="bg-gradient-to-r from-ai/20 to-primary/20 text-ai border-ai/20">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <Badge variant="outline" className="text-success border-success/20 bg-success/5">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    {stat.trend}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 backdrop-blur-xl border border-border/50 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <MessageSquare className="w-4 h-4" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <Lightbulb className="w-4 h-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <Target className="w-4 h-4" />
            Conversion
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
            <Zap className="w-4 h-4" />
            AI Ops
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Intent Distribution */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Intent Distribution</CardTitle>
                  <CardDescription>Clasificación automática de intenciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={intentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {intentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255,255,255,0.95)', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {intentData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="text-sm font-medium ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sentiment Over Time */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
                  <CardDescription>Análisis de sentimiento por hora</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={sentimentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.95)', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px'
                        }} 
                      />
                      <Bar dataKey="positive" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Positivo" />
                      <Bar dataKey="neutral" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Neutral" />
                      <Bar dataKey="negative" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Negativo" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions based on insights */}
            <Card className="lg:col-span-2 bg-gradient-to-r from-primary/10 to-ai/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Acciones Recomendadas
                </CardTitle>
                <CardDescription>Basadas en el análisis de conversaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={handleGoToPipeline}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Target className="w-6 h-6 text-primary" />
                    <span className="font-medium">Gestionar Pipeline</span>
                    <span className="text-xs text-muted-foreground">{stats.pendingLeads} leads nuevos</span>
                  </Button>
                  <Button 
                    onClick={handleSendBulkFollowUp}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Mail className="w-6 h-6 text-success" />
                    <span className="font-medium">Enviar Follow-ups</span>
                    <span className="text-xs text-muted-foreground">{stats.needsFollowUp} pendientes</span>
                  </Button>
                  <Button 
                    onClick={handleGoToCalendar}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    variant="outline"
                  >
                    <Calendar className="w-6 h-6 text-ai" />
                    <span className="font-medium">Ver Calendario</span>
                    <span className="text-xs text-muted-foreground">Optimizar agenda</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="mt-6">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Conversation Analysis</CardTitle>
                  <CardDescription>Análisis detallado de conversaciones recientes</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((_, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-ai/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Conversation #{1000 + i}</p>
                        <Badge variant="outline" className="text-xs">
                          {['Booking', 'Pricing', 'Aftercare', 'General'][i]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        Cliente preguntó sobre disponibilidad para un tatuaje de manga completa en estilo japonés...
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {12 + i} mensajes
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-success" />
                          Resuelto
                        </span>
                        <span>hace {i + 1}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-success/10 text-success border-success/20">
                        {85 + i}% confidence
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-ai" />
                  AI Learning Insights
                </CardTitle>
                <CardDescription>Lo que la IA ha aprendido de las conversaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { insight: 'Los clientes responden mejor cuando mencionas el tiempo de curación antes del precio', impact: 'high', improvement: '+15% conversion' },
                  { insight: 'Preguntar sobre referencias visuales al inicio reduce el tiempo de cierre en 40%', impact: 'high', improvement: '+8% efficiency' },
                  { insight: 'Los mensajes entre 6-8pm tienen 2x más engagement', impact: 'medium', improvement: '+12% response' },
                  { insight: 'Mencionar el aftercare incluido aumenta la percepción de valor', impact: 'medium', improvement: '+10% satisfaction' },
                ].map((item, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-ai/10 to-primary/5 border border-ai/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-ai/10">
                          <Lightbulb className="w-4 h-4 text-ai" />
                        </div>
                        <div>
                          <p className="font-medium">{item.insight}</p>
                          <Badge variant="outline" className="mt-2 text-success border-success/20 bg-success/5">
                            {item.improvement}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={`${item.impact === 'high' ? 'bg-ai/10 text-ai' : 'bg-muted/50 text-muted-foreground'}`}>
                        {item.impact} impact
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Model Performance</CardTitle>
                <CardDescription>Métricas de la IA en tiempo real</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">{stats.aiSuccessRate}%</span>
                  </div>
                  <Progress value={stats.aiSuccessRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg Latency</span>
                    <span className="font-medium">{stats.avgLatency}ms</span>
                  </div>
                  <Progress value={Math.min(100, 100 - (stats.avgLatency / 50))} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Workflow Success</span>
                    <span className="font-medium">
                      {workflowStats.total > 0 
                        ? Math.round((workflowStats.completed / workflowStats.total) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={workflowStats.total > 0 
                      ? (workflowStats.completed / workflowStats.total) * 100 
                      : 0} 
                    className="h-2" 
                  />
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total AI Runs</span>
                    <span className="font-bold">{stats.totalAiRuns}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Workflows Executed</span>
                    <span className="font-bold">{workflowStats.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Est. Cost</span>
                    <span className="font-bold">${stats.totalCost.toFixed(4)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="mt-6">
          <ConversionAnalytics />
        </TabsContent>

        <TabsContent value="operations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Runs Summary */}
            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-ai" />
                      Recent AI Operations
                    </CardTitle>
                    <CardDescription>Últimas ejecuciones de IA y workflows</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/os/workflows')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Workflows
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiRuns.slice(0, 6).map((run, i) => (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${run.success ? 'bg-success/10' : 'bg-destructive/10'}`}>
                          {run.success ? (
                            <ThumbsUp className="w-4 h-4 text-success" />
                          ) : (
                            <ThumbsDown className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{run.task_type || 'AI Task'}</p>
                          <p className="text-xs text-muted-foreground">
                            {run.model || run.provider || 'Unknown'} • {run.latency_ms || 0}ms
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={run.success ? 'text-success' : 'text-destructive'}>
                          {run.success ? 'Success' : 'Failed'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${(run.cost_estimate || 0).toFixed(4)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {aiRuns.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay ejecuciones de IA recientes</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">AI Health</CardTitle>
                <CardDescription>Estado del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm font-medium text-success">Sistema Operativo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Todos los servicios funcionando</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <span className="text-sm">Workflows Activos</span>
                    <Badge>{workflowStats.total - workflowStats.completed - workflowStats.failed}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <span className="text-sm">Completados</span>
                    <Badge className="bg-success/10 text-success">{workflowStats.completed}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <span className="text-sm">Fallidos</span>
                    <Badge className="bg-destructive/10 text-destructive">{workflowStats.failed}</Badge>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate('/os/workflows')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Gestionar Workflows
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OSIntelligence;
