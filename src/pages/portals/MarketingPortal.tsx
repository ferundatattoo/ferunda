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
  Sparkles, Target, TrendingUp, Zap, 
  Loader2, ArrowLeft, Instagram, Clock
} from 'lucide-react';
import { CampaignBuilder } from '@/components/portals/CampaignBuilder';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const mockCampaignData = [
  { name: 'IG Reels', bookings: 12, revenue: 4200 },
  { name: 'TikTok', bookings: 8, revenue: 2800 },
  { name: 'Email', bookings: 15, revenue: 5100 },
  { name: 'Stories', bookings: 6, revenue: 2100 },
];

const mockROIData = [
  { name: 'IG Reels', value: 35 },
  { name: 'TikTok', value: 25 },
  { name: 'Email', value: 30 },
  { name: 'Stories', value: 10 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function MarketingPortal() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('campaigns');

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canAccessMarketingPortal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos para acceder al Portal Marketing.</CardDescription>
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
              <h1 className="text-2xl font-bold">Portal Marketing</h1>
              <p className="text-sm text-muted-foreground">Campañas AI-powered</p>
            </div>
          </div>
          <Badge variant="secondary">Marketing Mode</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-xl mb-6">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Campañas AI
            </TabsTrigger>
            <TabsTrigger value="personalization" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Targeting
            </TabsTrigger>
            <TabsTrigger value="roi" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              ROI Tracker
            </TabsTrigger>
            <TabsTrigger value="viral" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Viral Opt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <CampaignBuilder />
          </TabsContent>

          <TabsContent value="personalization">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Federated Learning Targeting
                  </CardTitle>
                  <CardDescription>
                    Personalización basada en data de clientes (privacy-preserving)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">Segmento: Geometric Lovers</p>
                        <p className="text-2xl font-bold">234</p>
                        <p className="text-xs text-muted-foreground">clientes | 45% open rate</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">Segmento: First Timers</p>
                        <p className="text-2xl font-bold">89</p>
                        <p className="text-xs text-muted-foreground">leads | 62% conversion</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">Segmento: Repeat Clients</p>
                        <p className="text-2xl font-bold">156</p>
                        <p className="text-xs text-muted-foreground">VIPs | 78% retention</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4">
                      <p className="font-medium text-green-500">Privacy-Preserving AI</p>
                      <p className="text-sm text-muted-foreground">
                        Federated learning: datos nunca salen del dispositivo del cliente
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="roi">
            <Card>
              <CardHeader>
                <CardTitle>Causal ROI Tracker</CardTitle>
                <CardDescription>
                  "Campaña X generó Y bookings/revenue"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4">Bookings por Canal</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={mockCampaignData}>
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
                  </div>
                  <div>
                    <h3 className="font-medium mb-4">Distribución ROI</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={mockROIData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {mockROIData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {mockCampaignData.map((campaign) => (
                    <Card key={campaign.name} className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">{campaign.name}</p>
                        <p className="text-xl font-bold">€{campaign.revenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{campaign.bookings} bookings</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="viral">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Viral Optimizer (MoR)
                </CardTitle>
                <CardDescription>
                  Best timing/content para max engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-500">Mejor Momento: HOY</p>
                        <p className="text-2xl font-bold">19:00 - 21:00</p>
                        <p className="text-sm text-muted-foreground">
                          +47% engagement predicho vs promedio
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Instagram className="w-5 h-5" />
                        Instagram Reels
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Trending audio: "Aesthetic Vibes" | +32% reach
                      </p>
                      <Button className="w-full">Generar Contenido AI</Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">TikTok</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Trending: #TattooProcess | +28% views
                      </p>
                      <Button className="w-full" variant="secondary">Generar Contenido AI</Button>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="font-medium">MoR Prediction</p>
                    <p className="text-sm text-muted-foreground">
                      Si postas el contenido sugerido a las 19:30 → 
                      predicción: 12K views, 450 likes, 23 DMs
                    </p>
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
