import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Clock, ArrowRight, Settings, Play, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Workflow {
  id: string;
  workflow_name: string;
  description: string | null;
  trigger_type: string | null;
  trigger_config: Record<string, unknown> | null;
  actions: Record<string, unknown>[] | null;
  is_active: boolean | null;
  last_run_at: string | null;
  run_count: number | null;
}

const AutomationModule = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      // Use any cast since marketing_workflows may not be in generated types yet
      const { data, error } = await (supabase
        .from("marketing_workflows" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setWorkflows((data as Workflow[]) || []);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Error loading workflows");
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (id: string, currentState: boolean | null) => {
    try {
      // Use any cast since marketing_workflows may not be in generated types yet
      const { error } = await (supabase
        .from("marketing_workflows" as any)
        .update({ is_active: !currentState })
        .eq("id", id) as any);

      if (error) throw error;

      setWorkflows(prev =>
        prev.map(w => (w.id === id ? { ...w, is_active: !currentState } : w))
      );
      toast.success(`Workflow ${!currentState ? "activated" : "paused"}`);
    } catch (error) {
      console.error("Error toggling workflow:", error);
      toast.error("Error updating workflow");
    }
  };

  const formatLastRun = (date: string | null) => {
    if (!date) return "Never";
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Less than 1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCount = workflows.filter(w => w.is_active).length;
  const pausedCount = workflows.filter(w => !w.is_active).length;
  const totalRuns = workflows.reduce((sum, w) => sum + (w.run_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation</h1>
          <p className="text-muted-foreground">Set up automated marketing workflows</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRuns}</p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Pause className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pausedCount}</p>
                <p className="text-sm text-muted-foreground">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No workflows configured yet</p>
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => {
            const actions = Array.isArray(workflow.actions) 
              ? workflow.actions.map(a => (a as Record<string, unknown>).name || "Action") 
              : [];

            return (
              <Card key={workflow.id} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{workflow.workflow_name}</h3>
                        <Badge variant={workflow.is_active ? "default" : "secondary"}>
                          {workflow.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {workflow.description || "No description"}
                      </p>

                      {/* Workflow visualization */}
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {workflow.trigger_type || "Manual"}
                        </Badge>
                        {actions.map((action, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="secondary">{String(action)}</Badge>
                          </div>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span>Runs: {workflow.run_count || 0}</span>
                        <span>Last run: {formatLastRun(workflow.last_run_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={workflow.is_active || false}
                        onCheckedChange={() => toggleWorkflow(workflow.id, workflow.is_active)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AutomationModule;
