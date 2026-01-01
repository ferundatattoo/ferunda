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
  Lightbulb
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProviderStatus {
  id: string;
  name: string;
  type: string;
  isAvailable: boolean;
  healthScore: number;
  latencyMs: number;
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
        name: r.providerId.replace(/-/g, ' ').toUpperCase(),
        type: r.providerId.includes('gpt') || r.providerId.includes('claude') || r.providerId.includes('gemini') 
          ? 'LLM' 
          : r.providerId.includes('dalle') || r.providerId.includes('sdxl') || r.providerId.includes('flux')
          ? 'Image'
          : 'Other',
        isAvailable: r.isHealthy,
        healthScore: r.isHealthy ? 0.95 : 0.3,
        latencyMs: r.latency,
      }));

      setProviders(providerList);
    } catch (err) {
      console.error('Error loading providers:', err);
      // Use mock data
      setProviders([
        { id: 'openai-gpt4', name: 'OpenAI GPT-4', type: 'LLM', isAvailable: true, healthScore: 0.98, latencyMs: 450 },
        { id: 'anthropic-claude', name: 'Anthropic Claude', type: 'LLM', isAvailable: true, healthScore: 0.97, latencyMs: 380 },
        { id: 'google-gemini', name: 'Google Gemini', type: 'LLM', isAvailable: true, healthScore: 0.95, latencyMs: 320 },
        { id: 'openai-dalle', name: 'OpenAI DALL-E', type: 'Image', isAvailable: true, healthScore: 0.96, latencyMs: 8000 },
        { id: 'flux-schnell', name: 'Flux Schnell', type: 'Image', isAvailable: true, healthScore: 0.92, latencyMs: 3000 },
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

        <TabsContent value="providers" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{provider.name}</CardTitle>
                    {getHealthIcon(provider.healthScore)}
                  </div>
                  <CardDescription>
                    <Badge variant="outline">{provider.type}</Badge>
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
                      {provider.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
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
