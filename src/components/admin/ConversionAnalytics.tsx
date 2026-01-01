import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Clock, 
  Zap,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

interface Insight {
  type: 'opportunity' | 'warning' | 'success';
  title: string;
  description: string;
  metric: string;
  action: string;
}

const ConversionAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<{
    totalSessions: number;
    conversions: number;
    conversionRate: number;
    avgTimeToConvert: string;
    topConvertingStyle: string;
  } | null>(null);

  const loadFunnelData = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.functions.invoke('conversion-engine', {
        body: {
          action: 'analyze_funnel',
          workspaceId: 'demo',
          startDate,
          endDate,
        },
      });

      if (error) throw error;
      setFunnel(data.funnel);
    } catch (err) {
      console.error('Error loading funnel:', err);
      toast.error('Failed to load funnel data');
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('conversion-engine', {
        body: {
          action: 'get_insights',
          workspaceId: 'demo',
          period: '7d',
        },
      });

      if (error) throw error;
      setInsights(data.insights);
      setSummary(data.summary);
    } catch (err) {
      console.error('Error loading insights:', err);
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunnelData();
    loadInsights();
  }, []);

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const formatStageName = (stage: string) => {
    return stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Conversion Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Track and optimize your booking conversion funnel
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { loadFunnelData(); loadInsights(); }}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{summary.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Sessions (7d)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.conversions}</p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(summary.conversionRate * 100)}%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.avgTimeToConvert}</p>
                  <p className="text-xs text-muted-foreground">Avg Time to Convert</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.topConvertingStyle}</p>
                  <p className="text-xs text-muted-foreground">Top Style</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="funnel" className="w-full">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">7-Day Conversion Funnel</CardTitle>
              <CardDescription>
                Track user progression through booking stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnel.length > 0 ? (
                <div className="space-y-4">
                  {funnel.map((stage, idx) => (
                    <div key={stage.stage} className="relative">
                      <div className="flex items-center gap-4">
                        <div className="w-36 text-sm font-medium">
                          {formatStageName(stage.stage)}
                        </div>
                        
                        <div className="flex-1 relative">
                          <div className="h-10 bg-muted rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{
                                width: `${idx === 0 ? 100 : stage.conversionRate * 100}%`,
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {stage.count.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="w-24 text-right">
                          {idx > 0 && (
                            <div className="flex items-center justify-end gap-1">
                              {stage.dropoffRate > 0.3 ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              )}
                              <span className={`text-sm ${
                                stage.dropoffRate > 0.3 ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {Math.round(stage.conversionRate * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {idx < funnel.length - 1 && (
                        <div className="flex items-center ml-36 pl-4 py-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          {stage.dropoffRate > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {Math.round(stage.dropoffRate * 100)}% drop-off
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No funnel data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
              <Card key={idx} className={`border-l-4 ${
                insight.type === 'opportunity' ? 'border-l-yellow-500' :
                insight.type === 'warning' ? 'border-l-orange-500' :
                'border-l-green-500'
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <CardTitle className="text-sm">{insight.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={
                      insight.metric.startsWith('+') ? 'default' : 'destructive'
                    }>
                      {insight.metric}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-primary">
                      Recommended Action:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insight.action}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversionAnalytics;
