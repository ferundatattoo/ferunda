import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Settings,
  Zap,
  Brain,
  Shield,
  Bell,
  Palette,
  Clock,
  DollarSign,
  Users,
  Mail,
  Globe,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";

interface WorkspaceConfig {
  id: string;
  config_key: string;
  config_value: any;
  category: string;
  description: string | null;
}

interface ConfigSection {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

const CONFIG_SECTIONS: ConfigSection[] = [
  { key: "general", label: "General", icon: Settings, description: "Configuración básica del workspace" },
  { key: "ai", label: "AI & Automation", icon: Brain, description: "Modelos de IA y automatización" },
  { key: "workflow", label: "Workflows", icon: Zap, description: "Configuración de workflows durables" },
  { key: "notifications", label: "Notificaciones", icon: Bell, description: "Alertas y comunicaciones" },
  { key: "security", label: "Seguridad", icon: Shield, description: "Políticas de seguridad y acceso" },
  { key: "pricing", label: "Precios", icon: DollarSign, description: "Tarifas y políticas de pago" },
];

const DEFAULT_CONFIGS: Record<string, Record<string, any>> = {
  general: {
    workspace_name: "My Studio",
    timezone: "America/Chicago",
    default_language: "es",
    business_hours_start: "09:00",
    business_hours_end: "18:00",
  },
  ai: {
    ai_enabled: true,
    ai_model_primary: "gpt-4o-mini",
    ai_model_fallback: "gemini-2.0-flash",
    ai_max_tokens: 2000,
    ai_temperature: 0.7,
    ai_auto_respond: false,
    ai_confidence_threshold: 0.8,
  },
  workflow: {
    workflow_enabled: true,
    workflow_max_retries: 3,
    workflow_retry_delay_seconds: 60,
    workflow_timeout_minutes: 30,
    workflow_dead_letter_enabled: true,
    workflow_auto_schedule: false,
  },
  notifications: {
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    notification_digest: "realtime",
    escalation_timeout_hours: 24,
  },
  security: {
    require_2fa: false,
    session_timeout_hours: 24,
    ip_whitelist_enabled: false,
    audit_log_retention_days: 90,
  },
  pricing: {
    hourly_rate: 150,
    deposit_percentage: 20,
    cancellation_fee_percentage: 50,
    minimum_session_hours: 2,
  },
};

const WorkspaceConfigurationManager = () => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("general");
  const [configs, setConfigs] = useState<Record<string, Record<string, any>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("app_configurations")
        .select("*")
        .order("category");

      const configMap: Record<string, Record<string, any>> = { ...DEFAULT_CONFIGS };

      (data || []).forEach((config: WorkspaceConfig) => {
        if (!configMap[config.category]) {
          configMap[config.category] = {};
        }
        configMap[config.category][config.config_key] = config.config_value;
      });

      setConfigs(configMap);
    } catch (error) {
      console.error("Error fetching configs:", error);
      setConfigs(DEFAULT_CONFIGS);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (category: string, key: string, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
      const upserts: any[] = [];

      Object.entries(configs).forEach(([category, categoryConfigs]) => {
        Object.entries(categoryConfigs).forEach(([key, value]) => {
          upserts.push({
            category,
            config_key: key,
            config_value: value,
          });
        });
      });

      for (const config of upserts) {
        await supabase
          .from("app_configurations")
          .upsert(config, { onConflict: "config_key" });
      }

      toast({
        title: "Configuración guardada",
        description: "Los cambios se aplicaron correctamente"
      });
      setHasChanges(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const renderConfigField = (category: string, key: string, value: any) => {
    const labelKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    // Boolean fields
    if (typeof value === "boolean") {
      return (
        <div key={key} className="flex items-center justify-between py-3">
          <div>
            <Label className="text-sm font-medium">{labelKey}</Label>
          </div>
          <Switch
            checked={value}
            onCheckedChange={(checked) => updateConfig(category, key, checked)}
          />
        </div>
      );
    }

    // Number fields with specific handling
    if (typeof value === "number") {
      // Percentage fields
      if (key.includes("percentage") || key.includes("threshold")) {
        return (
          <div key={key} className="space-y-2 py-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{labelKey}</Label>
              <span className="text-sm text-muted-foreground">{Math.round(value * (key.includes("threshold") ? 100 : 1))}%</span>
            </div>
            <Slider
              value={[value * (key.includes("threshold") ? 100 : 1)]}
              onValueChange={([v]) => updateConfig(category, key, v / (key.includes("threshold") ? 100 : 1))}
              max={100}
              step={1}
            />
          </div>
        );
      }

      // Currency fields
      if (key.includes("rate") || key.includes("fee") || key.includes("amount")) {
        return (
          <div key={key} className="space-y-2 py-3">
            <Label className="text-sm font-medium">{labelKey}</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                value={value}
                onChange={(e) => updateConfig(category, key, parseFloat(e.target.value) || 0)}
                className="w-32"
              />
            </div>
          </div>
        );
      }

      // Regular number
      return (
        <div key={key} className="space-y-2 py-3">
          <Label className="text-sm font-medium">{labelKey}</Label>
          <Input
            type="number"
            value={value}
            onChange={(e) => updateConfig(category, key, parseFloat(e.target.value) || 0)}
            className="w-32"
          />
        </div>
      );
    }

    // Select fields for specific keys
    if (key.includes("model") || key === "notification_digest" || key === "default_language") {
      const options: Record<string, string[]> = {
        ai_model_primary: ["gpt-4o-mini", "gpt-4o", "gemini-2.0-flash", "gemini-2.5-pro"],
        ai_model_fallback: ["gemini-2.0-flash", "gpt-4o-mini", "gemini-2.5-flash-lite"],
        notification_digest: ["realtime", "hourly", "daily"],
        default_language: ["es", "en", "pt"],
      };

      return (
        <div key={key} className="space-y-2 py-3">
          <Label className="text-sm font-medium">{labelKey}</Label>
          <select
            value={value}
            onChange={(e) => updateConfig(category, key, e.target.value)}
            className="w-full p-2 rounded-md border border-input bg-background text-sm"
          >
            {(options[key] || [value]).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    // Time fields
    if (key.includes("hours_start") || key.includes("hours_end") || key.includes("time")) {
      return (
        <div key={key} className="space-y-2 py-3">
          <Label className="text-sm font-medium">{labelKey}</Label>
          <Input
            type="time"
            value={value}
            onChange={(e) => updateConfig(category, key, e.target.value)}
            className="w-40"
          />
        </div>
      );
    }

    // Default text field
    return (
      <div key={key} className="space-y-2 py-3">
        <Label className="text-sm font-medium">{labelKey}</Label>
        <Input
          type="text"
          value={value}
          onChange={(e) => updateConfig(category, key, e.target.value)}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración del Workspace</h2>
          <p className="text-muted-foreground">Sistema centralizado de configuración</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500">
              <AlertTriangle className="w-3 h-3" />
              Cambios sin guardar
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchConfigs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </Button>
          <Button onClick={saveConfigs} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      {/* Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-xl border-border/30">
          <CardContent className="p-4">
            <nav className="space-y-1">
              {CONFIG_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;
                return (
                  <motion.button
                    key={section.key}
                    whileHover={{ x: 4 }}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/30" 
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                    <div>
                      <p className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                        {section.label}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {section.description}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="lg:col-span-3 bg-card/50 backdrop-blur-xl border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const section = CONFIG_SECTIONS.find(s => s.key === activeSection);
                const Icon = section?.icon || Settings;
                return (
                  <>
                    <Icon className="w-5 h-5 text-primary" />
                    {section?.label || "Configuración"}
                  </>
                );
              })()}
            </CardTitle>
            <CardDescription>
              {CONFIG_SECTIONS.find(s => s.key === activeSection)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-1 divide-y divide-border/50">
                {configs[activeSection] && Object.entries(configs[activeSection]).map(([key, value]) => (
                  renderConfigField(activeSection, key, value)
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkspaceConfigurationManager;
