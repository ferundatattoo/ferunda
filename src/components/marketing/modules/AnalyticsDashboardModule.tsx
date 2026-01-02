import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Users, Eye, Heart, MessageSquare } from "lucide-react";

const timeRanges = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
];

const metrics = [
  { label: "Followers", value: "24,589", change: "+1,234", trend: "up", icon: Users },
  { label: "Reach", value: "156.2K", change: "+28.4K", trend: "up", icon: Eye },
  { label: "Engagement", value: "4.8%", change: "+0.5%", trend: "up", icon: Heart },
  { label: "Comments", value: "892", change: "-45", trend: "down", icon: MessageSquare },
];

const platformBreakdown = [
  { name: "Instagram", followers: 12500, engagement: 5.2, color: "bg-pink-500" },
  { name: "TikTok", followers: 8200, engagement: 6.8, color: "bg-purple-500" },
  { name: "Facebook", followers: 3500, engagement: 2.1, color: "bg-blue-500" },
  { name: "Twitter", followers: 389, engagement: 3.4, color: "bg-sky-500" },
];

const chartData = [
  { day: "Mon", value: 2400 },
  { day: "Tue", value: 1398 },
  { day: "Wed", value: 4800 },
  { day: "Thu", value: 3908 },
  { day: "Fri", value: 4800 },
  { day: "Sat", value: 3800 },
  { day: "Sun", value: 4300 },
];

const AnalyticsDashboardModule = () => {
  const [selectedRange, setSelectedRange] = useState("7d");

  const maxValue = Math.max(...chartData.map(d => d.value));

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
                    style={{ height: `${(data.value / maxValue) * 100}%` }}
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
