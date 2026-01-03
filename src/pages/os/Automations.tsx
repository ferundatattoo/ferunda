import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, Activity, Settings, Zap } from "lucide-react";
import { WorkflowBuilderHub } from "@/components/admin/workflow-engine";
import WorkflowMonitoringDashboard from "@/components/admin/workflow-engine/WorkflowMonitoringDashboard";

const Automations = () => {
  const [activeTab, setActiveTab] = useState("builder");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Automatizaciones</h1>
        <p className="font-body text-muted-foreground mt-1">
          Workflows durables estilo Temporal con monitoreo en tiempo real
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            <span>Builder</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Monitoreo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <WorkflowBuilderHub />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <WorkflowMonitoringDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Automations;
