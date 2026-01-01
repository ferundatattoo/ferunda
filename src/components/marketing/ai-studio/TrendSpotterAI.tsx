import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, Sparkles, Brain, Zap, Eye, 
  RefreshCw, Instagram, Clock, Video,
  Flame, Globe, Search, AlertCircle, Play,
  Wand2, ArrowRight, Hash, Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Trend {
  id: string;
  platform: string | null;
  title: string | null;
  description: string | null;
  trend_type: string | null;
  viral_score: number | null;
  engagement_rate: number | null;
  sentiment_score?: number | null;
  tattoo_relevance: string | null;
  hashtags: string[] | null;
  best_posting_times: string[] | null;
  status: string | null;
  expires_estimate: string | null;
  detected_at: string | null;
}

interface ScanStats {
  totalTrends: number;
  hotTrends: number;
  avgEngagement: number;
  lastScan: string | null;
}

export function TrendSpotterAI() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ScanStats>({
    totalTrends: 0,
    hotTrends: 0,
    avgEngagement: 0,
    lastScan: null
  });

  // Fetch trends on mount
  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('social_trends')
        .select('*')
        .order('viral_score', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setTrends(data as Trend[]);
        calculateStats(data as Trend[]);
      } else {
        // Trigger initial scan if no data
        await scanForTrends(true);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
      setError('Error cargando tendencias');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (trendData: Trend[]) => {
    const hotCount = trendData.filter(t => t.status === 'hot' || (t.viral_score ?? 0) > 90).length;
    const validEngagements = trendData.filter(t => t.engagement_rate != null);
    const avgEng = validEngagements.length > 0 
      ? validEngagements.reduce((acc, t) => acc + (t.engagement_rate ?? 0), 0) / validEngagements.length 
      : 0;
    const lastDetected = trendData[0]?.detected_at || null;
    
    setStats({
      totalTrends: trendData.length,
      hotTrends: hotCount,
      avgEngagement: Math.round(avgEng * 10) / 10,
      lastScan: lastDetected
    });
  };

  const scanForTrends = async (forceRefresh = false) => {
    setIsScanning(true);
    setScanProgress(0);
    setError(null);

    // Progressive animation
    const progressInterval = setInterval(() => {
      setScanProgress(prev => prev >= 95 ? 95 : prev + Math.random() * 15);
    }, 200);

    try {
      const { data, error: scanError } = await supabase.functions.invoke('scan-social-trends', {
        body: { 
          platforms: ['instagram', 'tiktok'],
          niche: 'tattoo',
          action: 'scan',
          use_ai: true,
          force_refresh: forceRefresh
        }
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (scanError) throw scanError;

      if (data?.trends && data.trends.length > 0) {
        setTrends(data.trends);
        calculateStats(data.trends);
        
        if (data.cached) {
          toast.info(`Mostrando datos cacheados (${data.cacheAge || 'reciente'})`);
        } else {
          toast.success(`¡${data.newTrends || data.trends.length} trends ${data.aiPowered ? 'generados con AI' : 'detectados'}!`);
        }
      } else {
        toast.info('No se encontraron nuevas tendencias');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError('Error escaneando tendencias');
      toast.error('Error en el escaneo');
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const handleCreateContent = (trend: Trend) => {
    // Navigate to content wizard with trend pre-filled
    toast.success(`Iniciando creación para: ${trend.title}`);
    // Could integrate with ContentWizardAI here
  };

  const filteredTrends = trends.filter(trend => {
    const matchesSearch = (trend.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (trend.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || 
                           trend.platform === platformFilter || 
                           trend.platform === 'both';
    return matchesSearch && matchesPlatform;
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'tiktok': return <Video className="w-4 h-4" />;
      case 'both': return <Globe className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string | null, viralScore: number | null) => {
    const score = viralScore ?? 0;
    if (status === 'hot' || score > 90) {
      return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30"><Flame className="w-3 h-3 mr-1" />HOT</Badge>;
    }
    if (status === 'rising' || score > 80) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><TrendingUp className="w-3 h-3 mr-1" />Rising</Badge>;
    }
    return <Badge variant="secondary">Stable</Badge>;
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Desconocido';
    const date = new Date(dateStr);
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Hace minutos';
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  const getExpiresIn = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expirado';
    if (days === 1) return '1 día';
    return `${days} días`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Trend Spotter AI
              </CardTitle>
              <CardDescription>
                Detección de tendencias en tiempo real con AI
              </CardDescription>
            </div>
            <Button 
              onClick={() => scanForTrends(true)} 
              disabled={isScanning}
              className="gap-2"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Escaneando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Escanear Trends
                </>
              )}
            </Button>
          </div>
          
          {isScanning && (
            <div className="mt-4">
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Brain className="w-3 h-3 animate-pulse" />
                Analizando Instagram, TikTok con AI... {Math.round(scanProgress)}%
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Trends Activos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalTrends}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Hot Trends</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-500">{stats.hotTrends}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Avg Engagement</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgEngagement}%</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Último Scan</span>
            </div>
            <p className="text-sm font-medium mt-1">{stats.lastScan ? formatTimeAgo(stats.lastScan) : 'Nunca'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchTrends()} className="ml-auto">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar trends..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'instagram', 'tiktok'].map(platform => (
            <Button
              key={platform}
              variant={platformFilter === platform ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlatformFilter(platform)}
              className="gap-1"
            >
              {platform === 'all' ? <Globe className="w-3 h-3" /> : 
               platform === 'instagram' ? <Instagram className="w-3 h-3" /> : 
               <Video className="w-3 h-3" />}
              {platform === 'all' ? 'Todos' : platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Trends Grid */}
      {filteredTrends.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No hay trends disponibles</p>
            <p className="text-sm text-muted-foreground mb-4">
              Escanea para detectar nuevas tendencias
            </p>
            <Button onClick={() => scanForTrends(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Escanear Ahora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTrends.map((trend, index) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPlatformIcon(trend.platform)}
                        <Badge variant="outline">{trend.platform}</Badge>
                        {trend.trend_type && (
                          <Badge variant="secondary" className="text-xs">{trend.trend_type}</Badge>
                        )}
                        {getStatusBadge(trend.status, trend.viral_score)}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-primary">{trend.viral_score}</p>
                        <p className="text-xs text-muted-foreground">Viral Score</p>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2 leading-tight">{trend.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{trend.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="font-semibold">{trend.engagement_rate || 0}%</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Relevancia</p>
                        <p className="font-semibold capitalize">{trend.tattoo_relevance || 'medium'}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Expira</p>
                        <p className="font-semibold text-sm">{getExpiresIn(trend.expires_estimate) || '—'}</p>
                      </div>
                    </div>

                    {/* Hashtags */}
                    {trend.hashtags && trend.hashtags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Hash className="w-3 h-3 text-muted-foreground" />
                        {trend.hashtags.slice(0, 4).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Badge>
                        ))}
                        {trend.hashtags.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{trend.hashtags.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Best Times */}
                    {trend.best_posting_times && trend.best_posting_times.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Mejores horas:</span>
                        {trend.best_posting_times.slice(0, 3).map((time, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{time}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Action */}
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => handleCreateContent(trend)}
                    >
                      <Wand2 className="w-4 h-4" />
                      Crear Contenido
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
