import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Users,
  Settings,
  Palette,
  DollarSign,
  Calendar,
  FileText,
  Star,
  Instagram,
  ChevronRight,
  Loader2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ArtistsManager from "./concierge/ArtistsManager";
import ArtistCapabilitiesManager from "./concierge/ArtistCapabilitiesManager";
import PricingModelsManager from "./concierge/PricingModelsManager";
import ArtistStyleDNA from "./ArtistStyleDNA";
import SessionConfigManager from "./SessionConfigManager";

interface Artist {
  id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  specialty_styles: string[];
  is_active: boolean;
  is_primary: boolean;
  is_guest_artist: boolean;
  default_session_hours: number;
  max_sessions_per_day: number;
}

const ArtistManagementHub = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

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
      if (data.length > 0 && !selectedArtist) {
        setSelectedArtist(data[0]);
      }
    }
    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display text-foreground">Gestión de Artistas</h2>
          <p className="text-muted-foreground mt-1">
            Administra todos los artistas del studio y sus configuraciones
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="w-3 h-3" />
          {artists.length} artistas
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Artist Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Artistas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-2">
                {artists.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => {
                      setSelectedArtist(artist);
                      setActiveTab("overview");
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedArtist?.id === artist.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={artist.profile_image_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(artist.display_name || artist.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {artist.display_name || artist.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {artist.is_primary && (
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        )}
                        {artist.is_guest_artist && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Guest
                          </Badge>
                        )}
                        {artist.is_active ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}

                {artists.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay artistas configurados
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedArtist ? (
            <Card>
              {/* Artist Header */}
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedArtist.profile_image_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {getInitials(selectedArtist.display_name || selectedArtist.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>
                        {selectedArtist.display_name || selectedArtist.name}
                      </CardTitle>
                      {selectedArtist.is_primary && (
                        <Badge className="gap-1">
                          <Star className="w-3 h-3" />
                          Principal
                        </Badge>
                      )}
                      {selectedArtist.is_guest_artist && (
                        <Badge variant="secondary">Guest Artist</Badge>
                      )}
                      <Badge variant={selectedArtist.is_active ? "default" : "outline"}>
                        {selectedArtist.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1 flex items-center gap-4">
                      {selectedArtist.email && <span>{selectedArtist.email}</span>}
                      {selectedArtist.instagram_handle && (
                        <span className="flex items-center gap-1">
                          <Instagram className="w-3 h-3" />@
                          {selectedArtist.instagram_handle}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {/* Tabs for artist settings */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1 mb-6">
                    <TabsTrigger value="overview" className="gap-2">
                      <User className="w-4 h-4" />
                      Perfil
                    </TabsTrigger>
                    <TabsTrigger value="capabilities" className="gap-2">
                      <Settings className="w-4 h-4" />
                      Capacidades
                    </TabsTrigger>
                    <TabsTrigger value="pricing" className="gap-2">
                      <DollarSign className="w-4 h-4" />
                      Pricing
                    </TabsTrigger>
                    <TabsTrigger value="style-dna" className="gap-2">
                      <Palette className="w-4 h-4" />
                      Style DNA
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="gap-2">
                      <Clock className="w-4 h-4" />
                      Sesiones
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <div className="space-y-6">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground">Sesión Default</p>
                          <p className="text-2xl font-bold mt-1">
                            {selectedArtist.default_session_hours}h
                          </p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground">Max/Día</p>
                          <p className="text-2xl font-bold mt-1">
                            {selectedArtist.max_sessions_per_day}
                          </p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground">Estilos</p>
                          <p className="text-2xl font-bold mt-1">
                            {selectedArtist.specialty_styles?.length || 0}
                          </p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground">Estado</p>
                          <p className="text-lg font-medium mt-1">
                            {selectedArtist.is_active ? "✓ Activo" : "○ Inactivo"}
                          </p>
                        </Card>
                      </div>

                      {/* Specialty Styles */}
                      {selectedArtist.specialty_styles?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Estilos Especializados</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedArtist.specialty_styles.map((style) => (
                              <Badge key={style} variant="secondary">
                                {style}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Edit Profile Link */}
                      <div className="pt-4 border-t border-border/50">
                        <p className="text-sm text-muted-foreground mb-3">
                          Para editar el perfil completo del artista, usa el gestor de artistas:
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("full-manager")}
                          className="gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Abrir Gestor Completo
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="capabilities">
                    <ArtistCapabilitiesManager />
                  </TabsContent>

                  <TabsContent value="pricing">
                    <PricingModelsManager />
                  </TabsContent>

                  <TabsContent value="style-dna">
                    <ArtistStyleDNA artistId={selectedArtist.id} />
                  </TabsContent>

                  <TabsContent value="sessions">
                    <SessionConfigManager artistId={selectedArtist.id} />
                  </TabsContent>

                  <TabsContent value="full-manager">
                    <ArtistsManager />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium">Selecciona un artista</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O añade uno nuevo para comenzar
                </p>
                <Button className="mt-4 gap-2" onClick={() => setActiveTab("full-manager")}>
                  <Plus className="w-4 h-4" />
                  Añadir Artista
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistManagementHub;
