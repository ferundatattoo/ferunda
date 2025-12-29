import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Star, AlertCircle, Activity, 
  ChevronRight, Calendar, DollarSign, Heart,
  MessageCircle, Instagram, Mail, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const ClientProfilesManager = () => {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ClientProfile | null>(null);
  const { toast } = useToast();

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
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.instagram_handle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadScoreColor = (score: number | null) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
    if (score >= 50) return "bg-amber-500/20 text-amber-400";
    return "bg-muted text-muted-foreground";
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{profiles.length} clients</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or Instagram..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-2 space-y-2">
          <AnimatePresence>
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No client profiles yet</p>
                <p className="text-sm mt-1">Profiles are created from booking inquiries</p>
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setSelectedProfile(profile)}
                  className={`p-4 bg-card border rounded-lg cursor-pointer transition-colors ${
                    selectedProfile?.id === profile.id
                      ? "border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
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
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Profile Detail */}
        <div className="lg:col-span-1">
          {selectedProfile ? (
            <Card className="bg-card border-border sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg">
                  {selectedProfile.full_name || "Client Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedProfile.email}</span>
                  </div>
                  {selectedProfile.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">@{selectedProfile.instagram_handle}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sessions</span>
                    <span className="text-foreground">{selectedProfile.session_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lifetime Value</span>
                    <span className="text-foreground">
                      ${(selectedProfile.lifetime_value || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lead Score</span>
                    <Badge className={getLeadScoreColor(selectedProfile.lead_score)}>
                      {selectedProfile.lead_score || 0}
                    </Badge>
                  </div>
                </div>

                {selectedProfile.preferred_styles && selectedProfile.preferred_styles.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Preferred Styles</p>
                    <div className="flex gap-1 flex-wrap">
                      {selectedProfile.preferred_styles.map((style) => (
                        <Badge key={style} variant="secondary" className="text-xs">
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProfile.allergies && selectedProfile.allergies.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <p className="text-sm text-destructive">Allergies</p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {selectedProfile.allergies.map((allergy) => (
                        <Badge key={allergy} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProfile.communication_style && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">Communication Style</p>
                    <p className="text-sm text-foreground capitalize">
                      {selectedProfile.communication_style}
                    </p>
                  </div>
                )}

                {selectedProfile.ai_persona && Object.keys(selectedProfile.ai_persona).length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-pink-400" />
                      <p className="text-sm text-muted-foreground">AI Persona Insights</p>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedProfile.ai_persona, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedProfile.last_session_date && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Session:</span>
                      <span className="text-foreground">
                        {format(new Date(selectedProfile.last_session_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a client to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfilesManager;
