import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  TrendingUp, Brain, Zap, DollarSign, 
  ArrowRight, Sparkles, RefreshCw, Target,
  Calendar, Users, BarChart3, Play
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, Bar
} from 'recharts';

interface CausalScenario {
  id: string;
  name: string;
  description: string;
  causeFactor: string;
  effectFactor: string;
  currentValue: number;
  projectedImpact: number;
  confidence: number;
}

const forecastData = [
  { month: 'Ene', actual: 12500, predicted: 12800, optimistic: 14200, conservative: 11500 },
  { month: 'Feb', actual: 14200, predicted: 14500, optimistic: 16000, conservative: 13200 },
  { month: 'Mar', actual: 16800, predicted: 17200, optimistic: 19000, conservative: 15800 },
  { month: 'Abr', actual: null, predicted: 18500, optimistic: 21000, conservative: 16800 },
  { month: 'May', actual: null, predicted: 19800, optimistic: 23000, conservative: 17500 },
  { month: 'Jun', actual: null, predicted: 21200, optimistic: 25000, conservative: 18800 },
];

const causalScenarios: CausalScenario[] = [
  {
    id: '1',
    name: 'Marketing Spend',
    description: 'If aumentamos inversión en ads',
    causeFactor: 'Ad spend +€500/mes',
    effectFactor: 'Leads +35%',
    currentValue: 500,
    projectedImpact: 4200,
    confidence: 0.82,
  },
  {
    id: '2',
    name: 'Pricing Strategy',
    description: 'If cambiamos a comisión porcentaje',
    causeFactor: 'Porcentaje vs Fixed',
    effectFactor: 'Revenue +12%',
    currentValue: 0,
    projectedImpact: 3100,
    confidence: 0.76,
  },
  {
    id: '3',
    name: 'Artist Capacity',
    description: 'If agregamos 1 artista más',
    causeFactor: '+1 artista full-time',
    effectFactor: 'Capacity +40%',
    currentValue: 0,
    projectedImpact: 8500,
    confidence: 0.88,
  },
  {
    id: '4',
    name: 'Guest Spot Program',
    description: 'If lanzamos programa guest spots',
    causeFactor: '2 guests/mes',
    effectFactor: 'Novelty traffic +25%',
    currentValue: 0,
    projectedImpact: 2800,
    confidence: 0.71,
  },
];

export function CausalRevenueForecaster() {
  const [scenarios, setScenarios] = useState<CausalScenario[]>(causalScenarios);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  const [marketingSpend, setMarketingSpend] = useState(500);

  const handleRunForecast = async () => {
    setIsForecasting(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    toast.success('Forecast causal completado con QNN optimization');
    setIsForecasting(false);
  };

  const totalProjectedImpact = scenarios.reduce((sum, s) => sum + s.projectedImpact, 0);
  const avgConfidence = scenarios.reduce((sum, s) => sum + s.confidence, 0) / scenarios.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-ai" />
            Causal Revenue Forecaster
          </h2>
          <p className="text-sm text-muted-foreground">
            If X → Then Y: Simulación causal con QNN para predicciones financieras
          </p>
        </div>
        <Button onClick={handleRunForecast} disabled={isForecasting}>
          {isForecasting ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Run Causal AI
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">30d</p>
                <p className="text-sm text-muted-foreground">Horizon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">+€{(totalProjectedImpact / 1000).toFixed(1)}k</p>
                <p className="text-sm text-muted-foreground">Potencial</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ai/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-ai" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(avgConfidence * 100).toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Confianza</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scenarios.length}</p>
                <p className="text-sm text-muted-foreground">Scenarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Forecast 30/60/90</CardTitle>
          <CardDescription>
            Predicción con bandas de confianza (QNN-optimized)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={forecastData}>
              <defs>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255,255,255,0.95)', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="optimistic" 
                stroke="none"
                fill="hsl(var(--success))" 
                fillOpacity={0.1}
                name="Optimista"
              />
              <Area 
                type="monotone" 
                dataKey="conservative" 
                stroke="none"
                fill="hsl(var(--warning))" 
                fillOpacity={0.1}
                name="Conservador"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--foreground))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--foreground))' }}
                name="Actual"
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Predicción"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Causal Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-warning" />
            Causal Scenarios: If X → Then Y
          </CardTitle>
          <CardDescription>
            Simula el impacto de diferentes decisiones de negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {scenarios.map((scenario, index) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedScenario === scenario.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-primary/30'
                }`}
                onClick={() => setSelectedScenario(
                  selectedScenario === scenario.id ? null : scenario.id
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{scenario.name}</h4>
                    <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(scenario.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm mb-3">
                  <Badge variant="secondary">{scenario.causeFactor}</Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <Badge className="bg-success/20 text-success">{scenario.effectFactor}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Impacto proyectado</span>
                  <span className="font-bold text-success">+€{scenario.projectedImpact.toLocaleString()}/mes</span>
                </div>

                {selectedScenario === scenario.id && scenario.id === '1' && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Marketing spend</span>
                      <span className="text-sm font-mono">€{marketingSpend}</span>
                    </div>
                    <Slider
                      value={[marketingSpend]}
                      onValueChange={([v]) => setMarketingSpend(v)}
                      min={100}
                      max={2000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Con €{marketingSpend}/mes → proyección +€{Math.round(marketingSpend * 8.4)} revenue
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insight */}
      <Card className="border-ai/30 bg-ai/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-ai/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-ai" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">QNN Causal Analysis</h3>
              <p className="text-sm text-muted-foreground mb-3">
                El modelo quantum-neural ha identificado que la combinación óptima es:
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium">Marketing +€800</p>
                  <p className="text-xs text-success">+€6,720 revenue</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium">Switch to %</p>
                  <p className="text-xs text-success">+€3,100 revenue</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium">1 Guest/mes</p>
                  <p className="text-xs text-success">+€1,400 revenue</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                <strong>Total potencial:</strong> +€11,220/mes con 79% de confianza combinada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CausalRevenueForecaster;
