import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Wand2, Image, CheckCircle } from "lucide-react";
import DesignStudioAI from "./DesignStudioAI";
import GalleryManager from "./GalleryManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface PendingApproval {
  id: string;
  image_url: string;
  client_name: string;
  created_at: string;
  status: string;
}

const CreativeStudio = () => {
  const [activeSubTab, setActiveSubTab] = useState("design-ai");
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  useEffect(() => {
    if (activeSubTab === "approvals") {
      fetchPendingApprovals();
    }
  }, [activeSubTab]);

  const fetchPendingApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const { data } = await supabase
        .from("ai_design_suggestions")
        .select("id, generated_image_url, user_prompt, created_at, client_reaction")
        .is("client_reaction", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setPendingApprovals(
          data.map((d) => ({
            id: d.id,
            image_url: d.generated_image_url || "",
            client_name: d.user_prompt?.slice(0, 30) || "Sin descripción",
            created_at: d.created_at,
            status: d.client_reaction || "pending",
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoadingApprovals(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-foreground">Design Studio</h1>
        <p className="font-body text-muted-foreground mt-1">
          Generación de diseños, galería y aprobaciones
        </p>
      </div>

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1">
          <TabsTrigger value="design-ai" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            <span>Design AI</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            <span>Galería</span>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Aprobaciones</span>
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design-ai" className="mt-6">
          <DesignStudioAI />
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          <GalleryManager />
        </TabsContent>

        <TabsContent value="approvals" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Diseños Pendientes de Aprobación</h2>
              <Button variant="outline" size="sm" onClick={fetchPendingApprovals}>
                Actualizar
              </Button>
            </div>

            {loadingApprovals ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="font-body text-muted-foreground">
                    No hay diseños pendientes de aprobación
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingApprovals.map((approval) => (
                  <Card key={approval.id} className="overflow-hidden">
                    {approval.image_url && (
                      <div className="aspect-square bg-secondary">
                        <img
                          src={approval.image_url}
                          alt="Design"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <p className="font-body text-sm text-foreground truncate">
                        {approval.client_name}
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        {new Date(approval.created_at).toLocaleDateString("es")}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1">
                          Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreativeStudio;
