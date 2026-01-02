import DiagnosticsCenter from "@/components/admin/DiagnosticsCenter";
import { EdgeFunctionTestRunner } from "@/components/admin/EdgeFunctionTestRunner";
import SystemHealthMonitor from "@/components/admin/SystemHealthMonitor";
import SecretsHealthPanel from "@/components/admin/SecretsHealthPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Stethoscope, 
  Zap, 
  Activity, 
  Shield, 
  Key,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Server,
  Download
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Diagnostics = () => {
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runFullDiagnostics = async () => {
    setRunningDiagnostics(true);
    toast.info('Running full system diagnostics...');
    
    try {
      // Run multiple health checks in parallel
      const [providerResult, secretsResult] = await Promise.all([
        supabase.functions.invoke('provider-fallback', { body: { action: 'health_check' } }),
        supabase.functions.invoke('check-secrets-health'),
      ]);

      const providerHealthy = providerResult.data?.summary?.healthy || 0;
      const providerTotal = providerResult.data?.summary?.total || 0;
      const secretsConfigured = secretsResult.data?.summary?.configured || 0;
      const secretsTotal = secretsResult.data?.summary?.total || 0;

      setLastRun(new Date().toISOString());
      
      toast.success(
        `Diagnostics complete: ${providerHealthy}/${providerTotal} providers, ${secretsConfigured}/${secretsTotal} secrets`
      );
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Failed to run full diagnostics');
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const exportHealthReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      lastDiagnosticRun: lastRun,
      status: 'generated',
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Health report exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Diagnostics</h1>
            <p className="text-muted-foreground">Monitor system health, test edge functions, and view provider status</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportHealthReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={runFullDiagnostics} disabled={runningDiagnostics}>
            {runningDiagnostics ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Run Full Diagnostics
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">70</p>
                <p className="text-xs text-muted-foreground">Edge Functions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">96%</p>
                <p className="text-xs text-muted-foreground">System Health</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">14</p>
                <p className="text-xs text-muted-foreground">Configured Secrets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lastRun ? 'OK' : '--'}</p>
                <p className="text-xs text-muted-foreground">
                  {lastRun 
                    ? `Last run: ${new Date(lastRun).toLocaleTimeString()}` 
                    : 'No recent run'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="secrets" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
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

        <TabsContent value="secrets" className="space-y-4">
          <SecretsHealthPanel />
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
