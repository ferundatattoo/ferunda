import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Eye, Heart, Share2, Calendar, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ScheduledPost {
  id: string;
  platform: string | null;
  content: string | null;
  scheduled_at: string | null;
}

interface Campaign {
  id: string;
  name: string | null;
  status: string | null;
  created_at: string;
}

const MarketingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [upcomingPosts, setUpcomingPosts] = useState<ScheduledPost[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    activeCampaigns: 0,
    scheduledPosts: 0,
    completedTests: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch upcoming posts - use any cast since table may not be in generated types
      const { data: posts } = await (supabase
        .from("marketing_scheduled_posts" as any)
        .select("id, platform, content, scheduled_at")
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(3) as any);

      setUpcomingPosts((posts as ScheduledPost[]) || []);

      // Fetch recent campaigns - use any cast since table may not be in generated types
      const { data: campaigns } = await (supabase
        .from("marketing_campaigns" as any)
        .select("id, name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(4) as any);

      setRecentCampaigns((campaigns as Campaign[]) || []);

      // Fetch stats - use any cast for tables not in generated types
      const { count: postsCount } = await (supabase
        .from("marketing_scheduled_posts" as any)
        .select("*", { count: "exact", head: true }) as any);

      const { count: activeCampaignsCount } = await (supabase
        .from("marketing_campaigns" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "active") as any);

      const { count: scheduledCount } = await (supabase
        .from("marketing_scheduled_posts" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "scheduled") as any);

      const { count: testsCount } = await (supabase
        .from("marketing_ab_tests" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "completed") as any);

      setStats({
        totalPosts: postsCount || 0,
        activeCampaigns: activeCampaignsCount || 0,
        scheduledPosts: scheduledCount || 0,
        completedTests: testsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Posts", value: stats.totalPosts.toString(), change: "+12.3%", trend: "up", icon: Users },
    { label: "Active Campaigns", value: stats.activeCampaigns.toString(), change: "+0.5%", trend: "up", icon: Heart },
    { label: "Scheduled Posts", value: stats.scheduledPosts.toString(), change: "+28.4%", trend: "up", icon: Eye },
    { label: "Completed Tests", value: stats.completedTests.toString(), change: "+3.2%", trend: "up", icon: Share2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing Dashboard</h1>
        <p className="text-muted-foreground">Overview of your marketing performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
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
        {/* Recent Campaigns */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Recent Campaigns
            </CardTitle>
            <CardDescription>Latest marketing campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No campaigns yet</p>
            ) : (
              <div className="space-y-4">
                {recentCampaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{campaign.name || "Unnamed Campaign"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(campaign.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {campaign.status || "draft"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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
            {upcomingPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No scheduled posts</p>
            ) : (
              <div className="space-y-4">
                {upcomingPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{post.platform}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{post.content || "No content"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {post.scheduled_at ? format(new Date(post.scheduled_at), "MMM d, h:mm a") : "Not scheduled"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketingDashboard;
