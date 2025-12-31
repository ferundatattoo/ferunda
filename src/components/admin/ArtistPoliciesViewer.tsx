import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  User, 
  Package, 
  ChevronDown, 
  ChevronUp,
  Clock,
  DollarSign,
  AlertTriangle,
  Settings,
  Eye,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ArtistSetupWizard from "./ArtistSetupWizard";

interface Artist {
  id: string;
  name: string;
  display_name: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  workspace_id: string;
}

interface ArtistPolicy {
  id: string;
  artist_id: string;
  is_active: boolean;
  settings: {
    deposit_type?: string;
    deposit_percent?: number;
    deposit_fixed?: number;
    cancellation_window_hours?: number;
    reschedule_window_hours?: number;
    late_threshold_minutes?: number;
    no_show_rule?: string;
    cancellation_rule?: string;
    deposit_refund_option?: string;
  };
  summary_text: string | null;
}

interface ArtistService {
  id: string;
  artist_id: string;
  name: string;
  duration_minutes: number;
  deposit_amount: number;
  hourly_rate: number | null;
  is_active: boolean;
}

interface ArtistWithDetails extends Artist {
  policy: ArtistPolicy | null;
  services: ArtistService[];
}

interface ArtistPoliciesViewerProps {
  workspaceId: string;
}

