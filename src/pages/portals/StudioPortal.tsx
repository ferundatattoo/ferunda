import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, Users, Settings, MessageSquare, TrendingUp, 
  Brain, Calendar, DollarSign, Loader2, ArrowLeft 
} from 'lucide-react';
import { SocialInbox } from '@/components/portals/SocialInbox';
import { RevenueAnalytics } from '@/components/portals/RevenueAnalytics';
import { CampaignBuilder } from '@/components/portals/CampaignBuilder';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const mockRevenueData = [
  { month: 'Ene', revenue: 12000, bookings: 45 },
  { month: 'Feb', revenue: 15000, bookings: 52 },
  { month: 'Mar', revenue: 18000, bookings: 61 },
  { month: 'Abr', revenue: 16500, bookings: 58 },
  { month: 'May', revenue: 21000, bookings: 72 },
  { month: 'Jun', revenue: 24000, bookings: 85 },
];

const mockArtistPerformance = [
  { name: 'Ferunda', bookings: 35, revenue: 12500 },
  { name: 'Artist 2', bookings: 28, revenue: 9800 },
  { name: 'Artist 3', bookings: 22, revenue: 7200 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

export default function StudioPortal() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canAccessStudioPortal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos para acceder al Portal Studio.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Volver al Inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Portal Studio</h1>
              <p className="text-sm text-muted-foreground">Gestión completa del estudio</p>
            </div>
          </div>
          <Badge variant="secondary">Studio Mode</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full max-w-3xl mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Equipo
            </TabsTrigger>
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Agent AI
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Ingresos Mes</CardDescription>
                    <CardTitle className="text-3xl">€24,000</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="default">+15% vs anterior</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Bookings Activos</CardDescription>
                    <CardTitle className="text-3xl">85</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">12 esta semana</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Agent Conversiones</CardDescription>
                    <CardTitle className="text-3xl">23</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">27% conversion rate</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Clientes Nuevos</CardDescription>
                    <CardTitle className="text-3xl">42</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge>+8% growth</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Ingresos mensuales del estudio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
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
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance por Artista</CardTitle>
                    <CardDescription>Distribución de bookings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={mockArtistPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Causal AI Explorer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Causal AI Explorer
                  </CardTitle>
                  <CardDescription>
                    Explora escenarios "What-if" para optimizar decisiones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">Si aumentas marketing +20%</p>
                        <p className="text-2xl font-bold text-green-500">+€4,800</p>
                        <p className="text-xs text-muted-foreground">Predicción: +20% bookings</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">Si reduces tiempo respuesta a 1h</p>
                        <p className="text-2xl font-bold text-green-500">+15%</p>
                        <p className="text-xs text-muted-foreground">Conversión estimada</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">Si añades 1 artista</p>
                        <p className="text-2xl font-bold text-green-500">+€8,000</p>
                        <p className="text-xs text-muted-foreground">Capacidad +33%</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Equipo</CardTitle>
                <CardDescription>Artistas, asistentes y payroll AI-optimized</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockArtistPerformance.map((artist, index) => (
                    <div key={artist.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {artist.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{artist.name}</p>
                          <p className="text-sm text-muted-foreground">{artist.bookings} bookings este mes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">€{artist.revenue.toLocaleString()}</p>
                        <Badge variant="outline">Comisión: 60%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inbox">
            <SocialInbox />
          </TabsContent>

          <TabsContent value="analytics">
            <RevenueAnalytics />
          </TabsContent>

          <TabsContent value="agent">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Configuración Agent AI
                </CardTitle>
                <CardDescription>
                  Ajusta reglas, velocidad y continual learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium mb-2">Match Threshold</p>
                      <input type="range" min="50" max="100" defaultValue="80" className="w-full" />
                      <p className="text-xs text-muted-foreground mt-1">80% - Solo acepta matches de alta calidad</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium mb-2">Auto-Respond DMs</p>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Activado</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-4">
                    <p className="font-medium text-green-500">Continual Learning Stats</p>
                    <p className="text-2xl font-bold">+15% accuracy</p>
                    <p className="text-sm text-muted-foreground">
                      Desde datos federados de 1,247 interacciones
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Estudio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configuraciones avanzadas del estudio...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
