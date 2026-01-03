import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, Pause, RotateCcw, XCircle, Clock, CheckCircle, 
  AlertTriangle, Activity, RefreshCw, Send, Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type WorkflowRun = Tables<'workflow_runs'>;
type WorkflowSignal = Tables<'workflow_signals'>;
type DeadLetterEntry = Tables<'workflow_dead_letters'>;

const statusConfig: Record<string, { color: string; icon: typeof Activity }> = {
  running: { color: 'bg-blue-500', icon: Activity },
  completed: { color: 'bg-green-500', icon: CheckCircle },
  failed: { color: 'bg-red-500', icon: XCircle },
  paused: { color: 'bg-yellow-500', icon: Pause },
  awaiting_signal: { color: 'bg-purple-500', icon: Clock },
  retry_scheduled: { color: 'bg-orange-500', icon: RotateCcw },
  dead_lettered: { color: 'bg-gray-500', icon: Archive },
};

export function WorkflowDashboard() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [signals, setSignals] = useState<WorkflowSignal[]>([]);
  const [deadLetters, setDeadLetters] = useState<DeadLetterEntry[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('runs');

  useEffect(() => {
    loadData();
    
    // Subscribe to realtime updates
    const runsChannel = supabase
      .channel('workflow_runs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_runs' }, () => {
        loadRuns();
      })
      .subscribe();

    const signalsChannel = supabase
      .channel('workflow_signals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_signals' }, () => {
        loadSignals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(runsChannel);
      supabase.removeChannel(signalsChannel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRuns(), loadSignals(), loadDeadLetters()]);
    setLoading(false);
  };

  const loadRuns = async () => {
    const { data, error } = await supabase
      .from('workflow_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setRuns(data);
    }
  };

  const loadSignals = async () => {
    const { data, error } = await supabase
      .from('workflow_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setSignals(data);
    }
  };

  const loadDeadLetters = async () => {
    const { data, error } = await supabase
      .from('workflow_dead_letters')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setDeadLetters(data);
    }
  };

  const executeAction = async (action: string, runId: string, payload?: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: { action, runId, ...payload }
      });

      if (error) throw error;
      toast.success(`Action "${action}" executed successfully`);
      loadData();
    } catch (err: any) {
      toast.error(`Failed to execute action: ${err.message}`);
    }
  };

  const retryDeadLetter = async (entryId: string) => {
    try {
      const entry = deadLetters.find(d => d.id === entryId);
      if (!entry || !entry.run_id) return;

      // Reset the workflow run for retry
      const { error } = await supabase
        .from('workflow_runs')
        .update({ 
          status: 'running', 
          retry_count: 0, 
          error_message: null,
          next_retry_at: null 
        })
        .eq('id', entry.run_id);

      if (error) throw error;

      // Mark dead letter as resolved
      await supabase
        .from('workflow_dead_letters')
        .update({ resolved_at: new Date().toISOString(), resolution_action: 'retry' })
        .eq('id', entryId);

      // Trigger execution
      await executeAction('resume', entry.run_id);
      toast.success('Dead letter entry requeued for processing');
    } catch (err: any) {
      toast.error(`Failed to retry: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const config = statusConfig[status || 'running'] || statusConfig.running;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {(status || 'unknown').replace('_', ' ')}
      </Badge>
    );
  };

  const stats = {
    total: runs.length,
    running: runs.filter(r => r.status === 'running').length,
    completed: runs.filter(r => r.status === 'completed').length,
    failed: runs.filter(r => r.status === 'failed').length,
    awaiting: runs.filter(r => r.status === 'awaiting_signal').length,
    deadLettered: deadLetters.filter(d => !d.resolved_at).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{stats.running}</div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-500">{stats.awaiting}</div>
            <p className="text-xs text-muted-foreground">Awaiting Signal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-500">{stats.deadLettered}</div>
            <p className="text-xs text-muted-foreground">Dead Letters</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Workflow Runs</CardTitle>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="runs">Active Runs</TabsTrigger>
                <TabsTrigger value="signals">Signals ({signals.length})</TabsTrigger>
                <TabsTrigger value="dead-letters">
                  Dead Letters ({stats.deadLettered})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="runs">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {runs.map((run) => (
                      <div
                        key={run.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedRun?.id === run.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedRun(run)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(run.status)}
                            <span className="font-medium text-sm">{run.workflow_id}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {run.started_at && format(new Date(run.started_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                        {run.current_node_id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Step: {run.current_node_id}
                          </p>
                        )}
                        {run.awaiting_signal && (
                          <p className="text-xs text-purple-500 mt-1">
                            Awaiting: {run.awaiting_signal}
                          </p>
                        )}
                        {(run.retry_count ?? 0) > 0 && (
                          <p className="text-xs text-orange-500 mt-1">
                            Retries: {run.retry_count}
                          </p>
                        )}
                      </div>
                    ))}
                    {runs.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No workflow runs found
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="signals">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {signals.map((signal) => (
                      <div key={signal.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Badge variant={!signal.processed_at ? 'default' : 'secondary'}>
                            {signal.signal_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {signal.created_at && format(new Date(signal.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Run: {signal.run_id?.slice(0, 8)}...
                        </p>
                        <p className="text-xs mt-1">
                          {signal.processed_at ? `Processed ${format(new Date(signal.processed_at), 'HH:mm')}` : 'Pending'}
                        </p>
                      </div>
                    ))}
                    {signals.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No signals found
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="dead-letters">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {deadLetters.filter(d => !d.resolved_at).map((entry) => (
                      <div key={entry.id} className="p-3 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{entry.workflow_name || entry.workflow_id}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryDeadLetter(entry.id)}
                            disabled={!entry.can_retry}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        </div>
                        <p className="text-xs text-red-600 mt-1">{entry.failure_reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Retries: {entry.retry_count ?? 0} | {entry.created_at && format(new Date(entry.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    ))}
                    {deadLetters.filter(d => !d.resolved_at).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No dead letters
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Run Details */}
        <Card>
          <CardHeader>
            <CardTitle>Run Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRun ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Workflow</p>
                  <p className="font-medium">{selectedRun.workflow_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(selectedRun.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Step</p>
                  <p>{selectedRun.current_node_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Started</p>
                  <p>{selectedRun.started_at && format(new Date(selectedRun.started_at), 'PPpp')}</p>
                </div>
                {selectedRun.finished_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p>{format(new Date(selectedRun.finished_at), 'PPpp')}</p>
                  </div>
                )}
                {selectedRun.deadline_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p>{format(new Date(selectedRun.deadline_at), 'PPpp')}</p>
                  </div>
                )}
                {selectedRun.error_message && (
                  <div>
                    <p className="text-xs text-muted-foreground">Error</p>
                    <pre className="text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded overflow-auto max-h-32">
                      {selectedRun.error_message}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedRun.status === 'running' && (
                    <Button size="sm" variant="outline" onClick={() => executeAction('pause', selectedRun.id)}>
                      <Pause className="h-3 w-3 mr-1" /> Pause
                    </Button>
                  )}
                  {selectedRun.status === 'paused' && (
                    <Button size="sm" onClick={() => executeAction('resume', selectedRun.id)}>
                      <Play className="h-3 w-3 mr-1" /> Resume
                    </Button>
                  )}
                  {selectedRun.status === 'failed' && (
                    <Button size="sm" onClick={() => executeAction('retry', selectedRun.id)}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Retry
                    </Button>
                  )}
                  {selectedRun.status === 'awaiting_signal' && (
                    <Button size="sm" variant="secondary" onClick={() => {
                      const signalName = selectedRun.awaiting_signal || 'manual';
                      executeAction('signal', selectedRun.id, { signalName, payload: {} });
                    }}>
                      <Send className="h-3 w-3 mr-1" /> Send Signal
                    </Button>
                  )}
                  {!['completed', 'cancelled'].includes(selectedRun.status || '') && (
                    <Button size="sm" variant="destructive" onClick={() => executeAction('cancel', selectedRun.id)}>
                      <XCircle className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a run to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
