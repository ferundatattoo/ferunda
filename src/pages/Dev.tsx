import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { chatCache } from '@/lib/chatCache';
import { useCoreBus } from '@/hooks/useCoreBus';
import { toast } from 'sonner';
import { 
  Bug, 
  RefreshCw, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Wifi,
  WifiOff,
  Radio,
  Send
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HealthResult {
  ok: boolean;
  latency: number;
  error?: string;
}

const CONVERSATION_ID_KEY = 'ferunda_conversation_id';

const Dev = () => {
  const coreBus = useCoreBus();
  const [isDebugEnabled, setIsDebugEnabled] = useState(() => 
    localStorage.getItem('ferunda_debug') === '1'
  );
  const [healthResults, setHealthResults] = useState<Record<string, HealthResult>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const publishTestEvent = useCallback(async () => {
    setIsPublishing(true);
    try {
      await coreBus.publish('bus:system_health', { 
        ping: true, 
        component: 'dev-console',
        timestamp: new Date().toISOString()
      });
      toast.success('Test event published!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Publish failed: ' + msg);
    } finally {
      setIsPublishing(false);
    }
  }, [coreBus]);

  const toggleDebug = useCallback(() => {
    const newValue = !isDebugEnabled;
    if (newValue) {
      localStorage.setItem('ferunda_debug', '1');
    } else {
      localStorage.removeItem('ferunda_debug');
    }
    setIsDebugEnabled(newValue);
    toast.success(newValue ? 'Debug mode activated' : 'Debug mode deactivated');
  }, [isDebugEnabled]);

  const resetConversation = useCallback(async () => {
    try {
      localStorage.removeItem(CONVERSATION_ID_KEY);
      await chatCache.clear();
      toast.success('Conversation reset! Reload the page to start fresh.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLastError(msg);
      toast.error('Failed to reset: ' + msg);
    }
  }, []);

  const runHealthCheck = useCallback(async () => {
    setIsChecking(true);
    setLastError(null);
    const results: Record<string, HealthResult> = {};
    const TIMEOUT_MS = 15000;

    const functions = ['concierge-gateway', 'chat-session', 'chat-upload-url'];

    // Helper: race invoke against timeout
    const invokeWithTimeout = async (fn: string): Promise<HealthResult> => {
      const start = Date.now();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
      );
      try {
        const { error } = await Promise.race([
          supabase.functions.invoke(fn, { body: { healthCheck: true, warmUp: true } }),
          timeoutPromise,
        ]);
        const latency = Date.now() - start;
        if (error) {
          return { ok: false, latency, error: error.message };
        }
        return { ok: true, latency };
      } catch (err) {
        const latency = Date.now() - start;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { ok: false, latency, error: msg };
      }
    };

    try {
      // Use allSettled so one failure/hang doesn't block others
      const settled = await Promise.allSettled(
        functions.map(fn => invokeWithTimeout(fn))
      );

      settled.forEach((res, idx) => {
        const fn = functions[idx];
        if (res.status === 'fulfilled') {
          results[fn] = res.value;
        } else {
          results[fn] = { ok: false, latency: TIMEOUT_MS, error: res.reason?.message || 'Unknown' };
        }
      });

      // Capture first error for display
      const firstError = Object.values(results).find(r => r.error)?.error;
      if (firstError) setLastError(firstError);

      setHealthResults(results);

      const allOk = Object.values(results).every(r => r.ok);
      if (allOk) {
        toast.success('All services healthy!');
      } else {
        toast.error('Some services are unhealthy');
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearAllStorage = useCallback(async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await chatCache.clear();
      toast.success('All storage cleared! Reload to apply.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLastError(msg);
      toast.error('Failed: ' + msg);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="w-6 h-6" />
              Dev Console
            </h1>
            <p className="text-muted-foreground text-sm">
              Debugging tools for Ferunda Concierge
            </p>
          </div>
        </div>

        {/* Debug Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debug Mode</CardTitle>
            <CardDescription>
              Enable debug mode to see detailed logs and controls in the chat widget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={toggleDebug} 
              variant={isDebugEnabled ? "default" : "outline"}
              className="gap-2"
            >
              {isDebugEnabled ? (
                <>
                  <ToggleRight className="w-4 h-4" />
                  Debug Enabled
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  Debug Disabled
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* CoreBus Debug Panel */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Radio className="w-5 h-5" />
              CoreBus Status
            </CardTitle>
            <CardDescription>
              Real-time connection status and event monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                {coreBus.status === 'connected' ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : coreBus.status === 'connecting' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <Badge variant={
                  coreBus.status === 'connected' ? 'default' :
                  coreBus.status === 'connecting' ? 'secondary' :
                  'destructive'
                }>
                  {coreBus.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Events received: <span className="font-mono font-bold">{coreBus.eventCount}</span>
              </div>
            </div>

            {coreBus.lastEvent && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="text-xs text-muted-foreground">Last Event:</div>
                <div className="font-mono text-sm">{coreBus.lastEvent.type}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(coreBus.lastEvent.timestamp).toLocaleTimeString()}
                </div>
                <pre className="text-xs bg-background/50 p-2 rounded mt-2 overflow-auto max-h-32">
                  {JSON.stringify(coreBus.lastEvent.data, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={publishTestEvent}
                disabled={isPublishing || coreBus.status !== 'connected'}
                variant="outline"
                className="gap-2"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Publish Test Event
              </Button>
              
              {coreBus.status !== 'connected' && (
                <Button 
                  onClick={() => coreBus.reconnect()}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversation Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversation Controls</CardTitle>
            <CardDescription>
              Reset or clear conversation data to start fresh
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            <Button onClick={resetConversation} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Reset Conversation
            </Button>
            <Button onClick={clearAllStorage} variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Clear All Storage
            </Button>
          </CardContent>
        </Card>

        {/* Health Check */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Service Health
            </CardTitle>
            <CardDescription>
              Check if backend services are responding correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runHealthCheck} 
              disabled={isChecking}
              className="gap-2"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Run Health Check
                </>
              )}
            </Button>

            {Object.keys(healthResults).length > 0 && (
              <div className="space-y-2">
                {Object.entries(healthResults).map(([fn, result]) => (
                  <div 
                    key={fn} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {result.ok ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-mono text-sm">{fn}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.ok ? "default" : "destructive"}>
                        {result.latency}ms
                      </Badge>
                      {result.error && (
                        <span className="text-xs text-red-400 max-w-[200px] truncate">
                          {result.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Error */}
        {lastError && (
          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="text-lg text-red-400">Last Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-red-500/10 p-3 rounded-lg overflow-auto">
                {lastError}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            <Link to="/">
              <Button variant="outline">Home</Button>
            </Link>
            <Link to="/os/diagnostics">
              <Button variant="outline">OS Diagnostics</Button>
            </Link>
            <Link to="/audit-report">
              <Button variant="outline">Audit Report</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dev;
