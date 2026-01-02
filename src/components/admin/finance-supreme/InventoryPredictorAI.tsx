import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Droplets, TrendingUp, AlertTriangle, Package, 
  ShoppingCart, Sparkles, RefreshCw, CheckCircle,
  Clock, Zap, ArrowRight, Brain
} from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: 'ink' | 'needles' | 'supplies' | 'aftercare';
  currentStock: number;
  minStock: number;
  avgUsagePerSession: number;
  predictedDaysLeft: number;
  reorderRecommended: boolean;
  suggestedQuantity: number;
  pricePerUnit: number;
  supplier: string;
  causalFactors: string[];
}

const mockInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Dynamic Black',
    brand: 'Dynamic',
    category: 'ink',
    currentStock: 8,
    minStock: 5,
    avgUsagePerSession: 0.3,
    predictedDaysLeft: 18,
    reorderRecommended: true,
    suggestedQuantity: 12,
    pricePerUnit: 28,
    supplier: 'Eternal Ink Supply',
    causalFactors: ['High demand blackwork bookings', 'Guest artist incoming week 3']
  },
  {
    id: '2',
    name: 'Eternal White',
    brand: 'Eternal',
    category: 'ink',
    currentStock: 4,
    minStock: 3,
    avgUsagePerSession: 0.15,
    predictedDaysLeft: 25,
    reorderRecommended: false,
    suggestedQuantity: 6,
    pricePerUnit: 32,
    supplier: 'Eternal Ink Supply',
    causalFactors: ['Normal usage pattern']
  },
  {
    id: '3',
    name: 'Bugpin 5RL',
    brand: 'Cheyenne',
    category: 'needles',
    currentStock: 25,
    minStock: 50,
    avgUsagePerSession: 3,
    predictedDaysLeft: 7,
    reorderRecommended: true,
    suggestedQuantity: 100,
    pricePerUnit: 2.5,
    supplier: 'Pro Needle Co',
    causalFactors: ['Fine line bookings up 40%', 'Current low stock critical']
  },
  {
    id: '4',
    name: 'Hustle Butter',
    brand: 'Hustle',
    category: 'aftercare',
    currentStock: 15,
    minStock: 10,
    avgUsagePerSession: 0.5,
    predictedDaysLeft: 30,
    reorderRecommended: false,
    suggestedQuantity: 20,
    pricePerUnit: 18,
    supplier: 'Aftercare Direct',
    causalFactors: ['Seasonal demand stable']
  },
];

export function InventoryPredictorAI() {
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const criticalItems = inventory.filter(item => item.predictedDaysLeft < 14 && item.reorderRecommended);
  const totalReorderValue = criticalItems.reduce(
    (sum, item) => sum + item.suggestedQuantity * item.pricePerUnit, 0
  );

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success('Análisis causal completado');
    setIsAnalyzing(false);
  };

  const handleAutoReorder = () => {
    toast.success(`Auto-reorder iniciado para ${criticalItems.length} items (€${totalReorderValue.toFixed(0)})`);
  };

  const getCategoryIcon = (category: InventoryItem['category']) => {
    switch (category) {
      case 'ink': return <Droplets className="w-4 h-4" />;
      case 'needles': return <Zap className="w-4 h-4" />;
      case 'supplies': return <Package className="w-4 h-4" />;
      case 'aftercare': return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getUrgencyColor = (daysLeft: number) => {
    if (daysLeft < 7) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (daysLeft < 14) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-success/10 text-success border-success/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-ai" />
            Inventory Predictor AI
          </h2>
          <p className="text-sm text-muted-foreground">
            Causal AI: Bookings → Uso predicho → Auto-reorder inteligente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunAnalysis} disabled={isAnalyzing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Analizar
          </Button>
          <Button onClick={handleAutoReorder} disabled={criticalItems.length === 0}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Auto-Reorder (€{totalReorderValue.toFixed(0)})
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalItems.length}</p>
                <p className="text-sm text-muted-foreground">Críticos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inventory.filter(i => i.reorderRecommended).length}</p>
                <p className="text-sm text-muted-foreground">Reordenar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">+18%</p>
                <p className="text-sm text-muted-foreground">Demanda Ink</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">94%</p>
                <p className="text-sm text-muted-foreground">Precisión AI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Causal AI Insight */}
      <Card className="border-ai/30 bg-ai/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-ai/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-ai" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Causal AI Prediction</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Basado en <strong>23 bookings confirmados</strong> próximas 2 semanas + 
                tendencia histórica de estilos, el sistema detecta:
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium">Causa: Blackwork Trend ↑40%</p>
                  <p className="text-xs text-muted-foreground">
                    → Efecto: Dynamic Black agotamiento en 18 días
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium">Causa: Fine Line Bookings ↑25%</p>
                  <p className="text-xs text-muted-foreground">
                    → Efecto: Bugpin 5RL crítico en 7 días
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventario con Predicción</CardTitle>
          <CardDescription>
            Stock actual vs predicción de agotamiento basada en bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inventory.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${
                  item.reorderRecommended ? 'border-warning/30 bg-warning/5' : 'border-border/50 bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        <Badge variant="outline" className="text-xs">{item.brand}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Stock: {item.currentStock} • Min: {item.minStock} • 
                        Uso: {item.avgUsagePerSession}/sesión
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge className={getUrgencyColor(item.predictedDaysLeft)}>
                      <Clock className="w-3 h-3 mr-1" />
                      {item.predictedDaysLeft} días
                    </Badge>

                    {item.reorderRecommended && (
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Sugerido: +{item.suggestedQuantity} uds
                        </p>
                        <p className="text-xs text-muted-foreground">
                          €{(item.suggestedQuantity * item.pricePerUnit).toFixed(0)}
                        </p>
                      </div>
                    )}

                    {item.reorderRecommended && (
                      <Button size="sm" variant="outline">
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Ordenar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Causal Factors */}
                {item.causalFactors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-ai" />
                      <span>Factores causales:</span>
                      {item.causalFactors.map((factor, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supplier Upsell Suggestions */}
      <Card className="border-success/30 bg-success/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Supplier Upsell Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-background/50">
              <p className="font-medium mb-2">Eternal Ink Supply</p>
              <p className="text-sm text-muted-foreground mb-3">
                Orden actual: €336 • Si agregas €64 más, obtienes 15% descuento
              </p>
              <Button size="sm" variant="outline" className="gap-2">
                <ArrowRight className="w-4 h-4" />
                Ver productos sugeridos
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-background/50">
              <p className="font-medium mb-2">Pro Needle Co</p>
              <p className="text-sm text-muted-foreground mb-3">
                Bundle disponible: Bugpin 5RL + 3RL = 20% ahorro (€50)
              </p>
              <Button size="sm" variant="outline" className="gap-2">
                <ArrowRight className="w-4 h-4" />
                Aplicar bundle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InventoryPredictorAI;
