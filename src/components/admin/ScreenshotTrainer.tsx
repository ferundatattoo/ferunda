import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Upload, 
  Loader2, 
  Check, 
  X, 
  Plus, 
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExtractedKnowledge {
  category: string;
  title: string;
  content: string;
  selected: boolean;
}

interface ExtractedTrainingPair {
  category: string;
  question: string;
  ideal_response: string;
  selected: boolean;
}

interface AnalysisResult {
  knowledge_entries: ExtractedKnowledge[];
  training_pairs: ExtractedTrainingPair[];
}

const ScreenshotTrainer = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [showKnowledge, setShowKnowledge] = useState(true);
  const [showTraining, setShowTraining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = ["general", "pricing", "booking", "aftercare", "style", "availability", "faq"];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    
    const newImages: string[] = [];
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please upload images only", variant: "destructive" });
        continue;
      }
      
      // Convert to base64 for preview
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      newImages.push(base64);
    }
    
    setUploadedImages([...uploadedImages, ...newImages]);
    setUploading(false);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const analyzeScreenshots = async () => {
    if (uploadedImages.length === 0) {
      toast({ title: "No images", description: "Please upload at least one screenshot", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysisResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const allKnowledge: ExtractedKnowledge[] = [];
      const allTraining: ExtractedTrainingPair[] = [];

      // Analyze each image
      for (const imageBase64 of uploadedImages) {
        // Remove the data:image/xxx;base64, prefix
        const base64Data = imageBase64.split(",")[1];
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-screenshot`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ imageBase64: base64Data }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Analysis error:", errorData);
          continue; // Skip this image but continue with others
        }

        const result = await response.json();
        
        if (result.data) {
          // Add entries with selected=true by default
          result.data.knowledge_entries?.forEach((entry: any) => {
            allKnowledge.push({ ...entry, selected: true });
          });
          result.data.training_pairs?.forEach((pair: any) => {
            allTraining.push({ ...pair, selected: true });
          });
        }
      }

      if (allKnowledge.length === 0 && allTraining.length === 0) {
        setError("No training data could be extracted from the screenshots. Try uploading clearer conversation screenshots.");
      } else {
        setAnalysisResults({
          knowledge_entries: allKnowledge,
          training_pairs: allTraining,
        });
        toast({ 
          title: "Analysis complete", 
          description: `Found ${allKnowledge.length} knowledge entries and ${allTraining.length} training pairs` 
        });
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      setError(error.message || "Failed to analyze screenshots");
      toast({ title: "Error", description: error.message || "Failed to analyze", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleKnowledgeSelection = (index: number) => {
    if (!analysisResults) return;
    const updated = [...analysisResults.knowledge_entries];
    updated[index].selected = !updated[index].selected;
    setAnalysisResults({ ...analysisResults, knowledge_entries: updated });
  };

  const toggleTrainingSelection = (index: number) => {
    if (!analysisResults) return;
    const updated = [...analysisResults.training_pairs];
    updated[index].selected = !updated[index].selected;
    setAnalysisResults({ ...analysisResults, training_pairs: updated });
  };

  const updateKnowledgeField = (index: number, field: keyof ExtractedKnowledge, value: string) => {
    if (!analysisResults) return;
    const updated = [...analysisResults.knowledge_entries];
    (updated[index] as any)[field] = value;
    setAnalysisResults({ ...analysisResults, knowledge_entries: updated });
  };

  const updateTrainingField = (index: number, field: keyof ExtractedTrainingPair, value: string) => {
    if (!analysisResults) return;
    const updated = [...analysisResults.training_pairs];
    (updated[index] as any)[field] = value;
    setAnalysisResults({ ...analysisResults, training_pairs: updated });
  };

  const saveSelectedData = async () => {
    if (!analysisResults) return;

    const selectedKnowledge = analysisResults.knowledge_entries.filter(e => e.selected);
    const selectedTraining = analysisResults.training_pairs.filter(p => p.selected);

    if (selectedKnowledge.length === 0 && selectedTraining.length === 0) {
      toast({ title: "Nothing selected", description: "Please select at least one item to save", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      // Save knowledge entries
      if (selectedKnowledge.length > 0) {
        const knowledgeToInsert = selectedKnowledge.map(({ selected, ...rest }) => rest);
        const { error: kError } = await supabase
          .from("concierge_knowledge")
          .insert(knowledgeToInsert);
        
        if (kError) throw kError;
      }

      // Save training pairs
      if (selectedTraining.length > 0) {
        const trainingToInsert = selectedTraining.map(({ selected, ...rest }) => rest);
        const { error: tError } = await supabase
          .from("concierge_training_pairs")
          .insert(trainingToInsert);
        
        if (tError) throw tError;
      }

      toast({ 
        title: "Saved!", 
        description: `Added ${selectedKnowledge.length} knowledge entries and ${selectedTraining.length} training pairs to ETHEREAL` 
      });

      // Reset state
      setUploadedImages([]);
      setAnalysisResults(null);

    } catch (error: any) {
      console.error("Save failed:", error);
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    setUploadedImages([]);
    setAnalysisResults(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="font-display text-xl text-foreground">Screenshot Training</h3>
            <p className="font-body text-sm text-muted-foreground">
              Upload DM or email screenshots to automatically extract training data for ETHEREAL
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-foreground/50 transition-colors cursor-pointer p-8 text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading ? (
            <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-body text-sm text-muted-foreground">
                Click or drag screenshots here
              </p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Supports multiple images at once
              </p>
            </>
          )}
        </div>

        {/* Uploaded Images Preview */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-body text-sm text-muted-foreground">
                {uploadedImages.length} screenshot{uploadedImages.length > 1 ? "s" : ""} uploaded
              </p>
              <button
                onClick={clearAll}
                className="font-body text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={img} 
                    alt={`Screenshot ${index + 1}`}
                    className="w-20 h-20 object-cover border border-border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-border hover:border-foreground/50 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Analyze Button */}
        {uploadedImages.length > 0 && !analysisResults && (
          <button
            onClick={analyzeScreenshots}
            disabled={analyzing}
            className="w-full py-3 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing screenshots...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze & Extract Training Data
              </>
            )}
          </button>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="font-body text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysisResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Knowledge Entries */}
            {analysisResults.knowledge_entries.length > 0 && (
              <div className="border border-border">
                <button
                  onClick={() => setShowKnowledge(!showKnowledge)}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-foreground" />
                    <span className="font-display text-lg text-foreground">
                      Knowledge Entries ({analysisResults.knowledge_entries.filter(e => e.selected).length}/{analysisResults.knowledge_entries.length})
                    </span>
                  </div>
                  {showKnowledge ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                <AnimatePresence>
                  {showKnowledge && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-3">
                        {analysisResults.knowledge_entries.map((entry, index) => (
                          <div 
                            key={index}
                            className={`p-4 border transition-colors ${
                              entry.selected 
                                ? "border-foreground/30 bg-accent/30" 
                                : "border-border bg-transparent opacity-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleKnowledgeSelection(index)}
                                className={`mt-1 w-5 h-5 border flex items-center justify-center flex-shrink-0 ${
                                  entry.selected 
                                    ? "border-foreground bg-foreground text-background" 
                                    : "border-border"
                                }`}
                              >
                                {entry.selected && <Check className="w-3 h-3" />}
                              </button>
                              <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                  <select
                                    value={entry.category}
                                    onChange={(e) => updateKnowledgeField(index, "category", e.target.value)}
                                    className="bg-transparent border border-border px-2 py-1 font-body text-xs focus:outline-none"
                                  >
                                    {categories.map((cat) => (
                                      <option key={cat} value={cat} className="bg-background">{cat}</option>
                                    ))}
                                  </select>
                                </div>
                                <input
                                  type="text"
                                  value={entry.title}
                                  onChange={(e) => updateKnowledgeField(index, "title", e.target.value)}
                                  className="w-full bg-transparent border-b border-border py-1 font-display text-lg focus:outline-none focus:border-foreground"
                                  placeholder="Title"
                                />
                                <textarea
                                  value={entry.content}
                                  onChange={(e) => updateKnowledgeField(index, "content", e.target.value)}
                                  className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                                  rows={2}
                                  placeholder="Content"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Training Pairs */}
            {analysisResults.training_pairs.length > 0 && (
              <div className="border border-border">
                <button
                  onClick={() => setShowTraining(!showTraining)}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-foreground" />
                    <span className="font-display text-lg text-foreground">
                      Training Pairs ({analysisResults.training_pairs.filter(p => p.selected).length}/{analysisResults.training_pairs.length})
                    </span>
                  </div>
                  {showTraining ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                <AnimatePresence>
                  {showTraining && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-3">
                        {analysisResults.training_pairs.map((pair, index) => (
                          <div 
                            key={index}
                            className={`p-4 border transition-colors ${
                              pair.selected 
                                ? "border-foreground/30 bg-accent/30" 
                                : "border-border bg-transparent opacity-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleTrainingSelection(index)}
                                className={`mt-1 w-5 h-5 border flex items-center justify-center flex-shrink-0 ${
                                  pair.selected 
                                    ? "border-foreground bg-foreground text-background" 
                                    : "border-border"
                                }`}
                              >
                                {pair.selected && <Check className="w-3 h-3" />}
                              </button>
                              <div className="flex-1 space-y-3">
                                <div className="flex gap-2">
                                  <select
                                    value={pair.category}
                                    onChange={(e) => updateTrainingField(index, "category", e.target.value)}
                                    className="bg-transparent border border-border px-2 py-1 font-body text-xs focus:outline-none"
                                  >
                                    {categories.map((cat) => (
                                      <option key={cat} value={cat} className="bg-background">{cat}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                                    Customer Question
                                  </label>
                                  <textarea
                                    value={pair.question}
                                    onChange={(e) => updateTrainingField(index, "question", e.target.value)}
                                    className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                                    Ideal Response
                                  </label>
                                  <textarea
                                    value={pair.ideal_response}
                                    onChange={(e) => updateTrainingField(index, "ideal_response", e.target.value)}
                                    className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Save Button */}
            <div className="flex gap-3">
              <button
                onClick={clearAll}
                className="flex-1 py-3 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={saveSelectedData}
                disabled={saving}
                className="flex-1 py-3 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Selected to ETHEREAL
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScreenshotTrainer;
