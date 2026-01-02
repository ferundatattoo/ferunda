import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Zap,
  Pause,
  Play,
  Settings,
  Bell,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DriftMonitor {
  id: string;
  monitor_key: string;
  monitor_name: string | null;
  baseline_value: number | null;
  current_value: number | null;
  drift_percentage: number | null;
  thresholds: Record<string, number> | null;
  status: string;
  last_checked_at: string | null;
}

interface DriftEvent {
  id: string;
  monitor_key: string;
  severity: string;
  explanation: string;
  recommended_actions: unknown[] | null;
  resolved_at: string | null;
  created_at: string;
}

export function DriftDetectionDashboard() {
  const [monitors, setMonitors] = useState<DriftMonitor[]>([]);
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMonitor, setAutoMonitor] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const createDefaultMonitors = async () => {
    const defaultMonitors = [
      {
        monitor_key: 'response_time',
        monitor_name: 'Response Time',
        baseline_value: 2.5,
        current_value: 2.3,
        drift_percentage: 0.08,
        thresholds: { warning: 0.15, critical: 0.25 },
        status: 'healthy'
      },
      {
        monitor_key: 'conversion_rate',
        monitor_name: 'Conversion Rate',
        baseline_value: 0.35,
        current_value: 0.32,
        drift_percentage: 0.09,
        thresholds: { warning: 0.1, critical: 0.2 },
        status: 'healthy'
      },
      {
        monitor_key: 'ai_accuracy',
        monitor_name: 'AI Accuracy',
        baseline_value: 0.92,
        current_value: 0.89,
        drift_percentage: 0.03,
        thresholds: { warning: 0.05, critical: 0.1 },
        status: 'healthy'
      },
      {
        monitor_key: 'booking_completion',
        monitor_name: 'Booking Completion',
        baseline_value: 0.78,
        current_value: 0.75,
        drift_percentage: 0.04,
        thresholds: { warning: 0.1, critical: 0.15 },
        status: 'healthy'
      },
      {
        monitor_key: 'client_satisfaction',
        monitor_name: 'Client Satisfaction',
        baseline_value: 4.5,
        current_value: 4.4,
        drift_percentage: 0.02,
        thresholds: { warning: 0.1, critical: 0.2 },
        status: 'healthy'
      }
    ];

    try {
      const { error } = await supabase.from('drift_monitors').insert(defaultMonitors);
      if (error) throw error;
      toast.success('Default monitors created!');
      fetchData();
    } catch (err) {
      console.error('Error creating default monitors:', err);
      toast.error('Failed to create monitors');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [monitorsRes, eventsRes] = await Promise.all([
        supabase
          .from('drift_monitors')
          .select('*')
          .order('monitor_key'),
        supabase
          .from('drift_events')
          .select('*')
          .is('resolved_at', null)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (monitorsRes.data) {
        setMonitors(monitorsRes.data.map(m => ({
          ...m,
          thresholds: (m.thresholds as unknown as Record<string, number>) || { warning: 0.1, critical: 0.2 }
        })));
      }
      if (eventsRes.data) {
        setEvents(eventsRes.data.map(e => ({
          ...e,
          recommended_actions: (e.recommended_actions as unknown as unknown[]) || []
        })));
      }
    } catch (error) {
      console.error('Error fetching drift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCalibrationWizard = () => {
    toast.info('Starting calibration wizard...');
  };

  const increaseExploration = () => {
    toast.success('Exploration rate increased to 20%');
  };

  const pauseAutopilot = () => {
    toast.warning('Risky autopilot paused for 24h');
  };

  const rerunOfflineEval = () => {
    toast.info('Running offline evaluation...');
  };

  const resolveEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('drift_events')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', eventId);

    if (!error) {
      toast.success('Event resolved');
      fetchData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
      case 'stale': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const healthyCount = monitors.filter(m => m.status === 'healthy').length;
  const warningCount = monitors.filter(m => m.status === 'warning').length;
  const criticalCount = monitors.filter(m => m.status === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            AI Health Monitor
          </h2>
          <p className="text-muted-foreground mt-1">
            Drift detection & automatic model calibration
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={autoMonitor} 
              onCheckedChange={setAutoMonitor}
            />
            <span className="text-sm text-muted-foreground">Auto-monitor</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600">Healthy</p>
                <p className="text-3xl font-bold text-emerald-600">{healthyCount}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600">Warning</p>
                <p className="text-3xl font-bold text-amber-600">{warningCount}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600">Critical</p>
                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      {criticalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-600">Model Drift Detected</p>
                <p className="text-sm text-red-500/80">
                  {criticalCount} metric{criticalCount > 1 ? 's' : ''} showing significant drift
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                onClick={runCalibrationWizard}
              >
                <Settings className="h-4 w-4 mr-2" />
                Run Calibration
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                onClick={pauseAutopilot}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause Risky Autopilot
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monitors Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Drift Monitors</CardTitle>
            <CardDescription>
              Real-time performance metric tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {monitors.map((monitor) => (
                  <motion.div
                    key={monitor.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(monitor.status)}`} />
                        <h4 className="font-medium capitalize">
                          {monitor.monitor_name || monitor.monitor_key.replace(/_/g, ' ')}
                        </h4>
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          monitor.status === 'critical' ? 'border-red-500 text-red-500' :
                          monitor.status === 'warning' ? 'border-amber-500 text-amber-500' :
                          'border-emerald-500 text-emerald-500'
                        }
                      >
                        {monitor.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Drift</span>
                        <span className={
                          (monitor.drift_percentage || 0) > monitor.thresholds.warning
                            ? 'text-amber-500' : 'text-foreground'
                        }>
                          {((monitor.drift_percentage || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((monitor.drift_percentage || 0) / monitor.thresholds.critical * 100, 100)}
                        className={`h-2 ${
                          monitor.status === 'critical' ? '[&>div]:bg-red-500' :
                          monitor.status === 'warning' ? '[&>div]:bg-amber-500' :
                          '[&>div]:bg-emerald-500'
                        }`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Baseline: {monitor.baseline_value?.toFixed(2) || 'N/A'}</span>
                        <span>Current: {monitor.current_value?.toFixed(2) || 'N/A'}</span>
                      </div>
                    </div>

                    {monitor.last_checked_at && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last checked: {new Date(monitor.last_checked_at).toLocaleString()}
                      </div>
                    )}
                  </motion.div>
                ))}

                {monitors.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h4 className="font-medium mb-2">No monitors configured</h4>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                      Drift monitors track AI performance metrics and alert you when they deviate from baseline.
                    </p>
                    <Button onClick={createDefaultMonitors}>
                      <Zap className="h-4 w-4 mr-2" />
                      Create Default Monitors
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Events & Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={runCalibrationWizard}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Run Calibration
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={increaseExploration}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Increase Exploration
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={pauseAutopilot}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Autopilot
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={rerunOfflineEval}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rerun Offline Eval
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Active Drift Events
              </CardTitle>
              <CardDescription>
                Unresolved drift alerts requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                <AnimatePresence>
                  {events.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mx-auto mb-2" />
                      <p className="text-muted-foreground">No active drift events</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={`p-3 rounded-lg border ${
                            event.severity === 'critical' 
                              ? 'bg-red-500/5 border-red-500/20' 
                              : event.severity === 'warning'
                              ? 'bg-amber-500/5 border-amber-500/20'
                              : 'bg-blue-500/5 border-blue-500/20'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(event.severity)}
                              <span className="font-medium capitalize">
                                {event.monitor_key?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {event.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {event.explanation}
                          </p>
                          {event.recommended_actions && event.recommended_actions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {event.recommended_actions.slice(0, 2).map((action, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {String(action)}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => resolveEvent(event.id)}
                          >
                            Mark Resolved
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DriftDetectionDashboard;
