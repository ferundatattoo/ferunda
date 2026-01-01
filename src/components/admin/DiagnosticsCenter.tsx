import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Activity, Server, Clock, Download, Play 
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface JobError {
  id: string;
  job_id: string;
  error_code: string;
  provider: string;
  message: string;
  retryable: boolean;
  created_at: string;
}

interface ProviderHealth {
  provider_key: string;
  status: "up" | "degraded" | "down";
  latency_ms: number;
  last_checked_at: string;
}

interface JobTrace {
  id: string;
  job_id: string;
  stage: string;
  timestamp: string;
  info_json: Record<string, unknown>;
}

const DiagnosticsCenter = () => {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("errors");
  
  const [errors, setErrors] = useState<JobError[]>([]);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [traces, setTraces] = useState<JobTrace[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    if (workspace.workspaceId) {
      fetchData();
    }
  }, [workspace.workspaceId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch job errors
      const { data: errorData } = await supabase
        .from("job_errors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      setErrors(errorData || []);

      // Fetch provider health
      const { data: healthData } = await supabase
        .from("provider_health")
        .select("*")
        .order("last_checked_at", { ascending: false });
      
      setProviderHealth((healthData || []).map((h: any) => ({
        ...h,
        status: h.status as "up" | "degraded" | "down",
      })));

      // Fetch recent traces
      const { data: traceData } = await supabase
        .from("job_traces")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);
      
      setTraces((traceData || []).map((t: any) => ({
        ...t,
        info_json: (t.info_json as Record<string, unknown>) || {},
      })));
    } catch (err) {
      console.error("Error fetching diagnostics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-compiler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "retry_job",
            job_id: jobId,
          }),
        }
      );

      if (response.ok) {
        toast({ title: "Job queued for retry" });
        fetchData();
      } else {
        const data = await response.json();
        toast({ title: data.error || "Retry failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Retry failed", variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "up":
        return <Badge className="bg-green-500/20 text-green-400">Up</Badge>;
      case "degraded":
        return <Badge className="bg-amber-500/20 text-amber-400">Degraded</Badge>;
      case "down":
        return <Badge className="bg-red-500/20 text-red-400">Down</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Diagnostics Center</h2>
          <p className="text-muted-foreground">Monitor jobs, errors, and provider health</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Provider Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {providerHealth.slice(0, 4).map((provider) => (
          <Card key={provider.provider_key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{provider.provider_key}</span>
                {getStatusBadge(provider.status)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {provider.latency_ms}ms
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Errors ({errors.length})
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Provider Health
          </TabsTrigger>
          <TabsTrigger value="traces" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Job Traces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Failed jobs and their error details</CardDescription>
            </CardHeader>
            <CardContent>
              {errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>No recent errors</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Error Code</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{error.provider}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {error.error_code}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {error.message}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {error.retryable && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRetry(error.job_id)}
                                disabled={retrying === error.job_id}
                              >
                                {retrying === error.job_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Health Status</CardTitle>
              <CardDescription>Real-time status of external AI providers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Last Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerHealth.map((provider) => (
                    <TableRow key={provider.provider_key}>
                      <TableCell className="font-medium">{provider.provider_key}</TableCell>
                      <TableCell>{getStatusBadge(provider.status)}</TableCell>
                      <TableCell>{provider.latency_ms}ms</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(provider.last_checked_at), "HH:mm:ss")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traces" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Traces</CardTitle>
              <CardDescription>Execution timeline for recent jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {traces.map((trace) => (
                  <div key={trace.id} className="flex items-center gap-4 p-2 rounded bg-secondary/30">
                    <div className="w-24 text-xs text-muted-foreground">
                      {format(new Date(trace.timestamp), "HH:mm:ss.SSS")}
                    </div>
                    <Badge variant="outline" className="w-20 justify-center">
                      {trace.stage}
                    </Badge>
                    <div className="flex-1 text-sm text-muted-foreground truncate">
                      {JSON.stringify(trace.info_json).slice(0, 100)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiagnosticsCenter;
