import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Scan, 
  Map, 
  RefreshCw,
  Eye,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BodyLandmark {
  id: string;
  name: string;
  painLevel: number;
  visibilityScore: number;
  agingFactor: number;
}

interface BodyRegion {
  id: string;
  name: string;
  surfaceArea: number;
  inkRetention: number;
  healingDifficulty: number;
}

const BodyAtlasViewer = () => {
  const [loading, setLoading] = useState(false);
  const [landmarks, setLandmarks] = useState<BodyLandmark[]>([]);
  const [regions, setRegions] = useState<BodyRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const loadPoseData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('body-atlas', {
        body: { action: 'detect_pose', modelType: 'full_body' },
      });

      if (error) throw error;
      setLandmarks(data.landmarks || []);
      toast.success(`Detected ${data.landmarks?.length || 0} landmarks`);
    } catch (err) {
      console.error('Error loading pose:', err);
      toast.error('Failed to load pose data');
    } finally {
      setLoading(false);
    }
  };

  const loadRegions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('body-atlas', {
        body: { action: 'get_regions' },
      });

      if (error) throw error;
      setRegions(data.regions || []);
    } catch (err) {
      console.error('Error loading regions:', err);
      toast.error('Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  const getPainColor = (level: number) => {
    if (level <= 3) return 'bg-green-500';
    if (level <= 5) return 'bg-yellow-500';
    if (level <= 7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Neural Body Atlas
          </h2>
          <p className="text-sm text-muted-foreground">
            Anatomical mapping for optimal tattoo placement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPoseData} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
            <span className="ml-2">Detect Pose</span>
          </Button>
          <Button variant="outline" onClick={loadRegions} disabled={loading}>
            <Map className="h-4 w-4 mr-2" />
            Load Regions
          </Button>
        </div>
      </div>

      <Tabs defaultValue="landmarks" className="w-full">
        <TabsList>
          <TabsTrigger value="landmarks" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Landmarks
          </TabsTrigger>
          <TabsTrigger value="regions" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Regions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="landmarks" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Body Silhouette Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Body Map</CardTitle>
                <CardDescription>Interactive landmark visualization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center relative">
                  <User className="h-48 w-48 text-muted-foreground/30" />
                  {landmarks.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        {landmarks.length} landmarks detected
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Landmark List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detected Landmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {landmarks.length > 0 ? (
                    <div className="space-y-2">
                      {landmarks.map((landmark) => (
                        <div
                          key={landmark.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm">{landmark.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`w-2 h-2 rounded-full ${getPainColor(landmark.painLevel)}`} />
                              <span className="text-xs text-muted-foreground">
                                Pain: {landmark.painLevel}/10
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>Visibility: {Math.round(landmark.visibilityScore * 100)}%</p>
                            <p>Aging: {Math.round(landmark.agingFactor * 100)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Click "Detect Pose" to analyze body landmarks</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="regions" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regions.length > 0 ? (
              regions.map((region) => (
                <Card 
                  key={region.id}
                  className={`cursor-pointer transition-all ${
                    selectedRegion === region.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedRegion(region.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{region.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Surface Area</span>
                      <span>{region.surfaceArea} cm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ink Retention</span>
                      <Badge variant={region.inkRetention >= 0.9 ? "default" : "secondary"}>
                        {Math.round(region.inkRetention * 100)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Healing</span>
                      <Badge variant={region.healingDifficulty <= 0.3 ? "default" : region.healingDifficulty <= 0.5 ? "secondary" : "destructive"}>
                        {region.healingDifficulty <= 0.3 ? 'Easy' : region.healingDifficulty <= 0.5 ? 'Moderate' : 'Difficult'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Load Regions" to view body regions</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BodyAtlasViewer;
