import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Wand2, 
  MessageSquare, 
  Check, 
  ChevronRight,
  Palette,
  DollarSign,
  Clock,
  Shield,
  Loader2,
  Upload,
  MapPin,
  Star,
  Zap,
  Edit3,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SmartSetupWizardProps {
  artistId: string;
  workspaceId: string;
  artistName: string;
  onComplete: () => void;
  onClose: () => void;
}

interface GeneratedService {
  name: string;
  description: string;
  duration_minutes: number;
  deposit_amount: number;
  hourly_rate: number;
  is_active: boolean;
}

interface GeneratedConfig {
  services: GeneratedService[];
  policies: {
    cancellation_window_hours: number;
    reschedule_window_hours: number;
    late_threshold_minutes: number;
    deposit_type: string;
    deposit_percent: number;
    deposit_fixed: number;
    no_show_rule: string;
  };
  styles: string[];
  priceRange: {
    hourly_min: number;
    hourly_max: number;
  };
  suggestions: string[];
}

type Step = "describe" | "generating" | "review" | "customize" | "confirm";

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner", description: "1-2 years", icon: "🌱" },
  { value: "intermediate", label: "Intermediate", description: "3-5 years", icon: "⭐" },
  { value: "experienced", label: "Experienced", description: "6-10 years", icon: "🔥" },
  { value: "master", label: "Master Artist", description: "10+ years", icon: "👑" },
];

