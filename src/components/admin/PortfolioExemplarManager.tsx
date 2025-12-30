import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ThumbsUp, ThumbsDown, Image as ImageIcon, X } from "lucide-react";

interface Exemplar {
  id: string;
  artist_id: string;
  image_url: string;
  exemplar_type: 'yes' | 'no';
  style_tags: string[];
  subject_tags: string[];
  mood_tags: string[];
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface Artist {
  id: string;
  name: string;
  display_name: string | null;
}

const STYLE_OPTIONS = [
  'micro_realism', 'fine_line', 'black_grey', 'blackwork', 'ornamental',
  'geometric', 'illustrative', 'botanical', 'portrait', 'traditional',
  'neo_traditional', 'japanese', 'trash_polka', 'watercolor', 'minimalist'
];

const SUBJECT_OPTIONS = [
  'portrait', 'animal', 'nature', 'floral', 'abstract', 'geometric',
  'religious', 'mythological', 'celestial', 'anatomical', 'architectural',
  'typography', 'mandala', 'memorial', 'pop_culture'
];

const MOOD_OPTIONS = [
  'dark', 'light', 'elegant', 'bold', 'delicate', 'dramatic', 'peaceful',
  'intense', 'whimsical', 'sophisticated', 'raw', 'ethereal'
];

export default function PortfolioExemplarManager() {
  const { toast } = useToast();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [exemplars, setExemplars] = useState<Exemplar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExemplar, setNewExemplar] = useState({
    image_url: '',
    exemplar_type: 'yes' as 'yes' | 'no',
    style_tags: [] as string[],
    subject_tags: [] as string[],
    mood_tags: [] as string[],
    description: '',
  });

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    if (selectedArtist) {
      fetchExemplars();
    }
  }, [selectedArtist]);

  const fetchArtists = async () => {
    const { data } = await supabase
      .from("studio_artists")
      .select("id, name, display_name")
      .eq("is_active", true);
    setArtists(data || []);
    if (data && data.length > 0) {
      setSelectedArtist(data[0].id);
    }
    setLoading(false);
  };

  const fetchExemplars = async () => {
    const { data, error } = await supabase
      .from("portfolio_exemplars")
      .select("*")
      .eq("artist_id", selectedArtist)
      .order("exemplar_type")
      .order("display_order");

    if (error) {
      toast({ title: "Error loading exemplars", variant: "destructive" });
    } else {
      setExemplars((data || []) as Exemplar[]);
    }
  };

  const addExemplar = async () => {
    if (!newExemplar.image_url) {
      toast({ title: "Image URL is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("portfolio_exemplars").insert({
      artist_id: selectedArtist,
      ...newExemplar,
    });

    if (error) {
      toast({ title: "Error adding exemplar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Exemplar added" });
      setNewExemplar({
        image_url: '',
        exemplar_type: 'yes',
        style_tags: [],
        subject_tags: [],
        mood_tags: [],
        description: '',
      });
      setShowAddForm(false);
      fetchExemplars();
    }
  };

  const deleteExemplar = async (id: string) => {
    if (!confirm("Delete this exemplar?")) return;

    const { error } = await supabase
      .from("portfolio_exemplars")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting exemplar", variant: "destructive" });
    } else {
      setExemplars(exemplars.filter(e => e.id !== id));
      toast({ title: "Exemplar deleted" });
    }
  };

  const toggleTag = (
    tagType: 'style_tags' | 'subject_tags' | 'mood_tags',
    tag: string
  ) => {
    const current = newExemplar[tagType];
    if (current.includes(tag)) {
      setNewExemplar({ ...newExemplar, [tagType]: current.filter(t => t !== tag) });
    } else {
      setNewExemplar({ ...newExemplar, [tagType]: [...current, tag] });
    }
  };

  const yesExemplars = exemplars.filter(e => e.exemplar_type === 'yes');
  const noExemplars = exemplars.filter(e => e.exemplar_type === 'no');

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Portfolio Exemplars</h2>
          <p className="text-muted-foreground">Define YES (want) and NO (avoid) style examples for matching</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedArtist} onValueChange={setSelectedArtist}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select artist" />
            </SelectTrigger>
            <SelectContent>
              {artists.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.display_name || artist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Exemplar
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Add New Exemplar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Image URL</Label>
                <Input
                  placeholder="https://..."
                  value={newExemplar.image_url}
                  onChange={(e) => setNewExemplar({ ...newExemplar, image_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newExemplar.exemplar_type}
                  onValueChange={(v: 'yes' | 'no') => setNewExemplar({ ...newExemplar, exemplar_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">
                      <span className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                        YES - Want this style
                      </span>
                    </SelectItem>
                    <SelectItem value="no">
                      <span className="flex items-center gap-2">
                        <ThumbsDown className="w-4 h-4 text-red-500" />
                        NO - Avoid this style
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Style Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {STYLE_OPTIONS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={newExemplar.style_tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag('style_tags', tag)}
                  >
                    {tag.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Subject Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUBJECT_OPTIONS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={newExemplar.subject_tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag('subject_tags', tag)}
                  >
                    {tag.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Mood Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {MOOD_OPTIONS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={newExemplar.mood_tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag('mood_tags', tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Why this is a good/bad fit..."
                value={newExemplar.description}
                onChange={(e) => setNewExemplar({ ...newExemplar, description: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={addExemplar}>Add Exemplar</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exemplars Display */}
      <Tabs defaultValue="yes" className="w-full">
        <TabsList>
          <TabsTrigger value="yes" className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-green-500" />
            YES Examples ({yesExemplars.length})
          </TabsTrigger>
          <TabsTrigger value="no" className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-500" />
            NO Examples ({noExemplars.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="yes" className="mt-4">
          {yesExemplars.length === 0 ? (
            <Card className="p-8 text-center">
              <ThumbsUp className="w-12 h-12 mx-auto text-green-500/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No YES Exemplars</h3>
              <p className="text-muted-foreground">Add examples of work this artist wants to do</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {yesExemplars.map((exemplar) => (
                <Card key={exemplar.id} className="overflow-hidden group relative">
                  <div className="aspect-square bg-muted">
                    <img
                      src={exemplar.image_url}
                      alt="Exemplar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {exemplar.style_tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteExemplar(exemplar.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="no" className="mt-4">
          {noExemplars.length === 0 ? (
            <Card className="p-8 text-center">
              <ThumbsDown className="w-12 h-12 mx-auto text-red-500/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No NO Exemplars</h3>
              <p className="text-muted-foreground">Add examples of work this artist wants to avoid</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {noExemplars.map((exemplar) => (
                <Card key={exemplar.id} className="overflow-hidden group relative border-red-500/20">
                  <div className="aspect-square bg-muted">
                    <img
                      src={exemplar.image_url}
                      alt="Exemplar"
                      className="w-full h-full object-cover opacity-75"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-red-500/10" />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {exemplar.style_tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs border-red-500/30 text-red-400">
                          {tag.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteExemplar(exemplar.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
