import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Code,
  Unlock,
  AlertTriangle,
  Bug,
  Radio,
  Heart,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Activity,
  FileText,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDevMode } from "@/hooks/useDevMode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HealthResult {
  ok: boolean;
  latency?: number;
  error?: string;
}

export const DeveloperSettings = () => {
  const { isEnabled, setDevUnlock, toggleDevUnlock } = useDevMode();
  const [debugMode, setDebugMode] = useState(() => {
    return localStorage.getItem("ferunda_debug") === "true";
  });
  const [coreBusStatus, setCoreBusStatus] = useState<"connected" | "disconnected" | "unknown">("unknown");
  const [healthResults, setHealthResults] = useState<Record<string, HealthResult>>({});
  const [isChecking, setIsChecking] = useState(false);

  // Check CoreBus status on mount
  useEffect(() => {
    const checkCoreBus = () => {
      const status = localStorage.getItem("corebus_status");
      setCoreBusStatus(status === "connected" ? "connected" : status === "disconnected" ? "disconnected" : "unknown");
    };
    checkCoreBus();
    const interval = setInterval(checkCoreBus, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleDebug = () => {
    const newValue = !debugMode;
    localStorage.setItem("ferunda_debug", newValue ? "true" : "false");
    setDebugMode(newValue);
    toast.success(newValue ? "Debug mode enabled" : "Debug mode disabled");
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    const results: Record<string, HealthResult> = {};

    // Check Supabase connection
    const start1 = Date.now();
    try {
      const { error } = await supabase.from("workspace_settings").select("id").limit(1);
      results.supabase = { ok: !error, latency: Date.now() - start1, error: error?.message };
    } catch (e) {
      results.supabase = { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }

    // Check Edge Function (ai-router)
    const start2 = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "health" }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      results.edgeFunctions = { ok: response.ok, latency: Date.now() - start2 };
    } catch (e) {
      results.edgeFunctions = { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }

    // Check Auth
    const start3 = Date.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.auth = { ok: !!session, latency: Date.now() - start3 };
    } catch (e) {
      results.auth = { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }

    setHealthResults(results);
    setIsChecking(false);
  };

  const resetConversation = () => {
    localStorage.removeItem("ferunda_conversation_id");
    window.dispatchEvent(new CustomEvent("clear-chat-cache"));
    toast.success("Conversation reset");
  };

  const clearAllStorage = () => {
    const keysToPreserve = ["ferunda_dev_unlock", "ferunda_debug"];
    const preserved: Record<string, string> = {};
    keysToPreserve.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) preserved[key] = value;
    });
    localStorage.clear();
    sessionStorage.clear();
    Object.entries(preserved).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    window.dispatchEvent(new CustomEvent("clear-chat-cache"));
    toast.success("Storage cleared (dev settings preserved)");
  };

  const quickLinks = [
    { label: "Live Audit", path: "/live-audit", icon: Activity },
    { label: "OS Diagnostics", path: "/os/diagnostics", icon: Gauge },
    { label: "Dev Console", path: "/dev", icon: Code },
    { label: "Audit Report", path: "/audit-report", icon: FileText },
    { label: "Schema Studio", path: "/os/settings", icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {isEnabled && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Developer Mode Active</p>
            <p className="text-sm opacity-80">
              All tier restrictions are bypassed. All modules are unlocked.
            </p>
          </div>
        </div>
      )}

      {/* Master Dev Unlock */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Unlock className="h-5 w-5" />
            Master Dev Unlock
          </CardTitle>
          <CardDescription>
            Bypass all tier restrictions and unlock all modules for development purposes.
            This setting persists across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium">Enable Dev Unlock</p>
              <p className="text-sm text-muted-foreground">
                {isEnabled ? "All modules unlocked" : "Normal restrictions apply"}
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setDevUnlock}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Debug Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Debug Mode</p>
                <p className="text-sm text-muted-foreground">
                  Enable verbose logging in console
                </p>
              </div>
              <Switch checked={debugMode} onCheckedChange={toggleDebug} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">CoreBus Status</p>
                <p className="text-sm text-muted-foreground">
                  Real-time event bus connection
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  coreBusStatus === "connected" && "border-emerald-500 text-emerald-500",
                  coreBusStatus === "disconnected" && "border-destructive text-destructive",
                  coreBusStatus === "unknown" && "border-muted-foreground"
                )}
              >
                <Radio className="h-3 w-3 mr-1" />
                {coreBusStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Storage Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Storage Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={resetConversation}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Conversation
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={clearAllStorage}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Storage
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Health Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Service Health Check
          </CardTitle>
          <CardDescription>
            Test connectivity to backend services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runHealthCheck} disabled={isChecking}>
            {isChecking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Run Health Check
          </Button>

          {Object.keys(healthResults).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {Object.entries(healthResults).map(([service, result]) => (
                <div
                  key={service}
                  className={cn(
                    "p-3 rounded-lg border flex items-center gap-2",
                    result.ok
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-destructive/10 border-destructive/30"
                  )}
                >
                  {result.ok ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm capitalize">{service}</p>
                    {result.latency && (
                      <p className="text-xs text-muted-foreground">{result.latency}ms</p>
                    )}
                    {result.error && (
                      <p className="text-xs text-destructive truncate">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Quick Links
          </CardTitle>
          <CardDescription>
            Navigate to development and diagnostic pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickLinks.map((link) => (
              <Button
                key={link.path}
                variant="outline"
                asChild
                className="h-auto py-3 flex-col gap-1"
              >
                <Link to={link.path}>
                  <link.icon className="h-5 w-5" />
                  <span className="text-xs">{link.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeveloperSettings;
