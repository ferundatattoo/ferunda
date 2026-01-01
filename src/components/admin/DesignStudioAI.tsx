import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Loader2,
  Download,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Bookmark,
  Image as ImageIcon,
  Palette,
  MapPin,
  X,
  Check,
  Plus,
  History,
  Upload,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DesignEngine, { ReferenceAnalysis, PortfolioMatch } from "@/services/DesignEngineInternal";

interface DesignSuggestion {
  id: string;
  user_prompt: string;
  generated_image_url: string | null;
  ai_description: string | null;
  style_preferences: string[] | null;
  suggested_placement: string | null;
  client_reaction: string | null;
  booking_id: string | null;
  created_at: string;
  // Extended fields from DesignEngine
  analysis?: ReferenceAnalysis;
  portfolioMatch?: PortfolioMatch;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  tattoo_description: string;
}

const TATTOO_STYLES = [
  "Micro Realism",
  "Sacred Geometry",
  "Fine Line",
  "Blackwork",
  "Ornamental",
  "Neo Traditional",
  "Japanese",
  "Minimalist",
  "Dotwork",
  "Watercolor"
];

const PLACEMENTS = [
  "Forearm",
  "Upper Arm",
  "Shoulder",
  "Back",
  "Chest",
  "Ribs",
  "Thigh",
  "Calf",
  "Ankle",
  "Wrist",
  "Neck",
  "Hand"
];

interface DesignStudioAIProps {
  bookingId?: string;
  clientView?: boolean;
  onDesignApproved?: (designId: string, imageUrl: string) => void;
  workspaceId?: string;
  artistId?: string;
}

