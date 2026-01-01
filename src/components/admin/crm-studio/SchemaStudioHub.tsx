import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Layers, Link2, GitBranch, LayoutGrid, Shield } from "lucide-react";
import ObjectsManager from "./ObjectsManager";
import PropertiesManager from "./PropertiesManager";
import AssociationsManager from "./AssociationsManager";
import PipelinesManager from "./PipelinesManager";
import ViewsManager from "./ViewsManager";
import PermissionsManager from "./PermissionsManager";

type SchemaTab = "objects" | "properties" | "associations" | "pipelines" | "views" | "permissions";

export default function SchemaStudioHub() {
  const [activeTab, setActiveTab] = useState<SchemaTab>("objects");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM Schema Studio</h1>
        <p className="text-muted-foreground">
          Personaliza objetos, campos, pipelines y vistas sin código
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SchemaTab)}>
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="objects" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Objetos</span>
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Campos</span>
          </TabsTrigger>
          <TabsTrigger value="associations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Asociaciones</span>
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Pipelines</span>
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Vistas</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Permisos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="objects" className="mt-6">
          <ObjectsManager />
        </TabsContent>
        <TabsContent value="properties" className="mt-6">
          <PropertiesManager />
        </TabsContent>
        <TabsContent value="associations" className="mt-6">
          <AssociationsManager />
        </TabsContent>
        <TabsContent value="pipelines" className="mt-6">
          <PipelinesManager />
        </TabsContent>
        <TabsContent value="views" className="mt-6">
          <ViewsManager />
        </TabsContent>
        <TabsContent value="permissions" className="mt-6">
          <PermissionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
