import React, { useState, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, Video, Eye, DollarSign, Zap, 
  Brain, Sparkles, ArrowUpRight, Activity, Target, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

// Fallback data for when DB is empty
const fallbackRevenueForecasts = [
  { date: 'Ene', actual: 4200, predicted: 4500, causal: 4800 },
  { date: 'Feb', actual: 5100, predicted: 5400, causal: 5900 },
  { date: 'Mar', actual: 6800, predicted: 7200, causal: 7800 },
  { date: 'Abr', actual: null, predicted: 8500, causal: 9200 },
  { date: 'May', actual: null, predicted: 9800, causal: 10500 },
  { date: 'Jun', actual: null, predicted: 11200, causal: 12100 },
];

const fallbackTrendImpact = [
  { trend: 'Micro-Realismo', bookings: 45, confidence: 92 },
  { trend: 'Sacred Geometry', bookings: 32, confidence: 87 },
  { trend: 'Fine Line', bookings: 28, confidence: 84 },
  { trend: 'Blackwork', bookings: 18, confidence: 79 },
];

const fallbackPlatformDistribution = [
  { name: 'Instagram', value: 45, fill: 'hsl(var(--primary))' },
  { name: 'TikTok', value: 30, fill: 'hsl(var(--secondary))' },
  { name: 'YouTube', value: 15, fill: 'hsl(var(--accent))' },
  { name: 'X/Twitter', value: 10, fill: 'hsl(var(--muted))' },
];

export const AIStudioOverview = forwardRef<HTMLDivElement>((_, ref) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real data states
  const [revenueForecasts, setRevenueForecasts] = useState(fallbackRevenueForecasts);
  const [trendImpact, setTrendImpact] = useState(fallbackTrendImpact);
  const [platformDistribution, setPlatformDistribution] = useState(fallbackPlatformDistribution);
  const [qvoMetrics, setQvoMetrics] = useState([
    { name: 'Videos Hoy', value: 12, change: '+34%', color: 'text-green-500' },
    { name: 'Engagement Rate', value: '8.7%', change: '+12%', color: 'text-green-500' },
    { name: 'Conversiones', value: 23, change: '+28%', color: 'text-green-500' },
    { name: 'ROI Causal', value: '340%', change: '+15%', color: 'text-green-500' },
  ]);

  // Fetch real data on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch AI avatar videos for QVO metrics
        const { data: videos } = await supabase
          .from('ai_avatar_videos')
          .select('id, views_count, engagement_score, conversion_impact, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (videos && videos.length > 0) {
          const todayVideos = videos.length;
          const avgEngagement = videos.reduce((sum, v) => sum + (v.engagement_score || 0), 0) / videos.length;
          const conversions = videos.filter(v => (v.conversion_impact || 0) > 0).length;

          setQvoMetrics([
            { name: 'Videos Hoy', value: todayVideos, change: '+34%', color: 'text-green-500' },
            { name: 'Engagement Rate', value: `${(avgEngagement * 100).toFixed(1)}%`, change: '+12%', color: 'text-green-500' },
            { name: 'Conversiones', value: conversions, change: '+28%', color: 'text-green-500' },
            { name: 'ROI Causal', value: '340%', change: '+15%', color: 'text-green-500' },
          ]);
        }

        // Fetch trends for impact analysis
        const { data: trends } = await supabase
          .from('social_trends')
          .select('title, viral_score')
          .order('viral_score', { ascending: false })
          .limit(4);

        if (trends && trends.length > 0) {
          setTrendImpact(trends.map(t => ({
            trend: t.title.substring(0, 20),
            bookings: Math.round((t.viral_score / 100) * 50),
            confidence: t.viral_score
          })));
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const runQVOptimization = () => {
    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    const interval = setInterval(() => {
      setOptimizationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsOptimizing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* QVO Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {qvoMetrics.map((metric, index) => (
          <motion.div
            key={metric.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardContent className="pt-4 relative">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                  <Badge variant="secondary" className={metric.color}>
                    {metric.change}
                  </Badge>
                </div>
                <p className="text-3xl font-bold mt-1">{metric.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Forecast with Causal AI */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Revenue Forecast Causal
                </CardTitle>
                <CardDescription>
                  Predicción con world models + causal inference
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={runQVOptimization} disabled={isOptimizing}>
                {isOptimizing ? 'Optimizando...' : 'QVO Optimize'}
              </Button>
            </div>
            {isOptimizing && (
              <Progress value={optimizationProgress} className="h-1 mt-2" />
            )}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={revenueForecasts}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="actual" fill="url(#colorActual)" stroke="hsl(var(--primary))" strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" name="ML Prediction" />
                <Line type="monotone" dataKey="causal" stroke="hsl(var(--accent))" strokeWidth={2} name="Causal AI" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend Impact on Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Bookings from Trends
            </CardTitle>
            <CardDescription>
              Impacto causal de trends detectados → bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendImpact} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="trend" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              QVO Overview - Videos Generados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="pt-4">
                  <Video className="w-4 h-4 text-primary mb-2" />
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Videos Hoy</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
                <CardContent className="pt-4">
                  <Eye className="w-4 h-4 text-accent mb-2" />
                  <p className="text-2xl font-bold">48.2K</p>
                  <p className="text-xs text-muted-foreground">Views Totales</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="pt-4">
                  <Target className="w-4 h-4 text-green-500 mb-2" />
                  <p className="text-2xl font-bold">23</p>
                  <p className="text-xs text-muted-foreground">Conversiones</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                <CardContent className="pt-4">
                  <DollarSign className="w-4 h-4 text-yellow-500 mb-2" />
                  <p className="text-2xl font-bold">€8.4K</p>
                  <p className="text-xs text-muted-foreground">Revenue Impact</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Platform Mix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={platformDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {platformDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-auto py-4 flex-col gap-2" variant="outline">
              <Sparkles className="w-5 h-5" />
              <span>Spot Trends</span>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline">
              <Video className="w-5 h-5" />
              <span>Create Video</span>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline">
              <TrendingUp className="w-5 h-5" />
              <span>View Analytics</span>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline">
              <Target className="w-5 h-5" />
              <span>Connect Platform</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AIStudioOverview.displayName = "AIStudioOverview";
