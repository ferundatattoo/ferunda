import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, TrendingUp, Calendar, Users, Zap,
  Instagram, Play, Image, Lightbulb, Target,
  Clock, BarChart3, RefreshCw, Loader2, Check,
  ArrowUpRight, Eye, Heart, MessageCircle, Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';

interface ContentSuggestion {
  id: string;
  suggestion_type: string;
  title: string;
  description: string;
  content_data: Record<string, unknown>;
  confidence_score: number;
  status: string;
}

interface GrowthGoal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  start_value: number;
  target_date: string;
  status: string;
}

export function SocialGrowthDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { workspaceId } = useWorkspace(user?.id ?? null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [goals, setGoals] = useState<GrowthGoal[]>([]);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const loadData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      // Load suggestions for this workspace
      const { data: suggestionsData } = await supabase
        .from('content_suggestions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false })
        .limit(10);

      // Load goals for this workspace
      const { data: goalsData } = await supabase
        .from('growth_goals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

      setSuggestions((suggestionsData || []).map(s => ({
        ...s,
        content_data: s.content_data as unknown as Record<string, unknown>
      })));
      setGoals(goalsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateIdeas = async () => {
    if (!workspaceId) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive'
      });
      return;
    }
    
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-growth-engine', {
        body: { action: 'generate_content_ideas', workspace_id: workspaceId }
      });

      if (error) throw error;

      toast({
        title: 'Ideas generadas',
        description: `${data.suggestions?.length || 0} nuevas ideas de contenido`
      });

      loadData();
    } catch (error) {
      console.error('Error generating ideas:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron generar ideas',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleAutopilot = async (enabled: boolean) => {
    setAutopilotEnabled(enabled);
    if (!workspaceId) return;
    
    try {
      await supabase.functions.invoke('social-growth-engine', {
        body: { 
          action: 'configure_autopilot', 
          workspace_id: workspaceId,
          settings: { enabled, posting_frequency: 'daily' }
        }
      });
      
      toast({
        title: enabled ? 'Autopilot activado' : 'Autopilot desactivado',
        description: enabled ? 'La IA publicará contenido automáticamente' : 'Publicación manual habilitada'
      });
    } catch (error) {
      console.error('Error configuring autopilot:', error);
    }
  };

  const stats = [
    { label: 'Seguidores', value: '12.4K', change: '+8.2%', icon: Users, color: 'text-primary' },
    { label: 'Engagement', value: '4.8%', change: '+0.6%', icon: Heart, color: 'text-rose-500' },
    { label: 'Alcance Semanal', value: '45.2K', change: '+15%', icon: Eye, color: 'text-ai' },
    { label: 'Conversiones', value: '23', change: '+4', icon: Target, color: 'text-success' }
  ];

  const contentCalendar = [
    { day: 'Lun', posts: 2, scheduled: true },
    { day: 'Mar', posts: 1, scheduled: true },
    { day: 'Mié', posts: 2, scheduled: false },
    { day: 'Jue', posts: 1, scheduled: false },
    { day: 'Vie', posts: 2, scheduled: false },
    { day: 'Sáb', posts: 1, scheduled: false },
    { day: 'Dom', posts: 1, scheduled: false }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Social Growth Autopilot</h2>
          <p className="text-sm text-muted-foreground mt-1">IA que hace crecer tu audiencia mientras duermes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Autopilot</span>
            <Switch checked={autopilotEnabled} onCheckedChange={toggleAutopilot} />
          </div>
          <Button onClick={generateIdeas} disabled={generating} className="bg-gradient-to-r from-primary to-ai">
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generar Ideas
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="backdrop-blur-sm bg-white/60 border-white/20">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <Badge variant="outline" className="text-success border-success/20 bg-success/5">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold mt-3">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="backdrop-blur-sm bg-white/60 border border-white/20">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="ideas" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Ideas AI
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendencias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Content Performance */}
            <Card className="lg:col-span-2 backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Rendimiento de Contenido</CardTitle>
                <CardDescription>Últimos 7 días</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'Reel', title: 'Session timelapse', engagement: '8.2%', reach: '12.4K', likes: 892 },
                    { type: 'Carousel', title: 'Before/After coverup', engagement: '6.8%', reach: '8.7K', likes: 654 },
                    { type: 'Story', title: 'Flash designs reveal', engagement: '5.4%', reach: '6.2K', likes: 423 }
                  ].map((post, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        post.type === 'Reel' ? 'bg-rose-100' : post.type === 'Carousel' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {post.type === 'Reel' ? <Play className="w-5 h-5 text-rose-600" /> :
                         post.type === 'Carousel' ? <Image className="w-5 h-5 text-blue-600" /> :
                         <Clock className="w-5 h-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{post.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.reach}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-success/5 text-success border-success/20">
                        {post.engagement}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goals Progress */}
            <Card className="backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Metas Activas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { label: 'Seguidores', current: 12400, target: 15000, color: 'bg-primary' },
                  { label: 'Engagement Rate', current: 4.8, target: 6, color: 'bg-rose-500' },
                  { label: 'Bookings/mes', current: 23, target: 30, color: 'bg-success' }
                ].map((goal, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{goal.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ideas" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.length > 0 ? suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="backdrop-blur-sm bg-white/60 border-white/20 hover:shadow-lg transition-all h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline" className={
                        suggestion.suggestion_type === 'trend_alert' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-ai/10 text-ai border-ai/20'
                      }>
                        {suggestion.suggestion_type === 'post_idea' ? 'Idea' : 
                         suggestion.suggestion_type === 'trend_alert' ? 'Trending' : 'Sugerencia'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(suggestion.confidence_score * 100)}% match
                      </span>
                    </div>
                    <h4 className="font-semibold mb-2">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{suggestion.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Check className="w-3 h-3 mr-1" />
                        Usar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Calendar className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )) : (
              <Card className="col-span-full backdrop-blur-sm bg-white/60 border-white/20">
                <CardContent className="py-12 text-center">
                  <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-medium mb-2">No hay ideas pendientes</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Genera nuevas ideas de contenido con IA
                  </p>
                  <Button onClick={generateIdeas} disabled={generating}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar Ideas
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardHeader>
              <CardTitle className="text-lg">Calendario de Contenido</CardTitle>
              <CardDescription>Esta semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {contentCalendar.map((day, i) => (
                  <div 
                    key={i}
                    className={`p-4 rounded-xl border text-center ${
                      day.scheduled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-2">{day.day}</p>
                    <p className="text-2xl font-bold">{day.posts}</p>
                    <p className="text-xs text-muted-foreground mt-1">posts</p>
                    {day.scheduled && (
                      <Badge className="mt-2 bg-primary/10 text-primary border-0 text-xs">
                        Programado
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Calendario Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Tendencias en Auge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: '#microrealism', velocity: '+150%', relevance: 92 },
                  { name: 'Geometric florals', velocity: '+89%', relevance: 87 },
                  { name: 'Fine line portraits', velocity: '+67%', relevance: 85 }
                ].map((trend, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                    <div>
                      <p className="font-medium">{trend.name}</p>
                      <p className="text-xs text-muted-foreground">{trend.relevance}% relevante para ti</p>
                    </div>
                    <Badge className="bg-success/10 text-success border-0">
                      {trend.velocity}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-ai" />
                  Mejores Horarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Engagement más alto</span>
                    <Badge variant="outline">18:00 - 21:00</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mayor alcance</span>
                    <Badge variant="outline">10:00 - 12:00</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mejor día</span>
                    <Badge variant="outline">Martes</Badge>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-xl bg-ai/5 border border-ai/20">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-ai" />
                    Recomendación AI
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Publica Reels los martes a las 19:00 para maximizar reach
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
