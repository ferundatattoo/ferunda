import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Zap, GitBranch, Clock, History, CheckCircle, Activity, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import WorkflowCanvas from "./WorkflowCanvas";
import WorkflowTemplates from "./WorkflowTemplates";
import WorkflowRuns from "./WorkflowRuns";
import { WorkflowDashboard, ConfigurationPanel } from "@/components/admin/workflow";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  object_key: string | null;
  enabled: boolean;
  version: number;
  safety_level: string;
  trigger_type: string | null;
  created_at: string;
}

export default function WorkflowBuilderHub() {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("workflows");
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    object_key: "",
    safety_level: "suggest_only",
    trigger_type: "manual",
  });

  useEffect(() => {
    if (workspace.workspaceId) fetchWorkflows();
  }, [workspace.workspaceId]);

  const fetchWorkflows = async () => {
    const { data } = await supabase
      .from("workflows")
      .select("*")
      .eq("workspace_id", workspace.workspaceId)
      .order("created_at", { ascending: false });

    if (data) setWorkflows(data as Workflow[]);
    setLoading(false);
  };

  const createWorkflow = async () => {
    if (!workspace.workspaceId || !newWorkflow.name) return;

    const { data, error } = await supabase
      .from("workflows")
      .insert({
        workspace_id: workspace.workspaceId,
        name: newWorkflow.name,
        description: newWorkflow.description,
        object_key: newWorkflow.object_key || null,
        safety_level: newWorkflow.safety_level,
        trigger_type: newWorkflow.trigger_type,
        enabled: false,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear workflow");
    } else {
      toast.success("Workflow creado");
      setDialogOpen(false);
      setNewWorkflow({
        name: "",
        description: "",
        object_key: "",
        safety_level: "suggest_only",
        trigger_type: "manual",
      });
      fetchWorkflows();
      if (data) setSelectedWorkflow(data as Workflow);
    }
  };

  const toggleWorkflow = async (id: string, isEnabled: boolean) => {
    await supabase.from("workflows").update({ enabled: isEnabled }).eq("id", id);
    fetchWorkflows();
    toast.success(isEnabled ? "Workflow activado" : "Workflow pausado");
  };

  const getSafetyBadge = (level: string) => {
    switch (level) {
      case "suggest_only":
        return <Badge variant="secondary">Solo sugerir</Badge>;
      case "draft_first":
        return <Badge variant="outline">Draft primero</Badge>;
      case "autopilot":
        return <Badge className="bg-green-500">Autopilot</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const getTriggerIcon = (type: string | null) => {
    switch (type) {
      case "message_received":
        return <Zap className="h-4 w-4" />;
      case "booking_created":
        return <Clock className="h-4 w-4" />;
      case "deposit_paid":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  if (selectedWorkflow) {
    return (
      <WorkflowCanvas
        workflow={selectedWorkflow}
        onBack={() => setSelectedWorkflow(null)}
        onUpdate={fetchWorkflows}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow Engine</h1>
          <p className="text-muted-foreground">
            Automatizaciones visuales con triggers, condiciones y acciones
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  placeholder="Lead → Depósito → Confirmación"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input
                  placeholder="Automatiza el flujo de nuevos leads"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Trigger</Label>
                <Select
                  value={newWorkflow.trigger_type}
                  onValueChange={(v) => setNewWorkflow({ ...newWorkflow, trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="message_received">Mensaje recibido</SelectItem>
                    <SelectItem value="form_submitted">Form enviado</SelectItem>
                    <SelectItem value="booking_created">Cita creada</SelectItem>
                    <SelectItem value="deposit_paid">Depósito pagado</SelectItem>
                    <SelectItem value="no_show">No-show flagged</SelectItem>
                    <SelectItem value="review_received">Review recibida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nivel de seguridad</Label>
                <Select
                  value={newWorkflow.safety_level}
                  onValueChange={(v) => setNewWorkflow({ ...newWorkflow, safety_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggest_only">Solo sugerir (más seguro)</SelectItem>
                    <SelectItem value="draft_first">Draft primero</SelectItem>
                    <SelectItem value="autopilot">Autopilot (ejecuta automático)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createWorkflow} className="w-full">
                Crear Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Mis Workflows
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="runs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Ejecuciones
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitor
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${workflow.enabled ? "bg-green-500/10" : "bg-muted"}`}>
                      {getTriggerIcon(workflow.trigger_type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{workflow.name}</CardTitle>
                      {workflow.description && (
                        <CardDescription className="line-clamp-1">
                          {workflow.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={workflow.enabled}
                    onCheckedChange={(v) => {
                      v ? toggleWorkflow(workflow.id, true) : toggleWorkflow(workflow.id, false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSafetyBadge(workflow.safety_level)}
                    <Badge variant="outline">v{workflow.version}</Badge>
                    {workflow.trigger_type && (
                      <Badge variant="secondary">{workflow.trigger_type}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {workflows.length === 0 && (
              <Card className="col-span-full border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Sin workflows</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Crea tu primer workflow o usa un template
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("templates")}>
                    <Zap className="h-4 w-4 mr-2" />
                    Ver Templates
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplates onApply={fetchWorkflows} />
        </TabsContent>

        <TabsContent value="runs" className="mt-6">
          <WorkflowRuns />
        </TabsContent>

        <TabsContent value="monitor" className="mt-6">
          <WorkflowDashboard />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <ConfigurationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}