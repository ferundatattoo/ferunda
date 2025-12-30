import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Palette,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Zap,
  FileImage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisReport {
  style_detected: string[];
  complexity_score: number;
  estimated_hours: number;
  color_palette: string[];
  placement_suggestions: string[];
  technical_notes: string;
  client_preparation: string;
  potential_challenges: string[];
  style_description: string;
  size_recommendation: string;
}

interface ReferenceAnalyzerProps {
  bookingId?: string;
  clientEmail?: string;
  onAnalysisComplete?: (referenceId: string, analysis: AnalysisReport) => void;
}

const ReferenceAnalyzer = ({ bookingId, clientEmail, onAnalysisComplete }: ReferenceAnalyzerProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length + files.length > 3) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 3 reference images.",
        variant: "destructive"
      });
      return;
    }

    const validFiles = selectedFiles.filter(file => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported image format.`,
          variant: "destructive"
        });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 5MB limit.`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [files, toast]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast({
        title: "No images",
        description: "Please upload at least one reference image.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      // Upload images to storage
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('tattoo-references')
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { data: urlData } = supabase.storage
          .from('tattoo-references')
          .getPublicUrl(uploadData.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      // Create reference record
      const { data: refData, error: refError } = await supabase
        .from('tattoo_references')
        .insert({
          booking_id: bookingId || null,
          client_email: clientEmail || null,
          images: uploadedUrls,
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (refError) {
        console.error("Reference creation error:", refError);
        throw new Error("Failed to create reference record");
      }

      setReferenceId(refData.id);

      // Call AI analysis
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-reference', {
          body: {
            referenceId: refData.id,
            imageUrls: uploadedUrls
          }
        });

      if (analysisError) {
        throw analysisError;
      }

      if (!analysisData.success) {
        throw new Error(analysisData.error || "Analysis failed");
      }

      setAnalysis(analysisData.analysis);
      onAnalysisComplete?.(refData.id, analysisData.analysis);

      toast({
        title: "Analysis Complete",
        description: "Your reference images have been analyzed successfully."
      });

    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getComplexityColor = (score: number) => {
    if (score <= 3) return "text-green-500";
    if (score <= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getComplexityLabel = (score: number) => {
    if (score <= 3) return "Simple";
    if (score <= 6) return "Moderate";
    if (score <= 8) return "Complex";
    return "Very Complex";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-display text-lg text-foreground">AI Reference Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Upload your tattoo inspiration for instant AI analysis
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-foreground/30 transition-colors">
        <input
          type="file"
          id="reference-upload"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={isAnalyzing || files.length >= 3}
        />
        <label
          htmlFor="reference-upload"
          className={`flex flex-col items-center gap-3 cursor-pointer ${
            files.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="p-4 bg-accent/50 rounded-full">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-body text-foreground">
              Drop images here or click to upload
            </p>
            <p className="text-sm text-muted-foreground">
              JPG, PNG or WebP • Max 5MB each • Up to 3 images
            </p>
          </div>
        </label>
      </div>

      {/* Image Previews */}
      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-3 gap-4"
          >
            {previews.map((preview, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-lg overflow-hidden border border-border group"
              >
                <img
                  src={preview}
                  alt={`Reference ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeFile(index)}
                  disabled={isAnalyzing}
                  className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded text-xs font-body">
                  {files[index]?.name.substring(0, 15)}...
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze Button */}
      {files.length > 0 && !analysis && (
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full gap-2"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Analyze with AI
            </>
          )}
        </Button>
      )}

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 border border-border rounded-lg p-6 bg-accent/10"
          >
            <div className="flex items-center gap-2 text-green-500 mb-4">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Analysis Complete</span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Complexity</span>
                </div>
                <p className={`font-display text-2xl ${getComplexityColor(analysis.complexity_score)}`}>
                  {analysis.complexity_score}/10
                </p>
                <p className="text-xs text-muted-foreground">
                  {getComplexityLabel(analysis.complexity_score)}
                </p>
              </div>

              <div className="p-4 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Est. Time</span>
                </div>
                <p className="font-display text-2xl text-foreground">
                  {analysis.estimated_hours}h
                </p>
                <p className="text-xs text-muted-foreground">
                  Session time
                </p>
              </div>

              <div className="p-4 bg-background rounded-lg border border-border col-span-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Palette className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Style</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.style_detected.map((style, i) => (
                    <span key={i} className="px-2 py-0.5 bg-accent text-xs rounded-full">
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <h4 className="font-medium text-foreground mb-2">Style Description</h4>
                <p className="text-sm text-muted-foreground">{analysis.style_description}</p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Size Recommendation</h4>
                <p className="text-sm text-muted-foreground">{analysis.size_recommendation}</p>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Placement Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.placement_suggestions.map((placement, i) => (
                    <span key={i} className="px-3 py-1 bg-accent text-sm rounded-full">
                      {placement}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.color_palette.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Color Palette</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.color_palette.map((color, i) => (
                      <span key={i} className="px-3 py-1 border border-border text-sm rounded-full">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-foreground mb-2">Technical Notes</h4>
                <p className="text-sm text-muted-foreground">{analysis.technical_notes}</p>
              </div>

              {analysis.potential_challenges.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Potential Challenges
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {analysis.potential_challenges.map((challenge, i) => (
                      <li key={i}>{challenge}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-accent/30 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Client Preparation</h4>
                <p className="text-sm text-muted-foreground">{analysis.client_preparation}</p>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                setPreviews([]);
                setAnalysis(null);
                setReferenceId(null);
              }}
              className="w-full mt-4"
            >
              <FileImage className="w-4 h-4 mr-2" />
              Analyze New References
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReferenceAnalyzer;