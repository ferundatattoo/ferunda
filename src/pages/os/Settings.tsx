import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// ScrollArea no longer used for tabs
import {
  Settings2, FileText, Package, Mail, Clock, Shield, Users, Building2,
  Gavel, Link, ScrollText, Sparkles, Palette, Activity, Database,
  CheckCircle, AlertTriangle, Zap, ChevronLeft, ChevronRight, Loader2, CreditCard, Code
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import WorkspaceSettingsManager from "@/components/admin/WorkspaceSettingsManager";
import PolicySettingsManager from "@/components/admin/PolicySettingsManager";
import ServiceCatalogManager from "@/components/admin/ServiceCatalogManager";
import EmailTemplateManager from "@/components/admin/EmailTemplateManager";
import SessionConfigManager from "@/components/admin/SessionConfigManager";
import { SecurityDashboard } from "@/components/admin/SecurityDashboard";
import ArtistPoliciesViewer from "@/components/admin/ArtistPoliciesViewer";
import PolicyRuleBuilder from "@/components/admin/PolicyRuleBuilder";
import SocialIntegrationSetup from "@/components/admin/SocialIntegrationSetup";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import DesignCompilerSettings from "@/components/admin/DesignCompilerSettings";
import DiagnosticsCenter from "@/components/admin/DiagnosticsCenter";
import ArtistStyleDNA from "@/components/admin/ArtistStyleDNA";
import { SchemaStudioHub } from "@/components/admin/crm-studio";
import WorkspaceConfigurationManager from "@/components/admin/WorkspaceConfigurationManager";
import CommunicationDiagnostics from "@/components/admin/CommunicationDiagnostics";
import ModuleControlPanel from "@/components/admin/ModuleControlPanel";
import BillingManager from "@/components/admin/BillingManager";
import DeveloperSettings from "@/components/admin/DeveloperSettings";

interface SystemHealth {
  status: "healthy" | "warning" | "error";
  servicesActive: number;
  lastSync: string;
  integrations: number;
}

const OSSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'workspace';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: "healthy",
    servicesActive: 0,
    lastSync: new Date().toISOString(),
    integrations: 0
  });
  const [loading, setLoading] = useState(true);

  const scrollTabsBy = (delta: number) => {
    tabsScrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const { data: services } = await supabase
        .from("artist_services")
        .select("id, is_active")
        .limit(50);

      const activeServices = services?.filter(s => s.is_active)?.length || 0;

      setSystemHealth({
        status: activeServices > 0 ? "healthy" : "warning",
        servicesActive: activeServices,
        lastSync: new Date().toISOString(),
        integrations: 3 // Placeholder
      });
    } catch (error) {
      console.error("Error fetching system health:", error);
    } finally {
      setLoading(false);
    }
  };

  const settingsSections = [
    { id: "billing", label: "Billing", icon: CreditCard, color: "text-emerald-500" },
    { id: "workspace", label: "Workspace", icon: Building2, color: "text-blue-500" },
    { id: "config", label: "Configuración", icon: Settings2, color: "text-teal-500" },
    { id: "policies", label: "Políticas", icon: FileText, color: "text-amber-500" },
    { id: "rules", label: "Reglas", icon: Gavel, color: "text-purple-500" },
    { id: "services", label: "Servicios", icon: Package, color: "text-emerald-500" },
    { id: "templates", label: "Templates", icon: Mail, color: "text-pink-500" },
    { id: "session", label: "Sesiones", icon: Clock, color: "text-cyan-500" },
    { id: "artist-config", label: "Artist Config", icon: Users, color: "text-orange-500" },
    { id: "integrations", label: "Integraciones", icon: Link, color: "text-indigo-500" },
    { id: "security", label: "Seguridad", icon: Shield, color: "text-red-500" },
    { id: "audit", label: "Audit Log", icon: ScrollText, color: "text-slate-500" },
    { id: "design-compiler", label: "Design Compiler", icon: Sparkles, color: "text-violet-500" },
    { id: "style-dna", label: "Style DNA", icon: Palette, color: "text-rose-500" },
    { id: "diagnostics", label: "Diagnostics", icon: Activity, color: "text-teal-500" },
    { id: "communication", label: "Communication", icon: Zap, color: "text-yellow-500" },
    { id: "schema-studio", label: "Schema Studio", icon: Database, color: "text-blue-400" },
    { id: "modules", label: "Modules", icon: Sparkles, color: "text-amber-500" },
    { id: "developer", label: "Developer", icon: Code, color: "text-amber-500" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-emerald-500";
      case "warning": return "bg-amber-500";
      case "error": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };

  // Show loading state while workspace is loading
  if (workspace.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/os")}
            className="rounded-xl hover:bg-secondary/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="p-3 rounded-xl bg-gradient-to-br from-muted-foreground/20 to-muted/10 border border-border/50">
            <Settings2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Settings Hub</h1>
            <p className="text-sm text-muted-foreground">
              Configuración del workspace, políticas y sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 backdrop-blur-xl border border-border/50">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(systemHealth.status)} animate-pulse`} />
            <span className="text-sm capitalize">{systemHealth.status}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSystemHealth} className="shadow-sm">
            Sync Status
          </Button>
        </div>
      </motion.div>

      {/* System Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">System Status</p>
                  <p className="text-lg font-bold mt-1 capitalize">{systemHealth.status}</p>
                </div>
                <div className={`p-2 rounded-lg ${systemHealth.status === "healthy" ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
                  {systemHealth.status === "healthy" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Servicios Activos</p>
                  <p className="text-lg font-bold mt-1">{loading ? "..." : systemHealth.servicesActive}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Integraciones</p>
                  <p className="text-lg font-bold mt-1">{systemHealth.integrations}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Link className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Last Sync</p>
                  <p className="text-lg font-bold mt-1">
                    {new Date(systemHealth.lastSync).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Zap className="w-5 h-5 text-cyan-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Navegación Rápida</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {settingsSections.map((section, i) => (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.02 }}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    activeTab === section.id 
                      ? "bg-primary/20 border border-primary/30 shadow-lg" 
                      : "bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border/50"
                  }`}
                >
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                  <span className="text-xs text-center">{section.label}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative">
            {/* Scroll buttons */}
            <button
              type="button"
              onClick={() => scrollTabsBy(-320)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-lg bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTabsBy(320)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-lg bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center"
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Scrollable tab row */}
            <div
              ref={tabsScrollRef}
              className="w-full overflow-x-auto px-10 pb-2 -mb-2"
            >
              <TabsList className="w-max min-w-full justify-start bg-card/50 backdrop-blur-xl border border-border/50 p-1 shadow-lg gap-1">
                {settingsSections.map((section) => (
                  <TabsTrigger 
                    key={section.id} 
                    value={section.id} 
                    className="flex items-center gap-2 data-[state=active]:bg-primary/20 whitespace-nowrap"
                  >
                    <section.icon className="w-4 h-4" />
                    <span className="hidden md:inline">{section.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value="billing" className="mt-6">
            <BillingManager />
          </TabsContent>

          <TabsContent value="workspace" className="mt-6">
            <WorkspaceSettingsManager />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <WorkspaceConfigurationManager />
          </TabsContent>

          <TabsContent value="policies" className="mt-6">
            <PolicySettingsManager />
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            <PolicyRuleBuilder />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <ServiceCatalogManager />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="session" className="mt-6">
            {workspace.artistId ? (
              <SessionConfigManager artistId={workspace.artistId} />
            ) : (
              <EmptyStateCard message="No hay artista asociado a este workspace" />
            )}
          </TabsContent>

          <TabsContent value="artist-config" className="mt-6">
            {workspace.workspaceId ? (
              <ArtistPoliciesViewer workspaceId={workspace.workspaceId} />
            ) : (
              <EmptyStateCard message="No hay workspace seleccionado" />
            )}
          </TabsContent>

          <TabsContent value="integrations" className="mt-6">
            <SocialIntegrationSetup />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="design-compiler" className="mt-6">
            <DesignCompilerSettings />
          </TabsContent>

          <TabsContent value="style-dna" className="mt-6">
            {workspace.artistId ? (
              <ArtistStyleDNA artistId={workspace.artistId} />
            ) : (
              <EmptyStateCard message="No hay artista asociado" />
            )}
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-6">
            <DiagnosticsCenter />
          </TabsContent>

          <TabsContent value="communication" className="mt-6">
            <CommunicationDiagnostics />
          </TabsContent>

          <TabsContent value="schema-studio" className="mt-6">
            <SchemaStudioHub />
          </TabsContent>

          <TabsContent value="modules" className="mt-6">
            <ModuleControlPanel />
          </TabsContent>

          <TabsContent value="developer" className="mt-6">
            <DeveloperSettings />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

const EmptyStateCard = ({ message, showAction = false, onAction }: { message: string; showAction?: boolean; onAction?: () => void }) => (
  <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
    <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
      <AlertTriangle className="w-12 h-12 text-amber-500/50" />
      <p className="text-muted-foreground text-center">{message}</p>
      {showAction && onAction && (
        <Button onClick={onAction} variant="outline">
          Configurar Ahora
        </Button>
      )}
    </CardContent>
  </Card>
);

export default OSSettings;
