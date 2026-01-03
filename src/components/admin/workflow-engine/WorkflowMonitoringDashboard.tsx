import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Zap,
  TrendingUp,
  BarChart3,
  Timer,
  Inbox,
  RotateCcw,
  Eye,
  Trash2,
  FastForward,
  ArrowRight,
  ChevronRight,
  Loader2
} from "lucide-react";

interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: string;
  current_step: number;
  total_steps: number;
  input: any;
  output: any;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  retry_count: number;
  next_retry_at: string | null;
  idempotency_key: string | null;
  checkpoint_data: any;
  awaiting_signal: string | null;
  timer_expires_at: string | null;
  workflow?: {
    name: string;
    trigger_type: string;
  };
}

interface WorkflowStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  retrying: number;
  awaiting: number;
  avgDuration: number;
  successRate: number;
}

interface DeadLetter {
  id: string;
  run_id: string | null;
  workflow_id: string | null;
  workflow_name: string | null;
  failure_reason: string | null;
  last_error: string | null;
  failed_at_step: string | null;
  context: any;
  input_data: any;
  can_retry: boolean;
  retry_count: number;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  resolution_action: string | null;
  created_at: string;
}

const STATUS_CONFIG = {
  running: { icon: Play, color: "text-blue-500", bg: "bg-blue-500/10", label: "Ejecutando" },
  completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Completado" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Fallido" },
  retrying: { icon: RotateCcw, color: "text-amber-500", bg: "bg-amber-500/10", label: "Reintentando" },
  awaiting_signal: { icon: Inbox, color: "text-purple-500", bg: "bg-purple-500/10", label: "Esperando señal" },
  awaiting_timer: { icon: Timer, color: "text-cyan-500", bg: "bg-cyan-500/10", label: "Esperando timer" },
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Pendiente" }
};

