import React, { useState, useEffect, useCallback, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  RefreshCw,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Link as LinkIcon,
  Unlink,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
  Upload,
  Filter,
  HelpCircle,
  Copy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { GoogleOAuthSetupModal } from "./GoogleOAuthSetupModal";

interface PendingDateImport {
  id: string;
  google_event_id: string;
  date: string;
  city: string;
  summary: string;
  location?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface CityEventSummary {
  city: string;
  count: number;
  events: Array<{
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    location?: string;
  }>;
}

// Google OAuth config
const ENV_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || "";
const GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";
const CLIENT_ID_STORAGE_KEY = "google_oauth_client_id";

// Check if env variable is properly configured (not empty)
const isEnvConfigured = !!ENV_CLIENT_ID?.trim();

const GoogleCalendarSync = forwardRef<HTMLDivElement>((_, ref) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [pendingDates, setPendingDates] = useState<PendingDateImport[]>([]);
  const [cityEvents, setCityEvents] = useState<CityEventSummary[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<{ message: string; details?: string } | null>(null);
  const [filterCity, setFilterCity] = useState<string>("all");
  const [selectAll, setSelectAll] = useState(false);
  const [initializingToken, setInitializingToken] = useState(true);

  // Prefer env variable, fallback to localStorage
  const [clientId, setClientId] = useState<string>(
    () => ENV_CLIENT_ID || localStorage.getItem(CLIENT_ID_STORAGE_KEY) || ""
  );
  const [clientIdDraft, setClientIdDraft] = useState<string>(clientId);
  
  // Determine configuration source for display
  const clientIdSource: 'env' | 'localStorage' | 'none' = 
    isEnvConfigured ? 'env' : 
    localStorage.getItem(CLIENT_ID_STORAGE_KEY) ? 'localStorage' : 
    'none';

  useEffect(() => {
    setClientIdDraft(clientId);
  }, [clientId]);

  // Check for existing connection from database (secure storage)
  useEffect(() => {
    const loadTokenFromDatabase = async () => {
      if (!user?.id) {
        setInitializingToken(false);
        return;
      }
      
      try {
        // Try to get token from database first (secure)
        const { data: tokenData, error } = await supabase
          .from("calendar_sync_tokens")
          .select("access_token, token_expiry")
          .eq("provider", "google")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && tokenData?.access_token) {
          const expiry = tokenData.token_expiry ? new Date(tokenData.token_expiry) : null;
          if (!expiry || expiry > new Date()) {
            setAccessToken(tokenData.access_token);
            setIsConnected(true);
          }
        } else {
          // Fallback: Check localStorage for migration (legacy support)
          const storedToken = localStorage.getItem('google_calendar_token');
          const tokenExpiry = localStorage.getItem('google_calendar_token_expiry');
          
          if (storedToken && tokenExpiry) {
            const expiry = new Date(tokenExpiry);
            if (expiry > new Date()) {
              // Migrate to database
              await supabase.from("calendar_sync_tokens").insert({
                user_id: user.id,
                provider: "google",
                access_token: storedToken,
                token_expiry: tokenExpiry,
              });
              
              // Clear localStorage after migration
              localStorage.removeItem('google_calendar_token');
              localStorage.removeItem('google_calendar_token_expiry');
              
              setAccessToken(storedToken);
              setIsConnected(true);
            } else {
              localStorage.removeItem('google_calendar_token');
              localStorage.removeItem('google_calendar_token_expiry');
            }
          }
        }
      } catch (err) {
        console.error("Error loading token:", err);
      } finally {
        setInitializingToken(false);
      }
    };

    loadTokenFromDatabase();
  }, [user?.id]);

  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const redirectUri = window.location.origin + window.location.pathname;

  // Handle OAuth callback (PKCE + auth code)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      if (error) {
        toast({
          title: "Google OAuth Error",
          description: errorDescription || error,
          variant: "destructive",
        });
        return;
      }

      if (!code) return;

      try {
        const response = await supabase.functions.invoke("google-oauth-exchange", {
          body: {
            code,
            redirectUri,
          },
        });

        if (response.error) throw response.error;

        const data = response.data as any;
        if (!data?.access_token) {
          throw new Error(data?.error || "No access token returned");
        }

        setAccessToken(data.access_token);
        setIsConnected(true);

        // Store token securely in database instead of localStorage
        if (user?.id) {
          const expiry = data.expires_in 
            ? new Date(Date.now() + parseInt(String(data.expires_in)) * 1000).toISOString()
            : null;
          
          // Delete old tokens first, then insert new one
          await supabase
            .from("calendar_sync_tokens")
            .delete()
            .eq("user_id", user.id)
            .eq("provider", "google");
            
          await supabase.from("calendar_sync_tokens").insert({
            user_id: user.id,
            provider: "google",
            access_token: data.access_token,
            refresh_token: data.refresh_token || null,
            token_expiry: expiry,
          });
        }

        // Clear query params
        window.history.replaceState(null, "", window.location.pathname);

        toast({
          title: "Connected!",
          description: "Google Calendar connected successfully. You can now sync your events.",
        });
      } catch (e: any) {
        const details = e?.context?.body?.google
          ? JSON.stringify(e.context.body.google)
          : e?.message;

        toast({
          title: "Connection failed",
          description: details || "Failed to exchange Google OAuth code.",
          variant: "destructive",
        });
      }
    };

    void handleOAuthCallback();
  }, [toast]);

  const handleConnect = async () => {
    const effectiveClientId = clientId?.trim();
    if (!effectiveClientId) {
      setShowSetupModal(true);
      return;
    }

    // PKCE code flow (recommended by Google)
    const random = crypto.getRandomValues(new Uint8Array(32));
    const verifier = btoa(String.fromCharCode(...random))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const challenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    // Store verifier for potential future refresh/advanced flows
    sessionStorage.setItem("google_oauth_pkce_verifier", verifier);

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(effectiveClientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `code_challenge=${encodeURIComponent(challenge)}&` +
      `code_challenge_method=S256`;

    window.location.href = authUrl;
  };

  const handleClientIdSaved = (newClientId: string) => {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, newClientId);
    setClientId(newClientId);
    setClientIdDraft(newClientId);
    toast({
      title: "Setup Complete!",
      description: "Client ID saved. You can now connect to Google Calendar.",
    });
  };

  const handleDisconnect = () => {
    if (!confirm('Disconnect Google Calendar? This will stop syncing events.')) return;
    
    localStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_calendar_token_expiry');
    setAccessToken(null);
    setIsConnected(false);
    setPendingDates([]);
    setCityEvents([]);
    
    toast({
      title: "Disconnected",
      description: "Google Calendar has been disconnected.",
    });
  };

  const fetchCalendarEvents = async () => {
    if (!accessToken) return;

    setSyncing(true);

    try {
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'fetch-events',
          accessToken,
          dateRange: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      });

      if (response.error) {
        setLastSyncError({ message: response.error.message || 'Request failed' });
        throw response.error;
      }

      const data = response.data as any;

      if (data?.error) {
        const googleBits = data.google
          ? `Google: ${data.google.status}${data.google.reason ? ` (${data.google.reason})` : ''}${data.google.message ? ` — ${data.google.message}` : ''}`
          : null;

        setLastSyncError({
          message: data.error || 'Sync failed',
          details: googleBits || data.details,
        });

        toast({
          title: 'Sync Failed',
          description: googleBits || data.details || data.error || 'Failed to fetch calendar events',
          variant: 'destructive',
        });
        return;
      }

      setLastSyncError(null);
      setPendingDates(data.pendingDates || []);
      setCityEvents(data.cityEvents || []);
      setLastSync(new Date().toISOString());

      toast({
        title: 'Calendar Synced',
        description: `Found ${data.pendingDates?.length || 0} availability dates in ${data.cityEvents?.length || 0} cities.`,
      });
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch calendar events';
      const details = error?.context?.body?.details;

      console.error('Sync error:', error);
      setLastSyncError((prev) => prev ?? { message, details });

      toast({
        title: 'Sync Failed',
        description: details || message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const testConnection = async () => {
    if (!accessToken) return;

    setTestingConnection(true);

    try {
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'test-connection',
          accessToken,
        },
      });

      if (response.error) throw response.error;

      const data = response.data as any;
      if (data?.error) {
        const googleBits = data.google
          ? `Google: ${data.google.status}${data.google.reason ? ` (${data.google.reason})` : ''}${data.google.message ? ` — ${data.google.message}` : ''}`
          : null;

        setLastSyncError({
          message: data.error || 'Test failed',
          details: googleBits || data.details,
        });

        toast({
          title: 'Test Failed',
          description: googleBits || data.details || data.error || 'Failed to test connection',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Connection OK',
        description: 'Your token and permissions look good. If Fetch Events still fails, it’s likely calendar access or API enablement.',
      });
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error?.message || 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const copyDebugReport = async () => {
    const report = {
      time: new Date().toISOString(),
      route: window.location.pathname,
      redirectUri,
      scopes: GOOGLE_SCOPES,
      clientIdSource,
      clientIdTail: clientId ? clientId.slice(-16) : null,
      lastSync,
      lastSyncError,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      toast({
        title: 'Copied',
        description: 'Debug report copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not access clipboard in this browser context.',
        variant: 'destructive',
      });
    }
  };

  const toggleDateStatus = (id: string) => {
    setPendingDates(prev => 
      prev.map(d => d.id === id 
        ? { ...d, status: d.status === 'approved' ? 'pending' : 'approved' as const }
        : d
      )
    );
  };

  const toggleSelectAll = () => {
    const newStatus = !selectAll ? 'approved' : 'pending';
    const filtered = filterCity === 'all' 
      ? pendingDates 
      : pendingDates.filter(d => d.city === filterCity);
    
    setPendingDates(prev =>
      prev.map(d => 
        (filterCity === 'all' || d.city === filterCity)
          ? { ...d, status: newStatus as 'approved' | 'pending' }
          : d
      )
    );
    setSelectAll(!selectAll);
  };

  const approveAllForCity = (city: string) => {
    setPendingDates(prev =>
      prev.map(d => d.city === city ? { ...d, status: 'approved' as const } : d)
    );
    toast({
      title: `${city} Dates Approved`,
      description: `All ${city} dates marked for import.`,
    });
  };

  const handleApproveBatch = async () => {
    const approved = pendingDates.filter(d => d.status === 'approved');
    
    if (approved.length === 0) {
      toast({
        title: "No Dates Selected",
        description: "Please approve some dates before importing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'approve-batch',
          pendingImports: approved
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Dates Imported!",
        description: `Successfully imported ${response.data.imported} availability dates.`,
      });

      // Remove imported dates from pending
      setPendingDates(prev => prev.filter(d => d.status !== 'approved'));
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import dates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDates = filterCity === 'all' 
    ? pendingDates 
    : pendingDates.filter(d => d.city === filterCity);

  const approvedCount = pendingDates.filter(d => d.status === 'approved').length;
  const cities = [...new Set(pendingDates.map(d => d.city))];

  const cityColors: Record<string, string> = {
    "Austin": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Los Angeles": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "Houston": "bg-sky-500/20 text-sky-400 border-sky-500/30",
    "New York": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "Miami": "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "Chicago": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <div className="space-y-6">
      {/* OAuth Setup Modal */}
      <GoogleOAuthSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onClientIdSaved={handleClientIdSaved}
        redirectUri={redirectUri}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Google Calendar Sync
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Sync availability from Fernando.moralesunda@gmail.com
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isConnected && (
            <button
              onClick={() => setShowSetupModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 transition-colors text-sm font-body"
            >
              <HelpCircle className="w-4 h-4" />
              Setup Guide
            </button>
          )}
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Connected
            </div>
          )}
        </div>
      </div>

      {/* Configuration Status Banner */}
      {!isConnected && clientIdSource === 'none' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-body text-sm text-foreground">
              <strong>Google Client ID not configured.</strong> Enter your Client ID below to enable calendar sync.
            </p>
            <p className="font-body text-xs text-muted-foreground">
              This is stored locally in your browser. You'll need a Google Cloud OAuth Client ID.
            </p>
          </div>
        </motion.div>
      )}

      {/* Last sync error (helps diagnose 403s) */}
      {lastSyncError && (
        <div className="border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-body text-sm text-foreground">
                  <strong>Last sync error:</strong> {lastSyncError.message}
                </p>
                {lastSyncError.details && (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                    {lastSyncError.details}
                  </pre>
                )}
              </div>
            </div>

            <button
              onClick={copyDebugReport}
              className="flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground font-body text-sm hover:text-foreground hover:border-foreground/40 transition-colors"
              title="Copy debug report"
            >
              <Copy className="w-4 h-4" />
              Copy debug
            </button>
          </div>
        </div>
      )}

      {!isConnected && clientIdSource === 'localStorage' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-sky-500/30 bg-sky-500/5 p-4 flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-body text-sm text-foreground">
              Using locally stored Client ID
            </p>
            <p className="font-body text-xs text-muted-foreground">
              ...{clientId.slice(-25)}
            </p>
          </div>
        </motion.div>
      )}

      {!isConnected && clientIdSource === 'env' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-body text-sm text-foreground">
              Client ID configured via environment
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Ready to connect to Google Calendar
            </p>
          </div>
        </motion.div>
      )}

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-amber-500/30 bg-amber-500/5 p-6 space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h3 className="font-display text-lg text-foreground">Google OAuth Setup Required</h3>
            </div>
            <button onClick={() => setShowSetupGuide(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3 font-body text-sm text-muted-foreground">
            <p className="text-foreground">To connect Google Calendar, you need a Google OAuth Client ID.</p>

            {/* Client ID Status */}
            {clientId ? (
              <div className="flex items-center justify-between p-3 border border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-body text-sm">Client ID detected</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    ...{clientId.slice(-20)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
                    setClientId("");
                    setClientIdDraft("");
                    toast({
                      title: "Client ID cleared",
                      description: "You can now enter a new Client ID.",
                    });
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Client ID</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={clientIdDraft}
                    onChange={(e) => setClientIdDraft(e.target.value)}
                    placeholder="xxxxxx.apps.googleusercontent.com"
                    className="flex-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/40"
                  />
                  <button
                    onClick={() => {
                      const next = clientIdDraft.trim();
                      if (!next) return;
                      localStorage.setItem(CLIENT_ID_STORAGE_KEY, next);
                      setClientId(next);
                      toast({
                        title: "Client ID saved",
                        description: "Saved locally for this browser. You can now connect.",
                      });
                    }}
                    className="px-4 py-2 border border-border text-foreground font-body text-sm hover:border-foreground/40 transition-colors"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: Even if you already set VITE_GOOGLE_CLIENT_ID, the preview may need a refresh; saving here is an instant fallback.
                </p>
              </div>
            )}

            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>
                Go to{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener"
                  className="text-primary underline"
                >
                  Google Cloud Console 5 Credentials
                </a>
              </li>
              <li>
                Click <strong className="text-foreground">Create Credentials</strong> →{" "}
                <strong className="text-foreground">OAuth client ID</strong>
              </li>
              <li>
                Select <strong className="text-foreground">Web application</strong> as the application type
              </li>
              <li>
                Add this redirect URI:{" "}
                <code className="px-2 py-1 bg-accent text-foreground">{window.location.origin}/admin</code>
              </li>
              <li>
                Configure the OAuth consent screen (External) and add your email as a test user while in testing mode
              </li>
            </ol>
          </div>
        </motion.div>
      )}

      {/* Connection Card */}
      <div className={`border p-6 ${isConnected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isConnected ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              <Calendar className={`w-6 h-6 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h3 className="font-display text-lg text-foreground">Google Calendar</h3>
              <p className="font-body text-sm text-muted-foreground">
                {isConnected 
                  ? lastSync 
                    ? `Last synced: ${format(new Date(lastSync), 'MMM d, h:mm a')}`
                    : 'Connected - Ready to sync'
                  : 'Connect to sync your calendar events'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground font-body text-sm hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50"
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {testingConnection ? 'Testing...' : 'Test'}
                </button>

                <button
                  onClick={fetchCalendarEvents}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {syncing ? 'Syncing...' : 'Fetch Events'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 font-body text-sm hover:bg-red-500/10 transition-colors"
                >
                  <Unlink className="w-4 h-4" />
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 font-body text-sm hover:bg-red-500/30 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Connect Google Calendar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* City Overview */}
      {cityEvents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cityEvents.map(city => (
            <div
              key={city.city}
              className={`border p-4 ${cityColors[city.city] || 'border-border'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-body text-sm">{city.city}</span>
                </div>
                <span className="font-display text-2xl">{city.count}</span>
              </div>
              <button
                onClick={() => approveAllForCity(city.city)}
                className="w-full mt-2 px-3 py-1.5 text-xs font-body border border-current/30 hover:bg-current/10 transition-colors"
              >
                Approve All
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Dates for Approval */}
      {pendingDates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-body text-sm uppercase tracking-wider text-muted-foreground">
              Pending Dates ({pendingDates.length})
            </h2>
            
            <div className="flex items-center gap-4">
              {/* City Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                >
                  <option value="all">All Cities ({pendingDates.length})</option>
                  {cities.map(city => (
                    <option key={city} value={city}>
                      {city} ({pendingDates.filter(d => d.city === city).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select All */}
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 border border-border text-muted-foreground font-body text-sm hover:text-foreground hover:border-foreground/50 transition-colors"
              >
                {selectAll ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Date List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredDates.map((date, index) => (
                <motion.div
                  key={date.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center justify-between p-4 border transition-colors cursor-pointer ${
                    date.status === 'approved'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border hover:border-foreground/20'
                  }`}
                  onClick={() => toggleDateStatus(date.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      date.status === 'approved' ? 'bg-emerald-500/20' : 'bg-accent'
                    }`}>
                      {date.status === 'approved' ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Calendar className="w-5 h-5 text-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-body text-foreground">
                        {format(new Date(date.date), "EEEE, MMMM d, yyyy")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-body border ${cityColors[date.city] || 'border-border text-muted-foreground'}`}>
                          {date.city}
                        </span>
                        <span className="font-body text-sm text-muted-foreground">
                          {date.summary}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {date.status === 'approved' ? (
                      <span className="text-xs text-emerald-400">Approved</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Click to approve</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Approve Batch Button */}
          {approvedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4 -mx-6 -mb-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-foreground">
                    <span className="text-emerald-400 font-medium">{approvedCount}</span> dates selected
                  </p>
                  <p className="font-body text-sm text-muted-foreground">
                    These dates will be added to your availability calendar
                  </p>
                </div>
                <button
                  onClick={handleApproveBatch}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-body text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import {approvedCount} Dates
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Empty State */}
      {isConnected && pendingDates.length === 0 && !syncing && (
        <div className="text-center py-12 border border-border">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground mb-4">
            No pending dates to import
          </p>
          <button
            onClick={fetchCalendarEvents}
            className="px-4 py-2 border border-border text-foreground font-body text-sm hover:border-foreground/50 transition-colors"
          >
            Fetch Calendar Events
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="border border-border p-6 bg-card/50">
        <h3 className="font-display text-lg text-foreground mb-4">How It Works</h3>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 text-xs font-bold">1</div>
              <span className="font-body text-sm text-foreground">Connect</span>
            </div>
            <p className="font-body text-xs text-muted-foreground pl-8">
              Link your Google Calendar account
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 text-xs font-bold">2</div>
              <span className="font-body text-sm text-foreground">Fetch Events</span>
            </div>
            <p className="font-body text-xs text-muted-foreground pl-8">
              AI detects cities from your event titles & locations
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-xs font-bold">3</div>
              <span className="font-body text-sm text-foreground">Review & Approve</span>
            </div>
            <p className="font-body text-xs text-muted-foreground pl-8">
              Select which dates to import to your availability
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-xs font-bold">4</div>
              <span className="font-body text-sm text-foreground">Batch Import</span>
            </div>
            <p className="font-body text-xs text-muted-foreground pl-8">
              One click to add all approved dates
            </p>
          </div>
        </div>
      </div>

      {/* OAuth Troubleshooting Guide */}
      <div className="border border-amber-500/20 p-6 bg-amber-500/5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-lg text-foreground">OAuth Troubleshooting</h3>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Common issues when connecting to Google Calendar
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Ineligible Account Error */}
          <div className="space-y-3">
            <h4 className="font-body text-sm font-medium text-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              "Ineligible account for test users" Error
            </h4>
            <p className="font-body text-sm text-muted-foreground">
              This error occurs when Google rejects your account as a test user. Common causes:
            </p>
            <ul className="font-body text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-foreground">Google Workspace accounts</strong> — organization policies may block test user enrollment</li>
              <li><strong className="text-foreground">Supervised accounts</strong> — accounts managed by Family Link or parental controls</li>
              <li><strong className="text-foreground">Project owners/editors</strong> — accounts already managing the Cloud project</li>
              <li><strong className="text-foreground">Calendar API not enabled</strong> — Google returns a 403 like <em>accessNotConfigured</em> until you enable “Google Calendar API” for the project</li>
            </ul>
          </div>

          {/* Solutions */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Quick Fix */}
            <div className="border border-sky-500/30 bg-sky-500/5 p-4 space-y-2">
              <h5 className="font-body text-sm font-medium text-sky-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Quick Workaround
              </h5>
              <p className="font-body text-xs text-muted-foreground">
                Create a fresh personal Gmail account (not Workspace) and add it as a test user instead.
              </p>
            </div>

            {/* Recommended Fix */}
            <div className="border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <h5 className="font-body text-sm font-medium text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Recommended Solution
              </h5>
              <p className="font-body text-xs text-muted-foreground">
                Publish your app to bypass test user restrictions entirely.
              </p>
            </div>
          </div>

          {/* How to Publish */}
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="font-body text-sm font-medium text-foreground">
              How to Publish Your OAuth App
            </h4>
            <ol className="font-body text-sm text-muted-foreground list-decimal list-inside space-y-2 ml-2">
              <li>
                Go to{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials/consent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Google Cloud Console → OAuth consent screen
                </a>
              </li>
              <li>Ensure <strong className="text-foreground">User Type</strong> is set to <strong className="text-foreground">External</strong></li>
              <li>Find <strong className="text-foreground">Publishing status</strong> (shows "Testing" by default)</li>
              <li>Click <strong className="text-foreground">PUBLISH APP</strong> button</li>
              <li>Confirm the dialog — your app will now work for any Google account</li>
            </ol>
            
            <div className="flex items-start gap-2 mt-3 p-3 border border-amber-500/20 bg-amber-500/5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="font-body text-xs text-muted-foreground">
                <strong className="text-foreground">Note:</strong> After publishing, users will see an "This app isn't verified" warning during login. 
                They can click "Advanced" → "Go to [App Name] (unsafe)" to proceed. This is normal for unverified apps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

GoogleCalendarSync.displayName = "GoogleCalendarSync";

export default GoogleCalendarSync;
