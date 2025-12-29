import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, MessageCircle, Bot, Zap, Users, Clock, FileText, Heart, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import LunaAIManager from "./LunaAIManager";
import ConciergeAIManager from "./ConciergeAIManager";

type AIMode = "luna" | "concierge";

const UnifiedAIManager = () => {
  const [activeMode, setActiveMode] = useState<AIMode>("luna");

  const lunaUseCases = [
    { icon: HelpCircle, text: "Quick questions & FAQs" },
    { icon: Zap, text: "Pricing inquiries" },
    { icon: Clock, text: "Availability checks" },
    { icon: Users, text: "Style information" },
  ];

  const conciergeUseCases = [
    { icon: FileText, text: "New tattoo bookings" },
    { icon: Heart, text: "Guided project intake" },
    { icon: Users, text: "Building tattoo briefs" },
    { icon: Zap, text: "Cover-ups & touch-ups" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-editorial text-foreground">AI Assistant</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure and manage your AI assistants
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-4 bg-card/50 border border-border rounded-lg p-3">
          <div 
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${activeMode === "luna" ? "opacity-100" : "opacity-50"}`}
            onClick={() => setActiveMode("luna")}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Luna AI</span>
          </div>
          
          <Switch
            checked={activeMode === "concierge"}
            onCheckedChange={(checked) => setActiveMode(checked ? "concierge" : "luna")}
          />
          
          <div 
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${activeMode === "concierge" ? "opacity-100" : "opacity-50"}`}
            onClick={() => setActiveMode("concierge")}
          >
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Studio Concierge</span>
          </div>
        </div>
      </div>

      {/* Use Case Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          animate={{ 
            opacity: activeMode === "luna" ? 1 : 0.5,
            scale: activeMode === "luna" ? 1 : 0.98
          }}
          transition={{ duration: 0.2 }}
        >
          <Card 
            className={`cursor-pointer transition-all ${
              activeMode === "luna" 
                ? "border-primary/50 bg-primary/5" 
                : "border-border hover:border-primary/30"
            }`}
            onClick={() => setActiveMode("luna")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Luna AI</CardTitle>
                  <CardDescription>General Assistant</CardDescription>
                </div>
                {activeMode === "luna" && (
                  <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-3">
                Best for quick interactions and general inquiries. Luna handles casual conversations with warmth and efficiency.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {lunaUseCases.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <item.icon className="h-3 w-3 text-primary/70" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          animate={{ 
            opacity: activeMode === "concierge" ? 1 : 0.5,
            scale: activeMode === "concierge" ? 1 : 0.98
          }}
          transition={{ duration: 0.2 }}
        >
          <Card 
            className={`cursor-pointer transition-all ${
              activeMode === "concierge" 
                ? "border-primary/50 bg-primary/5" 
                : "border-border hover:border-primary/30"
            }`}
            onClick={() => setActiveMode("concierge")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Studio Concierge</CardTitle>
                  <CardDescription>Guided Journey</CardDescription>
                </div>
                {activeMode === "concierge" && (
                  <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-3">
                Best for clients ready to commit. Guides them through a structured intake process to build complete tattoo briefs.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {conciergeUseCases.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <item.icon className="h-3 w-3 text-primary/70" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Manager */}
      <motion.div
        key={activeMode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeMode === "luna" ? <LunaAIManager /> : <ConciergeAIManager />}
      </motion.div>
    </div>
  );
};

export default UnifiedAIManager;
