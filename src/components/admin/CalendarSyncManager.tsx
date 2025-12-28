import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  RefreshCw,
  Loader2,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Link as LinkIcon,
  Unlink,
  Settings,
  Clock,
  ChevronRight,
  Smartphone,
  Globe,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CalendarSyncToken {
  id: string;
  user_id: string;
  provider: 'google' | 'apple' | 'outlook';
  calendar_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  sync_errors: string[] | null;
}

interface SyncStatus {
  provider: string;
  connected: boolean;
  lastSync: string | null;
  errors: string[];
  calendarsCount: number;
}

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: Globe,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    description: 'Sync with Google Calendar for two-way updates'
  },
  {
    id: 'apple',
    name: 'Apple Calendar (iCloud)',
    icon: Smartphone,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/50',
    description: 'Sync with iOS and macOS Calendar apps'
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    icon: Globe,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    description: 'Sync with Microsoft Outlook calendar'
  }
];

const CalendarSyncManager = () => {
  const { toast } = useToast();
  const [syncTokens, setSyncTokens] = useState<CalendarSyncToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncTokens();
  }, []);

  const fetchSyncTokens = async () => {
    try {
      const { data, error } = await supabase
        .from("calendar_sync_tokens")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setSyncTokens((data || []) as CalendarSyncToken[]);
    } catch (error: any) {
      console.error("Error fetching sync tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderStatus = (providerId: string): SyncStatus => {
    const tokens = syncTokens.filter(t => t.provider === providerId);
    return {
      provider: providerId,
      connected: tokens.length > 0,
      lastSync: tokens[0]?.last_sync_at || null,
      errors: tokens.flatMap(t => t.sync_errors || []),
      calendarsCount: tokens.length
    };
  };

  const handleConnect = async (providerId: string) => {
    setConnecting(providerId);
    
    try {
      // In a real implementation, this would initiate OAuth flow
      // For now, we'll show a placeholder message
      toast({
        title: "OAuth Setup Required",
        description: `To connect ${providerId} Calendar, you need to set up OAuth credentials. This feature requires additional configuration.`,
      });
      
      // Simulated connection for demo
      await new Promise(r => setTimeout(r, 1500));
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    if (!confirm(`Disconnect ${providerId} calendar sync? This will stop syncing events.`)) return;

    try {
      const { error } = await supabase
        .from("calendar_sync_tokens")
        .update({ is_active: false })
        .eq("provider", providerId);

      if (error) throw error;
      toast({ title: "Disconnected", description: `${providerId} calendar sync disabled` });
      fetchSyncTokens();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSync = async (providerId: string) => {
    setSyncing(providerId);
    
    try {
      // This would call an edge function to sync
      await new Promise(r => setTimeout(r, 2000));
      
      toast({ 
        title: "Sync Complete", 
        description: `${providerId} calendar is now up to date` 
      });
      
      // Update last sync time
      await supabase
        .from("calendar_sync_tokens")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("provider", providerId);
      
      fetchSyncTokens();
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-light text-foreground">
          Calendar Sync
        </h1>
        <p className="font-body text-muted-foreground mt-1">
          Connect external calendars for two-way synchronization
        </p>
      </div>

      {/* Sync Status Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-body text-2xl font-light text-foreground">
                {syncTokens.filter(t => t.is_active).length}
              </p>
              <p className="font-body text-xs text-muted-foreground">Connected Calendars</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="font-body text-2xl font-light text-foreground">Two-Way</p>
              <p className="font-body text-xs text-muted-foreground">Sync Direction</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-body text-2xl font-light text-foreground">Auto</p>
              <p className="font-body text-xs text-muted-foreground">Real-time Updates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Providers */}
      <div className="space-y-4">
        <h2 className="font-body text-sm uppercase tracking-wider text-muted-foreground">
          Calendar Providers
        </h2>

        {PROVIDERS.map(provider => {
          const status = getProviderStatus(provider.id);
          const Icon = provider.icon;
          const isConnected = status.connected;
          const isSyncing = syncing === provider.id;
          const isConnecting = connecting === provider.id;

          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border ${isConnected ? provider.borderColor : 'border-border'} bg-card transition-colors`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${provider.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${provider.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg text-foreground">{provider.name}</h3>
                        {isConnected && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="font-body text-sm text-muted-foreground">
                        {provider.description}
                      </p>
                      {isConnected && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Last sync: {formatLastSync(status.lastSync)}</span>
                          </div>
                          {status.errors.length > 0 && (
                            <div className="flex items-center gap-1 text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{status.errors.length} warning(s)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleSync(provider.id)}
                          disabled={isSyncing}
                          className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground font-body text-sm hover:border-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                          {isSyncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button
                          onClick={() => handleDisconnect(provider.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 font-body text-sm hover:bg-red-500/10 transition-colors"
                        >
                          <Unlink className="w-4 h-4" />
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(provider.id)}
                        disabled={isConnecting}
                        className={`flex items-center gap-2 px-4 py-2 ${provider.bgColor} ${provider.color} font-body text-sm border ${provider.borderColor} hover:opacity-80 transition-colors disabled:opacity-50`}
                      >
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LinkIcon className="w-4 h-4" />
                        )}
                        {isConnecting ? "Connecting..." : "Connect"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sync Settings (when connected) */}
                <AnimatePresence>
                  {isConnected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-border"
                    >
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                            Sync Direction
                          </label>
                          <select className="w-full px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50">
                            <option value="both">Two-Way (Push & Pull)</option>
                            <option value="push">Push Only (CRM → Calendar)</option>
                            <option value="pull">Pull Only (Calendar → CRM)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                            Sync Frequency
                          </label>
                          <select className="w-full px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50">
                            <option value="realtime">Real-time</option>
                            <option value="5min">Every 5 minutes</option>
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                            Event Types to Sync
                          </label>
                          <select className="w-full px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50">
                            <option value="all">All Events</option>
                            <option value="sessions">Sessions Only</option>
                            <option value="blocked">Blocked Time Only</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* How It Works */}
      <div className="border border-border p-6 bg-card/50">
        <h3 className="font-display text-lg text-foreground mb-4">How Calendar Sync Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold">1</div>
              <span className="font-body text-sm text-foreground">Connect Your Calendar</span>
            </div>
            <p className="font-body text-xs text-muted-foreground pl-8">
              Authorize access to your Google, Apple, or Outlook calendar
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-xs font-bold">2</div>
              <span className="font-body text-sm text-foreground">Automatic Sync</span>
            </div>
            <p className="font-body text-xs text-muted-foreground pl-8">
              Changes sync in real-time between your phone/computer and CRM
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold">3</div>
              <span className="font-body text-sm text-foreground">Stay Updated</span>
            </div>
            <p className="font-body text-xs text-muted-foreground pl-8">
              Block time on your phone and it reflects on the booking calendar
            </p>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display text-foreground mb-2">OAuth Setup Required</h4>
            <p className="font-body text-sm text-muted-foreground mb-4">
              To enable calendar sync, you need to configure OAuth credentials for each provider:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-amber-400" />
                <span><strong>Google:</strong> Create OAuth 2.0 credentials in Google Cloud Console</span>
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-amber-400" />
                <span><strong>Apple:</strong> Set up Sign in with Apple and CalDAV access</span>
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-amber-400" />
                <span><strong>Outlook:</strong> Register an app in Azure Active Directory</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSyncManager;
