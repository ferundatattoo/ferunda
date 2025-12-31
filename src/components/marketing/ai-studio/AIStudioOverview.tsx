import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, Video, Eye, DollarSign, Zap, 
  Brain, Sparkles, ArrowUpRight, Activity, Target
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell
} from 'recharts';

const revenueForecasts = [
  { date: 'Ene', actual: 4200, predicted: 4500, causal: 4800 },
  { date: 'Feb', actual: 5100, predicted: 5400, causal: 5900 },
  { date: 'Mar', actual: 6800, predicted: 7200, causal: 7800 },
  { date: 'Abr', actual: null, predicted: 8500, causal: 9200 },
  { date: 'May', actual: null, predicted: 9800, causal: 10500 },
  { date: 'Jun', actual: null, predicted: 11200, causal: 12100 },
];

const trendImpact = [
  { trend: 'Micro-Realismo', bookings: 45, confidence: 92 },
  { trend: 'Sacred Geometry', bookings: 32, confidence: 87 },
  { trend: 'Fine Line', bookings: 28, confidence: 84 },
  { trend: 'Blackwork', bookings: 18, confidence: 79 },
];

const qvoMetrics = [
  { name: 'Videos Hoy', value: 12, change: '+34%', color: 'text-green-500' },
  { name: 'Engagement Rate', value: '8.7%', change: '+12%', color: 'text-green-500' },
  { name: 'Conversiones', value: 23, change: '+28%', color: 'text-green-500' },
  { name: 'ROI Causal', value: '340%', change: '+15%', color: 'text-green-500' },
];

const platformDistribution = [
  { name: 'Instagram', value: 45, fill: 'hsl(var(--primary))' },
  { name: 'TikTok', value: 30, fill: 'hsl(var(--secondary))' },
  { name: 'YouTube', value: 15, fill: 'hsl(var(--accent))' },
  { name: 'X/Twitter', value: 10, fill: 'hsl(var(--muted))' },
];

export function AIStudioOverview() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

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
                  <linearGradient id="colorCausal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  fill="url(#colorActual)" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Actual"
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="ML Prediction"
                />
                <Line 
                  type="monotone" 
                  dataKey="causal" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Causal AI"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span>ML Prediction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span>Causal AI (+18%)</span>
              </div>
            </div>
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
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar 
                  dataKey="bookings" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  name="Bookings"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {trendImpact.map(trend => (
                <div key={trend.trend} className="flex items-center justify-between text-sm">
                  <span>{trend.trend}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={trend.confidence} className="w-20 h-2" />
                    <span className="text-muted-foreground">{trend.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QVO Overview + Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              QVO Overview - Videos Generados
            </CardTitle>
            <CardDescription>
              Quantum Video Optimization: max quality, min render time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Videos Hoy</span>
                  </div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">+4 vs ayer</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">Views Totales</span>
                  </div>
                  <p className="text-2xl font-bold">48.2K</p>
                  <p className="text-xs text-muted-foreground">+22% esta semana</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Conversiones</span>
                  </div>
                  <p className="text-2xl font-bold">23</p>
                  <p className="text-xs text-muted-foreground">4.8% conversion rate</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Revenue Impact</span>
                  </div>
                  <p className="text-2xl font-bold">€8.4K</p>
                  <p className="text-xs text-muted-foreground">ROI 340%</p>
                </CardContent>
              </Card>
            </div>

            {/* BCI-Proxy Insights */}
            <Card className="mt-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Brain-Linked Prediction (BCI-Proxy)</span>
                  <Badge variant="secondary" className="text-purple-500">AI Active</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">User Reaction Prediction</p>
                    <p className="font-medium">Calm emotions → +67% retention</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Optimal Video Length</p>
                    <p className="font-medium">18-25s for max engagement</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Best Action</p>
                    <p className="font-medium">Post healing video at 19:00</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
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
                <Pie
                  data={platformDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {platformDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {platformDistribution.map(platform => (
                <div key={platform.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: platform.fill }} />
                    <span>{platform.name}</span>
                  </div>
                  <span className="font-medium">{platform.value}%</span>
                </div>
              ))}
            </div>
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
}
