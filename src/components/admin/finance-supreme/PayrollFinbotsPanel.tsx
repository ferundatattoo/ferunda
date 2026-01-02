import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, Zap, DollarSign, Users, Play, Pause, 
  Settings2, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Sparkles, RefreshCw, Send, Brain,
  Activity, ArrowRight, Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface Finbot {
  id: string;
  name: string;
  description: string;
  type: 'payroll' | 'disbursement' | 'reconciliation' | 'anomaly';
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  nextRun: string;
  processedAmount: number;
  successRate: number;
  isAutonomous: boolean;
}

interface PayrollRun {
  id: string;
  artistName: string;
  period: string;
  grossAmount: number;
  studioFee: number;
  netPayout: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stripeTransferId?: string;
}

const mockFinbots: Finbot[] = [
  {
    id: '1',
    name: 'Payroll Calculator Bot',
    description: 'Calcula automáticamente splits de comisiones semanales',
    type: 'payroll',
    status: 'active',
    lastRun: 'hace 2h',
    nextRun: 'Lunes 00:00',
    processedAmount: 12450,
    successRate: 99.2,
    isAutonomous: true,
  },
  {
    id: '2',
    name: 'Stripe Disbursement Bot',
    description: 'Dispersa pagos automáticamente via Stripe Connect',
    type: 'disbursement',
    status: 'active',
    lastRun: 'hace 6h',
    nextRun: 'Viernes 18:00',
    processedAmount: 8200,
    successRate: 100,
    isAutonomous: true,
  },
  {
    id: '3',
    name: 'Anomaly Detection Bot',
    description: 'Detecta payouts irregulares o sospechosos',
    type: 'anomaly',
    status: 'active',
    lastRun: 'hace 1h',
    nextRun: 'Continuo',
    processedAmount: 0,
    successRate: 97.5,
    isAutonomous: true,
  },
  {
    id: '4',
    name: 'Reconciliation Bot',
    description: 'Reconcilia pagos Stripe con bookings completados',
    type: 'reconciliation',
    status: 'paused',
    lastRun: 'hace 3d',
    nextRun: 'Pausado',
    processedAmount: 45000,
    successRate: 98.8,
    isAutonomous: false,
  },
];

const mockPayrollRuns: PayrollRun[] = [
  { id: '1', artistName: 'Ferunda', period: 'Sem 48', grossAmount: 4200, studioFee: 1680, netPayout: 2520, status: 'completed', stripeTransferId: 'tr_xxx' },
  { id: '2', artistName: 'Luna Ink', period: 'Sem 48', grossAmount: 3100, studioFee: 0, netPayout: 2300, status: 'completed', stripeTransferId: 'tr_yyy' },
  { id: '3', artistName: 'Shadow Art', period: 'Sem 48', grossAmount: 2800, studioFee: 1120, netPayout: 1680, status: 'processing' },
  { id: '4', artistName: 'Ferunda', period: 'Sem 49', grossAmount: 3800, studioFee: 1520, netPayout: 2280, status: 'pending' },
];

export function PayrollFinbotsPanel() {
  const [finbots, setFinbots] = useState<Finbot[]>(mockFinbots);
  const [payrollRuns] = useState<PayrollRun[]>(mockPayrollRuns);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const activeFinbots = finbots.filter(f => f.status === 'active').length;
  const totalProcessed = finbots.reduce((sum, f) => sum + f.processedAmount, 0);
  const avgSuccessRate = finbots.reduce((sum, f) => sum + f.successRate, 0) / finbots.length;

  const handleToggleBot = (botId: string) => {
    setFinbots(prev => prev.map(bot => 
      bot.id === botId 
        ? { ...bot, status: bot.status === 'active' ? 'paused' : 'active' }
        : bot
    ));
    toast.success('Estado del bot actualizado');
  };

  const handleRunAllBots = async () => {
    setIsRunningAll(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    toast.success('Todos los bots ejecutados correctamente');
    setIsRunningAll(false);
  };

  const handleProcessPayroll = () => {
    toast.success('Procesando payroll semanal...');
  };

  const getBotIcon = (type: Finbot['type']) => {
    switch (type) {
      case 'payroll': return <DollarSign className="w-5 h-5" />;
      case 'disbursement': return <Send className="w-5 h-5" />;
      case 'anomaly': return <AlertTriangle className="w-5 h-5" />;
      case 'reconciliation': return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: Finbot['status']) => {
    switch (status) {
      case 'active': return 'bg-success text-white';
      case 'paused': return 'bg-warning/20 text-warning';
      case 'error': return 'bg-destructive/20 text-destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-ai" />
            Agentic Finbots
          </h2>
          <p className="text-sm text-muted-foreground">
            Robots autónomos para cálculo de renta y dispersión Stripe
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleProcessPayroll}>
            <DollarSign className="w-4 h-4 mr-2" />
            Procesar Payroll
          </Button>
          <Button onClick={handleRunAllBots} disabled={isRunningAll}>
            {isRunningAll ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Ejecutar Todos
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeFinbots}/{finbots.length}</p>
                <p className="text-sm text-muted-foreground">Bots Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalProcessed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Procesado Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ai/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-ai" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Tasa Éxito</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Anomalías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finbots Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {finbots.map((bot, index) => (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${bot.status === 'active' ? 'border-success/30' : 'border-border/50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      bot.status === 'active' ? 'bg-success/10' : 'bg-muted'
                    }`}>
                      {getBotIcon(bot.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{bot.name}</h3>
                        <Badge className={getStatusColor(bot.status)}>{bot.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{bot.description}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={bot.status === 'active'} 
                    onCheckedChange={() => handleToggleBot(bot.id)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Última ejecución</p>
                    <p className="text-sm font-medium">{bot.lastRun}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Próxima</p>
                    <p className="text-sm font-medium">{bot.nextRun}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tasa éxito</p>
                    <p className="text-sm font-medium text-success">{bot.successRate}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {bot.isAutonomous ? (
                      <>
                        <Sparkles className="w-3 h-3 text-ai" />
                        <span>Autónomo</span>
                      </>
                    ) : (
                      <>
                        <Settings2 className="w-3 h-3" />
                        <span>Manual</span>
                      </>
                    )}
                  </div>
                  <Button size="sm" variant="ghost">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payroll Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Cola de Payroll
          </CardTitle>
          <CardDescription>
            Splits calculados automáticamente listos para dispersión Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payrollRuns.map((run, index) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${
                  run.status === 'completed' ? 'border-success/30 bg-success/5' :
                  run.status === 'processing' ? 'border-ai/30 bg-ai/5' :
                  'border-border/50 bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      👤
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{run.artistName}</p>
                        <Badge variant="outline">{run.period}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Bruto: €{run.grossAmount} → Studio: €{run.studioFee} → Neto: €{run.netPayout}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={
                      run.status === 'completed' ? 'bg-success text-white' :
                      run.status === 'processing' ? 'bg-ai text-white' :
                      run.status === 'failed' ? 'bg-destructive text-white' :
                      'bg-muted'
                    }>
                      {run.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {run.status === 'processing' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                      {run.status}
                    </Badge>

                    {run.status === 'pending' && (
                      <Button size="sm">
                        <Send className="w-4 h-4 mr-1" />
                        Dispersar
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-warning" />
            Anomaly AI Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <p className="font-semibold text-success">Sistema Limpio</p>
              <p className="text-sm text-muted-foreground">
                No se detectaron payouts irregulares en las últimas 24 horas. 
                El bot de anomalías monitorea continuamente patrones sospechosos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PayrollFinbotsPanel;
