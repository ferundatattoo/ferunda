import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings2,
  FileText,
  Package,
  Mail,
  Clock,
  Shield,
  Users,
  Building2,
  Gavel,
  Link,
  ScrollText,
  Sparkles,
} from "lucide-react";
import WorkspaceSettingsManager from "./WorkspaceSettingsManager";
import PolicySettingsManager from "./PolicySettingsManager";
import ServiceCatalogManager from "./ServiceCatalogManager";
import EmailTemplateManager from "./EmailTemplateManager";
import SessionConfigManager from "./SessionConfigManager";
import { SecurityDashboard } from "./SecurityDashboard";
import ArtistPoliciesViewer from "./ArtistPoliciesViewer";
import PolicyRuleBuilder from "./PolicyRuleBuilder";
import SocialIntegrationSetup from "./SocialIntegrationSetup";
import AuditLogViewer from "./AuditLogViewer";
import DesignCompilerSettings from "./DesignCompilerSettings";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";

const SettingsHub = () => {
  const [activeSubTab, setActiveSubTab] = useState("workspace");
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-foreground">Configuración</h1>
        <p className="font-body text-muted-foreground mt-1">
          Ajustes del workspace, políticas, servicios y seguridad
        </p>
      </div>

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1 flex-wrap">
          <TabsTrigger value="workspace" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>Workspace</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Políticas</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Gavel className="w-4 h-4" />
            <span>Reglas</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>Servicios</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="session" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Sesiones</span>
          </TabsTrigger>
          <TabsTrigger value="artist-config" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Artist Config</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            <span>Integraciones</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            <span>Audit Log</span>
          </TabsTrigger>
          <TabsTrigger value="design-compiler" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Design Compiler</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="mt-6">
          <WorkspaceSettingsManager />
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
            <div className="text-center py-12 text-muted-foreground">
              No hay artista asociado a este workspace
            </div>
          )}
        </TabsContent>

        <TabsContent value="artist-config" className="mt-6">
          {workspace.workspaceId ? (
            <ArtistPoliciesViewer workspaceId={workspace.workspaceId} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No hay workspace seleccionado
            </div>
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
      </Tabs>
    </div>
  );
};

export default SettingsHub;
