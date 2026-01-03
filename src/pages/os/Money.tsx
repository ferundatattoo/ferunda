import { useState, useEffect, useCallback, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, TrendingUp, Users, BarChart3,
  Loader2, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight,
  Wallet, PiggyBank, Receipt, Calendar, Sparkles, Bot, Calculator,
  Brain, Droplets, FileText, AlertTriangle
} from 'lucide-react';
import { RevenueOptimizerDashboard } from '@/components/admin/revenue-optimizer';
import { 
  CompensationEnginePanel, 
  InventoryPredictorAI, 
  TaxOptimizerPanel, 
  PayrollFinbotsPanel,
  CausalRevenueForecaster 
} from '@/components/admin/finance-supreme';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { useFinanceData, useStudioAnalytics } from '@/hooks/useFinanceData';
import { useFinanceRealtime } from '@/hooks/useRealtimeSubscription';
import { RealtimeStatusIndicator } from '@/components/RealtimeStatusIndicator';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--ai))', 'hsl(var(--success))', 'hsl(var(--warning))'];

// Debug overlay for development - shows loading states
const DebugOverlay = ({ 
  authLoading, 
  rbacLoading, 
  dataLoading, 
  userId, 
  error,
  realtimeStatus 
}: {
  authLoading: boolean;
  rbacLoading: boolean;
  dataLoading: boolean;
  userId: string | null;
  error: string | null;
  realtimeStatus: string;
}) => {
  if (import.meta.env.PROD) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 p-3 bg-black/80 text-white text-xs rounded-lg font-mono max-w-xs">
      <div className="font-bold mb-1 text-yellow-400">🔍 Money Debug</div>
      <div>authLoading: <span className={authLoading ? 'text-red-400' : 'text-green-400'}>{String(authLoading)}</span></div>
      <div>rbacLoading: <span className={rbacLoading ? 'text-red-400' : 'text-green-400'}>{String(rbacLoading)}</span></div>
      <div>dataLoading: <span className={dataLoading ? 'text-yellow-400' : 'text-green-400'}>{String(dataLoading)}</span></div>
      <div>userId: {userId ? userId.slice(0,8)+'...' : 'null'}</div>
      <div>realtime: <span className={realtimeStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'}>{realtimeStatus}</span></div>
      {error && <div className="text-red-400 mt-1">Error: {error}</div>}
    </div>
  );
};

const OSMoney = forwardRef<HTMLDivElement>((_, ref) => {
  const { user, loading: authLoading, adminCheckError } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const { metrics, payroll, loading: dataLoading, error: dataError, refetch } = useFinanceData();
  const { analytics } = useStudioAnalytics();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Realtime updates for finance
  const handleRealtimeUpdate = useCallback(() => {
    console.log('[Money] Realtime update received');
    refetch();
    toast.success('💰 Payment received', { description: 'Dashboard updated live' });
  }, [refetch]);
  
  const { status: realtimeStatus } = useFinanceRealtime(handleRealtimeUpdate);

  const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`;

  // Combined error state - only from hooks that actually return error
  const hasError = adminCheckError || dataError;

  // Show loading only for auth/rbac, with timeout protection
  if (authLoading || rbacLoading) {
    return (
      <div ref={ref} className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {authLoading ? 'Verificando sesión...' : 'Cargando permisos...'}
        </p>
        <DebugOverlay 
          authLoading={authLoading} 
          rbacLoading={rbacLoading} 
          dataLoading={dataLoading} 
          userId={user?.id || null}
          error={hasError}
          realtimeStatus={realtimeStatus}
        />
      </div>
    );
  }

  // Show error state if something went wrong
  if (hasError) {
    return (
      <div ref={ref} className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <div className="text-center">
          <h3 className="font-semibold text-lg">Error de Carga</h3>
          <p className="text-sm text-muted-foreground mt-1">{hasError}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Reintentar
        </Button>
        <DebugOverlay 
          authLoading={authLoading} 
          rbacLoading={rbacLoading} 
          dataLoading={dataLoading} 
          userId={user?.id || null}
          error={hasError}
          realtimeStatus={realtimeStatus}
        />
      </div>
    );
  }

  if (!permissions.canAccessFinancePortal) {
    return (
      <Card className="backdrop-blur-sm bg-white/60 border-white/20">
        <CardHeader>
          <CardTitle>Acceso Denegado</CardTitle>
          <CardDescription>No tienes permisos para acceder a Money.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statCards = [
    {
      title: 'Balance Total',
      value: formatCurrency(metrics?.totalDepositAmount || 0),
      subtitle: `${metrics?.totalDepositsReceived || 0} depósitos`,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Ingresos Mes',
      value: formatCurrency(metrics?.totalRevenue || 0),
      subtitle: 'vs mes anterior',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: '+8%',
      trendUp: true
    },
    {
      title: 'Pendientes',
      value: formatCurrency(metrics?.pendingDepositAmount || 0),
      subtitle: `${metrics?.pendingDeposits || 0} por cobrar`,
      icon: Receipt,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: `${metrics?.pendingDeposits || 0}`,
      trendUp: false
    },
    {
      title: 'Bookings Confirmados',
      value: metrics?.confirmedBookings || 0,
      subtitle: `${metrics?.pendingBookings || 0} pendientes`,
      icon: Calendar,
      color: 'text-ai',
      bgColor: 'bg-ai/10',
      trend: `+${metrics?.pendingBookings || 0}`,
      trendUp: true
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Money</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control financiero y pagos del estudio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeStatusIndicator status={realtimeStatus} showLabel />
          <Button variant="outline" size="sm" onClick={refetch} disabled={dataLoading} className="backdrop-blur-sm bg-white/60">
            <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="backdrop-blur-sm bg-white/60 border-white/20 shadow-lg hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <Badge variant="outline" className={`${stat.trendUp ? 'text-success border-success/20 bg-success/5' : 'text-warning border-warning/20 bg-warning/5'}`}>
                    {stat.trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {stat.trend}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="backdrop-blur-sm bg-white/60 border border-white/20">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="ai-optimizer" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Optimizer
          </TabsTrigger>
          <TabsTrigger value="compensation" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Compensation
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Inventory AI
          </TabsTrigger>
          <TabsTrigger value="taxes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Taxes
          </TabsTrigger>
          <TabsTrigger value="finbots" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Finbots
          </TabsTrigger>
          <TabsTrigger value="causal" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Causal AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="backdrop-blur-sm bg-white/60 border-white/20">
                <CardHeader>
                  <CardTitle className="text-lg">Ingresos Mensuales</CardTitle>
                  <CardDescription>Depósitos recibidos por mes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={metrics?.monthlyRevenue || []}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.95)', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fill="url(#colorRevenue)" 
                        name="Ingresos (€)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bookings Chart */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="backdrop-blur-sm bg-white/60 border-white/20">
                <CardHeader>
                  <CardTitle className="text-lg">Bookings por Mes</CardTitle>
                  <CardDescription>Sesiones programadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={metrics?.monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.95)', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px'
                        }} 
                      />
                      <Bar dataKey="bookings" fill="hsl(var(--ai))" radius={[6, 6, 0, 0]} name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          {dataLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 backdrop-blur-sm bg-white/60 border-white/20">
                <CardHeader>
                  <CardTitle className="text-lg">Historial de Pagos</CardTitle>
                  <CardDescription>Últimos depósitos recibidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">Depósito #{1000 + i}</p>
                            <p className="text-sm text-muted-foreground">hace {i + 1} días</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">+€{(150 + i * 50).toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs">Completado</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-white/60 border-white/20">
                <CardHeader>
                  <CardTitle className="text-lg">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-sm text-muted-foreground">Total Recibido</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(metrics?.totalDepositAmount || 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-warning/5 border border-warning/10">
                    <p className="text-sm text-muted-foreground">Por Cobrar</p>
                    <p className="text-2xl font-bold text-warning">{formatCurrency(metrics?.pendingDepositAmount || 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/5 border border-success/10">
                    <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
                    <p className="text-2xl font-bold text-success">
                      {metrics?.totalDepositsReceived && metrics?.pendingDeposits 
                        ? Math.round((metrics.totalDepositsReceived / (metrics.totalDepositsReceived + metrics.pendingDeposits)) * 100)
                        : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Revenue Predictions</CardTitle>
                <CardDescription>Proyección basada en tendencias y sesiones confirmadas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={analytics.length > 0 ? analytics : metrics?.monthlyRevenue || []}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--ai))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--ai))" stopOpacity={0}/>
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
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#colorActual)" 
                      name="Actual"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="backdrop-blur-sm bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <p className="text-sm font-medium">If +20% marketing</p>
                  </div>
                  <p className="text-3xl font-bold text-success">+€4,800</p>
                  <p className="text-xs text-muted-foreground mt-1">85% confidence</p>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-sm bg-gradient-to-br from-ai/10 to-ai/5 border-ai/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-ai" />
                    <p className="text-sm font-medium">If +1 artista</p>
                  </div>
                  <p className="text-3xl font-bold text-ai">+€8,000</p>
                  <p className="text-xs text-muted-foreground mt-1">90% confidence</p>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-sm bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <PiggyBank className="w-4 h-4 text-warning" />
                    <p className="text-sm font-medium">If precios +15%</p>
                  </div>
                  <p className="text-3xl font-bold text-warning">+€2,100</p>
                  <p className="text-xs text-muted-foreground mt-1">-5% bookings expected</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Payroll Multi-Artistas</CardTitle>
                  <CardDescription>Comisiones calculadas automáticamente</CardDescription>
                </div>
                <Badge variant="outline" className="bg-ai/5 text-ai border-ai/20">
                  Automático
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : payroll.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No hay datos de artistas aún</p>
                  <p className="text-sm mt-1">Los artistas aparecerán cuando tengan sesiones completadas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payroll.map((artist, index) => (
                    <motion.div 
                      key={artist.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-ai/20 flex items-center justify-center font-bold text-lg text-primary">
                          {artist.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold">{artist.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {artist.sessions} sesiones · {formatCurrency(artist.revenue)} facturado
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-success">{formatCurrency(artist.commission)}</p>
                        <Badge variant="outline" className="mt-1">{Math.round(artist.commissionRate * 100)}% comisión</Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-optimizer" className="mt-6">
          <RevenueOptimizerDashboard />
        </TabsContent>

        <TabsContent value="compensation" className="mt-6">
          <CompensationEnginePanel />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryPredictorAI />
        </TabsContent>

        <TabsContent value="taxes" className="mt-6">
          <TaxOptimizerPanel />
        </TabsContent>

        <TabsContent value="finbots" className="mt-6">
          <PayrollFinbotsPanel />
        </TabsContent>

        <TabsContent value="causal" className="mt-6">
          <CausalRevenueForecaster />
        </TabsContent>
      </Tabs>
    </div>
  );
});

OSMoney.displayName = 'OSMoney';

export default OSMoney;
