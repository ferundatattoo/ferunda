import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Video, Palette, TrendingUp, LayoutDashboard, TestTube, User } from "lucide-react";
import UnifiedAIManager from "./UnifiedAIManager";
import VideoAvatarStudio from "./video-avatar/VideoAvatarStudio";
import DesignStudioAI from "./DesignStudioAI";
import { AIMarketingLab } from "@/components/marketing/ai-studio";
import AIStudioDashboard from "./AIStudioDashboard";
import AvatarCloneManager from "./AvatarCloneManager";
import { RegressionTestRunner } from "./concierge/RegressionTestRunner";

type AITab = "dashboard" | "assistants" | "video-avatar" | "clones" | "design-ai" | "marketing-ai" | "testing";

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
        <TabsList className="grid w-full grid-cols-7 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="assistants" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Assistants</span>
          </TabsTrigger>
          <TabsTrigger value="video-avatar" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Video</span>
          </TabsTrigger>
          <TabsTrigger value="clones" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Clones</span>
          </TabsTrigger>
          <TabsTrigger value="design-ai" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Design</span>
          </TabsTrigger>
          <TabsTrigger value="marketing-ai" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Marketing</span>
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            <span className="hidden sm:inline">Testing</span>
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

        <TabsContent value="testing" className="mt-0">
          <RegressionTestRunner />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AICommandCenter;
