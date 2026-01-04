import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Star, AlertCircle, Activity, 
  ChevronRight, Calendar, DollarSign, Heart,
  MessageCircle, Instagram, Mail, Loader2, Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOSAction } from "@/components/os/OSActionProvider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface ClientProfile {
  id: string;
  email: string;
  email_hash: string;
  full_name: string | null;
  instagram_handle: string | null;
  preferred_styles: string[] | null;
  allergies: string[] | null;
  skin_type: string | null;
  medical_notes: string | null;
  communication_style: string | null;
  session_count: number | null;
  lifetime_value: number | null;
  lead_score: number | null;
  last_session_date: string | null;
  next_recommended_date: string | null;
  ai_persona: unknown | null;
  created_at: string;
}

interface ClientProfilesManagerProps {
  searchQuery?: string;
}

const ClientProfilesManager = ({ searchQuery: externalSearch = "" }: ClientProfilesManagerProps) => {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { dispatch } = useOSAction();

  // Combine external and internal search
  const effectiveSearch = externalSearch || searchTerm;

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .order("lead_score", { ascending: false })
        .limit(100);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load client profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      p.instagram_handle?.toLowerCase().includes(effectiveSearch.toLowerCase())
  );

  const getLeadScoreColor = (score: number | null) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
    if (score >= 50) return "bg-amber-500/20 text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  const handleClientClick = (profile: ClientProfile) => {
    dispatch({ type: "view-client", payload: { clientId: profile.id } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Client Profiles</h2>
          <p className="text-muted-foreground text-sm mt-1">
            AI-enriched client database with persona insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => dispatch({ type: "create-client" })}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Client
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{profiles.length} clients</span>
          </div>
        </div>
      </div>

      {/* Search - only show if no external search */}
      {!externalSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or Instagram..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Star className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {profiles.filter((p) => (p.lead_score || 0) >= 80).length}
                </p>
                <p className="text-xs text-muted-foreground">High-Value Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {profiles.filter((p) => (p.session_count || 0) > 0).length}
                </p>
                <p className="text-xs text-muted-foreground">Return Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Instagram className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {profiles.filter((p) => p.instagram_handle).length}
                </p>
                <p className="text-xs text-muted-foreground">Social Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  ${profiles.reduce((sum, p) => sum + (p.lifetime_value || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total LTV</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client List - Full Width */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No client profiles yet</p>
              <p className="text-sm mt-1">Profiles are created from booking inquiries</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => dispatch({ type: "create-client" })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Client
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredProfiles.map((profile) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => handleClientClick(profile)}
                  className="p-4 bg-card border rounded-lg cursor-pointer transition-colors border-border hover:border-primary/50 hover:bg-card/80"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <span className="font-display text-foreground">
                          {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-body text-foreground">
                          {profile.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {profile.session_count && profile.session_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {profile.session_count} sessions
                        </Badge>
                      )}
                      <Badge className={getLeadScoreColor(profile.lead_score)}>
                        {profile.lead_score || 0} pts
                      </Badge>
                      {profile.instagram_handle && (
                        <Instagram className="w-4 h-4 text-muted-foreground" />
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  {profile.preferred_styles && profile.preferred_styles.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {profile.preferred_styles.slice(0, 3).map((style) => (
                        <Badge key={style} variant="outline" className="text-xs">
                          {style}
                        </Badge>
                      ))}
                      {profile.preferred_styles.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{profile.preferred_styles.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClientProfilesManager;
