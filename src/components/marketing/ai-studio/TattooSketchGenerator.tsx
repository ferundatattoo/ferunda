import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Palette, 
  Sparkles, 
  Scan, 
  GitCompare, 
  Pencil, 
  Check, 
  X, 
  RefreshCw,
  Upload,
  Download,
  Layers,
  Wand2,
  Camera
} from 'lucide-react';

interface SketchResult {
  sketchUrl?: string;
  sketchId?: string;
  quickSketchUrl?: string;
  similarity?: number;
  viable?: boolean;
  topMatches?: Array<{ imageUrl: string; similarity: number; styleTags: string[] }>;
  variations?: Array<{ style: string; imageUrl: string }>;
}

export const TattooSketchGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isLoading, setIsLoading] = useState(false);
  const [portfolioUrls, setPortfolioUrls] = useState('');
  const [artistId, setArtistId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [extractImageUrl, setExtractImageUrl] = useState('');
  const [skinTone, setSkinTone] = useState('medium');
  const [sketchPrompt, setSketchPrompt] = useState('');
  const [bodyPart, setBodyPart] = useState('forearm');
  const [compareImageUrl, setCompareImageUrl] = useState('');
  const [result, setResult] = useState<SketchResult | null>(null);
  const [pendingSketches, setPendingSketches] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');

  const callSketchStudio = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke('sketch-gen-studio', {
      body: { action, ...payload }
    });
    if (error) throw error;
    return data;
  };

  // ============================================
  // PORTFOLIO ANALYSIS
  // ============================================
  const handleAnalyzePortfolio = async () => {
    if (!portfolioUrls.trim() || !artistId || !workspaceId) {
      toast.error('Please fill in portfolio URLs, Artist ID, and Workspace ID');
      return;
    }

    setIsLoading(true);
    try {
      const urls = portfolioUrls.split('\n').filter(u => u.trim());
      const result = await callSketchStudio('analyze_portfolio', {
        imageUrls: urls,
        artistId,
        workspaceId
      });
      toast.success(`Analyzed ${result.totalAnalyzed} portfolio images`);
      setResult(result);
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // TATTOO EXTRACTION
  // ============================================
  const handleExtractTattoo = async () => {
    if (!extractImageUrl.trim()) {
      toast.error('Please provide an image URL');
      return;
    }

    setIsLoading(true);
    try {
      const result = await callSketchStudio('extract_tattoo', {
        imageUrl: extractImageUrl,
        skinTone
      });
      toast.success(`Extracted ${result.tattooSegments} tattoo segments`);
      setResult(result);
    } catch (error: any) {
      toast.error(error.message || 'Extraction failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // SKETCH GENERATION
  // ============================================
  const handleGenerateSketch = async () => {
    if (!sketchPrompt.trim()) {
      toast.error('Please describe the tattoo');
      return;
    }

    setIsLoading(true);
    try {
      const result = await callSketchStudio('generate_sketch', {
        prompt: sketchPrompt,
        bodyPart,
        workspaceId: workspaceId || undefined
      });
      toast.success('Sketch generated!');
      setResult(result);
    } catch (error: any) {
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSketch = async () => {
    if (!sketchPrompt.trim()) {
      toast.error('Please describe the tattoo');
      return;
    }

    setIsLoading(true);
    try {
      const result = await callSketchStudio('quick_sketch', {
        prompt: sketchPrompt
      });
      toast.success('Quick sketch ready!');
      setResult(result);
    } catch (error: any) {
      toast.error(error.message || 'Quick sketch failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!sketchPrompt.trim()) {
      toast.error('Please describe the tattoo');
      return;
    }

    setIsLoading(true);
    try {
      const result = await callSketchStudio('generate_variations', {
        prompt: sketchPrompt
      });
      toast.success(`Generated ${result.count} variations`);
      setResult(result);
    } catch (error: any) {
      toast.error(error.message || 'Variations failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // SIMILARITY COMPARISON
  // ============================================
  const handleCompare = async () => {
    if (!compareImageUrl.trim() || !artistId) {
      toast.error('Please provide image URL and Artist ID');
      return;
    }

    setIsLoading(true);
    try {
      const result = await callSketchStudio('compare_similarity', {
        imageUrl: compareImageUrl,
        artistId
      });
      setResult(result);
      if (result.viable) {
        toast.success(`${(result.similarity * 100).toFixed(0)}% match - Viable!`);
      } else {
        toast.warning(`${(result.similarity * 100).toFixed(0)}% match - Below threshold`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // SKETCH APPROVAL
  // ============================================
  const handleApproveSketch = async (sketchId: string, approved: boolean) => {
    setIsLoading(true);
    try {
      await callSketchStudio('approve_sketch', {
        sketchId,
        approved,
        feedback: approved ? 'Approved' : feedback
      });
      toast.success(approved ? 'Sketch approved!' : 'Sketch rejected');
      fetchPendingSketches();
    } catch (error: any) {
      toast.error(error.message || 'Approval failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineSketch = async (sketchId: string) => {
    if (!feedback.trim()) {
      toast.error('Please provide refinement feedback');
      return;
    }

    setIsLoading(true);
    try {
      const result = await callSketchStudio('refine_sketch', {
        sketchId,
        feedback
      });
      toast.success(`Refined sketch (iteration ${result.iteration})`);
      setResult(result);
      setFeedback('');
      fetchPendingSketches();
    } catch (error: any) {
      toast.error(error.message || 'Refinement failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingSketches = async () => {
    if (!workspaceId) return;
    
    const { data } = await supabase
      .from('sketch_approvals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('approved', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    setPendingSketches(data || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wand2 className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Tattoo Analysis & Sketch Gen</h2>
          <p className="text-muted-foreground">AI-powered sketch generation with CLIP comparison</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="portfolio" className="flex items-center gap-1">
            <Palette className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="extract" className="flex items-center gap-1">
            <Scan className="h-4 w-4" />
            Extract
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-1">
            <GitCompare className="h-4 w-4" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-1">
            <Pencil className="h-4 w-4" />
            Quick Sketch
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            Approvals
          </TabsTrigger>
        </TabsList>

        {/* PORTFOLIO ANALYSIS TAB */}
        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Portfolio Vectorization (CLIP)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Artist ID"
                  value={artistId}
                  onChange={(e) => setArtistId(e.target.value)}
                />
                <Input
                  placeholder="Workspace ID"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                />
              </div>
              <Textarea
                placeholder="Portfolio image URLs (one per line)"
                value={portfolioUrls}
                onChange={(e) => setPortfolioUrls(e.target.value)}
                rows={5}
              />
              <Button onClick={handleAnalyzePortfolio} disabled={isLoading} className="w-full">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Analyze Portfolio
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXTRACT TAB */}
        <TabsContent value="extract" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Tattoo Extraction (SAM + QNN)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Image URL with existing tattoo"
                value={extractImageUrl}
                onChange={(e) => setExtractImageUrl(e.target.value)}
              />
              <div className="flex gap-2">
                {['light', 'medium', 'dark', 'morena'].map((tone) => (
                  <Button
                    key={tone}
                    variant={skinTone === tone ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSkinTone(tone)}
                  >
                    {tone}
                  </Button>
                ))}
              </div>
              <Button onClick={handleExtractTattoo} disabled={isLoading} className="w-full">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Scan className="h-4 w-4 mr-2" />}
                Extract Tattoo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Sketch Generation (FLUX)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the tattoo design (e.g., 'full sleeve flores enredaderas para piel morena, estilo geométrico')"
                value={sketchPrompt}
                onChange={(e) => setSketchPrompt(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 flex-wrap">
                {['forearm', 'upper-arm', 'back', 'chest', 'leg', 'hand', 'neck'].map((part) => (
                  <Button
                    key={part}
                    variant={bodyPart === part ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBodyPart(part)}
                  >
                    {part}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={handleGenerateSketch} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate Sketch
                </Button>
                <Button onClick={handleGenerateVariations} disabled={isLoading} variant="outline">
                  <Layers className="h-4 w-4 mr-2" />
                  3 Variations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPARE TAB */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Style Comparison (CLIP Similarity)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="New design image URL"
                value={compareImageUrl}
                onChange={(e) => setCompareImageUrl(e.target.value)}
              />
              <Input
                placeholder="Artist ID (to compare with portfolio)"
                value={artistId}
                onChange={(e) => setArtistId(e.target.value)}
              />
              <Button onClick={handleCompare} disabled={isLoading} className="w-full">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <GitCompare className="h-4 w-4 mr-2" />}
                Compare Similarity
              </Button>

              {result?.similarity !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Similarity Score</span>
                    <Badge variant={result.viable ? 'default' : 'secondary'}>
                      {(result.similarity * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={result.similarity * 100} />
                  <p className="text-sm text-muted-foreground">
                    Threshold: 80% | Status: {result.viable ? '✓ Viable' : '✗ Below threshold'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QUICK SKETCH TAB */}
        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Quick Sketch (Fast Approval)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Quick description for fast sketch"
                value={sketchPrompt}
                onChange={(e) => setSketchPrompt(e.target.value)}
                rows={2}
              />
              <Button onClick={handleQuickSketch} disabled={isLoading} className="w-full">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
                Quick Sketch (2 steps)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPROVALS TAB */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Workspace ID"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                />
                <Button onClick={fetchPendingSketches} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              {pendingSketches.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending sketches</p>
              ) : (
                <div className="grid gap-4">
                  {pendingSketches.map((sketch) => (
                    <div key={sketch.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Iteration {sketch.iteration_number}</Badge>
                        <span className="text-sm text-muted-foreground">{sketch.body_part}</span>
                      </div>
                      {sketch.sketch_url && (
                        <img 
                          src={sketch.sketch_url} 
                          alt="Sketch" 
                          className="w-full h-48 object-contain bg-muted rounded"
                        />
                      )}
                      <p className="text-sm">{sketch.prompt_used}</p>
                      <Textarea
                        placeholder="Feedback for refinement..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveSketch(sketch.id, true)}
                          disabled={isLoading}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleApproveSketch(sketch.id, false)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRefineSketch(sketch.id)}
                          disabled={isLoading || !feedback.trim()}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" /> Refine
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RESULTS DISPLAY */}
      {result && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sketch Display */}
            {(result.sketchUrl || result.quickSketchUrl) && (
              <div className="space-y-2">
                <img 
                  src={result.sketchUrl || result.quickSketchUrl} 
                  alt="Generated Sketch" 
                  className="w-full max-h-96 object-contain bg-muted rounded-lg"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={result.sketchUrl || result.quickSketchUrl} download="sketch.png">
                      <Download className="h-4 w-4 mr-1" /> Download
                    </a>
                  </Button>
                  <Button size="sm" variant="outline">
                    <Camera className="h-4 w-4 mr-1" /> AR Preview
                  </Button>
                </div>
              </div>
            )}

            {/* Variations Display */}
            {result.variations && result.variations.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {result.variations.map((v, idx) => (
                  <div key={idx} className="space-y-2">
                    <img 
                      src={v.imageUrl} 
                      alt={v.style} 
                      className="w-full h-40 object-contain bg-muted rounded"
                    />
                    <Badge variant="outline" className="w-full justify-center">{v.style}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Top Matches Display */}
            {result.topMatches && result.topMatches.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Top Portfolio Matches</h4>
                <div className="grid grid-cols-3 gap-4">
                  {result.topMatches.map((match, idx) => (
                    <div key={idx} className="space-y-1">
                      <img 
                        src={match.imageUrl} 
                        alt="Portfolio match" 
                        className="w-full h-24 object-cover rounded"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span>{(match.similarity * 100).toFixed(0)}%</span>
                        <div className="flex gap-1">
                          {match.styleTags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TattooSketchGenerator;
