import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Bot, 
  MessageSquare, 
  Database, 
  Image, 
  Mic, 
  Settings,
  Zap,
  Users,
  BookOpen,
  TestTube,
  MapPin,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Sub-managers (lazy loaded based on tab)
import { FactsVaultManager } from "./concierge/FactsVaultManager";
import { VoiceProfileEditor } from "./concierge/VoiceProfileEditor";
import ArtistsManager from "./concierge/ArtistsManager";
import PricingModelsManager from "./concierge/PricingModelsManager";
import { GuestSpotManager } from "./concierge/GuestSpotManager";
import ScreenshotTrainer from "./concierge/ScreenshotTrainer";
import { RegressionTestRunner } from "./concierge/RegressionTestRunner";

type ManagementTab = 
  | "overview" 
  | "knowledge" 
  | "training" 
  | "voice" 
  | "artists" 
  | "pricing" 
  | "guest-spots" 
  | "testing";

const UnifiedAIManager = () => {
  const [activeTab, setActiveTab] = useState<ManagementTab>("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: Sparkles, description: "AI assistant status & quick settings" },
    { id: "knowledge", label: "Knowledge", icon: Database, description: "Facts, FAQs, policies the AI knows" },
    { id: "training", label: "Training", icon: Image, description: "Teach AI with screenshots & examples" },
    { id: "voice", label: "Voice", icon: Mic, description: "Tone, personality, language style" },
    { id: "artists", label: "Artists", icon: Users, description: "Artist profiles & capabilities" },
    { id: "pricing", label: "Pricing", icon: DollarSign, description: "Pricing models & deposit rules" },
    { id: "guest-spots", label: "Guest Spots", icon: MapPin, description: "Travel locations & availability" },
    { id: "testing", label: "Testing", icon: TestTube, description: "Test AI responses & regressions" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-editorial text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI Assistant Manager
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your AI assistants, knowledge base, and training data
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Luna + Concierge Unified
          </Badge>
        </div>
      </div>

      {/* Consolidated Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ManagementTab)}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex flex-col items-center gap-1 py-2 px-2 data-[state=active]:bg-background"
            >
              <tab.icon className="h-4 w-4" />
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Overview - Quick status of both Luna & Concierge */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Luna Card */}
                <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Luna AI</CardTitle>
                        <CardDescription>Quick Q&A Assistant</CardDescription>
                      </div>
                      <Badge className="ml-auto bg-green-500/20 text-green-500 border-0">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      Handles quick questions, FAQs, pricing inquiries, and availability checks with warmth and efficiency.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Zap className="h-3 w-3 text-purple-500/70" />
                        Fast responses
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="h-3 w-3 text-purple-500/70" />
                        Casual tone
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Concierge Card */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Studio Concierge</CardTitle>
                        <CardDescription>Booking Journey Guide</CardDescription>
                      </div>
                      <Badge className="ml-auto bg-green-500/20 text-green-500 border-0">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      Guides clients through structured intake to build complete tattoo briefs, handle bookings, and project intake.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <BookOpen className="h-3 w-3 text-primary/70" />
                        Guided flows
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3 w-3 text-primary/70" />
                        Brief building
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Quick Settings from both managers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Quick Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Use the tabs above to configure knowledge base, training data, voice personality, 
                    artist profiles, and pricing models. Both Luna and Concierge share the same knowledge base.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Knowledge - Combined knowledge base */}
            <TabsContent value="knowledge" className="mt-6">
              <FactsVaultManager />
            </TabsContent>

            {/* Training - Screenshot trainer */}
            <TabsContent value="training" className="mt-6">
              <ScreenshotTrainer />
            </TabsContent>

            {/* Voice Profile */}
            <TabsContent value="voice" className="mt-6">
              <VoiceProfileEditor />
            </TabsContent>

            {/* Artists Management */}
            <TabsContent value="artists" className="mt-6">
              <ArtistsManager />
            </TabsContent>

            {/* Pricing Models */}
            <TabsContent value="pricing" className="mt-6">
              <PricingModelsManager />
            </TabsContent>

            {/* Guest Spots */}
            <TabsContent value="guest-spots" className="mt-6">
              <GuestSpotManager />
            </TabsContent>

            {/* Testing */}
            <TabsContent value="testing" className="mt-6">
              <RegressionTestRunner />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

export default UnifiedAIManager;