const WorkflowMonitoringDashboard = () => {
  const { toast } = useToast();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([]);
  const [stats, setStats] = useState<WorkflowStats>({
    total: 0, running: 0, completed: 0, failed: 0,
    retrying: 0, awaiting: 0, avgDuration: 0, successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    fetchData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('workflow-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_runs'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch workflow runs with workflow info
      const { data: runsData } = await supabase
        .from('workflow_runs')
        .select(`
          *,
          workflow:workflows(name, trigger_type)
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      // Fetch dead letters (unresolved ones)
      const { data: deadLettersData } = await supabase
        .from('workflow_dead_letters')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      const typedRuns = (runsData || []) as unknown as WorkflowRun[];
      setRuns(typedRuns);
      setDeadLetters((deadLettersData || []) as DeadLetter[]);

      // Calculate stats
      const running = typedRuns.filter(r => r.status === 'running').length;
      const completed = typedRuns.filter(r => r.status === 'completed').length;
      const failed = typedRuns.filter(r => r.status === 'failed').length;
      const retrying = typedRuns.filter(r => r.status === 'retrying').length;
      const awaiting = typedRuns.filter(r => 
        r.status === 'awaiting_signal' || r.status === 'awaiting_timer'
      ).length;

      const completedRuns = typedRuns.filter(r => r.completed_at && r.started_at);
      const avgDuration = completedRuns.length > 0
        ? completedRuns.reduce((acc, r) => {
            const duration = new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime();
            return acc + duration;
          }, 0) / completedRuns.length / 1000
        : 0;

      const successRate = typedRuns.length > 0 
        ? (completed / typedRuns.length) * 100 
        : 0;

      setStats({
        total: typedRuns.length,
        running,
        completed,
        failed,
        retrying,
        awaiting,
        avgDuration,
        successRate
      });

    } catch (error) {
      console.error('Error fetching workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const retryWorkflow = async (runId: string) => {
    try {
      const { error } = await supabase.functions.invoke('workflow-executor', {
        body: { action: 'retry', run_id: runId }
      });

      if (error) throw error;
      toast({ title: "Reiniciando workflow", description: "El workflow se está ejecutando nuevamente" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const cancelWorkflow = async (runId: string) => {
    try {
      const { error } = await supabase
        .from('workflow_runs')
        .update({ status: 'failed', error_message: 'Cancelado manualmente' })
        .eq('id', runId);

      if (error) throw error;
      toast({ title: "Workflow cancelado" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const sendSignal = async (runId: string, signalType: string) => {
    try {
      const { error } = await supabase.from('workflow_signals').insert({
        workflow_run_id: runId,
        signal_type: signalType,
        signal_data: { manual: true }
      });

      if (error) throw error;
      toast({ title: "Señal enviada", description: `Signal ${signalType} enviada al workflow` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resolveDeadLetter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflow_dead_letters')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Dead letter resuelto" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  };

  const activeRuns = runs.filter(r => 
    ['running', 'retrying', 'awaiting_signal', 'awaiting_timer'].includes(r.status)
  );

  const completedRuns = runs.filter(r => r.status === 'completed');
  const failedRuns = runs.filter(r => r.status === 'failed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Activos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.running}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Completados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Fallidos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.failed}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Reintentando</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.retrying}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Esperando</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.awaiting}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Dead Letters</span>
            </div>
            <p className="text-2xl font-bold mt-1">{deadLetters.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-cyan-500" />
              <span className="text-xs text-muted-foreground">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgDuration.toFixed(1)}s</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.successRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Runs List */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 backdrop-blur-xl border-border/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Workflow Runs
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="active" className="gap-2">
                    <Play className="h-3 w-3" />
                    Activos ({activeRuns.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Completados ({completedRuns.length})
                  </TabsTrigger>
                  <TabsTrigger value="failed" className="gap-2">
                    <XCircle className="h-3 w-3" />
                    Fallidos ({failedRuns.length})
                  </TabsTrigger>
                  <TabsTrigger value="dead-letters" className="gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    Dead Letters ({deadLetters.length})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[500px]">
                  <TabsContent value="active" className="mt-0 space-y-2">
                    <AnimatePresence>
                      {activeRuns.map((run) => (
                        <WorkflowRunCard
                          key={run.id}
                          run={run}
                          onSelect={() => setSelectedRun(run)}
                          onRetry={() => retryWorkflow(run.id)}
                          onCancel={() => cancelWorkflow(run.id)}
                          onSendSignal={(signal) => sendSignal(run.id, signal)}
                          isSelected={selectedRun?.id === run.id}
                        />
                      ))}
                    </AnimatePresence>
                    {activeRuns.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No hay workflows activos</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="completed" className="mt-0 space-y-2">
                    {completedRuns.slice(0, 20).map((run) => (
                      <WorkflowRunCard
                        key={run.id}
                        run={run}
                        onSelect={() => setSelectedRun(run)}
                        isSelected={selectedRun?.id === run.id}
                      />
                    ))}
                    {completedRuns.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No hay workflows completados</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="failed" className="mt-0 space-y-2">
                    {failedRuns.map((run) => (
                      <WorkflowRunCard
                        key={run.id}
                        run={run}
                        onSelect={() => setSelectedRun(run)}
                        onRetry={() => retryWorkflow(run.id)}
                        isSelected={selectedRun?.id === run.id}
                      />
                    ))}
                    {failedRuns.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No hay workflows fallidos</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="dead-letters" className="mt-0 space-y-2">
                    {deadLetters.map((dl) => (
                      <motion.div
                        key={dl.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border border-red-500/30 bg-red-500/5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="destructive">Dead Letter</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(dl.created_at), { locale: es, addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-2">{dl.failure_reason || dl.last_error || 'Unknown error'}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Retries: {dl.retry_count}</Badge>
                          <Button size="sm" variant="outline" onClick={() => resolveDeadLetter(dl.id)}>
                            Resolver
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    {deadLetters.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No hay dead letters</p>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Run Details */}
        <div>
          <Card className="bg-card/50 backdrop-blur-xl border-border/30 sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedRun ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Workflow</p>
                    <p className="font-medium">{selectedRun.workflow?.name || 'Unknown'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <Badge className={getStatusConfig(selectedRun.status).bg}>
                      {getStatusConfig(selectedRun.status).label}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Progreso</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress 
                        value={(selectedRun.current_step / (selectedRun.total_steps || 1)) * 100} 
                        className="flex-1"
                      />
                      <span className="text-sm">
                        {selectedRun.current_step}/{selectedRun.total_steps || '?'}
                      </span>
                    </div>
                  </div>

                  {selectedRun.error_message && (
                    <div>
                      <p className="text-sm text-muted-foreground">Error</p>
                      <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded mt-1">
                        {selectedRun.error_message}
                      </p>
                    </div>
                  )}

                  {selectedRun.awaiting_signal && (
                    <div>
                      <p className="text-sm text-muted-foreground">Esperando señal</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{selectedRun.awaiting_signal}</Badge>
                        <Button 
                          size="sm" 
                          onClick={() => sendSignal(selectedRun.id, selectedRun.awaiting_signal!)}
                        >
                          Enviar señal
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedRun.timer_expires_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Timer expira</p>
                      <p className="text-sm">
                        {format(new Date(selectedRun.timer_expires_at), 'PPp', { locale: es })}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Input</p>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                      {JSON.stringify(selectedRun.input, null, 2)}
                    </pre>
                  </div>

                  {selectedRun.output && (
                    <div>
                      <p className="text-sm text-muted-foreground">Output</p>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                        {JSON.stringify(selectedRun.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Iniciado</p>
                    <p className="text-sm">
                      {format(new Date(selectedRun.started_at), 'PPp', { locale: es })}
                    </p>
                  </div>

                  {selectedRun.retry_count > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reintentos</p>
                      <Badge variant="outline">{selectedRun.retry_count}</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Selecciona un workflow para ver detalles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Sub-component for workflow run cards
interface WorkflowRunCardProps {
  run: WorkflowRun;
  onSelect: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onSendSignal?: (signal: string) => void;
  isSelected: boolean;
}

const WorkflowRunCard = ({ run, onSelect, onRetry, onCancel, onSendSignal, isSelected }: WorkflowRunCardProps) => {
  const statusConfig = STATUS_CONFIG[run.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border/50 hover:border-border bg-card/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${statusConfig.bg}`}>
            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
          </div>
          <div>
            <p className="font-medium text-sm">{run.workflow?.name || 'Unknown Workflow'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(run.started_at), { locale: es, addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {run.status === 'running' && (
            <Badge variant="outline" className="text-xs">
              {run.current_step}/{run.total_steps || '?'}
            </Badge>
          )}
          {run.awaiting_signal && onSendSignal && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => { e.stopPropagation(); onSendSignal(run.awaiting_signal!); }}
            >
              <Zap className="h-3 w-3" />
            </Button>
          )}
          {(run.status === 'failed' || run.status === 'retrying') && onRetry && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          {run.status === 'running' && onCancel && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {run.status === 'running' && (
        <Progress 
          value={(run.current_step / (run.total_steps || 1)) * 100} 
          className="h-1 mt-2"
        />
      )}

      {run.error_message && (
        <p className="text-xs text-red-400 mt-2 truncate">{run.error_message}</p>
      )}
    </motion.div>
  );
};

export default WorkflowMonitoringDashboard;
