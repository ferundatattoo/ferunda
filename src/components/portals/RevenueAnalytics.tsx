import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  DollarSign, TrendingUp, TrendingDown, Users, 
  Calendar, Target, Brain, Zap
} from 'lucide-react';

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  deposits: number;
  source: string;
  channel: string;
}

interface CausalInsight {
  factor: string;
  impact: number;
  confidence: number;
  recommendation: string;
}

export function RevenueAnalytics() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchRevenueData();
  }, [timeRange]);

  const fetchRevenueData = async () => {
    try {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: revenueData } = await supabase
        .from('revenue_analytics')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (revenueData) {
        setData(revenueData.map(r => ({
          date: r.date,
          revenue: Number(r.revenue_amount) || 0,
          bookings: r.bookings_count || 0,
          deposits: Number(r.deposits_amount) || 0,
          source: r.source,
          channel: r.channel || 'direct'
        })));
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate stats
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalBookings = data.reduce((sum, d) => sum + d.bookings, 0);
  const totalDeposits = data.reduce((sum, d) => sum + d.deposits, 0);
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // QAOA-inspired revenue prediction (simplified)
  const predictedRevenue = Math.round(totalRevenue * 1.15); // 15% growth prediction
  const confidenceScore = 0.78;

  // Causal AI insights (mock data for demo)
  const causalInsights: CausalInsight[] = [
    {
      factor: 'Instagram DM Response Time',
      impact: 23,
      confidence: 0.85,
      recommendation: 'Faster response time correlates with 23% more bookings'
    },
    {
      factor: 'Portfolio Updates',
      impact: 15,
      confidence: 0.72,
      recommendation: 'Weekly portfolio updates increase inquiries by 15%'
    },
    {
      factor: 'Story Posting Frequency',
      impact: 18,
      confidence: 0.68,
      recommendation: 'Daily stories correlate with 18% higher engagement'
    }
  ];

  // Channel breakdown for pie chart
  const channelData = [
    { name: 'Instagram', value: 45, color: 'hsl(var(--chart-1))' },
    { name: 'TikTok', value: 25, color: 'hsl(var(--chart-2))' },
    { name: 'Email', value: 15, color: 'hsl(var(--chart-3))' },
    { name: 'Direct', value: 15, color: 'hsl(var(--chart-4))' }
  ];

  // Prepare chart data
  const chartData = data.reduce((acc, curr) => {
    const existing = acc.find(a => a.date === curr.date);
    if (existing) {
      existing.revenue += curr.revenue;
      existing.bookings += curr.bookings;
    } else {
      acc.push({ ...curr });
    }
    return acc;
  }, [] as RevenueData[]);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Revenue Analytics</h2>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
            <div className="flex items-center mt-2 text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12% vs last period
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-bold">{totalBookings}</p>
              </div>
              <Calendar className="h-10 w-10 text-blue-500" />
            </div>
            <div className="flex items-center mt-2 text-sm text-blue-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              +8% vs last period
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Booking Value</p>
                <p className="text-3xl font-bold">${Math.round(avgBookingValue)}</p>
              </div>
              <Target className="h-10 w-10 text-purple-500" />
            </div>
            <div className="flex items-center mt-2 text-sm text-purple-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              +5% vs last period
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Predicted Revenue</p>
                <p className="text-3xl font-bold">${predictedRevenue.toLocaleString()}</p>
              </div>
              <Brain className="h-10 w-10 text-amber-500" />
            </div>
            <div className="flex items-center mt-2 text-sm text-amber-500">
              <Zap className="h-4 w-4 mr-1" />
              {Math.round(confidenceScore * 100)}% confidence
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `$${v}`}
                />
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
                  stroke="hsl(var(--primary))" 
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Causal AI Insights */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Causal AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {causalInsights.map((insight, i) => (
              <div 
                key={i}
                className="bg-muted/30 rounded-lg p-4 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{insight.factor}</span>
                  <span className={`text-lg font-bold ${insight.impact > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {insight.impact > 0 ? '+' : ''}{insight.impact}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {insight.recommendation}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${insight.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(insight.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What-If Explorer */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            What-If Scenario Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">If you increase marketing by 20%...</h4>
              <div className="bg-gradient-to-r from-green-500/10 to-transparent p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span>Projected Revenue Increase</span>
                  <span className="text-2xl font-bold text-green-500">+$2,340</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span>New Bookings</span>
                  <span className="text-xl font-bold text-green-500">+8</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">If response time drops to 5 min...</h4>
              <div className="bg-gradient-to-r from-blue-500/10 to-transparent p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span>Conversion Rate Increase</span>
                  <span className="text-2xl font-bold text-blue-500">+15%</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span>Additional Monthly Revenue</span>
                  <span className="text-xl font-bold text-blue-500">+$1,820</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
