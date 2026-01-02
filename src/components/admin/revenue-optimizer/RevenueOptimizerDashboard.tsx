import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Play,
  RefreshCw,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Recommendation {
  id: string;
  rec_type: string;
  suggestion: {
    title: string;
    description: string;
    action: string;
  };
  expected_impact: number;
  confidence: number;
  risk_level: string;
}

interface Constraints {
  min_deposit: number;
  max_deposit: number;
  max_price_delta_percent: number;
}

export function RevenueOptimizerDashboard() {
  const [constraints, setConstraints] = useState<Constraints>({
    min_deposit: 50,
    max_deposit: 500,
    max_price_delta_percent: 20
  });
  const [activeTab, setActiveTab] = useState('recommendations');
  const queryClient = useQueryClient();

  // Fetch recommendations
  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['revenue-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_recommendations')
        .select('*')
        .is('applied_at', null)
        .is('dismissed_at', null)
        .order('expected_impact', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return (data || []).map(rec => ({
        ...rec,
        suggestion: rec.suggestion as unknown as Recommendation['suggestion']
      })) as Recommendation[];
    }
  });

  // Fetch demand forecast
  const { data: forecast } = useQuery({
    queryKey: ['demand-forecast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_forecasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch premium slots
  const { data: premiumSlots } = useQuery({
    queryKey: ['premium-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_slots')
        .select('*')
        .eq('applied', false)
        .order('demand_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Run scenario mutation
  const runScenario = useMutation({
    mutationFn: async (params: { scenario_name: string; input_params: Record<string, number> }) => {
      const { data, error } = await supabase.functions.invoke('revenue-intelligence', {
        body: {
          action: 'run_scenario',
          workspace_id: 'default',
          params: {
            ...params,
            scenario_type: 'what_if'
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Scenario analysis complete');
      queryClient.invalidateQueries({ queryKey: ['optimization-scenarios'] });
    }
  });

  // Apply recommendation
  const applyRecommendation = useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from('revenue_recommendations')
        .update({ applied_at: new Date().toISOString() })
        .eq('id', recId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recommendation applied');
      queryClient.invalidateQueries({ queryKey: ['revenue-recommendations'] });
    }
  });

  // Dismiss recommendation
  const dismissRecommendation = useMutation({
    mutationFn: async (recId: string) => {
      const { error } = await supabase
        .from('revenue_recommendations')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', recId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.info('Recommendation dismissed');
      queryClient.invalidateQueries({ queryKey: ['revenue-recommendations'] });
    }
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'high': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Function to seed initial recommendations
  const seedRecommendations = async () => {
    const demoRecommendations = [
      {
        rec_type: 'pricing',
        record_type: 'booking',
        suggestion: { title: 'Optimizar Depósitos Premium', description: 'Aumentar depósitos en slots de alta demanda los sábados', action: 'Configurar +15% en sábados' },
        expected_impact: 12.5,
        confidence: 0.85,
        risk_level: 'low'
      },
      {
        rec_type: 'conversion',
        record_type: 'lead',
        suggestion: { title: 'Follow-up Automático 48h', description: 'Leads sin respuesta en 48h tienen 60% menos conversión', action: 'Activar secuencia automática de seguimiento' },
        expected_impact: 8.0,
        confidence: 0.78,
        risk_level: 'low'
      },
      {
        rec_type: 'pricing',
        record_type: 'service',
        suggestion: { title: 'Premium por Complejidad', description: 'Diseños de alta complejidad subvalorados en 20%', action: 'Ajustar pricing por nivel de detalle' },
        expected_impact: 15.0,
        confidence: 0.72,
        risk_level: 'medium'
      },
      {
        rec_type: 'scheduling',
        record_type: 'slot',
        suggestion: { title: 'Optimizar Slots Muertos', description: 'Martes 2-4pm tiene 85% de vacío histórico', action: 'Ofrecer descuento del 10% para llenar slots' },
        expected_impact: 6.0,
        confidence: 0.68,
        risk_level: 'low'
      }
    ];

    const { error } = await supabase.from('revenue_recommendations').insert(demoRecommendations);
    if (error) {
      toast.error('Error al crear recomendaciones');
    } else {
      toast.success('Recomendaciones demo creadas');
      queryClient.invalidateQueries({ queryKey: ['revenue-recommendations'] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Description */}
      <Card className="bg-gradient-to-r from-green-500/5 via-transparent to-transparent border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground">Revenue Optimizer</h2>
                  <Badge variant="outline" className="bg-green-500/5 text-green-600">AI-Powered</Badge>
                </div>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  Optimiza tus precios y depósitos usando AI. Analiza demanda, detecta slots premium,
                  y genera recomendaciones accionables para maximizar tus ingresos.
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Pricing dinámico
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Slots premium
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    What-if analysis
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['revenue-recommendations'] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Conversion</p>
                <p className="text-2xl font-bold">34.2%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-green-500 mt-2">+2.3% vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Deposit</p>
                <p className="text-2xl font-bold">$127</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Within policy range</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Premium Slots</p>
                <p className="text-2xl font-bold">{premiumSlots?.length || 0}</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Identified this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opportunity</p>
                <p className="text-2xl font-bold">+$2.4k</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Potential this month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Today's Recommendations
          </TabsTrigger>
          <TabsTrigger value="constraints" className="gap-2">
            <Target className="h-4 w-4" />
            Constraints
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-2">
            <Play className="h-4 w-4" />
            What-If
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-6">
          <div className="space-y-4">
            {loadingRecs ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading recommendations...
                </CardContent>
              </Card>
            ) : recommendations && recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{rec.rec_type}</Badge>
                            <Badge className={getRiskColor(rec.risk_level)}>
                              {rec.risk_level} risk
                            </Badge>
                          </div>
                          <h4 className="font-semibold">{rec.suggestion?.title || 'Optimization Suggestion'}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rec.suggestion?.description || 'Apply this recommendation to improve revenue.'}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="text-green-500">
                              +{rec.expected_impact?.toFixed(1) || '0'}% impact
                            </span>
                            <span className="text-muted-foreground">
                              {(rec.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dismissRecommendation.mutate(rec.id)}
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyRecommendation.mutate(rec.id)}
                          >
                            Apply
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h4 className="font-semibold">No hay recomendaciones aún</h4>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    El Revenue Optimizer analiza tus datos de bookings y genera recomendaciones 
                    para optimizar precios, depósitos y scheduling.
                  </p>
                  <div className="flex gap-3 justify-center mt-4">
                    <Button variant="outline" onClick={seedRecommendations}>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Crear Demo
                    </Button>
                    <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['revenue-recommendations'] })}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Analizar Datos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="constraints" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Revenue Guardrails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Minimum Deposit</label>
                  <span className="text-sm font-mono">${constraints.min_deposit}</span>
                </div>
                <Slider
                  value={[constraints.min_deposit]}
                  onValueChange={([value]) => setConstraints(prev => ({ ...prev, min_deposit: value }))}
                  min={25}
                  max={200}
                  step={25}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Maximum Deposit</label>
                  <span className="text-sm font-mono">${constraints.max_deposit}</span>
                </div>
                <Slider
                  value={[constraints.max_deposit]}
                  onValueChange={([value]) => setConstraints(prev => ({ ...prev, max_deposit: value }))}
                  min={100}
                  max={1000}
                  step={50}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Max Price Variance</label>
                  <span className="text-sm font-mono">{constraints.max_price_delta_percent}%</span>
                </div>
                <Slider
                  value={[constraints.max_price_delta_percent]}
                  onValueChange={([value]) => setConstraints(prev => ({ ...prev, max_price_delta_percent: value }))}
                  min={5}
                  max={50}
                  step={5}
                />
              </div>

              <Button className="w-full">
                Save Constraints
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>What-If Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Quick Scenarios</h4>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => runScenario.mutate({
                      scenario_name: 'Increase deposits 20%',
                      input_params: { deposit_change: 20 }
                    })}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Increase deposits by 20%
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => runScenario.mutate({
                      scenario_name: 'Decrease prices 10%',
                      input_params: { price_change: -10 }
                    })}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Decrease prices by 10%
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => runScenario.mutate({
                      scenario_name: 'Premium slot pricing',
                      input_params: { premium_multiplier: 1.3 }
                    })}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Add 30% premium slot pricing
                  </Button>
                </div>

                <div className="bg-muted/50 rounded-lg p-6">
                  <h4 className="font-medium mb-4">Results Preview</h4>
                  {runScenario.isPending ? (
                    <p className="text-sm text-muted-foreground">Running analysis...</p>
                  ) : runScenario.data ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Conversion Delta</span>
                        <span className="text-sm font-mono">
                          {runScenario.data.scenario?.expected_conversion_delta > 0 ? '+' : ''}
                          {runScenario.data.scenario?.expected_conversion_delta?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Revenue Delta</span>
                        <span className="text-sm font-mono text-green-500">
                          {runScenario.data.scenario?.expected_revenue_delta > 0 ? '+' : ''}
                          {runScenario.data.scenario?.expected_revenue_delta?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a scenario to see projected impact
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Demand Heatmap Preview */}
      {forecast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Demand Forecast (Next 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(forecast.forecast_json as Record<string, { predicted_bookings: number }>).slice(0, 14).map(([date, data]) => {
                const intensity = Math.min(data.predicted_bookings / 3, 1);
                return (
                  <div
                    key={date}
                    className="aspect-square rounded-md flex flex-col items-center justify-center text-xs"
                    style={{
                      backgroundColor: `rgba(var(--primary), ${0.1 + intensity * 0.4})`,
                    }}
                  >
                    <span className="font-mono">{new Date(date).getDate()}</span>
                    <span className="text-muted-foreground">{data.predicted_bookings.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}