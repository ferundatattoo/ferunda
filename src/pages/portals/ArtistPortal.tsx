import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, Image, MessageSquare, TrendingUp, Mic, 
  Loader2, ArrowLeft, Sparkles, Share2 
} from 'lucide-react';
import { SocialInbox } from '@/components/portals/SocialInbox';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const mockForecastData = [
  { week: 'Sem 1', actual: 2500, predicted: 2600 },
  { week: 'Sem 2', actual: 3200, predicted: 3100 },
  { week: 'Sem 3', actual: 2800, predicted: 2900 },
  { week: 'Sem 4', actual: null, predicted: 3400 },
  { week: 'Sem 5', actual: null, predicted: 3800 },
];

const mockDesigns = [
  { id: 1, name: 'Sacred Geometry Pattern', style: 'Geometric', variations: 3 },
  { id: 2, name: 'Floral Micro Realism', style: 'Micro Realism', variations: 5 },
  { id: 3, name: 'Abstract Blackwork', style: 'Blackwork', variations: 2 },
];

export default function ArtistPortal() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('calendar');
  const [autoManageDMs, setAutoManageDMs] = useState(true);

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canAccessArtistPortal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos para acceder al Portal Artista.</CardDescription>
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
              <h1 className="text-2xl font-bold">Portal Artista</h1>
              <p className="text-sm text-muted-foreground">Tu espacio personal</p>
            </div>
          </div>
          <Badge variant="secondary">Artist Mode</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-6">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="designs" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Diseños
            </TabsTrigger>
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="viral" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Viral Gen
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Forecast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Tu Calendario</CardTitle>
                  <CardDescription>Agent auto-fill desde redes/emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] bg-muted/50 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">FullCalendar Integration</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Agent Delegate
                  </CardTitle>
                  <CardDescription>
                    Controla cómo el Agent maneja tus DMs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Auto-manejar DMs</p>
                      <p className="text-sm text-muted-foreground">
                        Multimodal: voz DMs → transcripción → respuesta
                      </p>
                    </div>
                    <Switch checked={autoManageDMs} onCheckedChange={setAutoManageDMs} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="designs">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Galería de Diseños
                  </CardTitle>
                  <CardDescription>
                    AI variations (Stable Diffusion) + 3D try-on
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {mockDesigns.map((design) => (
                      <Card key={design.id} className="overflow-hidden">
                        <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <Image className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <CardContent className="pt-4">
                          <p className="font-medium">{design.name}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline">{design.style}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {design.variations} variaciones
                            </span>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="secondary" className="flex-1">
                              AI Variations
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              3D Try-on
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="inbox">
            <SocialInbox />
          </TabsContent>

          <TabsContent value="viral">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Viral Generator
                </CardTitle>
                <CardDescription>
                  Causal AI: "Post now para +20% leads"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-4">
                    <p className="font-medium text-green-500">Mejor momento para postear</p>
                    <p className="text-2xl font-bold">Hoy 19:00 - 21:00</p>
                    <p className="text-sm text-muted-foreground">
                      Predicción: +23% engagement vs promedio
                    </p>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                  <Button className="h-20">
                    <div className="text-center">
                      <p className="font-medium">Generar Post IG</p>
                      <p className="text-xs opacity-70">AI Content</p>
                    </div>
                  </Button>
                  <Button variant="secondary" className="h-20">
                    <div className="text-center">
                      <p className="font-medium">Generar TikTok</p>
                      <p className="text-xs opacity-70">Trending Audio</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast Personal</CardTitle>
                <CardDescription>
                  QAOA: "Optimize precios para max ingresos"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockForecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--secondary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">Recomendación QAOA</p>
                  <p className="text-sm text-muted-foreground">
                    Si aumentas tu rate €20/h → predicción +€1,200/mes sin pérdida de clientes
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
