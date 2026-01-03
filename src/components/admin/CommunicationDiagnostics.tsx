import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { eventBus } from '@/lib/eventBus';
import { getBridgeStats, initializeEventBridge } from '@/lib/eventBridge';
import { supabase } from '@/integrations/supabase/client';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowRun {
  id: string;
  workflow_id: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
}

const CommunicationDiagnostics = () => {
  const realtimeState = useGlobalRealtime();
  const [bridgeStats, setBridgeStats] = useState(getBridgeStats());
  const [eventHistory, setEventHistory] = useState(eventBus.getHistory());
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowRun[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize EventBridge
    const cleanup = initializeEventBridge();
    fetchDiagnosticsData();
    
    // Refresh periodically
    const interval = setInterval(() => {
      setBridgeStats(getBridgeStats());
      setEventHistory(eventBus.getHistory());
    }, 5000);

    return () => {
      cleanup();
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

  return (
    <div className="space-y-6">
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
                Unified communication hub connecting all modules
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <Badge variant={bridgeStats.initialized ? 'default' : 'secondary'}>
                {bridgeStats.initialized ? 'Active' : 'Inactive'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Bridge Status</p>
            </div>
          </div>
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
                      No workflow runs yet.
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
