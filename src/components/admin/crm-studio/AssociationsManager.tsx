import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Link2, ArrowRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

interface Association {
  id: string;
  from_object: string;
  to_object: string;
  cardinality: string;
  label: string;
}

interface CRMObject {
  object_key: string;
  label_plural: string;
}

const CARDINALITY_OPTIONS = [
  { value: "one_to_one", label: "Uno a Uno (1:1)" },
  { value: "one_to_many", label: "Uno a Muchos (1:N)" },
  { value: "many_to_many", label: "Muchos a Muchos (N:N)" },
];

export default function AssociationsManager() {
  const { workspace } = useWorkspace();
  const [objects, setObjects] = useState<CRMObject[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAssoc, setNewAssoc] = useState({
    from_object: "",
    to_object: "",
    cardinality: "one_to_many",
    label: "",
  });

  useEffect(() => {
    if (workspace?.id) {
      fetchObjects();
      fetchAssociations();
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

  const fetchAssociations = async () => {
    const { data } = await supabase
      .from("crm_associations")
      .select("*")
      .eq("workspace_id", workspace?.id);

    if (data) setAssociations(data as Association[]);
    setLoading(false);
  };

  const createAssociation = async () => {
    if (!workspace?.id || !newAssoc.from_object || !newAssoc.to_object) return;

    const { error } = await supabase.from("crm_associations").insert({
      workspace_id: workspace.id,
      from_object: newAssoc.from_object,
      to_object: newAssoc.to_object,
      cardinality: newAssoc.cardinality,
      label: newAssoc.label || `${newAssoc.from_object}_${newAssoc.to_object}`,
    });

    if (error) {
      toast.error("Error al crear asociación");
    } else {
      toast.success("Asociación creada");
      setDialogOpen(false);
      setNewAssoc({ from_object: "", to_object: "", cardinality: "one_to_many", label: "" });
      fetchAssociations();
    }
  };

  const deleteAssociation = async (id: string) => {
    await supabase.from("crm_associations").delete().eq("id", id);
    toast.success("Asociación eliminada");
    fetchAssociations();
  };

  const getObjectLabel = (key: string) => {
    return objects.find((o) => o.object_key === key)?.label_plural || key;
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Asociaciones</h2>
          <p className="text-sm text-muted-foreground">
            Define cómo se relacionan los objetos entre sí
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={objects.length < 2}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Asociación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Asociación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Objeto origen</Label>
                <Select
                  value={newAssoc.from_object}
                  onValueChange={(v) => setNewAssoc({ ...newAssoc, from_object: v })}
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
                <Label>Objeto destino</Label>
                <Select
                  value={newAssoc.to_object}
                  onValueChange={(v) => setNewAssoc({ ...newAssoc, to_object: v })}
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
                <Label>Cardinalidad</Label>
                <Select
                  value={newAssoc.cardinality}
                  onValueChange={(v) => setNewAssoc({ ...newAssoc, cardinality: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARDINALITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createAssociation} className="w-full">
                Crear Asociación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {associations.map((assoc) => (
          <Card key={assoc.id}>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{getObjectLabel(assoc.from_object)}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{getObjectLabel(assoc.to_object)}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAssociation(assoc.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <CardTitle className="text-sm mt-2">
                {CARDINALITY_OPTIONS.find((c) => c.value === assoc.cardinality)?.label}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}

        {associations.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Sin asociaciones</h3>
              <p className="text-sm text-muted-foreground text-center">
                Conecta objetos para modelar relaciones
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
