import { useState, useEffect } from "react";
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
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      // Fetch artists
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

      // Fetch policies
      const { data: policiesData } = await supabase
        .from("studio_policies" as any)
        .select("*")
        .in("artist_id", artistIds)
        .eq("is_active", true);

      // Fetch services
      const { data: servicesData } = await supabase
        .from("artist_services" as any)
        .select("*")
        .in("artist_id", artistIds);

      // Combine data
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
    
    if (hasServices && hasPolicy) return { status: "complete", label: "Configured", color: "bg-green-500/20 text-green-400" };
    if (hasServices || hasPolicy) return { status: "partial", label: "Partial", color: "bg-yellow-500/20 text-yellow-400" };
    return { status: "none", label: "Not Configured", color: "bg-muted text-muted-foreground" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h2 className="font-display text-xl text-foreground">Artist Services & Policies</h2>
            <p className="text-sm text-muted-foreground">
              View and manage each artist's configuration
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-2xl font-display">{artists.length}</p>
          <p className="text-sm text-muted-foreground">Total Artists</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-2xl font-display text-green-400">
            {artists.filter(a => getSetupStatus(a).status === "complete").length}
          </p>
          <p className="text-sm text-muted-foreground">Fully Configured</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-2xl font-display text-yellow-400">
            {artists.filter(a => getSetupStatus(a).status !== "complete").length}
          </p>
          <p className="text-sm text-muted-foreground">Need Setup</p>
        </div>
      </div>

      {/* Artists List */}
      <div className="space-y-3">
        {artists.map(artist => {
          const status = getSetupStatus(artist);
          const isExpanded = expandedArtist === artist.id;

          return (
            <div
              key={artist.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Artist Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(artist.id)}
              >
                <div className="flex items-center gap-3">
                  {artist.profile_image_url ? (
                    <img
                      src={artist.profile_image_url}
                      alt={artist.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{artist.display_name || artist.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{artist.services.filter(s => s.is_active).length} services</span>
                      <span>•</span>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWizardArtist(artist);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Services */}
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4" />
                      Services
                    </h4>
                    {artist.services.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No services configured</p>
                    ) : (
                      <div className="grid gap-2">
                        {artist.services.filter(s => s.is_active).map(service => (
                          <div key={service.id} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                            <span>{service.name}</span>
                            <span className="text-muted-foreground">
                              {formatDuration(service.duration_minutes)} • 
                              ${service.hourly_rate || 0}/hr • 
                              ${service.deposit_amount} deposit
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Policies */}
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4" />
                      Policies
                    </h4>
                    {!artist.policy ? (
                      <p className="text-sm text-muted-foreground">No policy configured</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-muted/30 rounded">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="w-4 h-4" />
                            Cancellation Notice
                          </div>
                          <p className="font-medium">{artist.policy.settings.cancellation_window_hours || 72} hours</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="w-4 h-4" />
                            Late Threshold
                          </div>
                          <p className="font-medium">{artist.policy.settings.late_threshold_minutes || 30} minutes</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <DollarSign className="w-4 h-4" />
                            Deposit Policy
                          </div>
                          <p className="font-medium capitalize">
                            {(artist.policy.settings.deposit_refund_option || "non_refundable").replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            No-Show Rule
                          </div>
                          <p className="font-medium capitalize">{artist.policy.settings.no_show_rule || "Deposit forfeited"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Policy Summary for messaging */}
                  {artist.policy?.summary_text && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Policy summary for messaging:</p>
                      <p className="text-sm">{artist.policy.summary_text}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {artists.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No artists found in this workspace.
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
