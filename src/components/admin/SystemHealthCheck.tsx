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
  Shield
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

  const updateCheck = (name: string, update: Partial<HealthCheck>) => {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, ...update } : c));
  };

  const runHealthChecks = async () => {
    setRunning(true);
    setChecks(prev => prev.map(c => ({ ...c, status: "checking" as const, message: undefined, latency: undefined })));

    // 1. Auth check
    try {
      const start = Date.now();
      const { data: { session }, error } = await supabase.auth.getSession();
      const latency = Date.now() - start;
      
      if (error) {
        updateCheck("Autenticación", { status: "error", message: error.message, latency });
      } else if (session) {
        updateCheck("Autenticación", { status: "ok", message: `Usuario: ${session.user.email}`, latency });
      } else {
        updateCheck("Autenticación", { status: "error", message: "No hay sesión activa", latency });
      }
    } catch (e: any) {
      updateCheck("Autenticación", { status: "error", message: e.message });
    }

    // 2. DB read check
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from("availability")
        .select("*", { count: "exact", head: true });
      const latency = Date.now() - start;
      
      if (error) {
        updateCheck("Base de datos", { status: "error", message: error.message, latency });
      } else {
        updateCheck("Base de datos", { status: "ok", message: `Conexión OK`, latency });
      }
    } catch (e: any) {
      updateCheck("Base de datos", { status: "error", message: e.message });
    }

    // 3. Availability data check
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from("availability")
        .select("id")
        .limit(10);
      const latency = Date.now() - start;
      
      if (error) {
        updateCheck("Disponibilidad", { status: "error", message: error.message, latency });
      } else {
        updateCheck("Disponibilidad", { status: "ok", message: `${data?.length || 0} registros accesibles`, latency });
      }
    } catch (e: any) {
      updateCheck("Disponibilidad", { status: "error", message: e.message });
    }

    // 4. Edge functions check
    try {
      const start = Date.now();
      const { data, error } = await supabase.functions.invoke("check-secrets-health", {
        body: {}
      });
      const latency = Date.now() - start;
      
      if (error) {
        updateCheck("Edge Functions", { status: "error", message: error.message, latency });
      } else {
        const configured = data?.summary?.configured || 0;
        const total = data?.summary?.total || 0;
        updateCheck("Edge Functions", { 
          status: "ok", 
          message: `${configured}/${total} secrets configurados`, 
          latency 
        });
      }
    } catch (e: any) {
      updateCheck("Edge Functions", { status: "error", message: e.message });
    }

    setRunning(false);
    
    const allOk = checks.every(c => c.status === "ok");
    if (allOk) {
      toast.success("Sistema funcionando correctamente");
    } else {
      toast.error("Se encontraron problemas - revisa los detalles");
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
      </CardContent>
    </Card>
  );
};

export default SystemHealthCheck;
