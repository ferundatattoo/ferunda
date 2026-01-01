import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Permission {
  id: string;
  role: string;
  object_key: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  field_rules_json: Json;
}

interface CRMObject {
  object_key: string;
  label_plural: string;
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "front_desk", label: "Front Desk" },
  { value: "artist", label: "Artista" },
  { value: "assistant", label: "Asistente" },
];

export default function PermissionsManager() {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);
  const [objects, setObjects] = useState<CRMObject[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPerm, setNewPerm] = useState({
    role: "",
    object_key: "",
    can_create: true,
    can_read: true,
    can_update: true,
    can_delete: false,
  });

  useEffect(() => {
    if (workspace.workspaceId) {
      fetchObjects();
      fetchPermissions();
    }
  }, [workspace.workspaceId]);

  const fetchObjects = async () => {
    const { data } = await supabase
      .from("crm_objects")
      .select("object_key, label_plural")
      .eq("workspace_id", workspace.workspaceId)
      .eq("enabled", true);

    if (data) setObjects(data);
  };

  const fetchPermissions = async () => {
    const { data } = await supabase
      .from("crm_permissions")
      .select("*")
      .eq("workspace_id", workspace.workspaceId);

    if (data) {
      setPermissions(data as Permission[]);
    }
    setLoading(false);
  };

  const createPermission = async () => {
    if (!workspace.workspaceId || !newPerm.role || !newPerm.object_key) return;

    const { error } = await supabase.from("crm_permissions").insert({
      workspace_id: workspace.workspaceId,
      role: newPerm.role,
      object_key: newPerm.object_key,
      can_create: newPerm.can_create,
      can_read: newPerm.can_read,
      can_update: newPerm.can_update,
      can_delete: newPerm.can_delete,
    });

    if (error) {
      toast.error("Error al crear permiso");
    } else {
      toast.success("Permiso creado");
      setDialogOpen(false);
      setNewPerm({
        role: "",
        object_key: "",
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: false,
      });
      fetchPermissions();
    }
  };

  const updatePermission = async (id: string, field: keyof Permission, value: boolean) => {
    await supabase
      .from("crm_permissions")
      .update({ [field]: value })
      .eq("id", id);

    fetchPermissions();
  };

  const deletePermission = async (id: string) => {
    await supabase.from("crm_permissions").delete().eq("id", id);
    toast.success("Permiso eliminado");
    fetchPermissions();
  };

  const getObjectLabel = (key: string) => {
    return objects.find((o) => o.object_key === key)?.label_plural || key;
  };

  // Group permissions by role
  const permissionsByRole = ROLES.map((role) => ({
    role: role.value,
    label: role.label,
    permissions: permissions.filter((p) => p.role === role.value),
  }));

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Permisos</h2>
          <p className="text-sm text-muted-foreground">
            Controla qué puede hacer cada rol con cada objeto
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={objects.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Permiso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Permiso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rol</Label>
                <Select
                  value={newPerm.role}
                  onValueChange={(v) => setNewPerm({ ...newPerm, role: v })}
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
                <Label>Objeto</Label>
                <Select
                  value={newPerm.object_key}
                  onValueChange={(v) => setNewPerm({ ...newPerm, object_key: v })}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>Crear</Label>
                  <Switch
                    checked={newPerm.can_create}
                    onCheckedChange={(v) => setNewPerm({ ...newPerm, can_create: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Leer</Label>
                  <Switch
                    checked={newPerm.can_read}
                    onCheckedChange={(v) => setNewPerm({ ...newPerm, can_read: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Actualizar</Label>
                  <Switch
                    checked={newPerm.can_update}
                    onCheckedChange={(v) => setNewPerm({ ...newPerm, can_update: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Eliminar</Label>
                  <Switch
                    checked={newPerm.can_delete}
                    onCheckedChange={(v) => setNewPerm({ ...newPerm, can_delete: v })}
                  />
                </div>
              </div>
              <Button onClick={createPermission} className="w-full">
                Crear Permiso
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {permissionsByRole.map((group) => (
          <Card key={group.role}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {group.permissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Objeto</TableHead>
                      <TableHead className="text-center w-20">Crear</TableHead>
                      <TableHead className="text-center w-20">Leer</TableHead>
                      <TableHead className="text-center w-20">Editar</TableHead>
                      <TableHead className="text-center w-20">Eliminar</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.permissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell>
                          <Badge variant="outline">{getObjectLabel(perm.object_key)}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.can_create}
                            onCheckedChange={(v) => updatePermission(perm.id, "can_create", v)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.can_read}
                            onCheckedChange={(v) => updatePermission(perm.id, "can_read", v)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.can_update}
                            onCheckedChange={(v) => updatePermission(perm.id, "can_update", v)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={perm.can_delete}
                            onCheckedChange={(v) => updatePermission(perm.id, "can_delete", v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePermission(perm.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin permisos configurados para este rol
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}