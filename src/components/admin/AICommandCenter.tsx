import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Video, TrendingUp, Megaphone, Sparkles } from "lucide-react";
import AIStudioDashboard from "./AIStudioDashboard";
import AvatarCloneManager from "./AvatarCloneManager";
import UnifiedAIManager from "./UnifiedAIManager";
import { AIMarketingLab } from "@/components/marketing/ai-studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AICommandCenter = () => {
  const [activeSubTab, setActiveSubTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-foreground">AI Command Center</h1>
        <p className="font-body text-muted-foreground mt-1">
          Centro de control de inteligencia artificial
        </p>
      </div>

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1 flex-wrap">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="assistants" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span>Asistentes</span>
          </TabsTrigger>
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <span>Avatar AI</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span>Marketing AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AIStudioDashboard />
        </TabsContent>

        <TabsContent value="assistants" className="mt-6">
          <UnifiedAIManager />
        </TabsContent>

        <TabsContent value="avatar" className="mt-6">
          <AvatarCloneManager />
        </TabsContent>

        <TabsContent value="marketing" className="mt-6">
          <AIMarketingLab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AICommandCenter;
