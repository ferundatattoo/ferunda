import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Video, Palette, TrendingUp } from "lucide-react";
import UnifiedAIManager from "./UnifiedAIManager";
import VideoAvatarStudio from "./video-avatar/VideoAvatarStudio";
import DesignStudioAI from "./DesignStudioAI";
import { AIMarketingLab } from "@/components/marketing/ai-studio";

type AITab = "assistants" | "video-avatar" | "design-ai" | "marketing-ai";

const AICommandCenter = () => {
  const [activeTab, setActiveTab] = useState<AITab>("assistants");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Center</h1>
        <p className="text-muted-foreground">
          Manage all AI-powered tools and assistants
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AITab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="assistants" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Assistants</span>
          </TabsTrigger>
          <TabsTrigger value="video-avatar" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Video Avatar</span>
          </TabsTrigger>
          <TabsTrigger value="design-ai" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Design AI</span>
          </TabsTrigger>
          <TabsTrigger value="marketing-ai" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Marketing AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistants" className="mt-0">
          <UnifiedAIManager />
        </TabsContent>

        <TabsContent value="video-avatar" className="mt-0">
          <VideoAvatarStudio />
        </TabsContent>

        <TabsContent value="design-ai" className="mt-0">
          <DesignStudioAI />
        </TabsContent>

        <TabsContent value="marketing-ai" className="mt-0">
          <AIMarketingLab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AICommandCenter;
