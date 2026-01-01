import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Video, Palette, TrendingUp, LayoutDashboard, TestTube, User, Heart, DollarSign, Layers, TestTube2, Zap, Activity, Map } from "lucide-react";
import UnifiedAIManager from "./UnifiedAIManager";
import VideoAvatarStudio from "./video-avatar/VideoAvatarStudio";
import DesignStudioAI from "./DesignStudioAI";
import { AIMarketingLab } from "@/components/marketing/ai-studio";
import AIStudioDashboard from "./AIStudioDashboard";
import AvatarCloneManager from "./AvatarCloneManager";
import { RegressionTestRunner } from "./concierge/RegressionTestRunner";
import HealingGuardianAI from "./HealingGuardianAI";
import RevenueIntelligenceDashboard from "./RevenueIntelligenceDashboard";
import SleeveCompilerManager from "./SleeveCompilerManager";
import FeasibilityLabManager from "./FeasibilityLabManager";
import ConversionAnalytics from "./ConversionAnalytics";
import SystemHealthMonitor from "./SystemHealthMonitor";
import BodyAtlasViewer from "./BodyAtlasViewer";

type AITab = "dashboard" | "assistants" | "video-avatar" | "clones" | "design-ai" | "marketing-ai" | "testing" | "healing" | "revenue" | "sleeve" | "feasibility" | "conversion" | "health" | "atlas";

const AICommandCenter = () => {
  const [activeTab, setActiveTab] = useState<AITab>("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Center</h1>
        <p className="text-muted-foreground">
          Manage all AI-powered tools and assistants
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AITab)} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-1 text-xs">
            <LayoutDashboard className="h-3 w-3" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="assistants" className="flex items-center gap-1 text-xs">
            <Bot className="h-3 w-3" />
            Assistants
          </TabsTrigger>
          <TabsTrigger value="design-ai" className="flex items-center gap-1 text-xs">
            <Palette className="h-3 w-3" />
            Design
          </TabsTrigger>
          <TabsTrigger value="sleeve" className="flex items-center gap-1 text-xs">
            <Layers className="h-3 w-3" />
            Sleeve
          </TabsTrigger>
          <TabsTrigger value="feasibility" className="flex items-center gap-1 text-xs">
            <TestTube2 className="h-3 w-3" />
            Feasibility
          </TabsTrigger>
          <TabsTrigger value="video-avatar" className="flex items-center gap-1 text-xs">
            <Video className="h-3 w-3" />
            Video
          </TabsTrigger>
          <TabsTrigger value="clones" className="flex items-center gap-1 text-xs">
            <User className="h-3 w-3" />
            Clones
          </TabsTrigger>
          <TabsTrigger value="marketing-ai" className="flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="healing" className="flex items-center gap-1 text-xs">
            <Heart className="h-3 w-3" />
            Healing
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-1 text-xs">
            <Zap className="h-3 w-3" />
            Conversion
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-1 text-xs">
            <Activity className="h-3 w-3" />
            Health
          </TabsTrigger>
          <TabsTrigger value="atlas" className="flex items-center gap-1 text-xs">
            <Map className="h-3 w-3" />
            Body Atlas
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-1 text-xs">
            <TestTube className="h-3 w-3" />
            Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <AIStudioDashboard />
        </TabsContent>

        <TabsContent value="assistants" className="mt-0">
          <UnifiedAIManager />
        </TabsContent>

        <TabsContent value="video-avatar" className="mt-0">
          <VideoAvatarStudio />
        </TabsContent>

        <TabsContent value="clones" className="mt-0">
          <AvatarCloneManager />
        </TabsContent>

        <TabsContent value="design-ai" className="mt-0">
          <DesignStudioAI />
        </TabsContent>

        <TabsContent value="marketing-ai" className="mt-0">
          <AIMarketingLab />
        </TabsContent>

        <TabsContent value="healing" className="mt-0">
          <HealingGuardianAI />
        </TabsContent>

        <TabsContent value="testing" className="mt-0">
          <RegressionTestRunner />
        </TabsContent>

        <TabsContent value="revenue" className="mt-0">
          <RevenueIntelligenceDashboard />
        </TabsContent>

        <TabsContent value="sleeve" className="mt-0">
          <SleeveCompilerManager />
        </TabsContent>

        <TabsContent value="feasibility" className="mt-0">
          <FeasibilityLabManager />
        </TabsContent>

        <TabsContent value="conversion" className="mt-0">
          <ConversionAnalytics />
        </TabsContent>

        <TabsContent value="health" className="mt-0">
          <SystemHealthMonitor />
        </TabsContent>

        <TabsContent value="atlas" className="mt-0">
          <BodyAtlasViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AICommandCenter;
