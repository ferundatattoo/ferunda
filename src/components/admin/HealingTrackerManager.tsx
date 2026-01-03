import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, AlertTriangle, CheckCircle, Clock, 
  Image as ImageIcon, Loader2, MessageCircle, 
  RefreshCw, AlertCircle, Heart, Upload, Sparkles, Radio
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useModuleRealtime } from "@/hooks/useGlobalRealtime";

interface HealingProgress {
  id: string;
  session_id: string | null;
  client_profile_id: string | null;
  day_number: number;
  photo_url: string | null;
  client_notes: string | null;
  ai_health_score: number | null;
  ai_healing_stage: string | null;
  ai_concerns: string[] | null;
  ai_recommendations: string | null;
  ai_confidence: number | null;
  requires_attention: boolean | null;
  artist_response: string | null;
  alert_sent_at: string | null;
  alert_acknowledged_at: string | null;
  created_at: string;
}

const HealingTrackerManager = () => {
  const [healingEntries, setHealingEntries] = useState<HealingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HealingProgress | null>(null);
  const [artistResponse, setArtistResponse] = useState("");
  const [responding, setResponding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadForm, setUploadForm] = useState({ dayNumber: 1, clientNotes: "" });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Real-time updates
  const handleRealtimeUpdate = useCallback(() => {
    fetchHealingEntries();
  }, []);
  
  const realtimeState = useModuleRealtime('healing', handleRealtimeUpdate);

  useEffect(() => {
    fetchHealingEntries();
  }, []);

  const fetchHealingEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("healing_progress")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHealingEntries(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load healing entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArtistResponse = async () => {
    if (!selectedEntry || !artistResponse.trim()) return;

    setResponding(true);
    try {
      const { error } = await supabase
        .from("healing_progress")
        .update({
          artist_response: artistResponse,
          alert_acknowledged_at: new Date().toISOString(),
        })
        .eq("id", selectedEntry.id);

      if (error) throw error;

      setHealingEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id
            ? { ...e, artist_response: artistResponse, alert_acknowledged_at: new Date().toISOString() }
            : e
        )
      );
      setSelectedEntry((prev) =>
        prev ? { ...prev, artist_response: artistResponse } : null
      );
      setArtistResponse("");
      toast({
        title: "Response Sent",
        description: "Your response has been saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save response",
        variant: "destructive",
      });
    } finally {
      setResponding(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;

    setAnalyzing(true);
    try {
      // Upload photo to storage
      const fileName = `healing/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("reference-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("reference-images")
        .getPublicUrl(fileName);

      // Call AI analysis
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-healing-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            photoUrl: publicUrl,
            dayNumber: uploadForm.dayNumber,
            clientNotes: uploadForm.clientNotes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const result = await response.json();
      toast({
        title: "Analysis Complete",
        description: `Health score: ${result.analysis.healthScore}% - ${result.analysis.healingStage}`,
      });

      setShowUploadForm(false);
      setUploadForm({ dayNumber: 1, clientNotes: "" });
      fetchHealingEntries();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to analyze photo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getHealthScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-destructive";
  };

  const getHealingStageIcon = (stage: string | null) => {
    switch (stage) {
      case "excellent":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "normal":
        return <Activity className="w-5 h-5 text-blue-400" />;
      case "concerning":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "critical":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const needsAttentionCount = healingEntries.filter((e) => e.requires_attention && !e.alert_acknowledged_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-foreground">Healing Tracker</h2>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered aftercare monitoring with health scores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowUploadForm(!showUploadForm)}>
            <Upload className="w-4 h-4 mr-2" />
            Analyze Photo
          </Button>
          <Button variant="outline" onClick={fetchHealingEntries}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg text-foreground">AI Healing Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a healing photo and let AI analyze the progress
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dayNumber">Day Number (since session)</Label>
                    <Input
                      id="dayNumber"
                      type="number"
                      min={1}
                      max={60}
                      value={uploadForm.dayNumber}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, dayNumber: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientNotes">Client Notes (optional)</Label>
                    <Input
                      id="clientNotes"
                      placeholder="Any concerns or observations..."
                      value={uploadForm.clientNotes}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, clientNotes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload & Analyze
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowUploadForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Banner */}
      {needsAttentionCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-body text-destructive font-medium">
              {needsAttentionCount} client{needsAttentionCount > 1 ? "s" : ""} need{needsAttentionCount === 1 ? "s" : ""} attention
            </p>
            <p className="text-sm text-destructive/80">
              AI detected potential healing issues that require your review
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {healingEntries.length}
                </p>
                <p className="text-xs text-muted-foreground">Total Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {healingEntries.filter((e) => (e.ai_health_score || 0) >= 80).length}
                </p>
                <p className="text-xs text-muted-foreground">Excellent Healing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {needsAttentionCount}
                </p>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MessageCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-display text-foreground">
                  {healingEntries.filter((e) => e.artist_response).length}
                </p>
                <p className="text-xs text-muted-foreground">Responded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entries List */}
        <div className="lg:col-span-2 space-y-2">
          {healingEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No healing check-ins yet</p>
              <p className="text-sm mt-1">Clients will submit photos after their sessions</p>
            </div>
          ) : (
            <AnimatePresence>
              {healingEntries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setArtistResponse(entry.artist_response || "");
                  }}
                  className={`p-4 bg-card border rounded-lg cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id
                      ? "border-primary"
                      : entry.requires_attention && !entry.alert_acknowledged_at
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getHealingStageIcon(entry.ai_healing_stage)}
                      <div>
                        <p className="font-body text-foreground">Day {entry.day_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {entry.ai_health_score && (
                        <span className={`font-display text-lg ${getHealthScoreColor(entry.ai_health_score)}`}>
                          {entry.ai_health_score}%
                        </span>
                      )}
                      {entry.photo_url && (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                      {entry.requires_attention && !entry.alert_acknowledged_at && (
                        <Badge variant="destructive" className="text-xs">
                          Needs Review
                        </Badge>
                      )}
                      {entry.artist_response && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </div>
                  {entry.client_notes && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      "{entry.client_notes}"
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedEntry ? (
            <Card className="bg-card border-border sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  {getHealingStageIcon(selectedEntry.ai_healing_stage)}
                  Day {selectedEntry.day_number} Check-in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedEntry.photo_url && (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    <img
                      src={selectedEntry.photo_url}
                      alt="Healing progress"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                {selectedEntry.ai_health_score && (
                  <div className="text-center py-4 border-y border-border">
                    <p className={`text-4xl font-display ${getHealthScoreColor(selectedEntry.ai_health_score)}`}>
                      {selectedEntry.ai_health_score}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI Health Score
                      {selectedEntry.ai_confidence && (
                        <span className="ml-2">({Math.round(selectedEntry.ai_confidence * 100)}% confidence)</span>
                      )}
                    </p>
                  </div>
                )}

                {selectedEntry.ai_healing_stage && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Healing Stage</p>
                    <Badge variant="secondary" className="capitalize">
                      {selectedEntry.ai_healing_stage}
                    </Badge>
                  </div>
                )}

                {selectedEntry.client_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Client Notes</p>
                    <p className="text-sm text-foreground bg-muted/50 rounded p-2">
                      "{selectedEntry.client_notes}"
                    </p>
                  </div>
                )}

                {selectedEntry.ai_concerns && selectedEntry.ai_concerns.length > 0 && (
                  <div>
                    <p className="text-sm text-destructive mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      AI Concerns
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {selectedEntry.ai_concerns.map((concern, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-destructive">•</span>
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedEntry.ai_recommendations && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">AI Recommendations</p>
                    <p className="text-sm text-foreground bg-muted/50 rounded p-2">
                      {selectedEntry.ai_recommendations}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-border space-y-3">
                  <p className="text-sm text-muted-foreground">Your Response</p>
                  <Textarea
                    placeholder="Add your professional advice or response..."
                    value={artistResponse}
                    onChange={(e) => setArtistResponse(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleArtistResponse}
                    disabled={responding || !artistResponse.trim()}
                    className="w-full"
                  >
                    {responding ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <MessageCircle className="w-4 h-4 mr-2" />
                    )}
                    {selectedEntry.artist_response ? "Update Response" : "Send Response"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select an entry to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealingTrackerManager;
