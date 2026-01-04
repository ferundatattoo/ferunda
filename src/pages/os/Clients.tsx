import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Heart, Brain, Search, TrendingUp, Star, Clock, 
  UserPlus, Activity, Zap, ChevronRight, Sparkles 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOSAction } from "@/components/os/OSActionProvider";
import ClientProfilesManager from "@/components/admin/ClientProfilesManager";
import HealingTrackerManager from "@/components/admin/HealingTrackerManager";
import ClientIntelligenceEngine from "@/components/admin/ClientIntelligenceEngine";

interface ClientStats {
  total: number;
  vip: number;
  returning: number;
  new: number;
}

const OSClients = () => {
  const [activeTab, setActiveTab] = useState("profiles");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<ClientStats>({ total: 0, vip: 0, returning: 0, new: 0 });
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { dispatch, onClientRefresh } = useOSAction();

  const handleRefresh = useCallback(() => {
    fetchClientData();
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    fetchClientData();
    // Register for refresh events from action provider
    const unsubscribe = onClientRefresh(handleRefresh);
    return unsubscribe;
  }, [onClientRefresh, handleRefresh]);

  const fetchClientData = async () => {
    try {
      // Fetch bookings as proxy for clients
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, name, email, status, created_at, deposit_paid")
        .order("created_at", { ascending: false })
        .limit(100);

      if (bookings) {
        const uniqueEmails = new Set(bookings.map(b => b.email));
        const vipCount = bookings.filter(b => b.deposit_paid).length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newCount = bookings.filter(b => new Date(b.created_at) > thirtyDaysAgo).length;

        setStats({
          total: uniqueEmails.size,
          vip: Math.floor(vipCount / 3),
          returning: Math.floor(uniqueEmails.size * 0.4),
          new: newCount
        });

        setRecentClients(bookings.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Clientes", value: stats.total, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "VIP", value: stats.vip, icon: Star, color: "from-amber-500 to-orange-500" },
    { label: "Recurrentes", value: stats.returning, icon: TrendingUp, color: "from-emerald-500 to-green-500" },
    { label: "Nuevos (30d)", value: stats.new, icon: UserPlus, color: "from-purple-500 to-pink-500" }
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            Client Hub
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión integral de clientes, healing y intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-background/50 backdrop-blur-sm border-border/50"
            />
          </div>
          <Button className="gap-2" onClick={() => dispatch({ type: "create-client" })}>
            <UserPlus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </div>
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
            <Card className="relative overflow-hidden bg-card/30 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all group">
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

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">AI Client Insights</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.vip > 0 
                    ? `${stats.vip} clientes VIP tienen alta probabilidad de referir. Considera un programa de referidos.`
                    : "Analiza patrones de comportamiento para identificar clientes VIP potenciales."
                  }
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    <Activity className="w-3 h-3 mr-1" />
                    {stats.returning} activos
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Alto engagement
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Clients Quick View */}
      {recentClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card/30 backdrop-blur-xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Clientes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {recentClients.map((client, i) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    onClick={() => dispatch({ type: "view-client", payload: { clientEmail: client.email } })}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium">{client.name?.charAt(0) || "?"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{client.name || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={client.deposit_paid ? "default" : "secondary"} className="text-xs">
                        {client.deposit_paid ? "VIP" : "Lead"}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
          <TabsList className="w-full justify-start bg-card/30 backdrop-blur-xl border border-border/50 p-1">
            <TabsTrigger value="profiles" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
              <Users className="w-4 h-4" />
              <span>Perfiles</span>
            </TabsTrigger>
            <TabsTrigger value="healing" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
              <Heart className="w-4 h-4" />
              <span>Healing Tracker</span>
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="flex items-center gap-2 data-[state=active]:bg-primary/20">
              <Brain className="w-4 h-4" />
              <span>Intelligence</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="mt-6">
            <ClientProfilesManager key={refreshKey} searchQuery={searchQuery} />
          </TabsContent>

          <TabsContent value="healing" className="mt-6">
            <HealingTrackerManager />
          </TabsContent>

          <TabsContent value="intelligence" className="mt-6">
            <ClientIntelligenceEngine />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default OSClients;
