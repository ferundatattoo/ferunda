import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Database,
  User,
  Zap,
  Shield,
  FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HealthCheck {
  name: string;
  status: "pending" | "checking" | "ok" | "error";
  message?: string;
  latency?: number;
}

const SystemHealthCheck = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: "Autenticación", status: "pending" },
    { name: "Base de datos", status: "pending" },
    { name: "Disponibilidad", status: "pending" },
    { name: "Edge Functions", status: "pending" },
  ]);
  const [running, setRunning] = useState(false);
  const [smokeTestResult, setSmokeTestResult] = useState<{ status: "idle" | "running" | "pass" | "fail"; message?: string }>({ status: "idle" });

  const TIMEOUT_MS = 12000;

  // Helper: wrap any promise with a timeout
  const withTimeout = <T,>(promise: Promise<T>, label: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout (${TIMEOUT_MS}ms)`)), TIMEOUT_MS)
      ),
    ]);
  };

  const runHealthChecks = async () => {
    setRunning(true);
    
    // Build results locally to avoid stale state
    const results: HealthCheck[] = [
      { name: "Autenticación", status: "checking" },
      { name: "Base de datos", status: "checking" },
      { name: "Disponibilidad", status: "checking" },
      { name: "Edge Functions", status: "checking" },
    ];
    setChecks([...results]);

    try {
      // 1. Auth check
      try {
        const start = Date.now();
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          "Auth"
        );
        const latency = Date.now() - start;
        
        if (error) {
          results[0] = { name: "Autenticación", status: "error", message: error.message, latency };
        } else if (session) {
          results[0] = { name: "Autenticación", status: "ok", message: `Usuario: ${session.user.email}`, latency };
        } else {
          results[0] = { name: "Autenticación", status: "error", message: "No hay sesión activa", latency };
        }
      } catch (e: any) {
        results[0] = { name: "Autenticación", status: "error", message: e.message };
      }
      setChecks([...results]);

      // 2. DB read check
      try {
        const start = Date.now();
        // Convert thenable to promise for timeout wrapper
        const dbResult = await withTimeout(
          Promise.resolve(supabase.from("availability").select("*", { count: "exact", head: true })),
          "DB count"
        ) as { count: number | null; error: { message: string } | null };
        const latency = Date.now() - start;
        
        if (dbResult.error) {
          results[1] = { name: "Base de datos", status: "error", message: dbResult.error.message, latency };
        } else {
          results[1] = { name: "Base de datos", status: "ok", message: `Conexión OK (${dbResult.count ?? 0} registros)`, latency };
        }
      } catch (e: any) {
        results[1] = { name: "Base de datos", status: "error", message: e.message };
      }
      setChecks([...results]);

      // 3. Availability data check
      try {
        const start = Date.now();
        const availResult = await withTimeout(
          Promise.resolve(supabase.from("availability").select("id").limit(10)),
          "Availability"
        ) as { data: { id: string }[] | null; error: { message: string } | null };
        const latency = Date.now() - start;
        
        if (availResult.error) {
          results[2] = { name: "Disponibilidad", status: "error", message: availResult.error.message, latency };
        } else {
          results[2] = { name: "Disponibilidad", status: "ok", message: `${availResult.data?.length || 0} registros accesibles`, latency };
        }
      } catch (e: any) {
        results[2] = { name: "Disponibilidad", status: "error", message: e.message };
      }
      setChecks([...results]);

      // 4. Edge functions check
      try {
        const start = Date.now();
        const { data, error } = await withTimeout(
          supabase.functions.invoke("check-secrets-health", { body: {} }),
          "Edge Function"
        );
        const latency = Date.now() - start;
        
        if (error) {
          results[3] = { name: "Edge Functions", status: "error", message: error.message, latency };
        } else {
          const configured = data?.summary?.configured || 0;
          const total = data?.summary?.total || 0;
          results[3] = { name: "Edge Functions", status: "ok", message: `${configured}/${total} secrets`, latency };
        }
      } catch (e: any) {
        results[3] = { name: "Edge Functions", status: "error", message: e.message };
      }
      setChecks([...results]);

      // Evaluate on final results array (not stale state)
      const okCount = results.filter(c => c.status === "ok").length;
      const totalCount = results.length;
      
      if (okCount === totalCount) {
        toast.success(`✅ Sistema OK (${okCount}/${totalCount})`);
      } else {
        const failed = results.filter(c => c.status === "error").map(c => c.name);
        toast.error(`❌ Problemas: ${failed.join(", ")}`);
      }
    } finally {
      setRunning(false);
    }
  };

  const runSmokeTest = async () => {
    setSmokeTestResult({ status: "running", message: "Ejecutando..." });
    
    try {
      // Step 1: Insert test row
      const testId = `smoke-test-${Date.now()}`;
      const { error: insertError } = await supabase
        .from("availability")
        .insert({ date: "2099-12-31", city: "Austin", notes: testId, is_available: true });
      
      if (insertError) {
        setSmokeTestResult({ status: "fail", message: `Insert falló: ${insertError.message}` });
        return;
      }

      // Step 2: Verify it exists
      const { data: found, error: selectError } = await supabase
        .from("availability")
        .select("id")
        .eq("notes", testId)
        .single();
      
      if (selectError || !found) {
        setSmokeTestResult({ status: "fail", message: `Select falló: ${selectError?.message || "No encontrado"}` });
        return;
      }

      // Step 3: Delete it
      const { error: deleteError } = await supabase
        .from("availability")
        .delete()
        .eq("id", found.id);
      
      if (deleteError) {
        setSmokeTestResult({ status: "fail", message: `Delete falló: ${deleteError.message}` });
        return;
      }

      setSmokeTestResult({ status: "pass", message: "Insert → Select → Delete ✓" });
      toast.success("Smoke Test PASÓ");
    } catch (e: any) {
      setSmokeTestResult({ status: "fail", message: e.message });
      toast.error("Smoke Test FALLÓ");
    }
  };

  const getIcon = (status: HealthCheck["status"]) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error": return <XCircle className="w-5 h-5 text-destructive" />;
      case "checking": return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getCheckIcon = (name: string) => {
    switch (name) {
      case "Autenticación": return <User className="w-4 h-4" />;
      case "Base de datos": return <Database className="w-4 h-4" />;
      case "Disponibilidad": return <Shield className="w-4 h-4" />;
      case "Edge Functions": return <Zap className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-display">System Health</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={runHealthChecks}
          disabled={running}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Verificando..." : "Verificar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check, index) => (
          <motion.div
            key={check.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
              check.status === "ok" 
                ? "border-green-500/30 bg-green-500/5" 
                : check.status === "error"
                ? "border-destructive/30 bg-destructive/5"
                : "border-border/50 bg-secondary/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-secondary/50 rounded">
                {getCheckIcon(check.name)}
              </div>
              <div>
                <p className="font-medium text-sm">{check.name}</p>
                {check.message && (
                  <p className={`text-xs ${check.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                    {check.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {check.latency !== undefined && (
                <span className="text-xs text-muted-foreground">{check.latency}ms</span>
              )}
              {getIcon(check.status)}
            </div>
          </motion.div>
        ))}
        
        {checks.every(c => c.status === "pending") && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Haz clic en "Verificar" para comprobar el estado del sistema
          </p>
        )}

        {/* Smoke Test */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Smoke Test (DB Write)</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={runSmokeTest}
              disabled={smokeTestResult.status === "running"}
              className="gap-2"
            >
              {smokeTestResult.status === "running" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : smokeTestResult.status === "pass" ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : smokeTestResult.status === "fail" ? (
                <XCircle className="w-3 h-3 text-destructive" />
              ) : null}
              Probar
            </Button>
          </div>
          {smokeTestResult.message && (
            <p className={`text-xs mt-2 ${smokeTestResult.status === "fail" ? "text-destructive" : "text-muted-foreground"}`}>
              {smokeTestResult.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemHealthCheck;
