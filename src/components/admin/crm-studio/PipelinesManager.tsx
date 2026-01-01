import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GitBranch, GripVertical, Trash2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

interface Pipeline {
  id: string;
  object_key: string;
  pipeline_key: string;
  label: string;
  stages_json: { key: string; label: string; color: string }[];
  default_stage: string;
}

interface CRMObject {
  object_key: string;
  label_plural: string;
}

const STAGE_COLORS = [
  { value: "gray", label: "Gris", class: "bg-gray-500" },
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "yellow", label: "Amarillo", class: "bg-yellow-500" },
  { value: "red", label: "Rojo", class: "bg-red-500" },
  { value: "purple", label: "Morado", class: "bg-purple-500" },
];

const DEFAULT_STAGES = [
  { key: "new", label: "Nuevo", color: "gray" },
  { key: "in_progress", label: "En Progreso", color: "blue" },
  { key: "completed", label: "Completado", color: "green" },
  { key: "cancelled", label: "Cancelado", color: "red" },
];

export default function PipelinesManager() {
  const { workspace } = useWorkspace();
  const [objects, setObjects] = useState<CRMObject[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newPipeline, setNewPipeline] = useState({
    object_key: "",
    pipeline_key: "",
    label: "",
  });
  const [newStage, setNewStage] = useState({ key: "", label: "", color: "gray" });

  useEffect(() => {
    if (workspace?.id) {
      fetchObjects();
      fetchPipelines();
    }
  }, [workspace?.id]);

  const fetchObjects = async () => {
    const { data } = await supabase
      .from("crm_objects")
      .select("object_key, label_plural")
      .eq("workspace_id", workspace?.id)
      .eq("is_enabled", true);

    if (data) setObjects(data);
  };

  const fetchPipelines = async () => {
    const { data } = await supabase
      .from("crm_pipelines")
      .select("*")
      .eq("workspace_id", workspace?.id);

    if (data) {
      const mapped = data.map((p) => ({
        ...p,
        stages_json: p.stages_json as Pipeline["stages_json"],
      }));
      setPipelines(mapped);
    }
    setLoading(false);
  };

  const createPipeline = async () => {
    if (!workspace?.id || !newPipeline.object_key || !newPipeline.pipeline_key) return;

    const { error } = await supabase.from("crm_pipelines").insert({
      workspace_id: workspace.id,
      object_key: newPipeline.object_key,
      pipeline_key: newPipeline.pipeline_key.toLowerCase().replace(/\s+/g, "_"),
      label: newPipeline.label,
      stages_json: DEFAULT_STAGES,
      default_stage: "new",
    });

    if (error) {
      toast.error("Error al crear pipeline");
    } else {
      toast.success("Pipeline creado");
      setDialogOpen(false);
      setNewPipeline({ object_key: "", pipeline_key: "", label: "" });
      fetchPipelines();
    }
  };

  const addStage = async () => {
    if (!selectedPipeline || !newStage.key) return;

    const updatedStages = [...selectedPipeline.stages_json, newStage];
    
    await supabase
      .from("crm_pipelines")
      .update({ stages_json: updatedStages })
      .eq("id", selectedPipeline.id);

    toast.success("Etapa agregada");
    setStageDialogOpen(false);
    setNewStage({ key: "", label: "", color: "gray" });
    fetchPipelines();
  };

  const removeStage = async (pipeline: Pipeline, stageKey: string) => {
    const updatedStages = pipeline.stages_json.filter((s) => s.key !== stageKey);
    
    await supabase
      .from("crm_pipelines")
      .update({ stages_json: updatedStages })
      .eq("id", pipeline.id);

    toast.success("Etapa eliminada");
    fetchPipelines();
  };

  const getObjectLabel = (key: string) => {
    return objects.find((o) => o.object_key === key)?.label_plural || key;
  };

  const getColorClass = (color: string) => {
    return STAGE_COLORS.find((c) => c.value === color)?.class || "bg-gray-500";
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pipelines</h2>
          <p className="text-sm text-muted-foreground">
            Define etapas y flujos para cada objeto
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={objects.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Pipeline</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Objeto</Label>
                <Select
                  value={newPipeline.object_key}
                  onValueChange={(v) => setNewPipeline({ ...newPipeline, object_key: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {objects.map((obj) => (
                      <SelectItem key={obj.object_key} value={obj.object_key}>
                        {obj.label_plural}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Clave única</Label>
                <Input
                  placeholder="ej: sales_pipeline"
                  value={newPipeline.pipeline_key}
                  onChange={(e) => setNewPipeline({ ...newPipeline, pipeline_key: e.target.value })}
                />
              </div>
              <div>
                <Label>Nombre visible</Label>
                <Input
                  placeholder="Pipeline de Ventas"
                  value={newPipeline.label}
                  onChange={(e) => setNewPipeline({ ...newPipeline, label: e.target.value })}
                />
              </div>
              <Button onClick={createPipeline} className="w-full">
                Crear Pipeline
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{pipeline.label}</CardTitle>
                  <CardDescription>
                    {getObjectLabel(pipeline.object_key)} · {pipeline.pipeline_key}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPipeline(pipeline);
                    setStageDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Etapa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {pipeline.stages_json.map((stage, index) => (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted min-w-max">
                      <div className={`w-3 h-3 rounded-full ${getColorClass(stage.color)}`} />
                      <span className="text-sm font-medium">{stage.label}</span>
                      {stage.key === pipeline.default_stage && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeStage(pipeline, stage.key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {index < pipeline.stages_json.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {pipelines.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Sin pipelines</h3>
              <p className="text-sm text-muted-foreground text-center">
                Crea pipelines para definir flujos de trabajo
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clave única</Label>
              <Input
                placeholder="ej: waiting_deposit"
                value={newStage.key}
                onChange={(e) => setNewStage({ ...newStage, key: e.target.value })}
              />
            </div>
            <div>
              <Label>Nombre visible</Label>
              <Input
                placeholder="Esperando Depósito"
                value={newStage.label}
                onChange={(e) => setNewStage({ ...newStage, label: e.target.value })}
              />
            </div>
            <div>
              <Label>Color</Label>
              <Select
                value={newStage.color}
                onValueChange={(v) => setNewStage({ ...newStage, color: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addStage} className="w-full">
              Agregar Etapa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