const SmartSetupWizard = ({ artistId, workspaceId, artistName, onComplete, onClose }: SmartSetupWizardProps) => {
  const [step, setStep] = useState<Step>("describe");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Input state
  const [description, setDescription] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [location, setLocation] = useState("");

  // Generated config
  const [config, setConfig] = useState<GeneratedConfig | null>(null);
  const [editingService, setEditingService] = useState<number | null>(null);

  const generateConfiguration = async () => {
    if (!description.trim()) {
      toast.error("Please describe your style and work");
      return;
    }

    setStep("generating");
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-artist-setup", {
        body: {
          action: "generate-config",
          data: {
            artistName,
            description,
            experienceLevel,
            location,
          },
        },
      });

      if (error) throw error;

      if (data?.success && data?.config) {
        setConfig(data.config);
        setStep("review");
        
        if (data.fallback) {
          toast.info("Using smart defaults. You can customize everything.");
        }
      } else {
        throw new Error("Failed to generate configuration");
      }
    } catch (err) {
      console.error("Generation error:", err);
      toast.error("Failed to generate. Using defaults.");
      
      // Use defaults
      setConfig({
        services: [
          { name: "Consultation", description: "Discuss your idea", duration_minutes: 30, deposit_amount: 0, hourly_rate: 0, is_active: true },
          { name: "Small Session", description: "2-3 hour pieces", duration_minutes: 150, deposit_amount: 100, hourly_rate: 200, is_active: true },
          { name: "Half Day", description: "4-5 hour session", duration_minutes: 270, deposit_amount: 200, hourly_rate: 200, is_active: true },
          { name: "Full Day", description: "6-8 hours", duration_minutes: 420, deposit_amount: 350, hourly_rate: 200, is_active: true },
        ],
        policies: {
          cancellation_window_hours: 72,
          reschedule_window_hours: 72,
          late_threshold_minutes: 30,
          deposit_type: "fixed",
          deposit_percent: 30,
          deposit_fixed: 150,
          no_show_rule: "deposit forfeited",
        },
        styles: ["Custom Work"],
        priceRange: { hourly_min: 150, hourly_max: 250 },
        suggestions: [],
      });
      setStep("review");
    } finally {
      setIsProcessing(false);
    }
  };

  const regenerate = async () => {
    await generateConfiguration();
  };

  const updateService = (index: number, updates: Partial<GeneratedService>) => {
    if (!config) return;
    const newServices = [...config.services];
    newServices[index] = { ...newServices[index], ...updates };
    setConfig({ ...config, services: newServices });
  };

  const toggleService = (index: number) => {
    if (!config) return;
    updateService(index, { is_active: !config.services[index].is_active });
  };

  const saveConfiguration = async () => {
    if (!config) return;
    
    setIsSaving(true);
    
    try {
      // Delete existing services
      await supabase
        .from("artist_services" as any)
        .delete()
        .eq("artist_id", artistId);

      // Insert new services
      const servicesData = config.services
        .filter(s => s.is_active)
        .map((s, idx) => ({
          artist_id: artistId,
          workspace_id: workspaceId,
          service_key: s.name.toLowerCase().replace(/\s+/g, "_"),
          name: s.name,
          description: s.description,
          duration_minutes: s.duration_minutes,
          deposit_amount: s.deposit_amount,
          hourly_rate: s.hourly_rate,
          is_active: true,
          sort_order: idx,
        }));

      const { error: servicesError } = await supabase
        .from("artist_services" as any)
        .insert(servicesData);

      if (servicesError) throw servicesError;

      // Deactivate existing policies
      await supabase
        .from("studio_policies" as any)
        .update({ is_active: false })
        .eq("artist_id", artistId);

      // Create new policy
      const { error: policyError } = await supabase
        .from("studio_policies" as any)
        .insert({
          artist_id: artistId,
          workspace_id: workspaceId,
          version: 1,
          is_active: true,
          settings: config.policies,
          summary_text: `Cancellation: ${config.policies.cancellation_window_hours}h notice. Late: ${config.policies.late_threshold_minutes}min threshold.`,
        });

      if (policyError) throw policyError;

      toast.success("Setup complete! Your services and policies are ready.");
      onComplete();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl text-foreground flex items-center gap-2">
                  Smart Setup
                  <Badge variant="secondary" className="text-xs">AI Powered</Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {step === "describe" && "Tell us about your work"}
                  {step === "generating" && "Creating your configuration..."}
                  {step === "review" && "Review your generated setup"}
                  {step === "customize" && "Fine-tune your services"}
                  {step === "confirm" && "Ready to go!"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Describe */}
            {step === "describe" && (
              <motion.div
                key="describe"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* AI Intro */}
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Wand2 className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-foreground">AI-Powered Setup</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Describe your tattoo style and experience — or upload some work samples. 
                        Our AI will analyze everything and generate personalized services, 
                        pricing recommendations, and policies tailored to you.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Portfolio Upload (NEW) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Work Samples (Optional)
                  </Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drop photos here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI will detect your style, colors, and specialties
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Tell Us About Your Work
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Example: I specialize in fine line and micro realism tattoos. I love creating delicate botanical pieces and small portraits. Most of my work is black and grey, focusing on detailed linework..."
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    The more detail you provide, the better your configuration will be.
                  </p>
                </div>

                {/* Experience Level */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Experience Level
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setExperienceLevel(level.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          experienceLevel === level.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{level.icon}</span>
                          <div>
                            <div className="font-medium text-sm">{level.label}</div>
                            <div className="text-xs text-muted-foreground">{level.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location (for pricing)
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Los Angeles, CA"
                  />
                </div>

                {/* Setup Assistant (NEW) */}
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      Need help? Just describe what you're unsure about and I'll suggest what to write.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Generating */}
            {step === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
                </div>
                <h3 className="font-display text-xl mt-6">Creating Your Setup</h3>
                <p className="text-muted-foreground text-center mt-2 max-w-sm">
                  AI is analyzing your style and generating personalized services, 
                  pricing, and policies...
                </p>
                <div className="flex items-center gap-2 mt-4 text-sm text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === "review" && config && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Success Banner */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Configuration Generated!</h3>
                      <p className="text-sm text-muted-foreground">
                        Review and customize before saving.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={regenerate}
                      className="ml-auto gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </Button>
                  </div>
                </div>

                {/* Detected Styles */}
                {config.styles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Detected Styles
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {config.styles.map((style, idx) => (
                        <Badge key={idx} variant="secondary">
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing Range */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <h4 className="font-medium">Recommended Pricing</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-2xl font-display text-primary">
                        ${config.priceRange.hourly_min} - ${config.priceRange.hourly_max}
                      </div>
                      <div className="text-sm text-muted-foreground">per hour</div>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Generated Services
                  </Label>
                  {config.services.map((service, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border transition-all ${
                        service.is_active
                          ? "border-primary/50 bg-primary/5"
                          : "border-border opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={service.is_active}
                            onCheckedChange={() => toggleService(idx)}
                          />
                          <div>
                            <div className="font-medium">{service.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDuration(service.duration_minutes)} • ${service.deposit_amount} deposit
                              {service.hourly_rate > 0 && ` • $${service.hourly_rate}/hr`}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingService(editingService === idx ? null : idx)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Edit Form */}
                      <AnimatePresence>
                        {editingService === idx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                              <div>
                                <Label className="text-xs">Name</Label>
                                <Input
                                  value={service.name}
                                  onChange={(e) => updateService(idx, { name: e.target.value })}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Duration (min)</Label>
                                <Input
                                  type="number"
                                  value={service.duration_minutes}
                                  onChange={(e) => updateService(idx, { duration_minutes: parseInt(e.target.value) || 60 })}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Deposit ($)</Label>
                                <Input
                                  type="number"
                                  value={service.deposit_amount}
                                  onChange={(e) => updateService(idx, { deposit_amount: parseInt(e.target.value) || 0 })}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* Policies Summary */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Policies
                  </Label>
                  <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Cancellation Notice</div>
                      <div className="font-medium">{config.policies.cancellation_window_hours} hours</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Reschedule Notice</div>
                      <div className="font-medium">{config.policies.reschedule_window_hours} hours</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Late Threshold</div>
                      <div className="font-medium">{config.policies.late_threshold_minutes} minutes</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">No-Show Rule</div>
                      <div className="font-medium capitalize">{config.policies.no_show_rule}</div>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                {config.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      AI Suggestions
                    </Label>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {config.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20">
          <div className="flex justify-between">
            {step === "describe" ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={generateConfiguration}
                  disabled={!description.trim()}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            ) : step === "review" && config ? (
              <>
                <Button variant="outline" onClick={() => setStep("describe")}>
                  Start Over
                </Button>
                <Button 
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save & Finish
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartSetupWizard;
