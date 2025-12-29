import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  AlertTriangle, 
  Bug, 
  Clock, 
  Fingerprint, 
  Ban,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address?: string | null;
  created_at: string;
  details?: unknown;
  success?: boolean | null;
}

interface HoneypotTrigger {
  id: string;
  trigger_type: string;
  ip_address: string;
  created_at: string;
  trigger_details?: unknown;
}

interface RateLimitEntry {
  id: string;
  identifier_hash: string;
  action_type: string;
  action_count: number | null;
  is_blocked: boolean | null;
  blocked_until?: string | null;
  last_action_at: string | null;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  actor_type?: string | null;
  resource_type?: string | null;
  action?: string | null;
  ip_address?: string | null;
  severity: string | null;
  details?: unknown;
}

interface SecurityAnomaly {
  anomaly_type: string;
  severity: string;
  description: string;
  affected_count: number;
  details?: unknown;
}

interface SuspiciousFingerprint {
  id: string;
  fingerprint_hash: string;
  risk_score: number | null;
  request_count: number | null;
  last_seen_at: string;
  is_suspicious: boolean | null;
}

export const SecurityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [honeypotTriggers, setHoneypotTriggers] = useState<HoneypotTrigger[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([]);
  const [suspiciousFingerprints, setSuspiciousFingerprints] = useState<SuspiciousFingerprint[]>([]);
  const [securityScore, setSecurityScore] = useState(100);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // Fetch security logs (last 24h)
      const { data: events } = await supabase
        .from('security_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (events) setSecurityEvents(events as SecurityEvent[]);

      // Fetch honeypot triggers (last 24h)
      const { data: honeypots } = await supabase
        .from('honeypot_triggers')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (honeypots) setHoneypotTriggers(honeypots as HoneypotTrigger[]);

      // Rate limits from new table - skip RPC since types not updated yet
      // Will be available after types regeneration
      setRateLimits([]);

      // Fetch audit logs - use security_logs as fallback
      const { data: audits } = await supabase
        .from('security_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (audits) {
        const mappedAudits: AuditLogEntry[] = audits.map(a => ({
          id: a.id,
          timestamp: a.created_at,
          event_type: a.event_type,
          actor_type: a.user_id ? 'user' : 'anonymous',
          ip_address: a.ip_address,
          severity: a.is_flagged ? 'warning' : 'info',
          details: a.details
        }));
        setAuditLogs(mappedAudits);
      }

      // Fetch suspicious fingerprints
      const { data: fingerprints } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('is_suspicious', true)
        .order('risk_score', { ascending: false })
        .limit(20);

      if (fingerprints) setSuspiciousFingerprints(fingerprints);

      // Detect anomalies
      const { data: anomalyData } = await supabase.rpc('detect_security_anomalies');
      if (anomalyData) setAnomalies(anomalyData as SecurityAnomaly[]);

      // Calculate security score
      calculateSecurityScore(events as SecurityEvent[] || [], honeypots as HoneypotTrigger[] || [], [], anomalyData as SecurityAnomaly[] || []);

    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSecurityScore = (
    events: SecurityEvent[],
    honeypots: HoneypotTrigger[],
    blockedLimits: RateLimitEntry[],
    anomalies: SecurityAnomaly[]
  ) => {
    let score = 100;
    
    // Deduct for failed login attempts
    const failedLogins = events.filter(e => e.event_type.includes('failed')).length;
    score -= Math.min(failedLogins * 2, 20);

    // Deduct for honeypot triggers
    score -= Math.min(honeypots.length * 3, 15);

    // Deduct for blocked rate limits
    score -= Math.min(blockedLimits.length * 2, 15);

    // Deduct for anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    const highAnomalies = anomalies.filter(a => a.severity === 'high').length;
    score -= criticalAnomalies * 10;
    score -= highAnomalies * 5;

    setSecurityScore(Math.max(0, score));
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': case 'error': return 'bg-orange-500';
      case 'warning': case 'warn': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Security Dashboard</h2>
            <p className="text-muted-foreground">Real-time security monitoring</p>
          </div>
        </div>
        <Button onClick={fetchSecurityData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Score & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(securityScore)}`}>
                {securityScore}
              </div>
              <p className="text-muted-foreground text-sm mt-1">Security Score</p>
              <div className="mt-2">
                {securityScore >= 80 ? (
                  <Badge className="bg-green-500">Healthy</Badge>
                ) : securityScore >= 60 ? (
                  <Badge className="bg-yellow-500">Attention</Badge>
                ) : (
                  <Badge className="bg-red-500">At Risk</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{honeypotTriggers.length}</p>
                <p className="text-muted-foreground text-sm">Honeypot Triggers</p>
              </div>
              <Bug className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{rateLimits.length}</p>
                <p className="text-muted-foreground text-sm">Blocked IPs</p>
              </div>
              <Ban className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{suspiciousFingerprints.length}</p>
                <p className="text-muted-foreground text-sm">Suspicious Devices</p>
              </div>
              <Fingerprint className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{anomalies.length}</p>
                <p className="text-muted-foreground text-sm">Active Anomalies</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="anomalies" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="honeypots">Honeypots</TabsTrigger>
          <TabsTrigger value="ratelimits">Rate Limits</TabsTrigger>
          <TabsTrigger value="fingerprints">Fingerprints</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Detected Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {anomalies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No anomalies detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anomalies.map((anomaly, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge className={getSeverityColor(anomaly.severity)}>
                        {anomaly.severity.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{anomaly.anomaly_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                        <p className="text-sm mt-1">
                          Affected: <span className="font-medium">{anomaly.affected_count}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Honeypots Tab */}
        <TabsContent value="honeypots">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Honeypot Triggers (Last 24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {honeypotTriggers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No bot activity detected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {honeypotTriggers.map((trigger) => (
                      <div key={trigger.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Bug className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="font-medium">{trigger.trigger_type}</p>
                            <p className="text-sm text-muted-foreground">
                              IP: {trigger.ip_address?.substring(0, 12)}***
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(trigger.created_at), 'HH:mm:ss')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="ratelimits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Blocked Rate Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {rateLimits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No rate limit violations</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rateLimits.map((limit) => (
                      <div key={limit.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{limit.action_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Hash: {limit.identifier_hash.substring(0, 16)}...
                          </p>
                          <p className="text-sm">
                            Attempts: <span className="font-medium">{limit.action_count}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">Blocked</Badge>
                          {limit.blocked_until && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Until: {format(new Date(limit.blocked_until), 'MMM d, HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fingerprints Tab */}
        <TabsContent value="fingerprints">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Suspicious Fingerprints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {suspiciousFingerprints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No suspicious devices</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suspiciousFingerprints.map((fp) => (
                      <div key={fp.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-mono text-sm">{fp.fingerprint_hash.substring(0, 24)}...</p>
                          <p className="text-sm text-muted-foreground">
                            Requests: {fp.request_count}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={fp.risk_score > 75 ? "destructive" : "secondary"}>
                            Risk: {fp.risk_score}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(fp.last_seen_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Security Audit Log (Last 24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2" />
                    <p>No audit entries</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge className={getSeverityColor(log.severity)} variant="outline">
                          {log.severity}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{log.event_type.replace(/_/g, ' ')}</p>
                          <div className="flex gap-2 text-sm text-muted-foreground flex-wrap">
                            {log.actor_type && <span>Actor: {log.actor_type}</span>}
                            {log.resource_type && <span>• Resource: {log.resource_type}</span>}
                            {log.action && <span>• Action: {log.action}</span>}
                          </div>
                          {log.ip_address && (
                            <p className="text-sm text-muted-foreground">
                              IP: {log.ip_address.substring(0, 12)}***
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
