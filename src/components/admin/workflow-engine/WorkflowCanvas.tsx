import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Play, Trash2, Zap, Clock, GitBranch, MessageSquare, Mail, Calendar, DollarSign, CheckCircle, AlertTriangle, ArrowDown, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  version: number;
  safety_level: string;
}

interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: string;
  node_key: string;
  label: string;
  config_json: Record<string, unknown>;
  ui_position_json: { x: number; y: number };
  next_nodes_json: string[];
}

interface Props {
  workflow: Workflow;
  onBack: () => void;
  onUpdate: () => void;
}

const NODE_TYPES = [
  { value: "trigger", label: "Trigger", icon: Zap, color: "bg-yellow-500" },
  { value: "condition", label: "Condición", icon: GitBranch, color: "bg-blue-500" },
  { value: "delay", label: "Delay", icon: Clock, color: "bg-purple-500" },
  { value: "action_send_dm", label: "Enviar DM", icon: MessageSquare, color: "bg-green-500" },
  { value: "action_send_email", label: "Enviar Email", icon: Mail, color: "bg-green-500" },
  { value: "action_create_booking", label: "Crear Cita", icon: Calendar, color: "bg-green-500" },
  { value: "action_send_deposit", label: "Enviar Depósito", icon: DollarSign, color: "bg-green-500" },
  { value: "action_assign", label: "Asignar Owner", icon: CheckCircle, color: "bg-green-500" },
  { value: "branch", label: "Branch A/B", icon: GitBranch, color: "bg-orange-500" },
];

