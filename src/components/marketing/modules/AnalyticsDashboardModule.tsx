import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Users, Eye, Heart, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const timeRanges = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
];

interface AnalyticsData {
  metric_name: string;
  metric_value: number;
  change_percent: number;
  recorded_at: string;
}

const platformBreakdown = [
  { name: "Instagram", followers: 12500, engagement: 5.2, color: "bg-pink-500" },
  { name: "TikTok", followers: 8200, engagement: 6.8, color: "bg-purple-500" },
  { name: "Facebook", followers: 3500, engagement: 2.1, color: "bg-blue-500" },
  { name: "Twitter", followers: 389, engagement: 3.4, color: "bg-sky-500" },
];

const AnalyticsDashboardModule = () => {
  const [selectedRange, setSelectedRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [chartData, setChartData] = useState<{ day: string; value: number }[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
      const days = daysMap[selectedRange] || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Use any cast since marketing_analytics may not be in generated types yet
      const { data, error } = await (supabase
        .from("marketing_analytics" as any)
        .select("*")
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true }) as any);

      if (error) throw error;

      setAnalyticsData((data as AnalyticsData[]) || []);

      // Generate chart data from analytics
      const grouped = ((data as AnalyticsData[]) || []).reduce((acc, item) => {
        const date = new Date(item.recorded_at).toLocaleDateString("en", { weekday: "short" });
        acc[date] = (acc[date] || 0) + (item.metric_value || 0);
        return acc;
      }, {} as Record<string, number>);

      const chartEntries = Object.entries(grouped).slice(-7).map(([day, value]) => ({
        day,
        value: value as number,
      }));

      setChartData(chartEntries.length > 0 ? chartEntries : [
        { day: "Mon", value: 0 },
        { day: "Tue", value: 0 },
        { day: "Wed", value: 0 },
        { day: "Thu", value: 0 },
        { day: "Fri", value: 0 },
        { day: "Sat", value: 0 },
        { day: "Sun", value: 0 },
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { 
      label: "Followers", 
      value: analyticsData.find(d => d.metric_name === "followers")?.metric_value?.toLocaleString() || "0",
      change: `${analyticsData.find(d => d.metric_name === "followers")?.change_percent || 0}%`,
      trend: (analyticsData.find(d => d.metric_name === "followers")?.change_percent || 0) >= 0 ? "up" : "down",
      icon: Users 
    },
    { 
      label: "Reach", 
      value: analyticsData.find(d => d.metric_name === "reach")?.metric_value?.toLocaleString() || "0",
      change: `${analyticsData.find(d => d.metric_name === "reach")?.change_percent || 0}%`,
      trend: (analyticsData.find(d => d.metric_name === "reach")?.change_percent || 0) >= 0 ? "up" : "down",
      icon: Eye 
    },
    { 
      label: "Engagement", 
      value: `${analyticsData.find(d => d.metric_name === "engagement")?.metric_value || 0}%`,
      change: `${analyticsData.find(d => d.metric_name === "engagement")?.change_percent || 0}%`,
      trend: (analyticsData.find(d => d.metric_name === "engagement")?.change_percent || 0) >= 0 ? "up" : "down",
      icon: Heart 
    },
    { 
      label: "Comments", 
      value: analyticsData.find(d => d.metric_name === "comments")?.metric_value?.toLocaleString() || "0",
      change: `${analyticsData.find(d => d.metric_name === "comments")?.change_percent || 0}%`,
      trend: (analyticsData.find(d => d.metric_name === "comments")?.change_percent || 0) >= 0 ? "up" : "down",
      icon: MessageSquare 
    },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track your marketing performance</p>
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {timeRanges.map(range => (
            <Button
              key={range.value}
              variant={selectedRange === range.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedRange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;
          return (
            <Card key={metric.label} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${metric.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                    <TrendIcon className="h-3 w-3" />
                    {metric.change}
                  </div>
                </div>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Engagement Over Time
            </CardTitle>
            <CardDescription>Daily engagement for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-48 gap-2">
              {chartData.map((data) => (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                    style={{ height: `${(data.value / maxValue) * 100}%`, minHeight: data.value > 0 ? "4px" : "0" }}
                  />
                  <span className="text-xs text-muted-foreground">{data.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>Performance by social platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformBreakdown.map((platform) => {
                const totalFollowers = platformBreakdown.reduce((sum, p) => sum + p.followers, 0);
                const percentage = (platform.followers / totalFollowers) * 100;
                
                return (
                  <div key={platform.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                        <span className="text-sm font-medium">{platform.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {platform.followers.toLocaleString()} followers
                        </span>
                        <Badge variant="outline">
                          {platform.engagement}% engagement
                        </Badge>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboardModule;
