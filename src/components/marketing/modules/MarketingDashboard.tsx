import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Eye, Heart, Share2, Calendar, Zap } from "lucide-react";

const stats = [
  { label: "Total Followers", value: "24.5K", change: "+12.3%", trend: "up", icon: Users },
  { label: "Engagement Rate", value: "4.8%", change: "+0.5%", trend: "up", icon: Heart },
  { label: "Total Reach", value: "156K", change: "+28.4%", trend: "up", icon: Eye },
  { label: "Shares", value: "2.1K", change: "-3.2%", trend: "down", icon: Share2 },
];

const recentActivity = [
  { type: "post", message: "Instagram post published", time: "2 hours ago", status: "success" },
  { type: "campaign", message: "Summer Campaign started", time: "5 hours ago", status: "active" },
  { type: "test", message: "A/B Test completed - Variant B won", time: "1 day ago", status: "completed" },
  { type: "schedule", message: "3 posts scheduled for tomorrow", time: "1 day ago", status: "pending" },
];

const upcomingPosts = [
  { platform: "Instagram", content: "New tattoo showcase...", scheduledAt: "Today, 6:00 PM" },
  { platform: "TikTok", content: "Behind the scenes...", scheduledAt: "Tomorrow, 2:00 PM" },
  { platform: "Facebook", content: "Client testimonial...", scheduledAt: "Tomorrow, 5:00 PM" },
];

const MarketingDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing Dashboard</h1>
        <p className="text-muted-foreground">Overview of your marketing performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
          return (
            <Card key={stat.label} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge 
                    variant={stat.trend === "up" ? "default" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    <TrendIcon className="h-3 w-3" />
                    {stat.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest marketing actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Posts */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Posts
            </CardTitle>
            <CardDescription>Scheduled content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingPosts.map((post, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{post.platform}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{post.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">{post.scheduledAt}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketingDashboard;
