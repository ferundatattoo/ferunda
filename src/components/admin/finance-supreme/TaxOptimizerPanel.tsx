import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, FileText, TrendingDown, DollarSign,
  Sparkles, Download, AlertCircle, CheckCircle,
  Calendar, PiggyBank, Receipt, Brain, Send
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

interface TaxSummary {
  grossIncome: number;
  deductions: number;
  taxableIncome: number;
  estimatedTax: number;
  quarterlyPayment: number;
  optimizedSavings: number;
}

interface Deduction {
  id: string;
  category: string;
  description: string;
  amount: number;
  status: 'verified' | 'pending' | 'suggested';
  aiConfidence: number;
}

const mockTaxSummary: TaxSummary = {
  grossIncome: 84500,
  deductions: 18750,
  taxableIncome: 65750,
  estimatedTax: 15780,
  quarterlyPayment: 3945,
  optimizedSavings: 2340,
};

const mockDeductions: Deduction[] = [
  { id: '1', category: 'Equipment', description: 'Tattoo machines & supplies', amount: 4200, status: 'verified', aiConfidence: 0.98 },
  { id: '2', category: 'Studio Rent', description: 'Monthly booth/studio rent', amount: 9600, status: 'verified', aiConfidence: 0.99 },
  { id: '3', category: 'Insurance', description: 'Business liability insurance', amount: 1800, status: 'verified', aiConfidence: 0.95 },
  { id: '4', category: 'Education', description: 'Workshops & training', amount: 1500, status: 'pending', aiConfidence: 0.87 },
  { id: '5', category: 'Vehicle', description: 'Mileage deduction (guest spots)', amount: 1650, status: 'suggested', aiConfidence: 0.72 },
];

const monthlyData = [
  { month: 'Ene', income: 6200, tax: 1488, deductions: 1200 },
  { month: 'Feb', income: 7100, tax: 1704, deductions: 1400 },
  { month: 'Mar', income: 8500, tax: 2040, deductions: 1800 },
  { month: 'Abr', income: 7800, tax: 1872, deductions: 1600 },
  { month: 'May', income: 9200, tax: 2208, deductions: 2100 },
  { month: 'Jun', income: 8100, tax: 1944, deductions: 1500 },
];

