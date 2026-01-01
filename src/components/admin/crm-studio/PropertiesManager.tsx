import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Type, Hash, Calendar, ToggleLeft, List, DollarSign, FileText, Link2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

interface CRMProperty {
  id: string;
  object_key: string;
  property_key: string;
  label: string;
  field_type: string;
  options_json: string[] | null;
  is_required: boolean;
  is_sensitive: boolean;
  sort_order: number;
}

interface CRMObject {
  id: string;
  object_key: string;
  label_plural: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "number", label: "Número", icon: Hash },
  { value: "money", label: "Dinero", icon: DollarSign },
  { value: "date", label: "Fecha", icon: Calendar },
  { value: "boolean", label: "Sí/No", icon: ToggleLeft },
  { value: "select", label: "Selección única", icon: List },
  { value: "multiselect", label: "Selección múltiple", icon: List },
  { value: "file", label: "Archivo", icon: FileText },
  { value: "relation", label: "Relación", icon: Link2 },
];

export default function PropertiesManager() {
  const { workspace } = useWorkspace();
  const [objects, setObjects] = useState<CRMObject[]>([]);
  const [properties, setProperties] = useState<CRMProperty[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProp, setNewProp] = useState({
    property_key: "",
    label: "",
    field_type: "text",
    options: "",
    is_required: false,
    is_sensitive: false,
  });

  useEffect(() => {
    if (workspace?.id) fetchObjects();
  }, [workspace?.id]);

  useEffect(() => {
    if (selectedObject) fetchProperties();
  }, [selectedObject]);

  const fetchObjects = async () => {
    const { data } = await supabase
      .from("crm_objects")
      .select("id, object_key, label_plural")
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
      .select("*")
      .eq("workspace_id", workspace?.id)
      .eq("object_key", selectedObject)
      .order("sort_order");

    if (data) {
      setProperties(data as CRMProperty[]);
    }
  };

  const createProperty = async () => {
    if (!workspace?.id || !selectedObject || !newProp.property_key) return;

    const options = newProp.options
      ? newProp.options.split(",").map((o) => o.trim())
      : null;

    const { error } = await supabase.from("crm_properties").insert({
      workspace_id: workspace.id,
      object_key: selectedObject,
      property_key: newProp.property_key.toLowerCase().replace(/\s+/g, "_"),
      label: newProp.label,
      field_type: newProp.field_type,
      options_json: options,
      is_required: newProp.is_required,
      is_sensitive: newProp.is_sensitive,
      sort_order: properties.length,
    });

    if (error) {
      toast.error("Error al crear campo");
    } else {
      toast.success("Campo creado");
      setDialogOpen(false);
      setNewProp({
        property_key: "",
        label: "",
        field_type: "text",
        options: "",
        is_required: false,
        is_sensitive: false,
      });
      fetchProperties();
    }
  };

  const deleteProperty = async (id: string) => {
    await supabase.from("crm_properties").delete().eq("id", id);
    toast.success("Campo eliminado");
    fetchProperties();
  };

  const getFieldIcon = (type: string) => {
    const found = FIELD_TYPES.find((f) => f.value === type);
    return found ? found.icon : Type;
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campos por Objeto</h2>
          <p className="text-sm text-muted-foreground">
            Define qué información captura cada objeto
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedObject}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Campo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Campo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Clave única</Label>
                <Input
                  placeholder="ej: preferred_style"
                  value={newProp.property_key}
                  onChange={(e) => setNewProp({ ...newProp, property_key: e.target.value })}
                />
              </div>
              <div>
                <Label>Etiqueta visible</Label>
                <Input
                  placeholder="Estilo Preferido"
                  value={newProp.label}
                  onChange={(e) => setNewProp({ ...newProp, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo de campo</Label>
                <Select
                  value={newProp.field_type}
                  onValueChange={(v) => setNewProp({ ...newProp, field_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>
                        <div className="flex items-center gap-2">
                          <ft.icon className="h-4 w-4" />
                          {ft.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(newProp.field_type === "select" || newProp.field_type === "multiselect") && (
                <div>
                  <Label>Opciones (separadas por coma)</Label>
                  <Textarea
                    placeholder="Opción 1, Opción 2, Opción 3"
                    value={newProp.options}
                    onChange={(e) => setNewProp({ ...newProp, options: e.target.value })}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Requerido</Label>
                <Switch
                  checked={newProp.is_required}
                  onCheckedChange={(v) => setNewProp({ ...newProp, is_required: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Dato sensible</Label>
                <Switch
                  checked={newProp.is_sensitive}
                  onCheckedChange={(v) => setNewProp({ ...newProp, is_sensitive: v })}
                />
              </div>
              <Button onClick={createProperty} className="w-full">
                Crear Campo
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

      <div className="space-y-3">
        {properties.map((prop) => {
          const IconComp = getFieldIcon(prop.field_type);
          return (
            <Card key={prop.id}>
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{prop.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{prop.property_key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{prop.field_type}</Badge>
                  {prop.is_required && <Badge>Requerido</Badge>}
                  {prop.is_sensitive && <Badge variant="destructive">Sensible</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteProperty(prop.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {prop.options_json && (
                <CardContent className="pt-0">
                  <div className="flex gap-1 flex-wrap">
                    {prop.options_json.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {opt}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {properties.length === 0 && selectedObject && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Type className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Sin campos configurados</h3>
              <p className="text-sm text-muted-foreground text-center">
                Agrega campos para capturar información de {selectedObject}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
