import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Calendar, Clock, Palette, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OnboardingLayout from "./OnboardingLayout";

interface SoloArtistWizardProps {
  userId: string;
  workspaceId: string;
  initialStep?: string;
  onComplete: () => void;
}

type Step = "basics" | "calendar" | "style" | "policies" | "voice";

const STEPS: Step[] = ["basics", "calendar", "style", "policies", "voice"];

const STEP_CONFIG: Record<Step, { title: string; subtitle: string }> = {
  basics: { title: "Studio Basics", subtitle: "Let's set up your identity" },
  calendar: { title: "Connect Calendar", subtitle: "Sync your availability" },
  style: { title: "Work Style", subtitle: "How do you prefer to work?" },
  policies: { title: "Deposits & Policies", subtitle: "Set your booking rules" },
  voice: { title: "Assistant Voice", subtitle: "Customize ETHEREAL's personality" },
};

const SoloArtistWizard = ({ userId, workspaceId, initialStep, onComplete }: SoloArtistWizardProps) => {
  const [currentStep, setCurrentStep] = useState<Step>(
    (initialStep as Step) || "basics"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    displayName: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    bookingSlug: "",
    // Calendar
    calendarConnected: false,
    // Style
    sessionTypes: ["4h"] as string[],
    weeklyRhythm: "balanced",
    // Policies
    policyTemplate: "luxury",
    noticeWindow: 48,
    noticeRefundable: true, // true = refundable, false = non-refundable
    depositType: "percent", // "percent" or "fixed"
    depositPercent: 30,
    depositFixed: 100,
    lateThreshold: 15,
    // Voice
    voicePreset: "luxury",
    conciseness: 50,
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
      // Complete wizard
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
      // Update workspace settings with collected data
      await supabase
        .from("workspace_settings")
        .update({
          name: formData.displayName || "My Studio",
          onboarding_completed: true,
          setup_step: "complete",
          settings: {
            timezone: formData.timezone,
            booking_slug: formData.bookingSlug,
            session_types: formData.sessionTypes,
            weekly_rhythm: formData.weeklyRhythm,
            policy_template: formData.policyTemplate,
            notice_window_hours: formData.noticeWindow,
            notice_refundable: formData.noticeRefundable,
            deposit_type: formData.depositType,
            deposit_percent: formData.depositPercent,
            deposit_fixed: formData.depositFixed,
            late_threshold_minutes: formData.lateThreshold,
            voice_preset: formData.voicePreset,
            conciseness: formData.conciseness,
          },
        })
        .eq("id", workspaceId);

      // Mark onboarding as complete
      await supabase
        .from("onboarding_progress")
        .update({
          completed_at: new Date().toISOString(),
          steps_completed: STEPS,
        })
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);

      toast.success("Your workspace is ready!");
      onComplete();
    } catch (error) {
      console.error("Error completing wizard:", error);
      toast.error("Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentStep === "calendar") {
      handleNext();
    }
  };

  return (
    <OnboardingLayout
      currentStep={stepIndex + 1}
      totalSteps={STEPS.length}
      title={STEP_CONFIG[currentStep].title}
      subtitle={STEP_CONFIG[currentStep].subtitle}
    >
      <AnimatePresence mode="wait">
        {/* Step 1: Basics */}
        {currentStep === "basics" && (
          <motion.div
            key="basics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => updateFormData({ displayName: e.target.value })}
                  placeholder="e.g., Ferunda Ink"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => updateFormData({ timezone: e.target.value })}
                  className="mt-1.5"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-detected from your browser
                </p>
              </div>

              <div>
                <Label htmlFor="bookingSlug">Booking Link</Label>
                <div className="flex items-center mt-1.5">
                  <span className="text-sm text-muted-foreground mr-2">
                    ferunda.com/
                  </span>
                  <Input
                    id="bookingSlug"
                    value={formData.bookingSlug}
                    onChange={(e) => updateFormData({ bookingSlug: e.target.value.toLowerCase().replace(/\s/g, "-") })}
                    placeholder="your-name"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Calendar */}
        {currentStep === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="p-8 rounded-xl border border-border bg-card text-center">
              <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">
                Connect Google Calendar
              </h3>
              <p className="text-muted-foreground mb-6">
                Sync your availability and avoid double-bookings
              </p>
              <Button size="lg" className="w-full max-w-xs">
                Connect Calendar
              </Button>
            </div>

            <button
              onClick={handleSkip}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        )}

        {/* Step 3: Work Style */}
        {currentStep === "style" && (
          <motion.div
            key="style"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <Label className="mb-3 block">Session Types You Offer</Label>
              <div className="grid grid-cols-4 gap-2">
                {["3h", "4h", "6h", "8h"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const types = formData.sessionTypes.includes(type)
                        ? formData.sessionTypes.filter((t) => t !== type)
                        : [...formData.sessionTypes, type];
                      updateFormData({ sessionTypes: types });
                    }}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      formData.sessionTypes.includes(type)
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Weekly Rhythm</Label>
              <div className="grid gap-2">
                {[
                  { id: "calm", label: "Calm Week", desc: "1 long session per day" },
                  { id: "balanced", label: "Balanced", desc: "2-3 sessions per day" },
                  { id: "high", label: "High Output", desc: "Maximum bookings" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ weeklyRhythm: option.id })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.weeklyRhythm === option.id
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

        {/* Step 4: Policies */}
        {currentStep === "policies" && (
          <motion.div
            key="policies"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <Label className="mb-3 block">Policy Template</Label>
              <div className="grid gap-2">
                {[
                  { id: "luxury", label: "Luxury Standard", desc: "Recommended for high-end studios" },
                  { id: "flexible", label: "Flexible", desc: "More lenient on cancellations" },
                  { id: "strict", label: "Strict", desc: "Maximum protection" },
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
                <Label>Notice Window</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="number"
                    value={formData.noticeWindow}
                    onChange={(e) => updateFormData({ noticeWindow: parseInt(e.target.value) || 48 })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>

              <div>
                <Label>Notice Policy</Label>
                <div className="flex gap-2 mt-1.5">
                  {[
                    { id: true, label: "Refundable" },
                    { id: false, label: "Non-refundable" },
                  ].map((option) => (
                    <button
                      key={String(option.id)}
                      onClick={() => updateFormData({ noticeRefundable: option.id })}
                      className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                        formData.noticeRefundable === option.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Deposit Type</Label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { id: "percent", label: "Percentage" },
                  { id: "fixed", label: "Fixed Amount" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ depositType: option.id })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      formData.depositType === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {formData.depositType === "percent" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.depositPercent}
                    onChange={(e) => updateFormData({ depositPercent: parseInt(e.target.value) || 30 })}
                    className="w-24"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">% of total</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={formData.depositFixed}
                    onChange={(e) => updateFormData({ depositFixed: parseInt(e.target.value) || 100 })}
                    className="w-24"
                    min={0}
                  />
                  <span className="text-sm text-muted-foreground">flat fee</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 5: Voice */}
        {currentStep === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <Label className="mb-3 block">ETHEREAL Voice Preset</Label>
              <div className="grid gap-2">
                {[
                  { id: "luxury", label: "Luxury", desc: "Elegant and refined" },
                  { id: "warm", label: "Warm", desc: "Friendly and approachable" },
                  { id: "direct", label: "Direct", desc: "Straight to the point" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData({ voicePreset: option.id })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      formData.voicePreset === option.id
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

            <div>
              <Label className="mb-3 block">Response Length</Label>
              <div className="px-2">
                <Slider
                  value={[formData.conciseness]}
                  onValueChange={([value]) => updateFormData({ conciseness: value })}
                  max={100}
                  step={10}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>More concise</span>
                  <span>More detailed</span>
                </div>
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

export default SoloArtistWizard;
