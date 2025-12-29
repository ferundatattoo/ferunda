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
  History
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

const DesignStudioAI = ({ bookingId, clientView = false, onDesignApproved }: DesignStudioAIProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [placement, setPlacement] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState<DesignSuggestion[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>(bookingId || "");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
      const { data, error } = await supabase.functions.invoke("generate-design", {
        body: {
          prompt: prompt.trim(),
          style: style || undefined,
          placement: placement || undefined,
          booking_id: selectedBooking || bookingId || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Design generated!",
        description: "Your AI tattoo design is ready.",
      });

      // Add to the beginning of the list
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
        setGeneratedDesigns((prev) => [newDesign, ...prev]);
      }

      // Clear prompt after successful generation
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

      setGeneratedDesigns((prev) =>
        prev.map((d) => (d.id === designId ? { ...d, client_reaction: reaction } : d))
      );

      if (reaction === "approved") {
        const design = generatedDesigns.find((d) => d.id === designId);
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
            Generate custom tattoo designs with AI assistance
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

      {/* Generation Form */}
      <Card className="bg-card border-border">
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
              className="min-h-[100px] resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Style and Placement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                <Palette className="w-3 h-3 inline mr-1" />
                Style (optional)
              </label>
              <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                <SelectTrigger>
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
                Placement (optional)
              </label>
              <Select value={placement} onValueChange={setPlacement} disabled={isGenerating}>
                <SelectTrigger>
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
                <SelectTrigger>
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
                    <Card className="bg-card border-border overflow-hidden">
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

                      {/* Details */}
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm text-foreground line-clamp-2">{design.user_prompt}</p>
                        <div className="flex flex-wrap gap-1">
                          {design.style_preferences?.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                          {design.suggested_placement && (
                            <Badge variant="outline" className="text-xs">
                              {design.suggested_placement}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(design.created_at).toLocaleDateString()}
                        </p>
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