import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Palette, Wand2, Image, CheckCircle, Sparkles, 
  Layers, TrendingUp, Clock, Eye, Zap, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOSAction } from "@/components/os/OSActionProvider";
import { toast } from "sonner";
import DesignStudioAI from "@/components/admin/DesignStudioAI";
import GalleryManager from "@/components/admin/GalleryManager";
import PortfolioExemplarManager from "@/components/admin/PortfolioExemplarManager";
import DesignDetailModal from "@/components/admin/DesignDetailModal";

interface DesignStats {
  totalDesigns: number;
  pending: number;
  approved: number;
  thisWeek: number;
}

interface PendingApproval {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

const OSStudio = () => {
  const [activeTab, setActiveTab] = useState("design-ai");
  const [stats, setStats] = useState<DesignStats>({ totalDesigns: 0, pending: 0, approved: 0, thisWeek: 0 });
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const { dispatch } = useOSAction();

  useEffect(() => {
    fetchStudioData();
  }, []);

  const fetchStudioData = async () => {
    try {
      const { data: designs } = await supabase
        .from("ai_design_suggestions")
        .select("id, generated_image_url, user_prompt, created_at, client_reaction")
        .order("created_at", { ascending: false })
        .limit(100);

      if (designs) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const pending = designs.filter(d => !d.client_reaction);
        const approved = designs.filter(d => d.client_reaction === "approved");
        const thisWeek = designs.filter(d => new Date(d.created_at) > weekAgo);

        setStats({
          totalDesigns: designs.length,
          pending: pending.length,
          approved: approved.length,
          thisWeek: thisWeek.length
        });

        setPendingApprovals(
          pending.slice(0, 4).map(d => ({
            id: d.id,
            image_url: d.generated_image_url || "",
            prompt: d.user_prompt || "",
            created_at: d.created_at
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching studio data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Diseños", value: stats.totalDesigns, icon: Layers, color: "from-violet-500 to-purple-500" },
    { label: "Pendientes", value: stats.pending, icon: Clock, color: "from-amber-500 to-orange-500" },
    { label: "Aprobados", value: stats.approved, icon: CheckCircle, color: "from-emerald-500 to-green-500" },
    { label: "Esta Semana", value: stats.thisWeek, icon: TrendingUp, color: "from-blue-500 to-cyan-500" }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20">
            <Palette className="w-6 h-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Design Studio</h1>
            <p className="text-sm text-muted-foreground">
              Generación AI, galería y aprobaciones de diseños
            </p>
          </div>
        </div>
        <Button 
          className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-500/20"
          onClick={() => dispatch({ type: 'create-design' })}
        >
          <Wand2 className="w-4 h-4" />
          Nuevo Diseño AI
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden bg-card/50 backdrop-blur-xl border-border/50 hover:border-violet-500/30 transition-all group shadow-lg">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{loading ? "..." : stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* AI Generation Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-violet-500/10 via-card/50 to-card/30 backdrop-blur-xl border-violet-500/20 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Sparkles className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">AI Design Engine</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.thisWeek > 0
                    ? `${stats.thisWeek} diseños generados esta semana. El estilo más solicitado es micro-realismo.`
                    : "Motor de diseño AI listo. Genera conceptos únicos basados en el estilo del artista."
                  }
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-400">
                    <Zap className="w-3 h-3 mr-1" />
                    Engine activo
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Style DNA sync
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Approvals Quick View */}
      {pendingApprovals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pendientes de Aprobación
                  <Badge variant="secondary">{stats.pending}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("approvals")}>
                  Ver todos <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pendingApprovals.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="group cursor-pointer"
                    onClick={() => {
                      setSelectedDesign({
                        id: item.id,
                        generated_image_url: item.image_url,
                        user_prompt: item.prompt,
                        created_at: item.created_at
                      });
                      setDesignModalOpen(true);
                    }}
                  >
                    <div className="aspect-square rounded-lg bg-secondary/50 overflow-hidden relative">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt="Design"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-xs text-white truncate">{item.prompt.slice(0, 30)}...</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-card/50 backdrop-blur-xl border border-border/50 p-1 flex-wrap shadow-lg">
            <TabsTrigger value="design-ai" className="flex items-center gap-2 data-[state=active]:bg-violet-500/20">
              <Wand2 className="w-4 h-4" />
              <span>Design AI</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2 data-[state=active]:bg-violet-500/20">
              <Image className="w-4 h-4" />
              <span>Galería</span>
            </TabsTrigger>
            <TabsTrigger value="exemplars" className="flex items-center gap-2 data-[state=active]:bg-violet-500/20">
              <Sparkles className="w-4 h-4" />
              <span>Exemplars</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2 data-[state=active]:bg-violet-500/20">
              <CheckCircle className="w-4 h-4" />
              <span>Aprobaciones</span>
              {stats.pending > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-400">
                  {stats.pending}
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

          <TabsContent value="exemplars" className="mt-6">
            <PortfolioExemplarManager />
          </TabsContent>

          <TabsContent value="approvals" className="mt-6">
            <ApprovalsSection onRefresh={fetchStudioData} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Design Detail Modal */}
      <DesignDetailModal
        open={designModalOpen}
        onOpenChange={setDesignModalOpen}
        design={selectedDesign}
        onAction={fetchStudioData}
      />
    </div>
  );
};

// Approvals Section Component
const ApprovalsSection = ({ onRefresh }: { onRefresh: () => void }) => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("ai_design_suggestions")
        .select("id, generated_image_url, user_prompt, created_at, client_reaction")
        .is("client_reaction", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setApprovals(data);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
          <p className="text-muted-foreground">No hay diseños pendientes de aprobación</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Diseños Pendientes</h2>
        <Button variant="outline" size="sm" onClick={() => { fetchApprovals(); onRefresh(); }}>
          Actualizar
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {approvals.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card 
              className="overflow-hidden bg-card/50 backdrop-blur-xl border-border/50 hover:border-violet-500/30 transition-all shadow-lg cursor-pointer"
              onClick={() => {
                setSelectedDesign(item);
                setModalOpen(true);
              }}
            >
              {item.generated_image_url && (
                <div className="aspect-square bg-secondary">
                  <img
                    src={item.generated_image_url}
                    alt="Design"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <p className="text-sm truncate">{item.user_prompt?.slice(0, 50) || "Sin descripción"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.created_at).toLocaleDateString("es")}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await supabase
                          .from('ai_design_suggestions')
                          .update({ client_reaction: 'approved', reaction_sentiment_score: 1.0 })
                          .eq('id', item.id);
                        toast.success('Diseño aprobado');
                        fetchApprovals();
                        onRefresh();
                      } catch (err) {
                        toast.error('Error al aprobar');
                      }
                    }}
                  >
                    Aprobar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await supabase
                          .from('ai_design_suggestions')
                          .update({ client_reaction: 'rejected', reaction_sentiment_score: -1.0 })
                          .eq('id', item.id);
                        toast.success('Diseño rechazado');
                        fetchApprovals();
                        onRefresh();
                      } catch (err) {
                        toast.error('Error al rechazar');
                      }
                    }}
                  >
                    Rechazar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Design Detail Modal */}
      <DesignDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        design={selectedDesign}
        onAction={() => {
          fetchApprovals();
          onRefresh();
        }}
      />
    </div>
  );
};

export default OSStudio;
