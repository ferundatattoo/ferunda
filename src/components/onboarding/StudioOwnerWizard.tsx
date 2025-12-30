import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Users, Shield, Bot, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OnboardingLayout from "./OnboardingLayout";

interface StudioOwnerWizardProps {
  userId: string;
  workspaceId: string;
  initialStep?: string;
  onComplete: () => void;
}

type Step = "structure" | "artists" | "rules" | "permissions" | "ai";

const STEPS: Step[] = ["structure", "artists", "rules", "permissions", "ai"];

const STEP_CONFIG: Record<Step, { title: string; subtitle: string }> = {
  structure: { title: "Studio Structure", subtitle: "How is your studio organized?" },
  artists: { title: "Add Artists", subtitle: "Invite your team members" },
  rules: { title: "Studio Rules", subtitle: "Set studio-wide policies" },
  permissions: { title: "Permissions", subtitle: "Define role access" },
  ai: { title: "AI Behavior", subtitle: "Configure your concierge" },
};

const StudioOwnerWizard = ({ userId, workspaceId, initialStep, onComplete }: StudioOwnerWizardProps) => {
  const [currentStep, setCurrentStep] = useState<Step>(
    (initialStep as Step) || "structure"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // Structure
    studioStructure: "shared",
    studioName: "",
    // Artists
    artistEmails: [""],
    // Rules
    policyTemplate: "luxury",
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    depositEnforcement: "studio",
    // Permissions
    artistCanApprove: false,
    artistCanSetPrices: true,
    staffCanMessage: true,
    // AI
    conciergeMode: "central",
  });

  const stepIndex = STEPS.indexOf(currentStep);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const saveProgress = async () => {
    try {
      await supabase
        .from("onboarding_progress")
        .update({
          current_step: currentStep,
          steps_completed: STEPS.slice(0, stepIndex),
          form_data: formData,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNext = async () => {
    await saveProgress();

    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1]);
    } else {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1]);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await supabase
        .from("workspace_settings")
        .update({
          name: formData.studioName || "My Studio",
          onboarding_completed: true,
          setup_step: "complete",
          settings: {
            studio_structure: formData.studioStructure,
            policy_template: formData.policyTemplate,
            quiet_hours: {
              start: formData.quietHoursStart,
              end: formData.quietHoursEnd,
            },
            deposit_enforcement: formData.depositEnforcement,
            permissions: {
              artist_can_approve: formData.artistCanApprove,
              artist_can_set_prices: formData.artistCanSetPrices,
              staff_can_message: formData.staffCanMessage,
            },
            concierge_mode: formData.conciergeMode,
          },
        })
        .eq("id", workspaceId);

      await supabase
        .from("onboarding_progress")
        .update({
          completed_at: new Date().toISOString(),
          steps_completed: STEPS,
        })
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);

      toast.success("Your studio is ready!");
      onComplete();
    } catch (error) {
      console.error("Error completing wizard:", error);
      toast.error("Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArtistEmail = () => {
    updateFormData({ artistEmails: [...formData.artistEmails, ""] });
  };

  const updateArtistEmail = (index: number, value: string) => {
    const emails = [...formData.artistEmails];
    emails[index] = value;
    updateFormData({ artistEmails: emails });
  };

  return (
    <OnboardingLayout
      currentStep={stepIndex + 1}
      totalSteps={STEPS.length}
      title={STEP_CONFIG[currentStep].title}
      subtitle={STEP_CONFIG[currentStep].subtitle}
    >
      <AnimatePresence mode="wait">
        {/* Step 1: Structure */}
        {currentStep === "structure" && (
          <motion.div
            key="structure"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <Label htmlFor="studioName">Studio Name</Label>
              <Input
                id="studioName"
                value={formData.studioName}
                onChange={(e) => updateFormData({ studioName: e.target.value })}
                placeholder="e.g., Ferunda Studio"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="mb-3 block">How is your studio organized?</Label>
              <div className="grid gap-2">
                {[
                  { id: "shared", label: "Shared Front Desk", desc: "Central intake handles all inquiries" },
                  { id: "independent", label: "Independent Artists", desc: "Each artist manages their own clients" },
                  { id: "mixed", label: "Mixed", desc: "Some shared, some independent" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ studioStructure: option.id })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.studioStructure === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Artists */}
        {currentStep === "artists" && (
          <motion.div
            key="artists"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-xl border border-border bg-card">
              <Users className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-display text-lg text-foreground mb-2">
                Invite Artists
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add email addresses of artists to invite them
              </p>

              <div className="space-y-3">
                {formData.artistEmails.map((email, index) => (
                  <Input
                    key={index}
                    type="email"
                    value={email}
                    onChange={(e) => updateArtistEmail(index, e.target.value)}
                    placeholder="artist@email.com"
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addArtistEmail}
                  className="w-full"
                >
                  + Add another
                </Button>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip — I'll add artists later
            </button>
          </motion.div>
        )}

        {/* Step 3: Rules */}
        {currentStep === "rules" && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <Label className="mb-3 block">Studio Policy Template</Label>
              <div className="grid gap-2">
                {[
                  { id: "luxury", label: "Luxury Standard", desc: "High-end experience" },
                  { id: "flexible", label: "Flexible Studio", desc: "More lenient" },
                  { id: "strict", label: "Strict Studio", desc: "Maximum protection" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ policyTemplate: option.id })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.policyTemplate === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quiet Hours Start</Label>
                <Input
                  type="time"
                  value={formData.quietHoursStart}
                  onChange={(e) => updateFormData({ quietHoursStart: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Quiet Hours End</Label>
                <Input
                  type="time"
                  value={formData.quietHoursEnd}
                  onChange={(e) => updateFormData({ quietHoursEnd: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Deposit Enforcement</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "studio", label: "Studio-wide" },
                  { id: "artist", label: "Per Artist" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ depositEnforcement: option.id })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      formData.depositEnforcement === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Permissions */}
        {currentStep === "permissions" && (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="p-6 rounded-xl border border-border bg-card">
              <Shield className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-display text-lg text-foreground mb-4">
                Artist Permissions
              </h3>

              <div className="space-y-4">
                {[
                  { key: "artistCanApprove", label: "Artists can approve their own bookings" },
                  { key: "artistCanSetPrices", label: "Artists can set their own prices" },
                ].map((perm) => (
                  <label key={perm.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData[perm.key as keyof typeof formData] as boolean}
                      onChange={(e) => updateFormData({ [perm.key]: e.target.checked })}
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-foreground">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <Mail className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-display text-lg text-foreground mb-4">
                Staff Permissions
              </h3>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.staffCanMessage}
                  onChange={(e) => updateFormData({ staffCanMessage: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Staff can send messages to clients</span>
              </label>
            </div>
          </motion.div>
        )}

        {/* Step 5: AI Behavior */}
        {currentStep === "ai" && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-xl border border-border bg-card">
              <Bot className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-display text-lg text-foreground mb-4">
                How should Luna (AI) respond?
              </h3>

              <div className="space-y-3">
                {[
                  { id: "central", label: "Central Concierge", desc: "Front desk handles all inquiries, then routes to artists" },
                  { id: "artist-led", label: "Artist-Led", desc: "Each artist's voice and style in conversations" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ conciergeMode: option.id })}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      formData.conciergeMode === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={isSubmitting}
          className="gap-2"
        >
          {stepIndex === STEPS.length - 1 ? (
            <>
              Complete
              <Check className="w-4 h-4" />
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Finishing setup...</p>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
};

export default StudioOwnerWizard;
