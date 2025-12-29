import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Plus, Trash2, Edit2, Save, X, Loader2, 
  Star, Instagram, Globe, Palette
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Artist {
  id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  specialty_styles: string[];
  is_active: boolean;
  is_primary: boolean;
  is_guest_artist: boolean;
  default_session_hours: number;
  max_sessions_per_day: number;
  portfolio_url: string | null;
}

const STYLE_OPTIONS = [
  "fine-line", "botanical", "illustrative", "floral", "geometric",
  "minimalist", "blackwork", "traditional", "neo-traditional", 
  "realism", "watercolor", "dotwork", "ornamental", "japanese"
];

const ArtistsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newArtist, setNewArtist] = useState({
    name: "",
    display_name: "",
    email: "",
    bio: "",
    instagram_handle: "",
    specialty_styles: [] as string[],
    is_guest_artist: false,
    default_session_hours: 6,
    max_sessions_per_day: 2
  });

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("studio_artists")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("name");
    
    if (!error && data) {
      setArtists(data);
    }
    setLoading(false);
  };

  const addArtist = async () => {
    if (!newArtist.name) {
      toast({ title: "Error", description: "Artist name is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("studio_artists").insert({
      name: newArtist.name,
      display_name: newArtist.display_name || newArtist.name,
      email: newArtist.email || null,
      bio: newArtist.bio || null,
      instagram_handle: newArtist.instagram_handle || null,
      specialty_styles: newArtist.specialty_styles,
      is_guest_artist: newArtist.is_guest_artist,
      default_session_hours: newArtist.default_session_hours,
      max_sessions_per_day: newArtist.max_sessions_per_day
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add artist", variant: "destructive" });
    } else {
      toast({ title: "Added", description: `${newArtist.name} added to studio` });
      setNewArtist({
        name: "", display_name: "", email: "", bio: "", 
        instagram_handle: "", specialty_styles: [], 
        is_guest_artist: false, default_session_hours: 6, max_sessions_per_day: 2
      });
      setShowAddForm(false);
      fetchArtists();
    }
  };

  const updateArtist = async (artist: Artist) => {
    const { error } = await supabase
      .from("studio_artists")
      .update({
        name: artist.name,
        display_name: artist.display_name,
        email: artist.email,
        bio: artist.bio,
        instagram_handle: artist.instagram_handle,
        specialty_styles: artist.specialty_styles,
        is_active: artist.is_active,
        is_guest_artist: artist.is_guest_artist,
        default_session_hours: artist.default_session_hours,
        max_sessions_per_day: artist.max_sessions_per_day
      })
      .eq("id", artist.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update artist", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Artist profile updated" });
      setEditingArtist(null);
      fetchArtists();
    }
  };

  const deleteArtist = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    const { error } = await supabase.from("studio_artists").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Artist removed" });
      fetchArtists();
    }
  };

  const toggleStyle = (styles: string[], style: string) => {
    return styles.includes(style) 
      ? styles.filter(s => s !== style)
      : [...styles, style];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage artists and their specialties. The primary artist is featured by default.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Artist
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-card border border-border space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Artist Name *"
                value={newArtist.name}
                onChange={(e) => setNewArtist(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Display Name (optional)"
                value={newArtist.display_name}
                onChange={(e) => setNewArtist(prev => ({ ...prev, display_name: e.target.value }))}
                className="px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="Email"
                value={newArtist.email}
                onChange={(e) => setNewArtist(prev => ({ ...prev, email: e.target.value }))}
                className="px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Instagram Handle"
                value={newArtist.instagram_handle}
                onChange={(e) => setNewArtist(prev => ({ ...prev, instagram_handle: e.target.value }))}
                className="px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <textarea
              placeholder="Bio"
              value={newArtist.bio}
              onChange={(e) => setNewArtist(prev => ({ ...prev, bio: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
            />

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Specialty Styles</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS.map(style => (
                  <button
                    key={style}
                    onClick={() => setNewArtist(prev => ({
                      ...prev,
                      specialty_styles: toggleStyle(prev.specialty_styles, style)
                    }))}
                    className={`px-2 py-1 text-xs border transition-colors ${
                      newArtist.specialty_styles.includes(style)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={newArtist.is_guest_artist}
                  onCheckedChange={(checked) => setNewArtist(prev => ({ ...prev, is_guest_artist: checked }))}
                />
                Guest Artist
              </label>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Default Hours:</label>
                <input
                  type="number"
                  value={newArtist.default_session_hours}
                  onChange={(e) => setNewArtist(prev => ({ ...prev, default_session_hours: Number(e.target.value) }))}
                  className="w-16 px-2 py-1 bg-background border border-border text-foreground text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={addArtist}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                <Save className="w-4 h-4" />
                Save Artist
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Artists List */}
      <div className="space-y-3">
        {artists.map((artist) => (
          <div
            key={artist.id}
            className={`p-4 bg-card border ${
              artist.is_active ? "border-border" : "border-muted opacity-60"
            }`}
          >
            {editingArtist?.id === artist.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={editingArtist.name}
                    onChange={(e) => setEditingArtist(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={editingArtist.display_name || ""}
                    onChange={(e) => setEditingArtist(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                    className="px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <textarea
                  value={editingArtist.bio || ""}
                  onChange={(e) => setEditingArtist(prev => prev ? { ...prev, bio: e.target.value } : null)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map(style => (
                    <button
                      key={style}
                      onClick={() => setEditingArtist(prev => prev ? {
                        ...prev,
                        specialty_styles: toggleStyle(prev.specialty_styles || [], style)
                      } : null)}
                      className={`px-2 py-1 text-xs border transition-colors ${
                        editingArtist.specialty_styles?.includes(style)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateArtist(editingArtist)}
                    className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-sm"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingArtist(null)}
                    className="px-3 py-1 text-muted-foreground text-sm hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-foreground">
                      {artist.display_name || artist.name}
                    </h3>
                    {artist.is_primary && (
                      <Badge variant="default" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                    {artist.is_guest_artist && (
                      <Badge variant="secondary" className="text-xs">Guest</Badge>
                    )}
                    {!artist.is_active && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  
                  {artist.bio && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{artist.bio}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {artist.specialty_styles?.slice(0, 5).map(style => (
                      <span key={style} className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground">
                        {style}
                      </span>
                    ))}
                    {(artist.specialty_styles?.length || 0) > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{(artist.specialty_styles?.length || 0) - 5} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {artist.instagram_handle && (
                      <span className="flex items-center gap-1">
                        <Instagram className="w-3 h-3" />
                        @{artist.instagram_handle}
                      </span>
                    )}
                    <span>{artist.default_session_hours}h sessions</span>
                    <span>Max {artist.max_sessions_per_day}/day</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateArtist({ ...artist, is_active: !artist.is_active })}
                    className={`p-2 transition-colors ${
                      artist.is_active ? "text-primary" : "text-muted-foreground"
                    } hover:text-foreground`}
                    title={artist.is_active ? "Deactivate" : "Activate"}
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingArtist(artist)}
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!artist.is_primary && (
                    <button
                      onClick={() => deleteArtist(artist.id, artist.name)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {artists.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No artists configured. Add your first artist to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistsManager;