export function TaxOptimizerPanel() {
  const [summary] = useState<TaxSummary>(mockTaxSummary);
  const [deductions, setDeductions] = useState<Deduction[]>(mockDeductions);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleOptimize = async () => {
    setIsCalculating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success('Optimización fiscal completada. Ahorro potencial: €2,340');
    setIsCalculating(false);
  };

  const handleExport1099 = () => {
    toast.success('Generando formulario 1099-MISC...');
  };

  const handleQuarterlyEstimate = () => {
    toast.info(`Pago trimestral estimado: €${summary.quarterlyPayment.toLocaleString()}`);
  };

  const verifiedTotal = deductions.filter(d => d.status === 'verified').reduce((sum, d) => sum + d.amount, 0);
  const pendingTotal = deductions.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0);
  const suggestedTotal = deductions.filter(d => d.status === 'suggested').reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Tax Optimizer AI
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-cálculo impuestos con AI quantum-optimized para máximo ahorro
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport1099}>
            <FileText className="w-4 h-4 mr-2" />
            1099-MISC
          </Button>
          <Button onClick={handleOptimize} disabled={isCalculating}>
            <Sparkles className={`w-4 h-4 mr-2 ${isCalculating ? 'animate-pulse' : ''}`} />
            Optimizar
          </Button>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-success" />
              <Badge variant="outline" className="text-success">+12% YoY</Badge>
            </div>
            <p className="text-2xl font-bold">€{summary.grossIncome.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Ingreso Bruto</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              <Badge variant="outline" className="text-primary">Optimizado</Badge>
            </div>
            <p className="text-2xl font-bold">€{summary.deductions.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Deducciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Receipt className="w-5 h-5 text-warning" />
            </div>
            <p className="text-2xl font-bold">€{summary.estimatedTax.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Impuesto Est.</p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <PiggyBank className="w-5 h-5 text-success" />
              <Badge className="bg-success text-white">AI Savings</Badge>
            </div>
            <p className="text-2xl font-bold text-success">€{summary.optimizedSavings.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Ahorro AI</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deductions">
        <TabsList>
          <TabsTrigger value="deductions" className="gap-2">
            <Receipt className="w-4 h-4" />
            Deducciones
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2">
            <TrendingDown className="w-4 h-4" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="gap-2">
            <Calendar className="w-4 h-4" />
            Pagos Trimestrales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deductions" className="mt-6 space-y-4">
          {/* Deductions Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-success/5 border-success/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="font-medium">Verificadas</span>
                </div>
                <p className="text-xl font-bold">€{verifiedTotal.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-warning/5 border-warning/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span className="font-medium">Pendientes</span>
                </div>
                <p className="text-xl font-bold">€{pendingTotal.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-ai/5 border-ai/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-ai" />
                  <span className="font-medium">AI Sugeridas</span>
                </div>
                <p className="text-xl font-bold">€{suggestedTotal.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Deductions List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deducciones Detalladas</CardTitle>
              <CardDescription>
                AI analiza gastos y sugiere deducciones optimizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deductions.map((ded, index) => (
                  <motion.div
                    key={ded.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border ${
                      ded.status === 'verified' ? 'border-success/30 bg-success/5' :
                      ded.status === 'pending' ? 'border-warning/30 bg-warning/5' :
                      'border-ai/30 bg-ai/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ded.status === 'verified' ? 'bg-success/20' :
                          ded.status === 'pending' ? 'bg-warning/20' :
                          'bg-ai/20'
                        }`}>
                          {ded.status === 'verified' ? <CheckCircle className="w-5 h-5 text-success" /> :
                           ded.status === 'pending' ? <AlertCircle className="w-5 h-5 text-warning" /> :
                           <Sparkles className="w-5 h-5 text-ai" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{ded.category}</p>
                            <Badge variant="outline" className="text-xs">{ded.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{ded.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">€{ded.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Brain className="w-3 h-3" />
                          {(ded.aiConfidence * 100).toFixed(0)}% confianza
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proyección Fiscal 2024</CardTitle>
              <CardDescription>
                Forecast con Statsmodels open-source para predicción precisa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
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
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" fill="url(#colorIncome)" name="Ingresos" />
                  <Area type="monotone" dataKey="tax" stroke="hsl(var(--warning))" fill="url(#colorTax)" name="Impuestos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarterly" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pagos Trimestrales</CardTitle>
                <CardDescription>
                  Calendario de pagos estimados (1099-ES)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { q: 'Q1', date: 'Abr 15', amount: 3945, paid: true },
                  { q: 'Q2', date: 'Jun 15', amount: 3945, paid: true },
                  { q: 'Q3', date: 'Sep 15', amount: 3945, paid: false },
                  { q: 'Q4', date: 'Ene 15', amount: 3945, paid: false },
                ].map((q, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${
                    q.paid ? 'border-success/30 bg-success/5' : 'border-border/50 bg-muted/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={q.paid ? 'default' : 'outline'}>{q.q}</Badge>
                        <div>
                          <p className="font-medium">€{q.amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{q.date}</p>
                        </div>
                      </div>
                      {q.paid ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Button size="sm" variant="outline">
                          <Send className="w-4 h-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-ai/30 bg-ai/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-ai" />
                  E-Filing AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Integración con APIs de e-filing para envío automático de formularios fiscales.
                </p>
                <div className="space-y-2">
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="w-4 h-4" />
                    Generar 1099-MISC
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="w-4 h-4" />
                    Generar 1099-NEC
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <Download className="w-4 h-4" />
                    Exportar Schedule C
                  </Button>
                </div>
                <div className="p-3 rounded-lg bg-background/50 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  AI ha identificado €2,340 en deducciones adicionales aplicables a tu situación.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TaxOptimizerPanel;
