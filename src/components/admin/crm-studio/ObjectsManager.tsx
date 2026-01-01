import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Database, Users, Calendar, DollarSign, Package, Ticket, Building2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

interface CRMObject {
  id: string;
  object_key: string;
  label_singular: string;
  label_plural: string;
  icon: string;
  object_type: "standard" | "custom";
  is_enabled: boolean;
}

const ICON_OPTIONS = [
  { value: "users", label: "Usuarios", icon: Users },
  { value: "calendar", label: "Calendario", icon: Calendar },
  { value: "dollar", label: "Dinero", icon: DollarSign },
  { value: "package", label: "Paquete", icon: Package },
  { value: "ticket", label: "Ticket", icon: Ticket },
  { value: "building", label: "Edificio", icon: Building2 },
  { value: "database", label: "Base de datos", icon: Database },
];

const TEMPLATES = [
  {
    name: "Tattoo Studio Template",
    objects: [
      { key: "clients", singular: "Cliente", plural: "Clientes", icon: "users" },
      { key: "bookings", singular: "Cita", plural: "Citas", icon: "calendar" },
      { key: "artists", singular: "Artista", plural: "Artistas", icon: "users" },
      { key: "payments", singular: "Pago", plural: "Pagos", icon: "dollar" },
      { key: "aftercare", singular: "Aftercare", plural: "Aftercare", icon: "ticket" },
    ],
  },
  {
    name: "Solo Artist Template",
    objects: [
      { key: "clients", singular: "Cliente", plural: "Clientes", icon: "users" },
      { key: "projects", singular: "Proyecto", plural: "Proyectos", icon: "package" },
      { key: "sessions", singular: "Sesión", plural: "Sesiones", icon: "calendar" },
    ],
  },
  {
    name: "High Volume Walk-in Template",
    objects: [
      { key: "walkins", singular: "Walk-in", plural: "Walk-ins", icon: "users" },
      { key: "queue", singular: "En Cola", plural: "Cola", icon: "ticket" },
      { key: "flash", singular: "Flash", plural: "Flash Designs", icon: "package" },
    ],
  },
];

export default function ObjectsManager() {
  const { workspace } = useWorkspace();
  const [objects, setObjects] = useState<CRMObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newObject, setNewObject] = useState({
    object_key: "",
    label_singular: "",
    label_plural: "",
    icon: "database",
  });

  useEffect(() => {
    if (workspace?.id) fetchObjects();
  }, [workspace?.id]);

  const fetchObjects = async () => {
    const { data, error } = await supabase
      .from("crm_objects")
      .select("*")
      .eq("workspace_id", workspace?.id)
      .order("created_at");

    if (!error && data) {
      setObjects(data as CRMObject[]);
    }
    setLoading(false);
  };

  const createObject = async () => {
    if (!workspace?.id || !newObject.object_key) return;

    const { error } = await supabase.from("crm_objects").insert({
      workspace_id: workspace.id,
      object_key: newObject.object_key.toLowerCase().replace(/\s+/g, "_"),
      label_singular: newObject.label_singular,
      label_plural: newObject.label_plural,
      icon: newObject.icon,
      object_type: "custom",
      is_enabled: true,
    });

    if (error) {
      toast.error("Error al crear objeto");
    } else {
      toast.success("Objeto creado");
      setDialogOpen(false);
      setNewObject({ object_key: "", label_singular: "", label_plural: "", icon: "database" });
      fetchObjects();
    }
  };

  const applyTemplate = async (template: typeof TEMPLATES[0]) => {
    if (!workspace?.id) return;

    for (const obj of template.objects) {
      await supabase.from("crm_objects").upsert({
        workspace_id: workspace.id,
        object_key: obj.key,
        label_singular: obj.singular,
        label_plural: obj.plural,
        icon: obj.icon,
        object_type: "standard",
        is_enabled: true,
      }, { onConflict: "workspace_id,object_key" });
    }

    toast.success(`Template "${template.name}" aplicado`);
    setTemplateDialogOpen(false);
    fetchObjects();
  };

  const toggleObject = async (id: string, enabled: boolean) => {
    await supabase.from("crm_objects").update({ is_enabled: enabled }).eq("id", id);
    fetchObjects();
  };

  const getIconComponent = (iconName: string) => {
    const found = ICON_OPTIONS.find((i) => i.value === iconName);
    return found ? found.icon : Database;
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Objetos del CRM</h2>
          <p className="text-sm text-muted-foreground">
            Define qué entidades maneja tu estudio
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Smart Defaults</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {TEMPLATES.map((template) => (
                  <Card
                    key={template.name}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="py-3">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>
                        {template.objects.map((o) => o.plural).join(", ")}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Objeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Objeto Personalizado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Clave única</Label>
                  <Input
                    placeholder="ej: custom_projects"
                    value={newObject.object_key}
                    onChange={(e) => setNewObject({ ...newObject, object_key: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Singular</Label>
                    <Input
                      placeholder="Proyecto"
                      value={newObject.label_singular}
                      onChange={(e) => setNewObject({ ...newObject, label_singular: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Plural</Label>
                    <Input
                      placeholder="Proyectos"
                      value={newObject.label_plural}
                      onChange={(e) => setNewObject({ ...newObject, label_plural: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Icono</Label>
                  <Select
                    value={newObject.icon}
                    onValueChange={(v) => setNewObject({ ...newObject, icon: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createObject} className="w-full">
                  Crear Objeto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {objects.map((obj) => {
          const IconComp = getIconComponent(obj.icon);
          return (
            <Card key={obj.id} className={!obj.is_enabled ? "opacity-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <IconComp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{obj.label_plural}</CardTitle>
                    <CardDescription>{obj.object_key}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={obj.is_enabled}
                  onCheckedChange={(v) => toggleObject(obj.id, v)}
                />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge variant={obj.object_type === "standard" ? "default" : "secondary"}>
                    {obj.object_type === "standard" ? "Estándar" : "Custom"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {objects.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Sin objetos configurados</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Usa un template o crea objetos personalizados
              </p>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Comenzar con Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
