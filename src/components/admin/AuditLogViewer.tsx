import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { History, Search, Filter, FileText, User, Clock } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_by: string | null;
  changed_by_role: string | null;
  changes_diff: any;
  reason: string | null;
  metadata: any;
  occurred_at: string;
}

export default function AuditLogViewer() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("policy_audit_log")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (entityFilter !== 'all') {
      query = query.eq("entity_type", entityFilter);
    }
    if (actionFilter !== 'all') {
      query = query.eq("action", actionFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error loading audit logs", description: error.message, variant: "destructive" });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'updated': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'deleted': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'approved': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'rejected': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'policy_rules': return '📜';
      case 'artist_capabilities': return '🎨';
      case 'policy_overrides': return '🔓';
      case 'bookings': return '📅';
      default: return '📄';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.entity_id.toLowerCase().includes(search) ||
      log.entity_type.toLowerCase().includes(search) ||
      (log.reason?.toLowerCase().includes(search))
    );
  });

  const renderChanges = (changes: any) => {
    if (!changes) return null;

    if (changes.old && changes.new) {
      // Updated - show diff
      const oldObj = changes.old;
      const newObj = changes.new;
      const changedKeys = Object.keys(newObj).filter(
        key => JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])
      );

      if (changedKeys.length === 0) return <p className="text-xs text-muted-foreground">No visible changes</p>;

      return (
        <div className="space-y-2">
          {changedKeys.slice(0, 5).map(key => (
            <div key={key} className="text-xs">
              <span className="font-medium text-muted-foreground">{key}:</span>
              <div className="flex gap-2 mt-1">
                <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded line-through">
                  {JSON.stringify(oldObj[key])?.slice(0, 50)}
                </span>
                <span>→</span>
                <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                  {JSON.stringify(newObj[key])?.slice(0, 50)}
                </span>
              </div>
            </div>
          ))}
          {changedKeys.length > 5 && (
            <p className="text-xs text-muted-foreground">+{changedKeys.length - 5} more changes</p>
          )}
        </div>
      );
    }

    // Created or deleted - show key fields
    const keyFields = ['name', 'rule_id', 'decision', 'reason', 'email'];
    return (
      <div className="text-xs space-y-1">
        {keyFields.map(key => {
          if (changes[key]) {
            return (
              <div key={key}>
                <span className="font-medium text-muted-foreground">{key}:</span>{' '}
                <span>{JSON.stringify(changes[key])}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
          <p className="text-muted-foreground">Track all policy and configuration changes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by entity ID or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="policy_rules">Policy Rules</SelectItem>
            <SelectItem value="artist_capabilities">Artist Capabilities</SelectItem>
            <SelectItem value="policy_overrides">Overrides</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log Entries */}
      {filteredLogs.length === 0 ? (
        <Card className="p-8 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Audit Logs</h3>
          <p className="text-muted-foreground">Changes to policies and configurations will appear here</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card
              key={log.id}
              className={`cursor-pointer transition-all ${expandedLog === log.id ? 'ring-1 ring-primary' : 'hover:bg-muted/30'}`}
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getEntityIcon(log.entity_type)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.entity_type.replace('_', ' ')}</span>
                        <Badge variant="outline" className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{log.entity_id}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {format(new Date(log.occurred_at), 'MMM d, h:mm a')}
                    </div>
                    {log.changed_by_role && (
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <User className="w-3 h-3" />
                        {log.changed_by_role}
                      </div>
                    )}
                  </div>
                </div>

                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-2">Changes</h4>
                    <div className="bg-muted/50 rounded-lg p-3">
                      {renderChanges(log.changes_diff)}
                    </div>
                    {log.reason && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium mb-1">Reason</h4>
                        <p className="text-sm text-muted-foreground">{log.reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
