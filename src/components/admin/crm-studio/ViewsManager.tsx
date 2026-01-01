import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, LayoutGrid, Eye, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

interface CRMView {
  id: string;
  object_key: string;
  role: string;
  view_name: string;
  layout_json: {
    visible_fields: string[];
    quick_actions: string[];
  };
}

interface CRMObject {
  object_key: string;
  label_plural: string;
}

interface CRMProperty {
  property_key: string;
  label: string;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "front_desk", label: "Front Desk" },
  { value: "artist", label: "Artista" },
  { value: "assistant", label: "Asistente" },
];

const QUICK_ACTIONS = [
  { value: "edit", label: "Editar" },
  { value: "delete", label: "Eliminar" },
  { value: "duplicate", label: "Duplicar" },
  { value: "send_message", label: "Enviar Mensaje" },
  { value: "create_booking", label: "Crear Cita" },
  { value: "send_deposit", label: "Enviar Depósito" },
];

export default function ViewsManager() {
  const { workspace } = useWorkspace();
  const [objects, setObjects] = useState<CRMObject[]>([]);
  const [properties, setProperties] = useState<CRMProperty[]>([]);
  const [views, setViews] = useState<CRMView[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editView, setEditView] = useState<CRMView | null>(null);
  const [newView, setNewView] = useState({
    role: "",
    view_name: "",
    visible_fields: [] as string[],
    quick_actions: [] as string[],
  });

  useEffect(() => {
    if (workspace?.id) fetchObjects();
  }, [workspace?.id]);

  useEffect(() => {
    if (selectedObject) {
      fetchProperties();
      fetchViews();
    }
  }, [selectedObject]);

  const fetchObjects = async () => {
    const { data } = await supabase
      .from("crm_objects")
      .select("object_key, label_plural")
      .eq("workspace_id", workspace?.id)
      .eq("is_enabled", true);

    if (data && data.length > 0) {
      setObjects(data);
      setSelectedObject(data[0].object_key);
    }
    setLoading(false);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from("crm_properties")
      .select("property_key, label")
      .eq("workspace_id", workspace?.id)
      .eq("object_key", selectedObject);

    if (data) setProperties(data);
  };

  const fetchViews = async () => {
    const { data } = await supabase
      .from("crm_views")
      .select("*")
      .eq("workspace_id", workspace?.id)
      .eq("object_key", selectedObject);

    if (data) {
      setViews(data.map(v => ({
        ...v,
        layout_json: v.layout_json as CRMView["layout_json"]
      })));
    }
  };

  const createView = async () => {
    if (!workspace?.id || !selectedObject || !newView.role) return;

    const { error } = await supabase.from("crm_views").insert({
      workspace_id: workspace.id,
      object_key: selectedObject,
      role: newView.role,
      view_name: newView.view_name || `Vista ${newView.role}`,
      layout_json: {
        visible_fields: newView.visible_fields,
        quick_actions: newView.quick_actions,
      },
    });

    if (error) {
      toast.error("Error al crear vista");
    } else {
      toast.success("Vista creada");
      setDialogOpen(false);
      setNewView({ role: "", view_name: "", visible_fields: [], quick_actions: [] });
      fetchViews();
    }
  };

  const updateView = async () => {
    if (!editView) return;

    await supabase
      .from("crm_views")
      .update({
        view_name: editView.view_name,
        layout_json: editView.layout_json,
      })
      .eq("id", editView.id);

    toast.success("Vista actualizada");
    setEditView(null);
    fetchViews();
  };

  const deleteView = async (id: string) => {
    await supabase.from("crm_views").delete().eq("id", id);
    toast.success("Vista eliminada");
    fetchViews();
  };

  const toggleField = (field: string, isEdit: boolean) => {
    if (isEdit && editView) {
      const fields = editView.layout_json.visible_fields.includes(field)
        ? editView.layout_json.visible_fields.filter((f) => f !== field)
        : [...editView.layout_json.visible_fields, field];
      setEditView({
        ...editView,
        layout_json: { ...editView.layout_json, visible_fields: fields },
      });
    } else {
      const fields = newView.visible_fields.includes(field)
        ? newView.visible_fields.filter((f) => f !== field)
        : [...newView.visible_fields, field];
      setNewView({ ...newView, visible_fields: fields });
    }
  };

  const toggleAction = (action: string, isEdit: boolean) => {
    if (isEdit && editView) {
      const actions = editView.layout_json.quick_actions.includes(action)
        ? editView.layout_json.quick_actions.filter((a) => a !== action)
        : [...editView.layout_json.quick_actions, action];
      setEditView({
        ...editView,
        layout_json: { ...editView.layout_json, quick_actions: actions },
      });
    } else {
      const actions = newView.quick_actions.includes(action)
        ? newView.quick_actions.filter((a) => a !== action)
        : [...newView.quick_actions, action];
      setNewView({ ...newView, quick_actions: actions });
    }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Vistas por Rol</h2>
          <p className="text-sm text-muted-foreground">
            Personaliza qué ve cada rol en cada objeto
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedObject}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Vista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Vista</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rol</Label>
                  <Select
                    value={newView.role}
                    onValueChange={(v) => setNewView({ ...newView, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre de la vista</Label>
                  <Input
                    placeholder="Vista Principal"
                    value={newView.view_name}
                    onChange={(e) => setNewView({ ...newView, view_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Campos visibles</Label>
                <div className="grid grid-cols-2 gap-2">
                  {properties.map((prop) => (
                    <div key={prop.property_key} className="flex items-center gap-2">
                      <Checkbox
                        checked={newView.visible_fields.includes(prop.property_key)}
                        onCheckedChange={() => toggleField(prop.property_key, false)}
                      />
                      <span className="text-sm">{prop.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Acciones rápidas</Label>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <div key={action.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={newView.quick_actions.includes(action.value)}
                        onCheckedChange={() => toggleAction(action.value, false)}
                      />
                      <span className="text-sm">{action.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={createView} className="w-full">
                Crear Vista
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {objects.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {objects.map((obj) => (
            <Button
              key={obj.object_key}
              variant={selectedObject === obj.object_key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedObject(obj.object_key)}
            >
              {obj.label_plural}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {views.map((view) => (
          <Card key={view.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">{view.view_name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline" className="mt-1">
                    {ROLES.find((r) => r.value === view.role)?.label || view.role}
                  </Badge>
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditView(view)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteView(view.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Campos:</p>
                  <div className="flex gap-1 flex-wrap">
                    {view.layout_json.visible_fields.map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">
                        {properties.find((p) => p.property_key === f)?.label || f}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Acciones:</p>
                  <div className="flex gap-1 flex-wrap">
                    {view.layout_json.quick_actions.map((a) => (
                      <Badge key={a} variant="outline" className="text-xs">
                        {QUICK_ACTIONS.find((qa) => qa.value === a)?.label || a}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {views.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Sin vistas configuradas</h3>
              <p className="text-sm text-muted-foreground text-center">
                Crea vistas personalizadas por rol
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit View Dialog */}
      <Dialog open={!!editView} onOpenChange={(open) => !open && setEditView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Vista</DialogTitle>
          </DialogHeader>
          {editView && (
            <div className="space-y-4">
              <div>
                <Label>Nombre de la vista</Label>
                <Input
                  value={editView.view_name}
                  onChange={(e) => setEditView({ ...editView, view_name: e.target.value })}
                />
              </div>

              <div>
                <Label className="mb-2 block">Campos visibles</Label>
                <div className="grid grid-cols-2 gap-2">
                  {properties.map((prop) => (
                    <div key={prop.property_key} className="flex items-center gap-2">
                      <Checkbox
                        checked={editView.layout_json.visible_fields.includes(prop.property_key)}
                        onCheckedChange={() => toggleField(prop.property_key, true)}
                      />
                      <span className="text-sm">{prop.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Acciones rápidas</Label>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <div key={action.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={editView.layout_json.quick_actions.includes(action.value)}
                        onCheckedChange={() => toggleAction(action.value, true)}
                      />
                      <span className="text-sm">{action.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={updateView} className="w-full">
                Guardar Cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
