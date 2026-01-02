import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Save, Loader2, Check, X, AlertTriangle,
  Palette, Scissors, MapPin, Clock, Users, Sparkles,
  Ban, Heart, RefreshCw, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Json } from "@/integrations/supabase/types";

interface StyleOption {
  style_key: string;
  display_name: string;
  category: string;
  requires_color: boolean;
  complexity_level: number;
}

interface Artist {
  id: string;
  name: string;
  display_name: string | null;
  is_primary: boolean;
}

interface ArtistCapability {
  id?: string;
  artist_id: string;
  // Styles
  accepted_styles: string[];
  rejected_styles: string[];
  signature_styles: string[];
  // Work Types
  accepts_coverups: boolean;
  accepts_reworks: boolean;
  accepts_touchups: boolean;
  accepts_color_work: boolean;
  accepts_black_grey_only: boolean;
  accepts_first_timers: boolean;
  accepts_matching_tattoos: boolean;
  // Size
  min_size_inches: number;
  max_size_inches: number | null;
  preferred_size_min: number;
  preferred_size_max: number;
  accepts_full_sleeves: boolean;
  accepts_full_back: boolean;
  accepts_bodysuits: boolean;
  // Placements
  rejected_placements: string[];
  requires_consultation_placements: string[];
  // Sessions
  session_type: string;
  min_session_hours: number;
  max_session_hours: number;
  prefers_multi_session: boolean;
  accepts_walk_ins: boolean;
  // Booking
  max_clients_per_day: number;
  requires_deposit: boolean;
  deposit_amount: number;
  requires_reference_images: boolean;
  requires_consultation_for_large: boolean;
  large_project_threshold_hours: number;
  // Creative
  prefers_custom_only: boolean;
  offers_flash: boolean;
  will_repeat_designs: boolean;
  allows_design_changes: boolean;
  max_revision_rounds: number;
  // Extra
  special_conditions: Json | null;
  internal_notes: string;
}

const PLACEMENT_OPTIONS = [
  "face", "neck", "hands", "fingers", "feet", "toes",
  "chest", "stomach", "ribs", "back", "spine",
  "upper arm", "forearm", "wrist", "shoulder",
  "thigh", "calf", "ankle", "behind ear"
];

const SESSION_TYPES = [
  { value: "day_session", label: "Day Sessions Only" },
  { value: "hourly", label: "Hourly Rate" },
  { value: "by_piece", label: "By Piece/Quote" },
  { value: "mixed", label: "Mixed (All Options)" }
];

const defaultCapability: Omit<ArtistCapability, 'artist_id'> = {
  accepted_styles: [],
  rejected_styles: [],
  signature_styles: [],
  accepts_coverups: false,
  accepts_reworks: false,
  accepts_touchups: true,
  accepts_color_work: true,
  accepts_black_grey_only: true,
  accepts_first_timers: true,
  accepts_matching_tattoos: true,
  min_size_inches: 1,
  max_size_inches: null,
  preferred_size_min: 3,
  preferred_size_max: 12,
  accepts_full_sleeves: true,
  accepts_full_back: true,
  accepts_bodysuits: false,
  rejected_placements: [],
  requires_consultation_placements: [],
  session_type: "day_session",
  min_session_hours: 4,
  max_session_hours: 8,
  prefers_multi_session: true,
  accepts_walk_ins: false,
  max_clients_per_day: 1,
  requires_deposit: true,
  deposit_amount: 500,
  requires_reference_images: false,
  requires_consultation_for_large: true,
  large_project_threshold_hours: 6,
  prefers_custom_only: true,
  offers_flash: false,
  will_repeat_designs: false,
  allows_design_changes: true,
  max_revision_rounds: 3,
  special_conditions: null,
  internal_notes: ""
};

interface ArtistCapabilitiesManagerProps {
  artistId?: string;
}

