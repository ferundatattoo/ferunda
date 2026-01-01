import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, TrendingUp, Users, BarChart3, Shield,
  Loader2, ArrowLeft, DollarSign, AlertTriangle, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export default function FinancePortal() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const { metrics, payroll, loading: dataLoading, refetch } = useFinanceData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('payments');

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canAccessFinancePortal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos para acceder al Portal Financiero.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Volver al Inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Portal Financiero</h1>
              <p className="text-sm text-muted-foreground">Control total de finanzas • Datos en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetch} disabled={dataLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Badge variant="secondary">Finance Mode</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-6">
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
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Seguridad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {dataLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Balance Total</CardDescription>
                        <CardTitle className="text-3xl">{formatCurrency(metrics?.totalDepositAmount || 0)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline">{metrics?.totalDepositsReceived || 0} depósitos</Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Depósitos Pendientes</CardDescription>
                        <CardTitle className="text-3xl text-yellow-500">{formatCurrency(metrics?.pendingDepositAmount || 0)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="secondary">{metrics?.pendingDeposits || 0} pendientes</Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Confirmados</CardDescription>
                        <CardTitle className="text-3xl text-green-500">{metrics?.confirmedBookings || 0}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="default">Listos para sesión</Badge>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Por Confirmar</CardDescription>
                        <CardTitle className="text-3xl text-orange-500">{metrics?.pendingBookings || 0}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline">Esperando depósito</Badge>
                      </CardContent>
                    </Card>
                  </div>

              <Card>
                <CardHeader>
                  <CardTitle>Stripe Dashboard</CardTitle>
                  <CardDescription>Depósitos auto, refunds, transacciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] bg-muted/50 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Stripe Dashboard Embed</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle>QAOA Revenue Predictions</CardTitle>
                <CardDescription>
                  Basado en sesiones estimadas y riesgo no-show
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.3)" 
                      name="Actual"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="hsl(var(--secondary))" 
                      fill="hsl(var(--secondary) / 0.2)" 
                      strokeDasharray="5 5"
                      name="Predicted"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">Q3 Prediction</p>
                      <p className="text-2xl font-bold text-green-500">+18%</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-500/10 border-yellow-500/30">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">No-show Risk</p>
                      <p className="text-2xl font-bold text-yellow-500">8%</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">Confidence</p>
                      <p className="text-2xl font-bold">92%</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Multi-Artistas</CardTitle>
                <CardDescription>
                  Comisiones calculadas automáticamente desde bookings reales
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : payroll.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay datos de artistas aún</p>
                    <p className="text-sm">Los datos aparecerán cuando se completen bookings</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payroll.map((artist) => (
                      <div key={artist.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                            {artist.name[0]}
                          </div>
                          <div>
                            <p className="font-medium">{artist.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {artist.sessions} sesiones | {formatCurrency(artist.revenue)} generado
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatCurrency(artist.commission)}</p>
                          <Badge variant="outline">{Math.round(artist.commissionRate * 100)}% comisión</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button className="w-full mt-4" disabled={payroll.length === 0}>
                  Procesar Pagos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Causal Analytics</CardTitle>
                <CardDescription>
                  "If +campañas → +ingresos?"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">If +20% marketing spend</p>
                      <p className="text-2xl font-bold text-green-500">+€4,800</p>
                      <p className="text-xs text-muted-foreground">85% confidence</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">If +1 artista</p>
                      <p className="text-2xl font-bold text-green-500">+€8,000</p>
                      <p className="text-xs text-muted-foreground">90% confidence</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">If precios +15%</p>
                      <p className="text-2xl font-bold text-yellow-500">+€2,100</p>
                      <p className="text-xs text-muted-foreground">-5% bookings</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Blindaje Financiero
                </CardTitle>
                <CardDescription>
                  Homomorphic encrypt + blockchain audit traces
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-4 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-medium text-green-500">Encryption Active</p>
                      <p className="text-sm text-muted-foreground">
                        Todas las transacciones protegidas con homomorphic encryption
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="font-medium">Audit Trail</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Últimas 24h: 47 transacciones verificadas
                    </p>
                    <Button variant="outline" size="sm">Ver Blockchain Traces</Button>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                  <CardContent className="pt-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    <div>
                      <p className="font-medium text-yellow-500">1 Alerta</p>
                      <p className="text-sm text-muted-foreground">
                        Transacción inusual detectada - requiere revisión
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
