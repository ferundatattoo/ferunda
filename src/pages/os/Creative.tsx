import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Palette,
  Wand2,
  Camera,
  Layers,
  Sparkles,
  Image,
  Video,
  Crown
} from 'lucide-react';
import { FeatureGate } from '@/components/ui/FeatureGate';

// Import components
import BodyAtlasViewer from '@/components/admin/BodyAtlasViewer';
import { TattooSketchGenerator } from '@/components/marketing/ai-studio';

export default function Creative() {
  const [activeTab, setActiveTab] = useState('studio');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
            <Palette className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Creative Studio</h1>
            <p className="text-sm text-muted-foreground">
              Herramientas de diseño y visualización
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30">
            LITE
          </Badge>
          <Badge className="bg-gradient-to-r from-primary/20 to-ai/20 text-primary border-primary/20">
            <Crown className="w-3 h-3 mr-1" />
            PRO Features Available
          </Badge>
        </div>
      </div>

      {/* LITE Features - Always Available */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Image className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Galería</p>
                <p className="text-xs text-muted-foreground">Portafolio de trabajos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Camera className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium">Referencias</p>
                <p className="text-xs text-muted-foreground">Organizar imágenes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Layers className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Templates</p>
                <p className="text-xs text-muted-foreground">Diseños base</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="studio" className="gap-2">
            <Palette className="h-4 w-4" />
            Studio
          </TabsTrigger>
          <TabsTrigger value="ai-design" className="gap-2">
            <Wand2 className="h-4 w-4" />
            AI Design
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">PRO</Badge>
          </TabsTrigger>
          <TabsTrigger value="body-atlas" className="gap-2">
            <Layers className="h-4 w-4" />
            Body Atlas
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">PRO</Badge>
          </TabsTrigger>
          <TabsTrigger value="ar-preview" className="gap-2">
            <Video className="h-4 w-4" />
            AR Preview
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">PRO</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Studio Tab - Free */}
        <TabsContent value="studio" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Trabajos Recientes</CardTitle>
                <CardDescription>Últimos diseños completados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div 
                      key={i} 
                      className="aspect-square rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center"
                    >
                      <Image className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Ver Galería Completa
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Acciones rápidas del estudio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="w-4 h-4 mr-2" />
                  Subir Nuevo Trabajo
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Layers className="w-4 h-4 mr-2" />
                  Organizar Galería
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Image className="w-4 h-4 mr-2" />
                  Gestionar Referencias
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Design Tab - PRO */}
        <TabsContent value="ai-design" className="mt-6">
          <FeatureGate module="creative-pro">
            <TattooSketchGenerator />
          </FeatureGate>
        </TabsContent>

        {/* Body Atlas Tab - PRO */}
        <TabsContent value="body-atlas" className="mt-6">
          <FeatureGate module="creative-pro">
            <BodyAtlasViewer />
          </FeatureGate>
        </TabsContent>

        {/* AR Preview Tab - PRO */}
        <TabsContent value="ar-preview" className="mt-6">
          <FeatureGate module="creative-pro">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  AR Live Preview
                </CardTitle>
                <CardDescription>
                  Visualiza diseños en tiempo real con realidad aumentada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg bg-muted/30 border border-dashed border-border flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      AR Preview disponible en la app móvil
                    </p>
                    <Button variant="outline" className="mt-4">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Abrir AR Live
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FeatureGate>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
