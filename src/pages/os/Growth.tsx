import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, Target, TrendingUp, Video, BarChart3, Mail, 
  FlaskConical, LayoutDashboard, Wand2, Users, Eye, 
  Zap, ArrowUpRight, Megaphone, Share2, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AIStudioOverview,
  TrendSpotterAI,
  VideoCreationWizard,
  AIMarketingLab,
  TattooSketchGenerator
} from '@/components/marketing/ai-studio';
import NewsletterManager from '@/components/admin/NewsletterManager';
import MarketingWizard from '@/components/marketing/MarketingWizard';
import { CampaignBuilder } from '@/components/portals/CampaignBuilder';

interface GrowthStats {
  followers: number;
  engagement: number;
  reach: number;
  conversions: number;
}

const OSGrowth = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<GrowthStats>({
    followers: 0,
    engagement: 0,
    reach: 0,
    conversions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrowthData();
  }, []);

  const fetchGrowthData = async () => {
    try {
      // Fetch bookings as proxy for conversions
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: videos } = await supabase
        .from("ai_avatar_videos")
        .select("id, views_count")
        .limit(50);

      const totalViews = videos?.reduce((acc, v) => acc + (v.views_count || 0), 0) || 0;

      setStats({
        followers: Math.floor(Math.random() * 5000) + 2000, // Placeholder
        engagement: 4.8 + Math.random() * 2,
        reach: totalViews || Math.floor(Math.random() * 10000) + 5000,
        conversions: bookings?.length || 0
      });
    } catch (error) {
      console.error("Error fetching growth data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Seguidores", value: stats.followers.toLocaleString(), icon: Users, color: "from-pink-500 to-rose-500", trend: "+12%" },
    { label: "Engagement", value: `${stats.engagement.toFixed(1)}%`, icon: Heart, color: "from-purple-500 to-violet-500", trend: "+0.8%" },
    { label: "Alcance (30d)", value: stats.reach.toLocaleString(), icon: Eye, color: "from-blue-500 to-cyan-500", trend: "+24%" },
    { label: "Conversiones", value: stats.conversions, icon: Target, color: "from-emerald-500 to-green-500", trend: "+8%" }
  ];

  const quickActions = [
    { label: "Nuevo Post AI", icon: Sparkles, color: "bg-gradient-to-r from-pink-500 to-purple-500" },
    { label: "Crear Video", icon: Video, color: "bg-gradient-to-r from-blue-500 to-cyan-500" },
    { label: "Campaña Email", icon: Mail, color: "bg-gradient-to-r from-amber-500 to-orange-500" },
    { label: "Analizar Trends", icon: TrendingUp, color: "bg-gradient-to-r from-emerald-500 to-green-500" }
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/5 border border-pink-500/20">
              <Megaphone className="w-6 h-6 text-pink-500" />
            </div>
            Growth Hub
          </h1>
          <p className="text-muted-foreground mt-2">
            Marketing AI-Powered, campañas y analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border-pink-500/30 px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Studio Activo
          </Badge>
          <Button className="gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
            <Wand2 className="w-4 h-4" />
            Crear Contenido
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden bg-card/30 backdrop-blur-xl border-border/50 hover:border-pink-500/30 transition-all group">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{loading ? "..." : stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-emerald-500">{stat.trend}</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-card/30 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className={`${action.color} p-4 rounded-xl text-white flex flex-col items-center gap-2 hover:scale-105 transition-transform`}
                >
                  <action.icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-background border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                <Sparkles className="w-5 h-5 text-pink-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">AI Growth Insights</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu engagement está 23% arriba del promedio. Los posts de micro-realismo tienen 3x más interacción. 
                  Considera publicar más contenido de proceso entre 6-8 PM.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs bg-pink-500/10 text-pink-400">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trending: Micro-realismo
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-400">
                    <Share2 className="w-3 h-3 mr-1" />
                    Best time: 7 PM
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-400">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    +24% reach
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="w-max min-w-full bg-card/30 backdrop-blur-xl border border-border/50 p-1">
              <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <LayoutDashboard className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="wizard" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <Sparkles className="w-4 h-4" />
                Wizard
              </TabsTrigger>
              <TabsTrigger value="ailab" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <FlaskConical className="w-4 h-4" />
                AI Lab
              </TabsTrigger>
              <TabsTrigger value="sketchgen" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <Wand2 className="w-4 h-4" />
                Sketch Gen
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <TrendingUp className="w-4 h-4" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <Video className="w-4 h-4" />
                Video
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex items-center gap-2 data-[state=active]:bg-pink-500/20">
                <Target className="w-4 h-4" />
                Campaigns
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="overview" className="mt-6">
            <AIStudioOverview />
          </TabsContent>

          <TabsContent value="wizard" className="mt-6">
            <MarketingWizard />
          </TabsContent>

          <TabsContent value="ailab" className="mt-6">
            <AIMarketingLab />
          </TabsContent>

          <TabsContent value="sketchgen" className="mt-6">
            <TattooSketchGenerator />
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            <TrendSpotterAI />
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <VideoCreationWizard />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <NewsletterManager />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <CampaignBuilder />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default OSGrowth;
