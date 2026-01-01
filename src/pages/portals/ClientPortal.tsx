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
  Calendar, Heart, MessageSquare, Share2, Sparkles,
  Loader2, ArrowLeft, Upload, Camera
} from 'lucide-react';

export default function ClientPortal() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bookings');

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canAccessClientPortal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos para acceder al Portal Cliente.</CardDescription>
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
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mi Portal</h1>
                <p className="text-sm text-muted-foreground">Tu espacio personal</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="border-border/50">Cliente</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-6">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Citas
            </TabsTrigger>
            <TabsTrigger value="healing" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Healing
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="share" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Compartir
            </TabsTrigger>
            <TabsTrigger value="personalized" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Para Ti
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle>Nueva Cita</CardTitle>
                  <CardDescription>
                    Habla con nuestro Agent AI multimodal (voz/foto → estimación)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-24 flex flex-col gap-2">
                      <MessageSquare className="w-6 h-6" />
                      <span>Chat con Agent</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2">
                      <Upload className="w-6 h-6" />
                      <span>Subir Referencia</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle>Mis Citas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tienes citas programadas</p>
                    <Button className="mt-4">Agendar Primera Cita</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="healing">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Healing Tracker
                </CardTitle>
                <CardDescription>
                  Sube fotos y recibe feedback del Agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full h-32 flex flex-col gap-2">
                  <Camera className="w-8 h-8" />
                  <span>Subir Foto de Progreso</span>
                </Button>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="font-medium">Causal Feedback</p>
                    <p className="text-sm text-muted-foreground">
                      "If irritación detectada → ajusta aftercare con más hidratación"
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle>Chat Directo</CardTitle>
                <CardDescription>
                  Integrado con DMs/emails del estudio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] bg-muted/50 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Chat Interface</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="share">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Comparte tu Tatuaje
                </CardTitle>
                <CardDescription>
                  Agent sugiere: "Post tu tatuaje para rewards"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20">
                    Instagram
                  </Button>
                  <Button variant="outline" className="h-20">
                    TikTok
                  </Button>
                  <Button variant="outline" className="h-20">
                    Twitter
                  </Button>
                </div>
                <Card className="bg-primary/10 border-primary/30">
                  <CardContent className="pt-4">
                    <p className="font-medium">Programa de Rewards</p>
                    <p className="text-sm text-muted-foreground">
                      Comparte tu tatuaje y gana 10% descuento en tu próxima sesión
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personalized">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Sugerencias Personalizadas
                </CardTitle>
                <CardDescription>
                  Federated prefs basadas en tu historia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="font-medium">Basado en tus preferencias</p>
                    <p className="text-sm text-muted-foreground">
                      Te gustan los estilos geométricos y blackwork
                    </p>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary/20" />
                    <CardContent className="pt-2">
                      <p className="text-sm font-medium">Sacred Geometry</p>
                      <p className="text-xs text-muted-foreground">98% match</p>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-secondary/20 to-accent/20" />
                    <CardContent className="pt-2">
                      <p className="text-sm font-medium">Mandala Fusion</p>
                      <p className="text-xs text-muted-foreground">95% match</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
