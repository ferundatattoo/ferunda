import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Play, CheckCircle, XCircle, Clock, RefreshCw, Eye, Pause, RotateCcw, 
  AlertTriangle, Timer, Send 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WorkflowRun {
  id: string;
  workflow_id: string | null;
  status: string;
  current_node_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  deadline_at: string | null;
  error_message: string | null;
  retry_count: number | null;
  context_json: Record<string, unknown> | null;
  awaiting_signal: string | null;
  workflows?: {
    name: string;
  } | null;
}

export default function WorkflowRuns() {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      setRuns(data.map(run => ({
        ...run,
        context_json: run.context_json as Record<string, unknown> | null,
      })));
    }
    setLoading(false);
  };

  const handleAction = async (runId: string, action: string) => {
    try {
      const { error } = await supabase.functions.invoke("workflow-executor", {
        body: { action, run_id: runId }
      });

      if (error) throw error;
      toast.success(`Acción "${action}" ejecutada`);
      fetchRuns();
    } catch (err) {
      toast.error("Error al ejecutar acción");
      console.error(err);
    }
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
      case "paused":
        return (
          <Badge variant="outline">
            <Pause className="h-3 w-3 mr-1" />
            Pausado
          </Badge>
        );
      case "awaiting_signal":
        return (
          <Badge className="bg-yellow-500">
            <Send className="h-3 w-3 mr-1" />
            Esperando señal
          </Badge>
        );
      case "awaiting_timer":
        return (
          <Badge className="bg-purple-500">
            <Timer className="h-3 w-3 mr-1" />
            Timer activo
          </Badge>
        );
      case "retrying":
        return (
          <Badge className="bg-orange-500">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reintentando
          </Badge>
        );
      case "dead_letter":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Dead Letter
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const viewDetails = (run: WorkflowRun) => {
    setSelectedRun(run);
    setDetailsOpen(true);
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
              <TableHead>Paso actual</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Reintentos</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
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
                  {run.current_node_id?.slice(0, 8) || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {run.started_at
                    ? format(new Date(run.started_at), "dd/MM HH:mm")
                    : "—"}
                </TableCell>
                <TableCell>
                  {run.retry_count && run.retry_count > 0 ? (
                    <Badge variant="outline">{run.retry_count}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => viewDetails(run)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {run.status === "paused" && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleAction(run.id, "resume")}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {run.status === "running" && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleAction(run.id, "pause")}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {run.status === "failed" && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleAction(run.id, "retry")}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de Ejecución</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{selectedRun.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedRun.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nodo actual</p>
                  <p className="font-mono text-sm">{selectedRun.current_node_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reintentos</p>
                  <p>{selectedRun.retry_count || 0}</p>
                </div>
                {selectedRun.deadline_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p>{format(new Date(selectedRun.deadline_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                )}
                {selectedRun.error_message && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Error</p>
                    <p className="text-destructive text-sm">{selectedRun.error_message}</p>
                  </div>
                )}
              </div>
              {selectedRun.context_json && Object.keys(selectedRun.context_json).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Contexto</p>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedRun.context_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}