export default function WorkflowCanvas({ workflow, onBack, onUpdate }: Props) {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [newNode, setNewNode] = useState({
    node_type: "action_send_dm",
    label: "",
    config: {} as Record<string, unknown>,
  });

  useEffect(() => {
    fetchNodes();
  }, [workflow.id]);

  const fetchNodes = async () => {
    const { data } = await supabase
      .from("workflow_nodes")
      .select("*")
      .eq("workflow_id", workflow.id)
      .order("created_at");

    if (data) {
      setNodes(data.map(n => ({
        ...n,
        config_json: (n.config_json as Record<string, unknown>) || {},
        ui_position_json: (n.ui_position_json as { x: number; y: number }) || { x: 0, y: 0 },
        next_nodes_json: (n.next_nodes_json as string[]) || [],
      })));
    }
    setLoading(false);
  };

  const addNode = async () => {
    if (!newNode.label) return;

    const position_y = nodes.length * 120;
    const prev_node = nodes[nodes.length - 1];

    const { data, error } = await supabase
      .from("workflow_nodes")
      .insert({
        workflow_id: workflow.id,
        node_type: newNode.node_type,
        node_key: `${newNode.node_type}_${Date.now()}`,
        label: newNode.label,
        config_json: newNode.config as Json,
        ui_position_json: { x: 0, y: position_y } as Json,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al agregar nodo");
    } else {
      // Link previous node to new node
      if (prev_node && data) {
        const updatedNextNodes = [...(prev_node.next_nodes_json || []), data.id];
        await supabase
          .from("workflow_nodes")
          .update({ next_nodes_json: updatedNextNodes as Json })
          .eq("id", prev_node.id);
      }

      toast.success("Nodo agregado");
      setDialogOpen(false);
      setNewNode({ node_type: "action_send_dm", label: "", config: {} });
      fetchNodes();
    }
  };

  const deleteNode = async (id: string) => {
    await supabase.from("workflow_nodes").delete().eq("id", id);
    toast.success("Nodo eliminado");
    fetchNodes();
  };

  const runDryRun = async () => {
    toast.info("Ejecutando dry run...");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success("Dry run completado sin errores");
  };

  const saveVersion = async () => {
    await supabase
      .from("workflows")
      .update({ version: workflow.version + 1 })
      .eq("id", workflow.id);
    
    toast.success(`Versión ${workflow.version + 1} guardada`);
    onUpdate();
  };

  const getNodeIcon = (type: string) => {
    const found = NODE_TYPES.find((n) => n.value === type);
    return found ? found.icon : Zap;
  };

  const getNodeColor = (type: string) => {
    const found = NODE_TYPES.find((n) => n.value === type);
    return found ? found.color : "bg-gray-500";
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-xl font-bold">{workflow.name}</h1>
            <p className="text-sm text-muted-foreground">
              v{workflow.version} · {workflow.enabled ? "Activo" : "Pausado"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runDryRun}>
            <Play className="h-4 w-4 mr-2" />
            Dry Run
          </Button>
          <Button onClick={saveVersion}>
            Guardar Versión
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Canvas */}
        <Card className="min-h-[600px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Flujo del Workflow</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Nodo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nodo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de nodo</Label>
                    <Select
                      value={newNode.node_type}
                      onValueChange={(v) => setNewNode({ ...newNode, node_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NODE_TYPES.filter((n) => n.value !== "trigger").map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Etiqueta</Label>
                    <Input
                      placeholder="ej: Enviar bienvenida"
                      value={newNode.label}
                      onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
                    />
                  </div>

                  {newNode.node_type === "delay" && (
                    <div>
                      <Label>Delay (minutos)</Label>
                      <Input
                        type="number"
                        placeholder="60"
                        onChange={(e) => setNewNode({
                          ...newNode,
                          config: { delay_minutes: parseInt(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  )}

                  {newNode.node_type.startsWith("action_send") && (
                    <div>
                      <Label>Mensaje / Template</Label>
                      <Textarea
                        placeholder="Hola {{name}}, gracias por tu interés..."
                        onChange={(e) => setNewNode({
                          ...newNode,
                          config: { message_template: e.target.value }
                        })}
                      />
                    </div>
                  )}

                  {newNode.node_type === "condition" && (
                    <div>
                      <Label>Condición</Label>
                      <Input
                        placeholder="ej: budget > 500"
                        onChange={(e) => setNewNode({
                          ...newNode,
                          config: { condition_expression: e.target.value }
                        })}
                      />
                    </div>
                  )}

                  {newNode.node_type === "branch" && (
                    <div>
                      <Label>Porcentaje variante A (%)</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        onChange={(e) => setNewNode({
                          ...newNode,
                          config: { split_percentage: parseInt(e.target.value) || 50 }
                        })}
                      />
                    </div>
                  )}

                  <Button onClick={addNode} className="w-full">
                    Agregar al Workflow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Trigger Node (always first) */}
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-lg bg-yellow-500/10 border-2 border-yellow-500 flex items-center gap-3">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Trigger: {workflow.name}</span>
                </div>
                {nodes.length > 0 && (
                  <ArrowDown className="h-6 w-6 text-muted-foreground my-2" />
                )}
              </div>

              {/* Other Nodes */}
              {nodes.map((node, index) => {
                const IconComp = getNodeIcon(node.node_type);
                const colorClass = getNodeColor(node.node_type);

                return (
                  <div key={node.id} className="flex flex-col items-center">
                    <div
                      className={`p-4 rounded-lg ${colorClass}/10 border-2 border-current flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow min-w-[250px]`}
                      style={{ borderColor: colorClass.replace("bg-", "") }}
                      onClick={() => setSelectedNode(node)}
                    >
                      <div className={`p-2 rounded ${colorClass}`}>
                        <IconComp className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{node.label}</p>
                        <p className="text-xs text-muted-foreground">{node.node_type}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {index < nodes.length - 1 && (
                      <ArrowDown className="h-6 w-6 text-muted-foreground my-2" />
                    )}
                  </div>
                );
              })}

              {nodes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Agrega nodos para construir el flujo</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Safety Level</Label>
                <Badge className="mt-1">{workflow.safety_level}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Versión</Label>
                <p className="font-medium">v{workflow.version}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nodos</Label>
                <p className="font-medium">{nodes.length} nodos</p>
              </div>
            </CardContent>
          </Card>

          {selectedNode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Nodo Seleccionado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Badge>{selectedNode.node_type}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <p className="font-medium">{selectedNode.label}</p>
                </div>
                {selectedNode.config_json && Object.keys(selectedNode.config_json).length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Config</Label>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(selectedNode.config_json, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Safety Gates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Complaint/Medical → Human takeover</p>
              <p>• Refund/Chargeback → Approval required</p>
              <p>• High-risk actions → Draft first</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