const ArtistCapabilitiesManager = ({ artistId: preselectedArtistId }: ArtistCapabilitiesManagerProps = {}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(preselectedArtistId || null);
  const [capabilities, setCapabilities] = useState<ArtistCapability | null>(null);
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    styles: true,
    workTypes: true,
    size: false,
    placements: false,
    sessions: false,
    booking: false,
    creative: false
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (preselectedArtistId) {
      setSelectedArtistId(preselectedArtistId);
    }
  }, [preselectedArtistId]);

  useEffect(() => {
    if (selectedArtistId) {
      fetchCapabilities(selectedArtistId);
    }
  }, [selectedArtistId]);

  const fetchInitialData = async () => {
    setLoading(true);
    
    const [artistsRes, stylesRes] = await Promise.all([
      supabase.from("studio_artists").select("id, name, display_name, is_primary").eq("is_active", true).order("is_primary", { ascending: false }),
      supabase.from("tattoo_style_catalog").select("style_key, display_name, category, requires_color, complexity_level").eq("is_active", true).order("category").order("display_name")
    ]);

    if (artistsRes.data) {
      setArtists(artistsRes.data);
      // Only auto-select if no preselected artist
      if (artistsRes.data.length > 0 && !preselectedArtistId && !selectedArtistId) {
        setSelectedArtistId(artistsRes.data[0].id);
      }
    }

    if (stylesRes.data) {
      setStyleOptions(stylesRes.data);
    }

    setLoading(false);
  };

  const fetchCapabilities = async (artistId: string) => {
    const { data, error } = await supabase
      .from("artist_capabilities")
      .select("*")
      .eq("artist_id", artistId)
      .single();

    if (data) {
      setCapabilities(data as ArtistCapability);
    } else {
      // Create default capabilities for this artist
      setCapabilities({ ...defaultCapability, artist_id: artistId });
    }
  };

  const saveCapabilities = async () => {
    if (!capabilities || !selectedArtistId) return;

    setSaving(true);

    // Prepare data for save, excluding the id from the payload for inserts
    const { id: _id, special_conditions, ...restCapabilities } = capabilities;
    const toSave = {
      ...restCapabilities,
      artist_id: selectedArtistId,
      special_conditions: special_conditions || {}
    };

    let result;
    if (capabilities.id) {
      result = await supabase
        .from("artist_capabilities")
        .update(toSave)
        .eq("id", capabilities.id);
    } else {
      result = await supabase
        .from("artist_capabilities")
        .insert(toSave)
        .select()
        .single();
      
      if (result.data) {
        setCapabilities(result.data as unknown as ArtistCapability);
      }
    }

    if (result.error) {
      toast({ title: "Error", description: "Failed to save capabilities", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Artist capabilities updated" });
    }

    setSaving(false);
  };

  const toggleStyle = (field: 'accepted_styles' | 'rejected_styles' | 'signature_styles', styleKey: string) => {
    if (!capabilities) return;
    
    const current = capabilities[field] || [];
    const updated = current.includes(styleKey)
      ? current.filter(s => s !== styleKey)
      : [...current, styleKey];

    // Auto-manage conflicts
    let newCaps = { ...capabilities, [field]: updated };
    
    if (field === 'accepted_styles' && updated.includes(styleKey)) {
      // Remove from rejected if adding to accepted
      newCaps.rejected_styles = (newCaps.rejected_styles || []).filter(s => s !== styleKey);
    } else if (field === 'rejected_styles' && updated.includes(styleKey)) {
      // Remove from accepted and signature if adding to rejected
      newCaps.accepted_styles = (newCaps.accepted_styles || []).filter(s => s !== styleKey);
      newCaps.signature_styles = (newCaps.signature_styles || []).filter(s => s !== styleKey);
    } else if (field === 'signature_styles' && updated.includes(styleKey)) {
      // Auto-add to accepted if marking as signature
      if (!newCaps.accepted_styles.includes(styleKey)) {
        newCaps.accepted_styles = [...newCaps.accepted_styles, styleKey];
      }
    }

    setCapabilities(newCaps);
  };

  const togglePlacement = (field: 'rejected_placements' | 'requires_consultation_placements', placement: string) => {
    if (!capabilities) return;
    
    const current = capabilities[field] || [];
    const updated = current.includes(placement)
      ? current.filter(p => p !== placement)
      : [...current, placement];

    setCapabilities({ ...capabilities, [field]: updated });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    section, 
    description 
  }: { 
    title: string; 
    icon: any; 
    section: string; 
    description?: string;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-primary" />
        <div className="text-left">
          <span className="font-medium text-foreground">{title}</span>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );

  const groupedStyles = styleOptions.reduce((acc, style) => {
    if (!acc[style.category]) acc[style.category] = [];
    acc[style.category].push(style);
    return acc;
  }, {} as Record<string, StyleOption[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!selectedArtistId || !capabilities) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No artists found. Add an artist first.
      </div>
    );
  }

  const selectedArtist = artists.find(a => a.id === selectedArtistId);

  return (
    <div className="space-y-4">
      {/* Artist Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <select
            value={selectedArtistId}
            onChange={(e) => setSelectedArtistId(e.target.value)}
            className="px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
          >
            {artists.map(artist => (
              <option key={artist.id} value={artist.id}>
                {artist.display_name || artist.name} {artist.is_primary ? "(Primary)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={saveCapabilities}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure what {selectedArtist?.display_name || selectedArtist?.name} accepts and rejects. 
        The AI concierge uses this to filter inquiries automatically.
      </p>

      {/* STYLES SECTION */}
      <div className="border border-border">
        <SectionHeader 
          title="Tattoo Styles" 
          icon={Palette} 
          section="styles"
          description="Which styles does this artist work in vs reject?"
        />
        <AnimatePresence>
          {expandedSections.styles && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-6">
                {Object.entries(groupedStyles).map(([category, styles]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-foreground mb-3 capitalize">{category}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {styles.map(style => {
                        const isAccepted = capabilities.accepted_styles?.includes(style.style_key);
                        const isRejected = capabilities.rejected_styles?.includes(style.style_key);
                        const isSignature = capabilities.signature_styles?.includes(style.style_key);

                        return (
                          <div
                            key={style.style_key}
                            className={`p-2 border text-sm transition-all ${
                              isSignature ? "border-primary bg-primary/10" :
                              isAccepted ? "border-green-500/50 bg-green-500/10" :
                              isRejected ? "border-destructive/50 bg-destructive/10" :
                              "border-border hover:border-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-medium ${
                                isRejected ? "text-muted-foreground line-through" : "text-foreground"
                              }`}>
                                {style.display_name}
                              </span>
                              {style.requires_color && (
                                <span className="text-xs text-amber-500">🎨</span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleStyle('accepted_styles', style.style_key)}
                                className={`flex-1 px-1 py-0.5 text-xs border ${
                                  isAccepted ? "bg-green-500 text-white border-green-500" : "text-muted-foreground border-border hover:border-green-500"
                                }`}
                                title="Accept this style"
                              >
                                <Check className="w-3 h-3 mx-auto" />
                              </button>
                              <button
                                onClick={() => toggleStyle('rejected_styles', style.style_key)}
                                className={`flex-1 px-1 py-0.5 text-xs border ${
                                  isRejected ? "bg-destructive text-white border-destructive" : "text-muted-foreground border-border hover:border-destructive"
                                }`}
                                title="Reject this style"
                              >
                                <X className="w-3 h-3 mx-auto" />
                              </button>
                              <button
                                onClick={() => toggleStyle('signature_styles', style.style_key)}
                                className={`flex-1 px-1 py-0.5 text-xs border ${
                                  isSignature ? "bg-primary text-white border-primary" : "text-muted-foreground border-border hover:border-primary"
                                }`}
                                title="Mark as signature style"
                              >
                                <Heart className="w-3 h-3 mx-auto" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                  <Badge variant="outline" className="bg-green-500/10 border-green-500/50">
                    <Check className="w-3 h-3 mr-1" /> Accepted: {capabilities.accepted_styles?.length || 0}
                  </Badge>
                  <Badge variant="outline" className="bg-destructive/10 border-destructive/50">
                    <X className="w-3 h-3 mr-1" /> Rejected: {capabilities.rejected_styles?.length || 0}
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 border-primary/50">
                    <Heart className="w-3 h-3 mr-1" /> Signature: {capabilities.signature_styles?.length || 0}
                  </Badge>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WORK TYPES SECTION */}
      <div className="border border-border">
        <SectionHeader 
          title="Work Type Preferences" 
          icon={Scissors} 
          section="workTypes"
          description="Cover-ups, color, first-timers, etc."
        />
        <AnimatePresence>
          {expandedSections.workTypes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'accepts_coverups', label: 'Cover-ups', desc: 'Covering existing tattoos' },
                  { key: 'accepts_reworks', label: 'Reworks', desc: "Fixing other artists' work" },
                  { key: 'accepts_touchups', label: 'Touch-ups', desc: 'Their own previous work' },
                  { key: 'accepts_color_work', label: 'Color Work', desc: 'Full color tattoos' },
                  { key: 'accepts_black_grey_only', label: 'Black & Grey', desc: 'Black and grey work' },
                  { key: 'accepts_first_timers', label: 'First-timers', desc: 'Clients getting their first tattoo' },
                  { key: 'accepts_matching_tattoos', label: 'Matching Tattoos', desc: 'Couple/friend matching' },
                  { key: 'accepts_walk_ins', label: 'Walk-ins', desc: 'Accept same-day bookings' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-3 bg-secondary/20 hover:bg-secondary/30 transition-colors cursor-pointer">
                    <div>
                      <span className="text-foreground">{item.label}</span>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={(capabilities as any)[item.key] ?? false}
                      onCheckedChange={(checked) => setCapabilities({ ...capabilities, [item.key]: checked })}
                    />
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PLACEMENTS SECTION */}
      <div className="border border-border">
        <SectionHeader 
          title="Placement Restrictions" 
          icon={MapPin} 
          section="placements"
          description="Which body areas are restricted?"
        />
        <AnimatePresence>
          {expandedSections.placements && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-destructive" />
                    Rejected Placements (Won't tattoo)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {PLACEMENT_OPTIONS.map(placement => (
                      <button
                        key={placement}
                        onClick={() => togglePlacement('rejected_placements', placement)}
                        className={`px-3 py-1 text-sm border transition-colors ${
                          capabilities.rejected_placements?.includes(placement)
                            ? "bg-destructive text-white border-destructive"
                            : "text-muted-foreground border-border hover:border-destructive"
                        }`}
                      >
                        {placement}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Requires Consultation First
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {PLACEMENT_OPTIONS.map(placement => (
                      <button
                        key={placement}
                        onClick={() => togglePlacement('requires_consultation_placements', placement)}
                        className={`px-3 py-1 text-sm border transition-colors ${
                          capabilities.requires_consultation_placements?.includes(placement)
                            ? "bg-amber-500 text-white border-amber-500"
                            : "text-muted-foreground border-border hover:border-amber-500"
                        }`}
                      >
                        {placement}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SESSIONS SECTION */}
      <div className="border border-border">
        <SectionHeader 
          title="Session Preferences" 
          icon={Clock} 
          section="sessions"
          description="Hourly, day sessions, duration limits"
        />
        <AnimatePresence>
          {expandedSections.sessions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Session Type</label>
                    <select
                      value={capabilities.session_type}
                      onChange={(e) => setCapabilities({ ...capabilities, session_type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    >
                      {SESSION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Max Clients Per Day</label>
                    <input
                      type="number"
                      value={capabilities.max_clients_per_day}
                      onChange={(e) => setCapabilities({ ...capabilities, max_clients_per_day: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={10}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Min Session Hours</label>
                    <input
                      type="number"
                      value={capabilities.min_session_hours}
                      onChange={(e) => setCapabilities({ ...capabilities, min_session_hours: parseFloat(e.target.value) || 1 })}
                      step={0.5}
                      min={0.5}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Max Session Hours</label>
                    <input
                      type="number"
                      value={capabilities.max_session_hours}
                      onChange={(e) => setCapabilities({ ...capabilities, max_session_hours: parseFloat(e.target.value) || 8 })}
                      step={0.5}
                      min={1}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 bg-secondary/20 cursor-pointer">
                  <div>
                    <span className="text-foreground">Prefers Multi-Session Projects</span>
                    <p className="text-xs text-muted-foreground">Large pieces done over multiple appointments</p>
                  </div>
                  <Switch
                    checked={capabilities.prefers_multi_session}
                    onCheckedChange={(checked) => setCapabilities({ ...capabilities, prefers_multi_session: checked })}
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CREATIVE PREFERENCES SECTION */}
      <div className="border border-border">
        <SectionHeader 
          title="Creative Preferences" 
          icon={Sparkles} 
          section="creative"
          description="Custom work, flash, design changes"
        />
        <AnimatePresence>
          {expandedSections.creative && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'prefers_custom_only', label: 'Custom Only', desc: 'No pre-made/flash designs' },
                    { key: 'offers_flash', label: 'Offers Flash', desc: 'Has pre-made designs available' },
                    { key: 'will_repeat_designs', label: 'Will Repeat Designs', desc: 'Same design for multiple clients' },
                    { key: 'allows_design_changes', label: 'Allows Changes', desc: 'Changes after initial approval' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-3 bg-secondary/20 hover:bg-secondary/30 transition-colors cursor-pointer">
                      <div>
                        <span className="text-foreground">{item.label}</span>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={(capabilities as any)[item.key] ?? false}
                        onCheckedChange={(checked) => setCapabilities({ ...capabilities, [item.key]: checked })}
                      />
                    </label>
                  ))}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Max Revision Rounds</label>
                  <input
                    type="number"
                    value={capabilities.max_revision_rounds}
                    onChange={(e) => setCapabilities({ ...capabilities, max_revision_rounds: parseInt(e.target.value) || 3 })}
                    min={0}
                    max={10}
                    className="w-32 px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Internal Notes (Admin Only)</label>
                  <textarea
                    value={capabilities.internal_notes || ""}
                    onChange={(e) => setCapabilities({ ...capabilities, internal_notes: e.target.value })}
                    rows={3}
                    placeholder="Private notes about this artist's preferences..."
                    className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArtistCapabilitiesManager;