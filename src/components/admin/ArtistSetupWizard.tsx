import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Package, 
  Shield, 
  Clock, 
  DollarSign,
  Plus,
  Trash2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ArtistSetupWizardProps {
  artistId: string;
  workspaceId: string;
  artistName: string;
  onComplete: () => void;
  onClose: () => void;
}

type Step = "services" | "pricing" | "policies" | "review";

const STEPS: Step[] = ["services", "pricing", "policies", "review"];

const STEP_CONFIG: Record<Step, { title: string; subtitle: string; icon: React.ElementType }> = {
  services: { title: "Services", subtitle: "What sessions do you offer?", icon: Package },
  pricing: { title: "Pricing", subtitle: "Set your rates and deposits", icon: DollarSign },
  policies: { title: "Policies", subtitle: "Cancellation and booking rules", icon: Shield },
  review: { title: "Review", subtitle: "Confirm your setup", icon: Check },
};

interface ServiceItem {
  id?: string;
  service_key: string;
  name: string;
  description: string;
  duration_minutes: number;
  deposit_amount: number;
  hourly_rate: number;
  is_active: boolean;
}

interface PolicyData {
  deposit_type: "percent" | "fixed";
  deposit_percent: number;
  deposit_fixed: number;
  cancellation_window_hours: number;
  reschedule_window_hours: number;
  late_threshold_minutes: number;
  no_show_rule: string;
  cancellation_rule: string;
  deposit_refund_option: "non_refundable" | "refundable_with_notice" | "transferable";
}

const DEFAULT_SERVICES: ServiceItem[] = [
  { service_key: "consultation", name: "Consultation", description: "Discuss your tattoo idea", duration_minutes: 30, deposit_amount: 0, hourly_rate: 0, is_active: true },
  { service_key: "session_3h", name: "3-Hour Session", description: "Small to medium pieces", duration_minutes: 180, deposit_amount: 100, hourly_rate: 200, is_active: true },
  { service_key: "session_4h", name: "4-Hour Session", description: "Medium pieces", duration_minutes: 240, deposit_amount: 150, hourly_rate: 200, is_active: true },
  { service_key: "session_6h", name: "6-Hour Session", description: "Larger pieces", duration_minutes: 360, deposit_amount: 250, hourly_rate: 200, is_active: true },
  { service_key: "session_8h", name: "Full Day Session", description: "Large scale work", duration_minutes: 480, deposit_amount: 350, hourly_rate: 200, is_active: false },
];

const ArtistSetupWizard = ({ artistId, workspaceId, artistName, onComplete, onClose }: ArtistSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("services");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Services state
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  
  // Policy state
  const [policy, setPolicy] = useState<PolicyData>({
    deposit_type: "fixed",
    deposit_percent: 30,
    deposit_fixed: 150,
    cancellation_window_hours: 72,
    reschedule_window_hours: 72,
    late_threshold_minutes: 30,
    no_show_rule: "deposit forfeited",
    cancellation_rule: "deposit forfeited",
    deposit_refund_option: "non_refundable",
  });

  const stepIndex = STEPS.indexOf(currentStep);

  useEffect(() => {
    loadExistingData();
  }, [artistId]);

  const loadExistingData = async () => {
    try {
      // Load existing services
      const { data: existingServices } = await supabase
        .from("artist_services" as any)
        .select("*")
        .eq("artist_id", artistId);

      if (existingServices && existingServices.length > 0) {
        setServices(existingServices as unknown as ServiceItem[]);
      }

      // Load existing policy
      const { data: existingPolicy } = await supabase
        .from("studio_policies" as any)
        .select("*")
        .eq("artist_id", artistId)
        .eq("is_active", true)
        .single();

      if (existingPolicy) {
        const settings = (existingPolicy as any).settings || {};
        setPolicy({
          deposit_type: settings.deposit_type || "fixed",
          deposit_percent: settings.deposit_percent || 30,
          deposit_fixed: settings.deposit_fixed || 150,
          cancellation_window_hours: settings.cancellation_window_hours || 72,
          reschedule_window_hours: settings.reschedule_window_hours || 72,
          late_threshold_minutes: settings.late_threshold_minutes || 30,
          no_show_rule: settings.no_show_rule || "deposit forfeited",
          cancellation_rule: settings.cancellation_rule || "deposit forfeited",
          deposit_refund_option: settings.deposit_refund_option || "non_refundable",
        });
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateService = (index: number, updates: Partial<ServiceItem>) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const toggleService = (index: number) => {
    updateService(index, { is_active: !services[index].is_active });
  };

  const addCustomService = () => {
    setServices(prev => [...prev, {
      service_key: `custom_${Date.now()}`,
      name: "New Service",
      description: "",
      duration_minutes: 120,
      deposit_amount: 100,
      hourly_rate: 200,
      is_active: true,
    }]);
  };

  const removeService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1]);
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
      // Delete existing services for this artist
      await supabase
        .from("artist_services" as any)
        .delete()
        .eq("artist_id", artistId);

      // Insert new services
      const servicesData = services.map((s, idx) => ({
        artist_id: artistId,
        workspace_id: workspaceId,
        service_key: s.service_key,
        name: s.name,
        description: s.description,
        duration_minutes: s.duration_minutes,
        deposit_amount: s.deposit_amount,
        hourly_rate: s.hourly_rate,
        is_active: s.is_active,
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
          settings: policy,
          summary_text: generatePolicySummary(),
        });

      if (policyError) throw policyError;

      toast.success("Setup complete!");
      onComplete();
    } catch (err) {
      console.error("Error saving:", err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePolicySummary = () => {
    const depositText = policy.deposit_type === "percent" 
      ? `${policy.deposit_percent}% of session cost`
      : `$${policy.deposit_fixed}`;
    
    return `Deposit: ${depositText}. Cancellations require ${policy.cancellation_window_hours}h notice. Late arrivals over ${policy.late_threshold_minutes} minutes may require rescheduling.`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const StepIcon = STEP_CONFIG[currentStep].icon;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl text-foreground">
                  {STEP_CONFIG[currentStep].title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {STEP_CONFIG[currentStep].subtitle}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            {STEPS.map((step, idx) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx <= stepIndex ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Step {stepIndex + 1} of {STEPS.length} · {artistName}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Services */}
            {currentStep === "services" && (
              <motion.div
                key="services"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-muted-foreground text-sm">
                  Toggle the services you offer. You can customize duration and pricing in the next step.
                </p>

                <div className="space-y-3">
                  {services.map((service, idx) => (
                    <div
                      key={service.service_key}
                      className={`p-4 rounded-lg border transition-all ${
                        service.is_active 
                          ? "border-primary bg-primary/5" 
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
                            <Input
                              value={service.name}
                              onChange={(e) => updateService(idx, { name: e.target.value })}
                              className="font-medium bg-transparent border-none p-0 h-auto text-foreground"
                            />
                            <p className="text-sm text-muted-foreground">
                              {formatDuration(service.duration_minutes)}
                            </p>
                          </div>
                        </div>
                        {service.service_key.startsWith("custom_") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeService(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={addCustomService} className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add Custom Service
                </Button>
              </motion.div>
            )}

            {/* Step 2: Pricing */}
            {currentStep === "pricing" && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-muted-foreground text-sm">
                  Set your hourly rate and deposits for each service.
                </p>

                <div className="space-y-4">
                  {services.filter(s => s.is_active).map((service, idx) => {
                    const actualIndex = services.findIndex(s => s.service_key === service.service_key);
                    return (
                      <div key={service.service_key} className="p-4 rounded-lg border border-border">
                        <h4 className="font-medium mb-3">{service.name}</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Duration</Label>
                            <Select
                              value={String(service.duration_minutes)}
                              onValueChange={(v) => updateService(actualIndex, { duration_minutes: parseInt(v) })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                                <SelectItem value="180">3 hours</SelectItem>
                                <SelectItem value="240">4 hours</SelectItem>
                                <SelectItem value="300">5 hours</SelectItem>
                                <SelectItem value="360">6 hours</SelectItem>
                                <SelectItem value="420">7 hours</SelectItem>
                                <SelectItem value="480">8 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Hourly Rate ($)</Label>
                            <Input
                              type="number"
                              value={service.hourly_rate}
                              onChange={(e) => updateService(actualIndex, { hourly_rate: parseInt(e.target.value) || 0 })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Deposit ($)</Label>
                            <Input
                              type="number"
                              value={service.deposit_amount}
                              onChange={(e) => updateService(actualIndex, { deposit_amount: parseInt(e.target.value) || 0 })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Policies */}
            {currentStep === "policies" && (
              <motion.div
                key="policies"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Cancellation Notice Required</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={policy.cancellation_window_hours}
                        onChange={(e) => setPolicy(p => ({ ...p, cancellation_window_hours: parseInt(e.target.value) || 72 }))}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">hours before appointment</span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Late Arrival Threshold</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={policy.late_threshold_minutes}
                        onChange={(e) => setPolicy(p => ({ ...p, late_threshold_minutes: parseInt(e.target.value) || 30 }))}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">minutes late = session may need rescheduling</span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Deposit Refund Policy</Label>
                    <Select
                      value={policy.deposit_refund_option}
                      onValueChange={(v) => setPolicy(p => ({ ...p, deposit_refund_option: v as PolicyData["deposit_refund_option"] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="non_refundable">Non-refundable (protects your time)</SelectItem>
                        <SelectItem value="refundable_with_notice">Refundable with proper notice</SelectItem>
                        <SelectItem value="transferable">Transferable to new date only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block">No-Show Consequence</Label>
                    <Select
                      value={policy.no_show_rule}
                      onValueChange={(v) => setPolicy(p => ({ ...p, no_show_rule: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit forfeited">Deposit forfeited</SelectItem>
                        <SelectItem value="deposit forfeited + future deposit required">Deposit forfeited + increased deposit for rebooking</SelectItem>
                        <SelectItem value="blacklisted">Cannot rebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <p className="text-sm">Review your setup before saving. You can always edit later.</p>
                </div>

                {/* Services Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Services ({services.filter(s => s.is_active).length} active)
                  </h4>
                  <div className="grid gap-2">
                    {services.filter(s => s.is_active).map(service => (
                      <div key={service.service_key} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground">
                          {formatDuration(service.duration_minutes)} · ${service.hourly_rate}/hr · ${service.deposit_amount} deposit
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Policies Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Policies
                  </h4>
                  <div className="text-sm p-3 bg-muted/50 rounded space-y-1">
                    <p>• Cancellation notice: {policy.cancellation_window_hours} hours</p>
                    <p>• Late threshold: {policy.late_threshold_minutes} minutes</p>
                    <p>• Deposit: {policy.deposit_refund_option.replace(/_/g, " ")}</p>
                    <p>• No-show: {policy.no_show_rule}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {stepIndex < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Complete Setup
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ArtistSetupWizard;
