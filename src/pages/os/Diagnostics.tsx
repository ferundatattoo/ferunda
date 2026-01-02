import DiagnosticsCenter from "@/components/admin/DiagnosticsCenter";
import { EdgeFunctionTestRunner } from "@/components/admin/EdgeFunctionTestRunner";
import SystemHealthMonitor from "@/components/admin/SystemHealthMonitor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, Zap, Activity, Shield } from "lucide-react";

const Diagnostics = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          <Stethoscope className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground">Monitor system health, test edge functions, and view provider status</p>
        </div>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="functions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Edge Functions
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Full Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <SystemHealthMonitor />
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          <EdgeFunctionTestRunner />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <DiagnosticsCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Diagnostics;
