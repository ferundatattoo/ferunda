import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Target, TrendingUp, 
  Video, BarChart3, Link, Wand2, Mail, FlaskConical, LayoutDashboard
} from 'lucide-react';
import {
  AIStudioOverview,
  TrendSpotterAI,
  VideoCreationWizard,
  StudioAnalyticsAI,
  PlatformConnectionWizard,
  AIMarketingLab,
  TattooSketchGenerator
} from '@/components/marketing/ai-studio';
import NewsletterManager from '@/components/admin/NewsletterManager';
import MarketingWizard from '@/components/marketing/MarketingWizard';
import { CampaignBuilder } from '@/components/portals/CampaignBuilder';

const OSGrowth = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Growth Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Marketing AI-Powered y campañas
          </p>
        </div>
        <Badge className="bg-ai/10 text-ai border-ai/20">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Studio
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/30 border border-border/50 flex-wrap">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="wizard" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Wizard
          </TabsTrigger>
          <TabsTrigger value="ailab" className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            AI Lab
          </TabsTrigger>
          <TabsTrigger value="sketchgen" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Sketch Gen
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AIStudioOverview />
        </TabsContent>

        <TabsContent value="wizard" className="mt-6">
          <MarketingWizard />
        </TabsContent>

        <TabsContent value="ailab" className="mt-6">
          <AIMarketingLab />
        </TabsContent>

        <TabsContent value="sketchgen" className="mt-6">
          <TattooSketchGenerator />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <TrendSpotterAI />
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          <VideoCreationWizard />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <NewsletterManager />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OSGrowth;
