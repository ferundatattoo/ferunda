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
  Calendar, MessageSquare, Package, BarChart3, 
  Loader2, ArrowLeft, Clock, AlertTriangle 
} from 'lucide-react';
import { SocialInbox } from '@/components/portals/SocialInbox';

const mockPendingTasks = [
  { id: 1, type: 'Reschedule', client: 'María G.', urgency: 'high', time: '10 min ago' },
  { id: 2, type: 'Follow-up', client: 'Carlos R.', urgency: 'medium', time: '1h ago' },
  { id: 3, type: 'Confirm', client: 'Ana P.', urgency: 'low', time: '2h ago' },
];

const mockInventory = [
  { item: 'Tinta Negra Premium', stock: 5, reorderAt: 10, status: 'low' },
  { item: 'Agujas RL 3', stock: 45, reorderAt: 20, status: 'ok' },
  { item: 'Film Protector', stock: 8, reorderAt: 15, status: 'low' },
];

export default function AssistantPortal() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('scheduling');

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate('/auth', { replace: true });
    return null;
  }

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canAccessAssistantPortal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos para acceder al Portal Asistente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Volver al Inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-warning/5 rounded-full blur-[100px]" />
      </div>

      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-warning/20">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Portal Asistente</h1>
                <p className="text-sm text-muted-foreground">Operaciones del día a día</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Assistant Mode</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-6">
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Service
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventario
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Redes
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduling">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardDescription>Citas Hoy</CardDescription>
                    <CardTitle className="text-3xl">8</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardDescription>Pendientes</CardDescription>
                    <CardTitle className="text-3xl text-warning">3</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardDescription>Completadas</CardDescription>
                    <CardTitle className="text-3xl text-success">5</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle>Multi-Calendario View</CardTitle>
                  <CardDescription>Agent suggestions: "Reasigna para balance carga"</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] bg-muted/50 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Multi-artist calendar view</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Tareas Pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockPendingTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={task.urgency === 'high' ? 'destructive' : task.urgency === 'medium' ? 'default' : 'secondary'}
                          >
                            {task.urgency}
                          </Badge>
                          <div>
                            <p className="font-medium">{task.type}: {task.client}</p>
                            <p className="text-xs text-muted-foreground">{task.time}</p>
                          </div>
                        </div>
                        <Button size="sm">Resolver</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="service">
            <SocialInbox />
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Inventario
                </CardTitle>
                <CardDescription>
                  Auto-orders AI-predicted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockInventory.map((item) => (
                    <div key={item.item} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.status === 'low' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                        <div>
                          <p className="font-medium">{item.item}</p>
                          <p className="text-sm text-muted-foreground">
                            Stock: {item.stock} | Reorder at: {item.reorderAt}
                          </p>
                        </div>
                      </div>
                      <Badge variant={item.status === 'low' ? 'destructive' : 'secondary'}>
                        {item.status === 'low' ? 'Bajo' : 'OK'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4">
                  AI Auto-Order Sugerencias
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle>Monitor de Comentarios</CardTitle>
                <CardDescription>Agent auto-replies rutinarios</CardDescription>
              </CardHeader>
              <CardContent>
                <SocialInbox />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle>Operative Reports</CardTitle>
                <CardDescription>
                  Causal: "If delay → -satisfaction?"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">Tiempo respuesta promedio</p>
                      <p className="text-2xl font-bold">12 min</p>
                      <Badge variant="default">-30% vs ayer</Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">Satisfacción cliente</p>
                      <p className="text-2xl font-bold">4.8/5</p>
                      <Badge variant="secondary">Estable</Badge>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                  <CardContent className="pt-4">
                    <p className="font-medium text-yellow-600">Predicción Causal</p>
                    <p className="text-sm">
                      Si el tiempo de respuesta sube a 30min → satisfacción baja -0.3 puntos
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
