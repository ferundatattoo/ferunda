import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickSetupWizardProps {
  userId: string;
  workspaceId: string;
  workspaceType: "solo" | "studio";
  onComplete: () => void;
}

type Step = "identity" | "preferences" | "ready";

const POLICY_PRESETS = {
  luxury: {
    label: "Premium Experience",
    deposit: 30,
    notice: 48,
    description: "High-end studio experience with standard protection",
  },
  flexible: {
    label: "Client-Friendly",
    deposit: 20,
    notice: 24,
    description: "More lenient policies, easier cancellations",
  },
  strict: {
    label: "Maximum Protection",
    deposit: 50,
    notice: 72,
    description: "Strict policies to prevent no-shows",
  },
};

const QuickSetupWizard = ({ userId, workspaceId, workspaceType, onComplete }: QuickSetupWizardProps) => {
  const [step, setStep] = useState<Step>("identity");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: "",
    policyPreset: "luxury" as keyof typeof POLICY_PRESETS,
    // AI-suggested values (populated on generate)
    suggestedStyles: [] as string[],
    suggestedHourlyRate: 0,
  });

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const generateSuggestions = async () => {
    if (!formData.displayName) return;
    
    setIsGenerating(true);
    try {
      // Try to get AI suggestions based on name
      const { data } = await supabase.functions.invoke("ai-artist-setup", {
        body: {
          description: `${formData.displayName} - ${workspaceType === "solo" ? "independent tattoo artist" : "tattoo studio"}`,
          experienceLevel: "intermediate",
          location: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (data?.config) {
        updateFormData({
          suggestedStyles: data.config.styles || ["Custom", "Fine Line"],
          suggestedHourlyRate: data.config.priceRange?.hourly || 150,
        });
      } else {
        // Default suggestions
        updateFormData({
          suggestedStyles: ["Custom", "Fine Line", "Blackwork"],
          suggestedHourlyRate: 150,
        });
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Use defaults
      updateFormData({
        suggestedStyles: ["Custom", "Fine Line", "Blackwork"],
        suggestedHourlyRate: 150,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = async () => {
    if (step === "identity") {
      await generateSuggestions();
      setStep("preferences");
    } else if (step === "preferences") {
      setStep("ready");
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const preset = POLICY_PRESETS[formData.policyPreset];
      
      // Update workspace settings
      await supabase
        .from("workspace_settings")
        .update({
          name: formData.displayName || "My Studio",
          onboarding_completed: true,
          setup_step: "complete",
          settings: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            policy_template: formData.policyPreset,
            deposit_percent: preset.deposit,
            notice_window_hours: preset.notice,
            suggested_styles: formData.suggestedStyles,
            hourly_rate: formData.suggestedHourlyRate,
            voice_preset: "luxury",
            conciseness: 50,
          },
        })
        .eq("id", workspaceId);

      // Mark onboarding complete
      await supabase
        .from("onboarding_progress")
        .update({
          completed_at: new Date().toISOString(),
          steps_completed: ["identity", "preferences", "ready"],
        })
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);

      toast.success("You're all set! Welcome to Ferunda.");
      onComplete();
    } catch (error) {
      console.error("Error completing setup:", error);
      toast.error("Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Progress indicator */}
        <div className="flex gap-2 mb-8 justify-center">
          {["identity", "preferences", "ready"].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 w-16 rounded-full transition-colors ${
                i <= ["identity", "preferences", "ready"].indexOf(step)
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Identity */}
          {step === "identity" && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="font-display text-3xl text-foreground mb-2">
                  Let's get you set up
                </h1>
                <p className="text-muted-foreground">
                  This only takes a minute
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="displayName">
                    {workspaceType === "solo" ? "Your Artist Name" : "Studio Name"}
                  </Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => updateFormData({ displayName: e.target.value })}
                    placeholder={workspaceType === "solo" ? "e.g., Ferunda" : "e.g., Ferunda Studio"}
                    className="mt-1.5 text-lg h-12"
                    autoFocus
                  />
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={!formData.displayName}
                size="lg"
                className="w-full gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Preferences */}
          {step === "preferences" && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="font-display text-3xl text-foreground mb-2">
                  Choose your style
                </h1>
                <p className="text-muted-foreground">
                  Pick how you want to handle bookings
                </p>
              </div>

              {isGenerating ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {(Object.entries(POLICY_PRESETS) as [keyof typeof POLICY_PRESETS, typeof POLICY_PRESETS.luxury][]).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => updateFormData({ policyPreset: key })}
                      className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                        formData.policyPreset === key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-display text-lg text-foreground">
                          {preset.label}
                        </h3>
                        {formData.policyPreset === key && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {preset.description}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{preset.deposit}% deposit</span>
                        <span>{preset.notice}h notice</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleNext}
                disabled={isGenerating}
                size="lg"
                className="w-full gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 3: Ready */}
          {step === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h1 className="font-display text-3xl text-foreground mb-2">
                  You're ready to go!
                </h1>
                <p className="text-muted-foreground">
                  Luna (your AI assistant) will handle bookings with these settings
                </p>
              </div>

              <div className="p-6 rounded-xl border border-border bg-card space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground font-medium">{formData.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Policy</span>
                  <span className="text-foreground font-medium">
                    {POLICY_PRESETS[formData.policyPreset].label}
                  </span>
                </div>
                {formData.suggestedStyles.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Styles</span>
                    <span className="text-foreground font-medium">
                      {formData.suggestedStyles.slice(0, 2).join(", ")}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                You can customize everything later in Settings
              </p>

              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                size="lg"
                className="w-full gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Launch Dashboard
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default QuickSetupWizard;