const ArtistPoliciesViewer = ({ workspaceId }: ArtistPoliciesViewerProps) => {
  const [artists, setArtists] = useState<ArtistWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [wizardArtist, setWizardArtist] = useState<Artist | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchArtistsWithDetails();
  }, [workspaceId]);

  const fetchArtistsWithDetails = async () => {
    try {
      const { data: artistsData, error: artistsError } = await supabase
        .from("studio_artists")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (artistsError) throw artistsError;

      const artistIds = (artistsData || []).map(a => a.id);

      if (artistIds.length === 0) {
        setArtists([]);
        setLoading(false);
        return;
      }

      const { data: policiesData } = await supabase
        .from("studio_policies" as any)
        .select("*")
        .in("artist_id", artistIds)
        .eq("is_active", true);

      const { data: servicesData } = await supabase
        .from("artist_services" as any)
        .select("*")
        .in("artist_id", artistIds);

      const combined: ArtistWithDetails[] = (artistsData || []).map(artist => {
        const policy = (policiesData || [] as any[]).find((p: any) => p.artist_id === artist.id) || null;
        const services = (servicesData || [] as any[]).filter((s: any) => s.artist_id === artist.id);
        return {
          ...artist,
          policy,
          services,
        };
      });

      setArtists(combined);
    } catch (err) {
      console.error("Error fetching artists:", err);
      toast({
        title: "Error",
        description: "Failed to load artist data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (artistId: string) => {
    setExpandedArtist(prev => prev === artistId ? null : artistId);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const getSetupStatus = (artist: ArtistWithDetails) => {
    const hasServices = artist.services.length > 0;
    const hasPolicy = artist.policy !== null;
    
    if (hasServices && hasPolicy) return { status: "complete", label: "Configured", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    if (hasServices || hasPolicy) return { status: "partial", label: "Partial", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    return { status: "none", label: "Not Configured", color: "bg-muted text-muted-foreground border-border/50" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading artists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20">
                <Shield className="w-6 h-6 text-gold" />
              </div>
              <div className="absolute inset-0 blur-xl bg-gold/20 -z-10" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-foreground tracking-tight">Artist Services & Policies</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                View and manage each artist's configuration
              </p>
            </div>
          </div>
        </div>
        
        {/* Decorative line */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-6 h-px bg-gradient-to-r from-gold/50 via-border to-transparent origin-left"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: artists.length, label: "Total Artists", color: "text-foreground" },
          { value: artists.filter(a => getSetupStatus(a).status === "complete").length, label: "Fully Configured", color: "text-emerald-400" },
          { value: artists.filter(a => getSetupStatus(a).status !== "complete").length, label: "Need Setup", color: "text-amber-400" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative group p-4 bg-gradient-to-br from-card to-background border border-border/50 hover:border-gold/30 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <p className={`text-3xl font-display ${stat.color}`}>{stat.value}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Artists List */}
      <div className="space-y-3">
        {artists.map((artist, index) => {
          const status = getSetupStatus(artist);
          const isExpanded = expandedArtist === artist.id;

          return (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative bg-gradient-to-br from-card to-background border border-border/50 overflow-hidden group"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              {/* Artist Header */}
              <div
                className="relative z-10 p-4 flex items-center justify-between cursor-pointer transition-colors"
                onClick={() => toggleExpand(artist.id)}
              >
                <div className="flex items-center gap-4">
                  {artist.profile_image_url ? (
                    <img
                      src={artist.profile_image_url}
                      alt={artist.name}
                      className="w-12 h-12 object-cover border border-border/50"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-gold" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-display text-lg text-foreground group-hover:text-gold transition-colors">
                      {artist.display_name || artist.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span>{artist.services.filter(s => s.is_active).length} services</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWizardArtist(artist);
                    }}
                    className="border-border/50 hover:border-gold/50 hover:bg-gold/10 hover:text-gold text-xs uppercase tracking-wider"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                  <div className={`w-8 h-8 flex items-center justify-center border border-border/30 transition-colors ${isExpanded ? "bg-gold/10 text-gold" : "text-muted-foreground"}`}>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/30 p-6 space-y-6 bg-secondary/10">
                      {/* Services */}
                      <div>
                        <h4 className="font-body text-xs uppercase tracking-[0.2em] flex items-center gap-2 mb-4 text-muted-foreground">
                          <Package className="w-4 h-4 text-gold" />
                          Services
                        </h4>
                        {artist.services.length === 0 ? (
                          <p className="text-sm text-muted-foreground/60">No services configured</p>
                        ) : (
                          <div className="grid gap-2">
                            {artist.services.filter(s => s.is_active).map(service => (
                              <div key={service.id} className="flex justify-between text-sm p-3 bg-background/50 border border-border/30">
                                <span className="text-foreground">{service.name}</span>
                                <span className="text-muted-foreground">
                                  {formatDuration(service.duration_minutes)} • 
                                  ${service.hourly_rate || 0}/hr • 
                                  <span className="text-gold">${service.deposit_amount} deposit</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Policies */}
                      <div>
                        <h4 className="font-body text-xs uppercase tracking-[0.2em] flex items-center gap-2 mb-4 text-muted-foreground">
                          <Shield className="w-4 h-4 text-gold" />
                          Policies
                        </h4>
                        {!artist.policy ? (
                          <p className="text-sm text-muted-foreground/60">No policy configured</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                              { icon: Clock, label: "Cancellation Notice", value: `${artist.policy.settings.cancellation_window_hours || 72} hours` },
                              { icon: Clock, label: "Late Threshold", value: `${artist.policy.settings.late_threshold_minutes || 30} minutes` },
                              { icon: DollarSign, label: "Deposit Policy", value: (artist.policy.settings.deposit_refund_option || "non_refundable").replace(/_/g, " ") },
                              { icon: AlertTriangle, label: "No-Show Rule", value: artist.policy.settings.no_show_rule || "Deposit forfeited" },
                            ].map((item, i) => (
                              <div key={i} className="p-3 bg-background/50 border border-border/30">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <item.icon className="w-3 h-3 text-gold" />
                                  <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                                </div>
                                <p className="font-medium text-foreground capitalize">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Policy Summary for messaging */}
                      {artist.policy?.summary_text && (
                        <div className="p-4 bg-gold/5 border border-gold/20">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-gold" />
                            Policy summary for messaging
                          </p>
                          <p className="text-sm text-foreground">{artist.policy.summary_text}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {artists.length === 0 && (
          <div className="text-center py-20 border border-border/50 bg-gradient-to-br from-card to-background">
            <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No artists found in this workspace.</p>
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {wizardArtist && (
        <ArtistSetupWizard
          artistId={wizardArtist.id}
          workspaceId={wizardArtist.workspace_id}
          artistName={wizardArtist.display_name || wizardArtist.name}
          onComplete={() => {
            setWizardArtist(null);
            fetchArtistsWithDetails();
          }}
          onClose={() => setWizardArtist(null)}
        />
      )}
    </div>
  );
};

export default ArtistPoliciesViewer;