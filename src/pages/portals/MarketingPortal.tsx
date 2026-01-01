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
  Loader2, ArrowLeft, Video, BarChart3, Link, LayoutDashboard, FlaskConical, Wand2
} from 'lucide-react';
import { CampaignBuilder } from '@/components/portals/CampaignBuilder';
import {
  AIStudioOverview,
  TrendSpotterAI,
  VideoCreationWizard,
  StudioAnalyticsAI,
  PlatformConnectionWizard,
  AIMarketingLab,
  TattooSketchGenerator
} from '@/components/marketing/ai-studio';

export default function MarketingPortal() {
  const { user, loading: authLoading } = useAuth();
  const { permissions, loading: rbacLoading } = useRBAC(user?.id || null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

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
              <h1 className="text-2xl font-bold">AI Studio - Centro de Comando</h1>
              <p className="text-sm text-muted-foreground">Social Media AI-Powered</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Studio
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-8 w-full max-w-5xl mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="ailab" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              <span className="hidden md:inline">AI Lab</span>
            </TabsTrigger>
            <TabsTrigger value="sketchgen" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              <span className="hidden md:inline">Sketch Gen</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden md:inline">Video</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              <span className="hidden md:inline">Platforms</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden md:inline">Campaigns</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AIStudioOverview />
          </TabsContent>

          <TabsContent value="ailab">
            <AIMarketingLab />
          </TabsContent>

          <TabsContent value="sketchgen">
            <TattooSketchGenerator />
          </TabsContent>

          <TabsContent value="trends">
            <TrendSpotterAI />
          </TabsContent>

          <TabsContent value="video">
            <VideoCreationWizard />
          </TabsContent>

          <TabsContent value="analytics">
            <StudioAnalyticsAI />
          </TabsContent>

          <TabsContent value="platforms">
            <PlatformConnectionWizard />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignBuilder />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