const DesignStudioAI = ({ 
  bookingId, 
  clientView = false, 
  onDesignApproved,
  workspaceId,
  artistId 
}: DesignStudioAIProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [placement, setPlacement] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState<DesignSuggestion[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>(bookingId || "");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Reference upload & analysis state
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [portfolioMatch, setPortfolioMatch] = useState<PortfolioMatch | null>(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  // Fetch bookings for linking designs
  useEffect(() => {
    if (!clientView) {
      fetchBookings();
    }
    fetchDesignHistory();
  }, [clientView]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, name, email, tattoo_description")
        .in("pipeline_stage", ["new_inquiry", "deposit_paid", "scheduled", "references_received"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchDesignHistory = async () => {
    setLoadingHistory(true);
    try {
      let query = supabase
        .from("ai_design_suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (bookingId) {
        query = query.eq("booking_id", bookingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setGeneratedDesigns(data || []);
    } catch (error) {
      console.error("Error fetching design history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Analyze uploaded reference with DesignEngine
  const analyzeReference = async (imageUrl: string) => {
    setIsAnalyzing(true);
    try {
      const analysis = await DesignEngine.analyzeReference(imageUrl);
      setCurrentAnalysis(analysis);
      
      // Auto-fill style if detected
      if (analysis.styles.length > 0 && !style) {
        const matchedStyle = TATTOO_STYLES.find(s => 
          analysis.styles.some(as => as.toLowerCase().includes(s.toLowerCase()))
        );
        if (matchedStyle) setStyle(matchedStyle);
      }
      
      // Auto-fill placement if suggested
      if (analysis.placement_suggestions.length > 0 && !placement) {
        const matchedPlacement = PLACEMENTS.find(p => 
          analysis.placement_suggestions.some(ps => ps.toLowerCase().includes(p.toLowerCase()))
        );
        if (matchedPlacement) setPlacement(matchedPlacement);
      }

      // Get portfolio match
      const match = await DesignEngine.matchWithPortfolio(analysis, artistId, workspaceId);
      setPortfolioMatch(match);
      setShowAnalysisPanel(true);

      toast({
        title: "Reference analyzed",
        description: `Detected: ${analysis.styles.join(", ")} • ${analysis.complexity} complexity`,
      });
    } catch (error) {
      console.error("Error analyzing reference:", error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze the reference image.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `references/${crypto.randomUUID()}.${fileExt}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tattoo-references')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tattoo-references')
        .getPublicUrl(filePath);

      setReferenceUrls(prev => [...prev, publicUrl]);
      await analyzeReference(publicUrl);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload reference image.",
        variant: "destructive",
      });
    }
  };

  const removeReference = (index: number) => {
    setReferenceUrls(prev => prev.filter((_, i) => i !== index));
    if (referenceUrls.length <= 1) {
      setCurrentAnalysis(null);
      setPortfolioMatch(null);
      setShowAnalysisPanel(false);
    }
  };

  const generateDesign = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the tattoo design you want to create.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Use DesignEngine if we have references
      if (referenceUrls.length > 0 && workspaceId) {
        const result = await DesignEngine.generatePreSketch({
          referenceUrls,
          clientDescription: prompt.trim(),
          preferredStyle: style || undefined,
          placement: placement || undefined,
          artistId,
          workspaceId,
        });

        const newDesign: DesignSuggestion = {
          id: result.id,
          user_prompt: prompt,
          generated_image_url: result.imageUrl,
          ai_description: result.aiDescription,
          style_preferences: result.analysis.styles,
          suggested_placement: placement || null,
          client_reaction: null,
          booking_id: selectedBooking || bookingId || null,
          created_at: new Date().toISOString(),
          analysis: result.analysis,
          portfolioMatch: result.portfolioMatch,
        };

        setGeneratedDesigns(prev => [newDesign, ...prev]);

        toast({
          title: "Design generated!",
          description: `Match: ${result.portfolioMatch?.matchPercentage || 0}% with portfolio`,
        });
      } else {
        // Fallback to original generate-design function
        const { data, error } = await supabase.functions.invoke("generate-design", {
          body: {
            prompt: prompt.trim(),
            style: style || undefined,
            placement: placement || undefined,
            booking_id: selectedBooking || bookingId || undefined,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if (data.suggestion_id && data.image_url) {
          const newDesign: DesignSuggestion = {
            id: data.suggestion_id,
            user_prompt: prompt,
            generated_image_url: data.image_url,
            ai_description: data.enhanced_prompt,
            style_preferences: style ? [style] : null,
            suggested_placement: placement || null,
            client_reaction: null,
            booking_id: selectedBooking || bookingId || null,
            created_at: new Date().toISOString(),
          };
          setGeneratedDesigns(prev => [newDesign, ...prev]);
        }

        toast({
          title: "Design generated!",
          description: "Your AI tattoo design is ready.",
        });
      }

      setPrompt("");
    } catch (error: any) {
      console.error("Error generating design:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReaction = async (designId: string, reaction: "approved" | "rejected" | "needs_changes") => {
    try {
      const { error } = await supabase
        .from("ai_design_suggestions")
        .update({ client_reaction: reaction })
        .eq("id", designId);

      if (error) throw error;

      setGeneratedDesigns(prev =>
        prev.map(d => (d.id === designId ? { ...d, client_reaction: reaction } : d))
      );

      if (reaction === "approved") {
        const design = generatedDesigns.find(d => d.id === designId);
        if (design && onDesignApproved) {
          onDesignApproved(designId, design.generated_image_url || "");
        }
        toast({
          title: "Design approved!",
          description: "This design has been saved to the booking.",
        });
      } else {
        toast({
          title: "Feedback recorded",
          description: `Design marked as ${reaction.replace("_", " ")}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save reaction.",
        variant: "destructive",
      });
    }
  };

  const downloadImage = async (imageUrl: string, designId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ferunda-design-${designId.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the image.",
        variant: "destructive",
      });
    }
  };

  const getFeasibilityColor = (feasibility?: PortfolioMatch["feasibility"]) => {
    switch (feasibility) {
      case "perfect_match": return "text-emerald-400 bg-emerald-500/20";
      case "good_match": return "text-green-400 bg-green-500/20";
      case "possible": return "text-amber-400 bg-amber-500/20";
      case "challenging": return "text-orange-400 bg-orange-500/20";
      case "not_recommended": return "text-red-400 bg-red-500/20";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getFeasibilityLabel = (feasibility?: PortfolioMatch["feasibility"]) => {
    switch (feasibility) {
      case "perfect_match": return "Perfect Match";
      case "good_match": return "Good Match";
      case "possible": return "Possible";
      case "challenging": return "Challenging";
      case "not_recommended": return "Not Recommended";
      default: return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Design Studio AI
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Generate custom tattoo designs with AI + portfolio matching
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="w-4 h-4" />
          {showHistory ? "Hide" : "Show"} History
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Reference Upload */}
          <Card className="bg-card/50 backdrop-blur-xl border-border/30">
            <CardHeader className="pb-4">
              <CardTitle className="font-body text-base flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Reference Images
                {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {referenceUrls.map((url, idx) => (
                  <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeReference(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceUpload}
                    className="hidden"
                    disabled={isAnalyzing}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload client references for AI analysis and portfolio matching
              </p>
            </CardContent>
          </Card>

          {/* Generation Form */}
          <Card className="bg-card/50 backdrop-blur-xl border-border/30">
            <CardHeader className="pb-4">
              <CardTitle className="font-body text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Create New Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt Input */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Describe your tattoo idea
                </label>
                <Textarea
                  placeholder="e.g., Geometric wolf with sacred geometry patterns, incorporating moon phases and forest elements..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] resize-none bg-background/50"
                  disabled={isGenerating}
                />
              </div>

              {/* Style and Placement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                    <Palette className="w-3 h-3 inline mr-1" />
                    Style {currentAnalysis && <span className="text-primary">(AI detected)</span>}
                  </label>
                  <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      {TATTOO_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Placement
                  </label>
                  <Select value={placement} onValueChange={setPlacement} disabled={isGenerating}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEMENTS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Link to Booking (Admin only) */}
              {!clientView && bookings.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                    Link to Booking (optional)
                  </label>
                  <Select value={selectedBooking || "none"} onValueChange={(val) => setSelectedBooking(val === "none" ? "" : val)} disabled={isGenerating}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select a booking to link" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No booking</SelectItem>
                      {bookings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} - {b.tattoo_description.slice(0, 40)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={generateDesign}
                disabled={isGenerating || !prompt.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Design...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Design
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Panel - 1 column */}
        <div className="space-y-4">
          {/* Portfolio Match Card */}
          <AnimatePresence>
            {showAnalysisPanel && portfolioMatch && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card className="bg-card/50 backdrop-blur-xl border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-body text-base flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Portfolio Match
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Match Percentage */}
                    <div className="text-center py-4">
                      <div className="text-4xl font-display text-foreground">
                        {portfolioMatch.matchPercentage}%
                      </div>
                      <Badge className={`mt-2 ${getFeasibilityColor(portfolioMatch.feasibility)}`}>
                        {getFeasibilityLabel(portfolioMatch.feasibility)}
                      </Badge>
                    </div>

                    {/* Match Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Style Alignment</span>
                        <span>{Math.round(portfolioMatch.styleAnalysis.artistExpertise * 100)}%</span>
                      </div>
                      <Progress value={portfolioMatch.styleAnalysis.artistExpertise * 100} className="h-2" />
                    </div>

                    {/* Similar Pieces */}
                    {portfolioMatch.similarPieces.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          Similar Portfolio Pieces
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {portfolioMatch.similarPieces.slice(0, 4).map((piece, idx) => (
                            <div key={idx} className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 border border-border">
                              <img src={piece.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {portfolioMatch.notes.length > 0 && (
                      <div className="space-y-1">
                        {portfolioMatch.notes.map((note, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reference Analysis Card */}
          <AnimatePresence>
            {showAnalysisPanel && currentAnalysis && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-card/50 backdrop-blur-xl border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-body text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Detected Styles */}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Styles</p>
                      <div className="flex flex-wrap gap-1">
                        {currentAnalysis.styles.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Complexity */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Complexity</span>
                      <Badge variant="outline" className="capitalize">
                        {currentAnalysis.complexity}
                      </Badge>
                    </div>

                    {/* Estimated Hours */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Est. Duration
                      </span>
                      <span className="text-sm font-medium">
                        {currentAnalysis.estimatedHours}h
                      </span>
                    </div>

                    {/* Colors */}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Colors</p>
                      <div className="flex gap-2">
                        {currentAnalysis.colors.slice(0, 5).map((color, i) => (
                          <span key={i} className="text-xs text-foreground/80">{color}</span>
                        ))}
                      </div>
                    </div>

                    {/* Placements */}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Suggested Placements</p>
                      <div className="flex flex-wrap gap-1">
                        {currentAnalysis.placement_suggestions.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs capitalize">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!showAnalysisPanel && (
            <Card className="bg-card/50 backdrop-blur-xl border-border/30 border-dashed">
              <CardContent className="py-8 text-center">
                <Eye className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Upload a reference image to see AI analysis and portfolio matching
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Generated Designs Gallery */}
      <AnimatePresence>
        {(showHistory || generatedDesigns.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h3 className="font-display text-lg text-foreground flex items-center gap-2">
              <History className="w-4 h-4" />
              Generated Designs
              <Badge variant="secondary" className="ml-2">
                {generatedDesigns.length}
              </Badge>
            </h3>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : generatedDesigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No designs generated yet</p>
                <p className="text-sm mt-1">Create your first AI design above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedDesigns.map((design) => (
                  <motion.div
                    key={design.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group"
                  >
                    <Card className="bg-card/50 backdrop-blur-xl border-border/30 overflow-hidden">
                      {/* Image */}
                      <div className="relative aspect-square bg-secondary">
                        {design.generated_image_url ? (
                          <img
                            src={design.generated_image_url}
                            alt={design.user_prompt}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          </div>
                        )}

                        {/* Match Badge (if available) */}
                        {design.portfolioMatch && (
                          <div className="absolute top-2 left-2">
                            <Badge className={getFeasibilityColor(design.portfolioMatch.feasibility)}>
                              {design.portfolioMatch.matchPercentage}% Match
                            </Badge>
                          </div>
                        )}

                        {/* Reaction Badge */}
                        {design.client_reaction && (
                          <div className="absolute top-2 right-2">
                            <Badge
                              className={
                                design.client_reaction === "approved"
                                  ? "bg-emerald-500/90"
                                  : design.client_reaction === "rejected"
                                  ? "bg-red-500/90"
                                  : "bg-amber-500/90"
                              }
                            >
                              {design.client_reaction === "approved" && <Check className="w-3 h-3 mr-1" />}
                              {design.client_reaction === "rejected" && <X className="w-3 h-3 mr-1" />}
                              {design.client_reaction.replace("_", " ")}
                            </Badge>
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => downloadImage(design.generated_image_url!, design.id)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {!design.client_reaction && (
                            <>
                              <Button
                                size="icon"
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleReaction(design.id, "approved")}
                                title="Approve"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => handleReaction(design.id, "rejected")}
                                title="Reject"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm line-clamp-2">{design.user_prompt}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {design.style_preferences?.map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                          {design.suggested_placement && (
                            <Badge variant="secondary" className="text-xs">
                              {design.suggested_placement}
                            </Badge>
                          )}
                        </div>
                        {design.analysis && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{design.analysis.estimatedHours}h estimated</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DesignStudioAI;
