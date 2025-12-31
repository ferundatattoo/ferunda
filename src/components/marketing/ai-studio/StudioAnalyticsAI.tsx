import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, Brain, DollarSign, Eye, Target, Zap,
  BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
  Video, Instagram, Globe, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line, LineChart
} from 'recharts';

const revenueData = [
  { date: 'Week 1', revenue: 4200, bookings: 12, videos: 8, predicted: 4500 },
  { date: 'Week 2', revenue: 5100, bookings: 15, videos: 12, predicted: 5200 },
  { date: 'Week 3', revenue: 6800, bookings: 18, videos: 15, predicted: 6500 },
  { date: 'Week 4', revenue: 7200, bookings: 21, videos: 18, predicted: 7000 },
];

const campaignPerformance = [
  { name: 'Healing Series', views: 45000, engagement: 8.7, conversions: 23, roi: 340 },
  { name: 'Micro-Realismo', views: 32000, engagement: 12.3, conversions: 18, roi: 280 },
  { name: 'Process Videos', views: 28000, engagement: 9.1, conversions: 15, roi: 220 },
  { name: 'Client Stories', views: 18000, engagement: 15.2, conversions: 12, roi: 190 },
];

const platformBreakdown = [
  { name: 'Instagram', value: 45, bookings: 34, revenue: 12400 },
  { name: 'TikTok', value: 30, bookings: 22, revenue: 8200 },
  { name: 'YouTube', value: 15, bookings: 11, revenue: 4100 },
  { name: 'X/Twitter', value: 10, bookings: 8, revenue: 2800 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const causalInsights = [
  {
    factor: 'Video Post Time',
    cause: 'Posts at 19:00-21:00',
    effect: '+47% engagement vs morning posts',
    confidence: 94,
    recommendation: 'Schedule all video posts for evening window'
  },
  {
    factor: 'Avatar Videos',
    cause: 'Videos with avatar narration',
    effect: '+62% watch completion rate',
    confidence: 91,
    recommendation: 'Use avatar for all educational content'
  },
  {
    factor: 'Healing Content',
    cause: 'Healing journey series',
    effect: '+40% repeat client bookings',
    confidence: 87,
    recommendation: 'Create more healing-focused content'
  },
  {
    factor: 'Trending Audio',
    cause: 'TikTok trending sounds',
    effect: '+180% reach on first 24h',
    confidence: 85,
    recommendation: 'Monitor trending audio weekly'
  },
];

const multiVerseScenarios = [
  {
    id: '1',
    scenario: 'Increase video frequency 2x',
    predictedRevenue: '+€8,400/month',
    predictedBookings: '+28',
    confidence: 88,
    risk: 'Low',
  },
  {
    id: '2',
    scenario: 'Focus only on TikTok',
    predictedRevenue: '+€4,200/month',
    predictedBookings: '+15',
    confidence: 72,
    risk: 'Medium',
  },
  {
    id: '3',
    scenario: 'Launch avatar video series',
    predictedRevenue: '+€12,600/month',
    predictedBookings: '+42',
    confidence: 82,
    risk: 'Low',
  },
];

export function StudioAnalyticsAI() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSimulating, setIsSimulating] = useState(false);

  const runQuantumSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: '€27,500', change: '+34%', icon: DollarSign, positive: true },
          { label: 'Total Views', value: '123K', change: '+22%', icon: Eye, positive: true },
          { label: 'Conversions', value: '68', change: '+18%', icon: Target, positive: true },
          { label: 'ROI Average', value: '285%', change: '+12%', icon: TrendingUp, positive: true },
        ].map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className="w-5 h-5 text-muted-foreground" />
                  <Badge variant="secondary" className={kpi.positive ? 'text-green-500' : 'text-red-500'}>
                    {kpi.positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {kpi.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="causal">Causal AI</TabsTrigger>
          <TabsTrigger value="multiverse">Multi-Verse</TabsTrigger>
          <TabsTrigger value="bci">BCI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Revenue & Bookings Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      yAxisId="left"
                      fill="url(#colorRevenue)" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Revenue (€)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      yAxisId="right"
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      name="Bookings"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="QNN Predicted"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Revenue by Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={platformBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {platformBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {platformBreakdown.map((platform, index) => (
                      <div key={platform.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          <span className="text-sm">{platform.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">€{platform.revenue.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{platform.bookings} bookings</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignPerformance.map((campaign) => (
                  <div key={campaign.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium">{campaign.name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{campaign.views.toLocaleString()} views</span>
                        <span>{campaign.engagement}% engagement</span>
                        <span>{campaign.conversions} conversions</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-500/20 text-green-500">
                        ROI {campaign.roi}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="causal" className="space-y-6">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Causal AI Insights
              </CardTitle>
              <CardDescription>
                "Video X causó Y bookings" - causal inference real
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {causalInsights.map((insight, index) => (
              <motion.div
                key={insight.factor}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{insight.factor}</CardTitle>
                      <Badge variant="outline">{insight.confidence}% confidence</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">CAUSE</p>
                        <p className="text-sm font-medium">{insight.cause}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <p className="text-xs text-muted-foreground mb-1">EFFECT</p>
                        <p className="text-sm font-medium text-green-500">{insight.effect}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-xs">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="multiverse" className="space-y-6">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Multi-Verse Scenario Simulations
                  </CardTitle>
                  <CardDescription>
                    QNN-powered what-if analysis con world models
                  </CardDescription>
                </div>
                <Button onClick={runQuantumSimulation} disabled={isSimulating}>
                  {isSimulating ? 'Simulating...' : 'Run QNN Sim'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {multiVerseScenarios.map((scenario) => (
              <Card key={scenario.id} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-full" />
                <CardHeader>
                  <CardTitle className="text-base">{scenario.scenario}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Predicted Revenue</p>
                      <p className="text-xl font-bold text-green-500">{scenario.predictedRevenue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Predicted Bookings</p>
                      <p className="text-lg font-medium">{scenario.predictedBookings}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <Progress value={scenario.confidence} className="w-20 h-2" />
                      </div>
                      <Badge variant={scenario.risk === 'Low' ? 'secondary' : 'destructive'}>
                        {scenario.risk} Risk
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Apply Scenario
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bci" className="space-y-6">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-500" />
                Brain-Linked Insights (BCI-Proxy)
              </CardTitle>
              <CardDescription>
                Análisis de reacciones viewer en tiempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Emotional Response</p>
                    <p className="text-xl font-bold">Calm +67%</p>
                    <p className="text-xs text-green-500">Optimal for conversions</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Attention Peaks</p>
                    <p className="text-xl font-bold">0:08, 0:15, 0:22</p>
                    <p className="text-xs text-muted-foreground">Key engagement moments</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Drop-off Point</p>
                    <p className="text-xl font-bold">0:28</p>
                    <p className="text-xs text-yellow-500">Optimize ending</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4 bg-gradient-to-br from-cyan-500/5 to-transparent">
                <CardContent className="pt-4">
                  <p className="font-medium mb-2">Federated Quantum Learning Status</p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cross-Platform Data</p>
                      <p className="font-medium">2.4M points</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Privacy Score</p>
                      <p className="font-medium text-green-500">100%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Model Accuracy</p>
                      <p className="font-medium">94.2%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Sync</p>
                      <p className="font-medium">2 min ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
