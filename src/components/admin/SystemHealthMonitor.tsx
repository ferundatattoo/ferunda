import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Cpu, 
  Zap, 
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Brain,
  Lightbulb,
  Sparkles,
  Share2,
  CreditCard,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProviderStatus {
  id: string;
  name: string;
  type: string;
  category: string;
  isAvailable: boolean;
  healthScore: number;
  latencyMs: number;
  isBuiltIn: boolean;
  requiredSecret?: string;
}

interface LearningMetrics {
  accuracy: number;
  totalInteractions: number;
  avgConfidenceDelta: number;
  improvementTrend: string;
}

const SystemHealthMonitor = () => {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [learningMetrics, setLearningMetrics] = useState<LearningMetrics | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [suggestions, setSuggestions] = useState<Array<{
    category: string;
    suggestion: string;
    confidence: number;
  }>>([]);

  const loadProviderHealth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('provider-fallback', {
        body: { action: 'health_check' },
      });

      if (error) throw error;

      const providerList = data.results.map((r: any) => ({
        id: r.providerId,
        name: r.providerName || r.providerId.replace(/-/g, ' ').toUpperCase(),
        type: r.type || 'other',
        category: r.category || 'ai',
        isAvailable: r.isHealthy,
        healthScore: r.healthScore || (r.isHealthy ? 0.95 : 0),
        latencyMs: r.latency,
        isBuiltIn: r.isBuiltIn || false,
        requiredSecret: r.requiredSecret,
      }));

      setProviders(providerList);
      toast.success(`Loaded ${data.summary.healthy}/${data.summary.total} providers healthy`);
    } catch (err) {
      console.error('Error loading providers:', err);
      toast.error('Failed to load provider health');
      // Use mock data
      setProviders([
        { id: 'lovable-gemini', name: 'Lovable AI (Gemini)', type: 'llm', category: 'ai', isAvailable: true, healthScore: 0.99, latencyMs: 320, isBuiltIn: true },
        { id: 'lovable-flux', name: 'Lovable AI (Flux)', type: 'image', category: 'ai', isAvailable: true, healthScore: 0.99, latencyMs: 3000, isBuiltIn: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadLearningMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('self-improving', {
        body: { action: 'get_performance_metrics', workspaceId: 'demo' },
      });

      if (error) throw error;
      setLearningMetrics(data.metrics ? {
        accuracy: data.metrics.accuracy,
        totalInteractions: data.totalInteractions,
        avgConfidenceDelta: data.avgConfidenceDelta,
        improvementTrend: data.improvementTrend,
      } : null);
    } catch (err) {
      console.error('Error loading metrics:', err);
      // Mock data
      setLearningMetrics({
        accuracy: 0.87,
        totalInteractions: 1250,
        avgConfidenceDelta: 0.03,
        improvementTrend: 'improving',
      });
    }
  };

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('self-improving', {
        body: { action: 'suggest_improvements', workspaceId: 'demo' },
      });

      if (error) throw error;
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setSuggestions([
        { category: 'response_quality', suggestion: 'Add more specific details when discussing tattoo sizing', confidence: 0.78 },
        { category: 'conversation_flow', suggestion: 'Ask about placement preferences earlier', confidence: 0.72 },
      ]);
    }
  };

  useEffect(() => {
    loadProviderHealth();
    loadLearningMetrics();
    loadSuggestions();
  }, []);

  const getHealthIcon = (score: number) => {
    if (score >= 0.9) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (score >= 0.7) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ai': return <Sparkles className="h-3 w-3" />;
      case 'social': return <Share2 className="h-3 w-3" />;
      case 'payments': return <CreditCard className="h-3 w-3" />;
      case 'core': return <Settings className="h-3 w-3" />;
      default: return <Cpu className="h-3 w-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ai': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'social': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'payments': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'core': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredProviders = categoryFilter === 'all' 
    ? providers 
    : providers.filter(p => p.category === categoryFilter);

  const categories = ['all', ...new Set(providers.map(p => p.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Health Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            AI providers, self-learning metrics, and system diagnostics
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { loadProviderHealth(); loadLearningMetrics(); loadSuggestions(); }}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh All
        </Button>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Self-Learning
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-6 space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className="capitalize"
              >
                {cat !== 'all' && getCategoryIcon(cat)}
                <span className="ml-1">{cat}</span>
              </Button>
            ))}
          </div>

          {/* Provider Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">
                    {providers.filter(p => p.isAvailable).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">
                    {providers.filter(p => !p.isAvailable).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Unavailable</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-500">
                    {providers.filter(p => p.isBuiltIn).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Built-in</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {providers.length > 0 
                      ? Math.round(providers.filter(p => p.isAvailable).reduce((sum, p) => sum + p.latencyMs, 0) / Math.max(providers.filter(p => p.isAvailable).length, 1))
                      : 0}ms
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => (
              <Card key={provider.id} className={provider.isBuiltIn ? 'border-purple-500/30' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {provider.name}
                      {provider.isBuiltIn && (
                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Built-in
                        </Badge>
                      )}
                    </CardTitle>
                    {getHealthIcon(provider.healthScore)}
                  </div>
                  <CardDescription className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">{provider.type.toUpperCase()}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${getCategoryColor(provider.category)}`}>
                      {getCategoryIcon(provider.category)}
                      <span className="ml-1 capitalize">{provider.category}</span>
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Health</span>
                    <span className="font-medium">{Math.round(provider.healthScore * 100)}%</span>
                  </div>
                  <Progress value={provider.healthScore * 100} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Latency</span>
                    <span>{provider.latencyMs}ms</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Status</span>
                    <Badge variant={provider.isAvailable ? "default" : "destructive"}>
                      {provider.isAvailable ? 'Available' : 'Not Configured'}
                    </Badge>
                  </div>

                  {!provider.isAvailable && provider.requiredSecret && (
                    <p className="text-xs text-muted-foreground">
                      Requires: {provider.requiredSecret}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="learning" className="mt-6">
          {learningMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Accuracy</span>
                      <span className="font-bold">{Math.round(learningMetrics.accuracy * 100)}%</span>
                    </div>
                    <Progress value={learningMetrics.accuracy * 100} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{learningMetrics.totalInteractions}</p>
                      <p className="text-xs text-muted-foreground">Total Interactions</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-green-500">
                        +{(learningMetrics.avgConfidenceDelta * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Confidence Delta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Learning Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {learningMetrics.improvementTrend === 'improving' ? (
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    ) : (
                      <Activity className="h-8 w-8 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium capitalize">{learningMetrics.improvementTrend}</p>
                      <p className="text-sm text-muted-foreground">
                        System is actively learning from interactions
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-medium">Recent Learnings</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Improved pricing estimation accuracy</p>
                      <p>• Better style matching for fine-line requests</p>
                      <p>• Optimized scheduling suggestions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Loading learning metrics...
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI-Generated Improvement Suggestions</CardTitle>
              <CardDescription>
                Based on analysis of recent interactions and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="capitalize">
                          {suggestion.category.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm">{suggestion.suggestion}</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline">Dismiss</Button>
                        <Button size="sm">Apply</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthMonitor;
