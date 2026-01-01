import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, CheckCircle, XCircle, Clock, RefreshCw, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface WorkflowRun {
  id: string;
  workflow_id: string;
  record_id: string | null;
  record_type: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  logs_json: Json;
  workflows?: {
    name: string;
  };
}

export default function WorkflowRuns() {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspace.workspaceId) fetchRuns();
  }, [workspace.workspaceId]);

  const fetchRuns = async () => {
    const { data } = await supabase
      .from("workflow_runs")
      .select(`
        *,
        workflows (name)
      `)
      .eq("workspace_id", workspace.workspaceId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (data) {
      setRuns(data as WorkflowRun[]);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completado
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Fallido
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-blue-500">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Ejecutando
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Historial de Ejecuciones</h3>
        <Button variant="outline" size="sm" onClick={fetchRuns}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium">
                  {run.workflows?.name || "—"}
                </TableCell>
                <TableCell>{getStatusBadge(run.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(run.started_at), "dd/MM HH:mm")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {run.finished_at
                    ? format(new Date(run.finished_at), "dd/MM HH:mm")
                    : "—"}
                </TableCell>
                <TableCell>
                  {run.record_id ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {run.record_id.slice(0, 8)}...
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {runs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sin ejecuciones registradas</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}