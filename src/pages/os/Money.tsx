import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, TrendingUp, Users, BarChart3, Shield,
  Loader2, DollarSign, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { useFinanceData } from '@/hooks/useFinanceData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const mockRevenueData = [
  { month: 'Ene', revenue: 4200, predicted: 4000 },
  { month: 'Feb', revenue: 5100, predicted: 4800 },
  { month: 'Mar', revenue: 4800, predicted: 5200 },
  { month: 'Abr', revenue: 6200, predicted: 5800 },
  { month: 'May', revenue: 7100, predicted: 6500 },
  { month: 'Jun', revenue: 6800, predicted: 7200 },
];

const OSMoney = () => {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const { metrics, payroll, loading: dataLoading, refetch } = useFinanceData();
  const [activeTab, setActiveTab] = useState('payments');

  const formatCurrency = (amount: number) => `€${amount.toLocaleString()}`;

  if (authLoading || rbacLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canAccessFinancePortal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso Denegado</CardTitle>
          <CardDescription>No tienes permisos para acceder a Money.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Money</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control financiero y pagos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={dataLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/30 border border-border/50">
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
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          {dataLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardDescription>Balance Total</CardDescription>
                    <CardTitle className="text-3xl">{formatCurrency(metrics?.totalDepositAmount || 0)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{metrics?.totalDepositsReceived || 0} depósitos</Badge>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardDescription>Pendientes</CardDescription>
                    <CardTitle className="text-3xl text-warning">{formatCurrency(metrics?.pendingDepositAmount || 0)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">{metrics?.pendingDeposits || 0} pendientes</Badge>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardDescription>Confirmados</CardDescription>
                    <CardTitle className="text-3xl text-success">{metrics?.confirmedBookings || 0}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className="bg-success/10 text-success border-success/20">Listos</Badge>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardDescription>Por Confirmar</CardDescription>
                    <CardTitle className="text-3xl text-warning">{metrics?.pendingBookings || 0}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">Esperando depósito</Badge>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Predictions</CardTitle>
              <CardDescription>Proyección basada en sesiones y riesgo no-show</CardDescription>
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
                    fill="hsl(var(--primary) / 0.2)" 
                    name="Actual"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--ai))" 
                    fill="hsl(var(--ai) / 0.1)" 
                    strokeDasharray="5 5"
                    name="Predicted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Multi-Artistas</CardTitle>
              <CardDescription>Comisiones calculadas automáticamente</CardDescription>
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
                </div>
              ) : (
                <div className="space-y-3">
                  {payroll.map((artist) => (
                    <div key={artist.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-secondary/20">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                          {artist.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{artist.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {artist.sessions} sesiones | {formatCurrency(artist.revenue)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold">{formatCurrency(artist.commission)}</p>
                        <Badge variant="outline">{Math.round(artist.commissionRate * 100)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Causal Analytics</CardTitle>
              <CardDescription>Proyecciones de impacto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-success/5 border-success/20">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">If +20% marketing</p>
                    <p className="text-2xl font-bold text-success">+€4,800</p>
                    <p className="text-xs text-muted-foreground">85% confidence</p>
                  </CardContent>
                </Card>
                <Card className="bg-success/5 border-success/20">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">If +1 artista</p>
                    <p className="text-2xl font-bold text-success">+€8,000</p>
                    <p className="text-xs text-muted-foreground">90% confidence</p>
                  </CardContent>
                </Card>
                <Card className="bg-warning/5 border-warning/20">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">If precios +15%</p>
                    <p className="text-2xl font-bold text-warning">+€2,100</p>
                    <p className="text-xs text-muted-foreground">-5% bookings</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OSMoney;
