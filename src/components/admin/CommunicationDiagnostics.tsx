import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { eventBus } from '@/lib/eventBus';
import { getBridgeStats, getBridgeContext, createManualNotification } from '@/lib/eventBridge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  Activity,
  Bell,
  Radio,
  Workflow,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Send,
  PlayCircle,
  TestTube2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowRun {
  id: string;
  workflow_id: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  message?: string;
  duration?: number;
}

const CommunicationDiagnostics = () => {
  const realtimeState = useGlobalRealtime();
  const [bridgeStats, setBridgeStats] = useState(getBridgeStats());
  const [bridgeContext, setBridgeContext] = useState(getBridgeContext());
  const [eventHistory, setEventHistory] = useState(eventBus.getHistory());
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowRun[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { workspaceId } = useWorkspace(user?.id ?? null);

  useEffect(() => {
    fetchDiagnosticsData();
    
    // Refresh periodically
    const interval = setInterval(() => {
      setBridgeStats(getBridgeStats());
      setBridgeContext(getBridgeContext());
      setEventHistory(eventBus.getHistory());
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchDiagnosticsData = async () => {
    setLoading(true);
    try {
      // Fetch recent workflow runs
      const { data: workflows } = await supabase
        .from('workflow_runs')
        .select('id, workflow_id, status, started_at, finished_at')
        .order('started_at', { ascending: false })
        .limit(10);

      setRecentWorkflows((workflows as WorkflowRun[]) || []);

      // Count recent notifications
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEvent = () => {
    eventBus.emit('booking:created', {
      bookingId: `test-${Date.now()}`,
      clientEmail: 'test@example.com',
      clientName: 'Test Client',
    });
    toast({
      title: 'Test Event Sent',
      description: 'booking:created event emitted',
    });
    setEventHistory(eventBus.getHistory());
    setBridgeStats(getBridgeStats());
  };

  // Phase 6: Self-test functions
  const runAllTests = async () => {
    setRunningTests(true);
    setTestResults([
      { name: 'EventBus', status: 'pending' },
      { name: 'Bridge Context', status: 'pending' },
      { name: 'Notifications Dispatcher', status: 'pending' },
      { name: 'Realtime Connection', status: 'pending' },
      { name: 'Database Access', status: 'pending' },
    ]);

    const results: TestResult[] = [];

    // Test 1: EventBus
    setTestResults(prev => prev.map(t => t.name === 'EventBus' ? { ...t, status: 'running' } : t));
    const startEventBus = Date.now();
    try {
      const initialCount = eventBus.getHistory().length;
      eventBus.emit('booking:created', { bookingId: 'test-diag', clientEmail: 'diag@test.com' });
      const newCount = eventBus.getHistory().length;
      results.push({
        name: 'EventBus',
        status: newCount > initialCount ? 'pass' : 'fail',
        message: newCount > initialCount ? `Event emitted (${newCount} in history)` : 'Event not recorded',
        duration: Date.now() - startEventBus,
      });
    } catch (e) {
      results.push({ name: 'EventBus', status: 'fail', message: String(e), duration: Date.now() - startEventBus });
    }
    setTestResults([...results, ...testResults.filter(t => !results.find(r => r.name === t.name))]);

    // Test 2: Bridge Context
    setTestResults(prev => prev.map(t => t.name === 'Bridge Context' ? { ...t, status: 'running' } : t));
    const startContext = Date.now();
    const ctx = getBridgeContext();
    results.push({
      name: 'Bridge Context',
      status: ctx.workspaceId ? 'pass' : 'fail',
      message: ctx.workspaceId ? `Workspace: ${ctx.workspaceId.substring(0, 8)}...` : 'No workspace context',
      duration: Date.now() - startContext,
    });
    setTestResults([...results, ...testResults.filter(t => !results.find(r => r.name === t.name))]);

    // Test 3: Notifications Dispatcher
    setTestResults(prev => prev.map(t => t.name === 'Notifications Dispatcher' ? { ...t, status: 'running' } : t));
    const startNotif = Date.now();
    if (workspaceId && user?.id) {
      try {
        const { error } = await createManualNotification({
          workspaceId,
          type: 'system',
          title: '🧪 Test de Diagnóstico',
          message: 'Esta es una notificación de prueba del sistema',
          priority: 'low',
          specificUserIds: [user.id],
        });
        results.push({
          name: 'Notifications Dispatcher',
          status: error ? 'fail' : 'pass',
          message: error ? `Error: ${error.message}` : 'Notification created successfully',
          duration: Date.now() - startNotif,
        });
      } catch (e) {
        results.push({ name: 'Notifications Dispatcher', status: 'fail', message: String(e), duration: Date.now() - startNotif });
      }
    } else {
      results.push({
        name: 'Notifications Dispatcher',
        status: 'fail',
        message: 'No workspace or user context',
        duration: Date.now() - startNotif,
      });
    }
    setTestResults([...results, ...testResults.filter(t => !results.find(r => r.name === t.name))]);

    // Test 4: Realtime Connection
    setTestResults(prev => prev.map(t => t.name === 'Realtime Connection' ? { ...t, status: 'running' } : t));
    const startRealtime = Date.now();
    results.push({
      name: 'Realtime Connection',
      status: realtimeState.status === 'connected' ? 'pass' : 'fail',
      message: `Status: ${realtimeState.status}, ${realtimeState.connectedTables.length} tables, ${realtimeState.eventCount} events`,
      duration: Date.now() - startRealtime,
    });
    setTestResults([...results, ...testResults.filter(t => !results.find(r => r.name === t.name))]);

    // Test 5: Database Access
    setTestResults(prev => prev.map(t => t.name === 'Database Access' ? { ...t, status: 'running' } : t));
    const startDb = Date.now();
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });
      results.push({
        name: 'Database Access',
        status: error ? 'fail' : 'pass',
        message: error ? `Error: ${error.message}` : `${count} notifications total`,
        duration: Date.now() - startDb,
      });
    } catch (e) {
      results.push({ name: 'Database Access', status: 'fail', message: String(e), duration: Date.now() - startDb });
    }

    setTestResults(results);
    setRunningTests(false);

    // Refresh data after tests
    await fetchDiagnosticsData();
    setBridgeStats(getBridgeStats());

    const passCount = results.filter(r => r.status === 'pass').length;
    toast({
      title: `Tests Completed: ${passCount}/${results.length} PASS`,
      description: passCount === results.length ? '✅ All systems operational' : '⚠️ Some tests failed',
      variant: passCount === results.length ? 'default' : 'destructive',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500/20 text-green-500';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'error':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getWorkflowStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTestStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Phase 6: Self-Test Panel */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="w-5 h-5 text-primary" />
                Self-Test Suite
              </CardTitle>
              <CardDescription>
                Run comprehensive tests to verify all communication systems
              </CardDescription>
            </div>
            <Button 
              onClick={runAllTests} 
              disabled={runningTests}
              className="gap-2"
            >
              {runningTests ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              Run All Tests
            </Button>
          </div>
        </CardHeader>
        {testResults.length > 0 && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {testResults.map((test) => (
                <div
                  key={test.name}
                  className={`p-3 rounded-lg border ${
                    test.status === 'pass' ? 'bg-green-500/10 border-green-500/30' :
                    test.status === 'fail' ? 'bg-red-500/10 border-red-500/30' :
                    test.status === 'running' ? 'bg-blue-500/10 border-blue-500/30' :
                    'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getTestStatusIcon(test.status)}
                    <span className="font-medium text-sm">{test.name}</span>
                  </div>
                  {test.message && (
                    <p className="text-xs text-muted-foreground truncate">{test.message}</p>
                  )}
                  {test.duration !== undefined && (
                    <p className="text-xs text-muted-foreground">{test.duration}ms</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Realtime</p>
                <p className="text-2xl font-bold">{realtimeState.connectedTables.length}</p>
                <p className="text-xs text-muted-foreground">tables connected</p>
              </div>
              <Badge className={getStatusColor(realtimeState.status)}>
                <Radio className="w-3 h-3 mr-1" />
                {realtimeState.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">EventBus</p>
                <p className="text-2xl font-bold">{eventHistory.length}</p>
                <p className="text-xs text-muted-foreground">events in history</p>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications</p>
                <p className="text-2xl font-bold">{notificationCount}</p>
                <p className="text-xs text-muted-foreground">last hour</p>
              </div>
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Workflows</p>
                <p className="text-2xl font-bold">{bridgeStats.workflowsTriggered}</p>
                <p className="text-xs text-muted-foreground">triggered</p>
              </div>
              <Workflow className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bridge Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                EventBridge Status
              </CardTitle>
              <CardDescription>
                Unified communication hub • Workspace: {bridgeContext.workspaceId ? bridgeContext.workspaceId.substring(0, 8) + '...' : 'None'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchDiagnosticsData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="default" size="sm" onClick={sendTestEvent}>
                <Send className="w-4 h-4 mr-2" />
                Test Event
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{bridgeStats.notificationRules}</p>
              <p className="text-xs text-muted-foreground">Notification Rules</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{bridgeStats.auditRules}</p>
              <p className="text-xs text-muted-foreground">Audit Rules</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{bridgeStats.workflowTriggers}</p>
              <p className="text-xs text-muted-foreground">Workflow Triggers</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{bridgeStats.analyticsEvents}</p>
              <p className="text-xs text-muted-foreground">Analytics Events</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{bridgeStats.notificationsSent}</p>
              <p className="text-xs text-muted-foreground">Notifs Sent</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Badge variant={bridgeStats.initialized ? 'default' : 'secondary'}>
                {bridgeStats.initialized ? 'Active' : 'Inactive'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Bridge Status</p>
            </div>
          </div>
          {bridgeStats.lastError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500">Last Error: {bridgeStats.lastError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Event History</TabsTrigger>
          <TabsTrigger value="realtime">Realtime Tables</TabsTrigger>
          <TabsTrigger value="workflows">Recent Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Last 50 events from the EventBus</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {eventHistory.slice(0, 50).map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {event.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {JSON.stringify(event.payload).substring(0, 60)}...
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {eventHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No events yet. Send a test event to see it here.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle>Connected Tables</CardTitle>
              <CardDescription>
                Tables with active realtime subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {realtimeState.connectedTables.map((table) => (
                  <div
                    key={table}
                    className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-mono">{table}</span>
                  </div>
                ))}
              </div>
              {realtimeState.lastEventAt && (
                <p className="text-sm text-muted-foreground mt-4">
                  Last event: {realtimeState.lastEventAt.toLocaleString()} ({realtimeState.eventCount} total)
                </p>
              )}
              {!realtimeState.lastEventAt && realtimeState.status === 'connected' && (
                <p className="text-sm text-yellow-500 mt-4">
                  ⚠️ Connected but no events received yet. Database changes will trigger events.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Recent Workflow Runs</CardTitle>
              <CardDescription>Last 10 workflow executions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {recentWorkflows.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        {getWorkflowStatusIcon(wf.status)}
                        <span className="font-medium">{wf.workflow_id || 'Unknown'}</span>
                        <Badge variant="outline">{wf.status}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {wf.started_at ? new Date(wf.started_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  ))}
                  {recentWorkflows.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No workflow runs yet. Workflows trigger on specific events.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunicationDiagnostics;
