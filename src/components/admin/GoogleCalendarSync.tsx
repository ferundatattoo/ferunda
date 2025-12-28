import { useState, useEffect, useCallback } from "react";
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
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
const DEFAULT_GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || "";
const GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";
const CLIENT_ID_STORAGE_KEY = "google_oauth_client_id";
const GoogleCalendarSync = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingDates, setPendingDates] = useState<PendingDateImport[]>([]);
  const [cityEvents, setCityEvents] = useState<CityEventSummary[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string>("all");
  const [selectAll, setSelectAll] = useState(false);
  const [clientId, setClientId] = useState<string>(
    () => DEFAULT_GOOGLE_CLIENT_ID || localStorage.getItem(CLIENT_ID_STORAGE_KEY) || ""
  );
  const [clientIdDraft, setClientIdDraft] = useState<string>(clientId);

  useEffect(() => {
    setClientIdDraft(clientId);
  }, [clientId]);
  // Check for existing connection
  useEffect(() => {
    const storedToken = localStorage.getItem('google_calendar_token');
    const tokenExpiry = localStorage.getItem('google_calendar_token_expiry');
    
    if (storedToken && tokenExpiry) {
      const expiry = new Date(tokenExpiry);
      if (expiry > new Date()) {
        setAccessToken(storedToken);
        setIsConnected(true);
      } else {
        // Token expired
        localStorage.removeItem('google_calendar_token');
        localStorage.removeItem('google_calendar_token_expiry');
      }
    }
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = () => {
      const hash = window.location.hash;
      if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        const expiresIn = params.get('expires_in');
        
        if (token) {
          setAccessToken(token);
          setIsConnected(true);
          
          // Store token with expiry
          localStorage.setItem('google_calendar_token', token);
          if (expiresIn) {
            const expiry = new Date(Date.now() + parseInt(expiresIn) * 1000);
            localStorage.setItem('google_calendar_token_expiry', expiry.toISOString());
          }
          
          // Clear hash
          window.history.replaceState(null, '', window.location.pathname);
          
          toast({
            title: "Connected!",
            description: "Google Calendar connected successfully. You can now sync your events.",
          });
        }
      }
    };

    handleOAuthCallback();
  }, [toast]);

  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const handleConnect = () => {
    const effectiveClientId = clientId?.trim();
    if (!effectiveClientId) {
      setShowSetupGuide(true);
      return;
    }

    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(effectiveClientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
      `prompt=consent`;

    window.location.href = authUrl;
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
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'fetch-events',
          accessToken,
          dateRange: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      setPendingDates(data.pendingDates || []);
      setCityEvents(data.cityEvents || []);
      setLastSync(new Date().toISOString());

      toast({
        title: "Calendar Synced",
        description: `Found ${data.pendingDates?.length || 0} availability dates in ${data.cityEvents?.length || 0} cities.`,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to fetch calendar events",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
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

        {isConnected && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Connected
          </div>
        )}
      </div>

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
    </div>
  );
};

export default GoogleCalendarSync;
