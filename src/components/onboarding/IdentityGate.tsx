import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, ArrowRight, ChevronLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type WorkspaceType = "solo" | "studio";
type UserRole = "studio" | "artist" | "assistant";

interface IdentityGateProps {
  userId: string;
  onComplete: (workspaceType: WorkspaceType, role: UserRole) => void;
}

const IdentityGate = ({ userId, onComplete }: IdentityGateProps) => {
  const [step, setStep] = useState<"type" | "role" | "help">("type");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeSelect = (type: WorkspaceType) => {
    setWorkspaceType(type);
    if (type === "solo") {
      // Solo artists get studio-level access
      handleComplete(type, "studio");
    } else {
      setStep("role");
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    if (!workspaceType) return;
    await handleComplete(workspaceType, role);
  };

  const handleComplete = async (type: WorkspaceType, role: UserRole) => {
    setIsSubmitting(true);
    try {
      // Create workspace settings
      const { data: workspace, error: wsError } = await supabase
        .from("workspace_settings")
        .insert({
          workspace_type: type,
          owner_user_id: role === "studio" ? userId : null,
          onboarding_completed: false,
          setup_step: type === "solo" ? "solo_setup" : "studio_setup",
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // Create workspace membership
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: userId,
          role: role,
          accepted_at: new Date().toISOString(),
          is_active: true,
        });

      if (memberError) throw memberError;

      // Create onboarding progress
      const wizardType = type === "solo" ? "solo_setup" : 
                         role === "artist" ? "artist_join" :
                         role === "assistant" ? "staff_join" : "studio_setup";
      
      const { error: onboardingError } = await supabase
        .from("onboarding_progress")
        .insert({
          user_id: userId,
          workspace_id: workspace.id,
          wizard_type: wizardType,
          current_step: "basics",
        });

      if (onboardingError) throw onboardingError;

      onComplete(type, role);
    } catch (error: any) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to set up workspace. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpAnswer = (booksSelf: boolean, approvesOthers: boolean) => {
    if (booksSelf && !approvesOthers) {
      // Solo artist
      handleTypeSelect("solo");
    } else if (approvesOthers) {
      // Studio manager/owner
      setWorkspaceType("studio");
      setStep("role");
    } else {
      // Artist or staff in a studio
      setWorkspaceType("studio");
      setStep("role");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <AnimatePresence mode="wait">
          {step === "type" && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="font-display text-3xl md:text-4xl text-foreground mb-3">
                  Welcome to Ferunda
                </h1>
                <p className="text-muted-foreground text-lg">
                  How will you use Ferunda?
                </p>
              </div>

              <div className="grid gap-4">
                <button
                  onClick={() => handleTypeSelect("solo")}
                  disabled={isSubmitting}
                  className="group relative p-6 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl text-foreground mb-1">
                        Solo Artist
                      </h3>
                      <p className="text-muted-foreground">
                        I book and run my own clients
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect("studio")}
                  disabled={isSubmitting}
                  className="group relative p-6 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl text-foreground mb-1">
                        Studio
                      </h3>
                      <p className="text-muted-foreground">
                        We have multiple artists or staff
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep("help")}
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  I'm not sure
                </button>
              </div>
            </motion.div>
          )}

          {step === "role" && (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <button
                  onClick={() => setStep("type")}
                  className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <h1 className="font-display text-3xl md:text-4xl text-foreground mb-3">
                  What is your role?
                </h1>
                <p className="text-muted-foreground text-lg">
                  This helps us customize your experience
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { id: "studio" as UserRole, label: "Studio Owner / Manager", desc: "Full control of studio settings and team" },
                  { id: "artist" as UserRole, label: "Artist", desc: "Manage your own schedule and clients" },
                  { id: "assistant" as UserRole, label: "Front Desk / Assistant", desc: "Handle intake and scheduling" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleRoleSelect(option.id)}
                    disabled={isSubmitting}
                    className="group p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all text-left"
                  >
                    <h3 className="font-display text-lg text-foreground mb-0.5">
                      {option.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {option.desc}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "help" && (
            <motion.div
              key="help"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <button
                  onClick={() => setStep("type")}
                  className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <h1 className="font-display text-3xl md:text-4xl text-foreground mb-3">
                  Let's figure it out
                </h1>
                <p className="text-muted-foreground text-lg">
                  Answer two quick questions
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-border bg-card">
                  <p className="text-foreground mb-4">
                    Do you book only for yourself?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleHelpAnswer(true, false)}
                      className="flex-1"
                    >
                      Yes, just me
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {}}
                      className="flex-1"
                    >
                      No, for others too
                    </Button>
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-border bg-card">
                  <p className="text-foreground mb-4">
                    Do you approve bookings for others?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleHelpAnswer(false, true)}
                      className="flex-1"
                    >
                      Yes, I manage others
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleHelpAnswer(false, false)}
                      className="flex-1"
                    >
                      No, someone manages me
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isSubmitting && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Setting up your workspace...</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default IdentityGate;
