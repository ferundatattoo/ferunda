import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TestTube, 
  Calendar, 
  Scan, 
  Map, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeasibilityResult {
  overall: 'excellent' | 'good' | 'challenging' | 'not_recommended';
  score: number;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    details: string;
  }>;
  recommendations: string[];
  risks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;
}

const FeasibilityLabManager = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeasibilityResult | null>(null);
  const [agingSimulations, setAgingSimulations] = useState<Array<{
    year: number;
    metrics: {
      lineBlur: number;
      colorFade: number;
      inkSpread: number;
      overallIntegrity: number;
    };
  }> | null>(null);
  const [placementHeatmap, setPlacementHeatmap] = useState<Record<string, { score: number; notes: string }> | null>(null);

  // Form state
  const [designUrl, setDesignUrl] = useState('');
  const [placement, setPlacement] = useState('inner_forearm');
  const [sizeCm, setSizeCm] = useState([10]);
  const [skinTone, setSkinTone] = useState('medium');
  const [skinType, setSkinType] = useState('normal');

  const analyzeDesign = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('feasibility-lab', {
        body: {
          action: 'analyze_full',
          designUrl: designUrl || 'https://placeholder.com/design.png',
          placement,
          size: sizeCm[0],
          skinTone,
          skinType,
        },
      });

      if (error) throw error;
      setResult(data.result);
      toast.success('Analysis complete');
    } catch (err) {
      console.error('Error analyzing:', err);
      toast.error('Failed to analyze design');
    } finally {
      setLoading(false);
    }
  };

  const simulateAging = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('feasibility-lab', {
        body: {
          action: 'aging_simulation',
          designUrl: designUrl || 'https://placeholder.com/design.png',
          placement,
          years: [1, 5, 10, 20],
        },
      });

      if (error) throw error;
      setAgingSimulations(data.simulations);
      toast.success('Aging simulation complete');
    } catch (err) {
      console.error('Error simulating:', err);
      toast.error('Failed to simulate aging');
    } finally {
      setLoading(false);
    }
  };

  const getPlacementHeatmap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('feasibility-lab', {
        body: {
          action: 'placement_heatmap',
          designStyle: 'fineline',
          designSize: sizeCm[0],
        },
      });

      if (error) throw error;
      setPlacementHeatmap(data.heatmap);
      toast.success('Heatmap generated');
    } catch (err) {
      console.error('Error getting heatmap:', err);
      toast.error('Failed to get heatmap');
    } finally {
      setLoading(false);
    }
  };

  const getOverallBadge = (overall: FeasibilityResult['overall']) => {
    switch (overall) {
      case 'excellent':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Excellent</Badge>;
      case 'good':
        return <Badge className="bg-blue-500"><CheckCircle2 className="h-3 w-3 mr-1" />Good</Badge>;
      case 'challenging':
        return <Badge className="bg-orange-500"><AlertTriangle className="h-3 w-3 mr-1" />Challenging</Badge>;
      case 'not_recommended':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Not Recommended</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TestTube className="h-5 w-5 text-primary" />
          Tattoo Feasibility Lab
        </h2>
        <p className="text-sm text-muted-foreground">
          Analyze design viability, aging projection, and placement suitability
        </p>
      </div>

      <Tabs defaultValue="analyze" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Full Analysis
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Aging Simulation
          </TabsTrigger>
          <TabsTrigger value="placement" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Placement Heatmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Design Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Design URL (optional)</Label>
                  <Input
                    placeholder="https://..."
                    value={designUrl}
                    onChange={(e) => setDesignUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Placement</Label>
                  <Select value={placement} onValueChange={setPlacement}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inner_forearm">Inner Forearm</SelectItem>
                      <SelectItem value="outer_forearm">Outer Forearm</SelectItem>
                      <SelectItem value="bicep">Bicep</SelectItem>
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="chest">Chest</SelectItem>
                      <SelectItem value="ribs">Ribs</SelectItem>
                      <SelectItem value="calf">Calf</SelectItem>
                      <SelectItem value="thigh">Thigh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Size: {sizeCm[0]} cm</Label>
                  <Slider
                    value={sizeCm}
                    onValueChange={setSizeCm}
                    min={3}
                    max={50}
                    step={1}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Skin Tone</Label>
                    <Select value={skinTone} onValueChange={setSkinTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="olive">Olive</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Skin Type</Label>
                    <Select value={skinType} onValueChange={setSkinType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="oily">Oily</SelectItem>
                        <SelectItem value="dry">Dry</SelectItem>
                        <SelectItem value="sensitive">Sensitive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={analyzeDesign}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Scan className="h-4 w-4 mr-2" />
                  )}
                  Analyze Feasibility
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Overall Assessment</span>
                      {getOverallBadge(result.overall)}
                    </div>

                    <div className="flex items-center gap-4">
                      <Progress value={result.score * 100} className="flex-1" />
                      <span className="font-medium">{Math.round(result.score * 100)}%</span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-sm font-medium">Factors</span>
                      {result.factors.map((factor, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{factor.name}</span>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={factor.score * 100} 
                              className="w-20 h-2"
                            />
                            <span className="text-muted-foreground w-10 text-right">
                              {Math.round(factor.score * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {result.risks.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Risks</span>
                        {result.risks.map((risk, idx) => (
                          <div key={idx} className="p-2 rounded bg-destructive/10 text-sm">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <span className="font-medium">{risk.description}</span>
                            </div>
                            {risk.mitigation && (
                              <p className="text-muted-foreground mt-1 ml-6">
                                {risk.mitigation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="text-sm font-medium">Recommendations</span>
                      {result.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Run analysis to see results</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aging" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aging Simulation</CardTitle>
              <CardDescription>
                See how your tattoo will look over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={simulateAging} disabled={loading} className="mb-6">
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Simulate Aging
              </Button>

              {agingSimulations && (
                <div className="grid grid-cols-4 gap-4">
                  {agingSimulations.map((sim) => (
                    <Card key={sim.year}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Year {sim.year}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span>Integrity</span>
                          <span>{Math.round(sim.metrics.overallIntegrity * 100)}%</span>
                        </div>
                        <Progress value={sim.metrics.overallIntegrity * 100} className="h-1" />
                        <div className="flex justify-between text-muted-foreground">
                          <span>Line Blur</span>
                          <span>{sim.metrics.lineBlur.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Color Fade</span>
                          <span>{Math.round(sim.metrics.colorFade * 100)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="placement" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Placement Suitability</CardTitle>
              <CardDescription>
                Find the best body location for your design style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={getPlacementHeatmap} disabled={loading} className="mb-6">
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Map className="h-4 w-4 mr-2" />
                )}
                Generate Heatmap
              </Button>

              {placementHeatmap && (
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(placementHeatmap)
                    .sort(([, a], [, b]) => b.score - a.score)
                    .map(([placement, data]) => (
                      <div
                        key={placement}
                        className={`p-3 rounded-lg border ${
                          data.score >= 0.85 ? 'bg-green-500/10 border-green-500/30' :
                          data.score >= 0.70 ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm capitalize">
                            {placement.replace('_', ' ')}
                          </span>
                          <Badge variant="outline">{Math.round(data.score * 100)}%</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{data.notes}</p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeasibilityLabManager;
