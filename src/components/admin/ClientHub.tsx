import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Heart, Brain } from "lucide-react";
import ClientProfilesManager from "./ClientProfilesManager";
import HealingTrackerManager from "./HealingTrackerManager";
import ClientIntelligenceEngine from "./ClientIntelligenceEngine";

const ClientHub = () => {
  const [activeSubTab, setActiveSubTab] = useState("profiles");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-foreground">Clientes</h1>
        <p className="font-body text-muted-foreground mt-1">
          Perfiles de clientes y seguimiento de healing
        </p>
      </div>

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1">
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Perfiles</span>
          </TabsTrigger>
          <TabsTrigger value="healing" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span>Healing</span>
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span>Intelligence</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-6">
          <ClientProfilesManager />
        </TabsContent>

        <TabsContent value="healing" className="mt-6">
          <HealingTrackerManager />
        </TabsContent>

        <TabsContent value="intelligence" className="mt-6">
          <ClientIntelligenceEngine />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientHub;
