import { useState, useEffect } from "react";
import { 
  Video, 
  Users, 
  Mic2, 
  TrendingUp,
  Play,
  Clock,
  Eye,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface DashboardPanelProps {
  onNavigate: (tab: "dashboard" | "create" | "avatars" | "voices" | "settings") => void;
}

const DashboardPanel = ({ onNavigate }: DashboardPanelProps) => {
  const [stats, setStats] = useState({
    totalAvatars: 0,
    readyAvatars: 0,
    totalVoices: 0,
    totalVideos: 0,
    totalViews: 0
  });
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    // Fetch avatar stats
    const { data: avatars } = await supabase
      .from('ai_avatar_clones')
      .select('id, status, elevenlabs_voice_id');

    // Fetch video stats
    const { data: videos } = await supabase
      .from('ai_avatar_videos')
      .select('id, views_count, created_at, script_text, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (avatars) {
      setStats({
        totalAvatars: avatars.length,
        readyAvatars: avatars.filter(a => a.status === 'ready').length,
        totalVoices: avatars.filter(a => a.elevenlabs_voice_id).length,
        totalVideos: videos?.length || 0,
        totalViews: videos?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0
      });
    }

    if (videos) {
      setRecentVideos(videos);
    }

    setLoading(false);
  };

  const statCards = [
    {
      title: "Active Avatars",
      value: stats.readyAvatars,
      total: stats.totalAvatars,
      icon: <Users className="w-5 h-5" />,
      color: "text-needle-blue",
      bgColor: "bg-needle-blue/10",
      action: () => onNavigate("avatars")
    },
    {
      title: "Voice Clones",
      value: stats.totalVoices,
      icon: <Mic2 className="w-5 h-5" />,
      color: "text-gothic-gold",
      bgColor: "bg-gothic-gold/10",
      action: () => onNavigate("voices")
    },
    {
      title: "Videos Generated",
      value: stats.totalVideos,
      icon: <Video className="w-5 h-5" />,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      action: () => onNavigate("create")
    },
    {
      title: "Total Views",
      value: stats.totalViews,
      icon: <Eye className="w-5 h-5" />,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-gothic text-3xl text-foreground tracking-wide">
          Avatar Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          Create personalized AI video messages for your clients
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => onNavigate("create")}
          className="bg-gradient-to-r from-needle-blue to-needle-blue/70 rounded-xl p-6 text-left hover:opacity-90 transition-opacity"
        >
          <Video className="w-8 h-8 text-white mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Create New Video</h3>
          <p className="text-white/70 text-sm">
            Generate a personalized video message with your AI avatar
          </p>
        </button>

        <button
          onClick={() => onNavigate("avatars")}
          className="bg-gradient-to-r from-gothic-gold to-gothic-gold/70 rounded-xl p-6 text-left hover:opacity-90 transition-opacity"
        >
          <Users className="w-8 h-8 text-white mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Create New Avatar</h3>
          <p className="text-white/70 text-sm">
            Train a new AI avatar with your likeness and voice
          </p>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className="bg-iron-dark border-border/30 cursor-pointer hover:border-border/50 transition-colors"
            onClick={stat.action}
          >
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                {stat.total !== undefined && (
                  <span className="text-sm text-muted-foreground">/ {stat.total}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-iron-dark border-border/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Recent Videos</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("create")}>
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentVideos.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No videos generated yet</p>
              <Button
                variant="link"
                onClick={() => onNavigate("create")}
                className="text-needle-blue mt-2"
              >
                Create your first video
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-ink-black"
                >
                  <div className="w-12 h-12 rounded-lg bg-needle-blue/20 flex items-center justify-center">
                    <Play className="w-5 h-5 text-needle-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {video.script_text?.slice(0, 50)}...
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(video.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {video.views_count || 0} views
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    video.status === 'completed' 
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-needle-blue/20 text-needle-blue'
                  }`}>
                    {video.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPanel;
