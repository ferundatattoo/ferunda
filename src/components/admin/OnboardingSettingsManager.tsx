import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  PlayCircle, 
  RotateCcw, 
  CheckCircle2, 
  User, 
  Building2, 
  Calendar, 
  Palette, 
  FileText,
  Bot,
  Users,
  Shield,
  Loader2
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SoloArtistWizard from "@/components/onboarding/SoloArtistWizard";
import StudioOwnerWizard from "@/components/onboarding/StudioOwnerWizard";

const OnboardingSettingsManager = () => {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);
  const [showWizard, setShowWizard] = useState<"solo" | "studio" | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const soloSteps = [
    { id: "basics", label: "Studio Basics", icon: User },
    { id: "calendar", label: "Connect Calendar", icon: Calendar },
    { id: "style", label: "Work Style", icon: Palette },
    { id: "policies", label: "Deposits & Policies", icon: FileText },
    { id: "voice", label: "Assistant Voice", icon: Bot },
  ];

  const studioSteps = [
    { id: "structure", label: "Studio Structure", icon: Building2 },
    { id: "artists", label: "Add Artists", icon: Users },
    { id: "rules", label: "Studio Rules", icon: FileText },
    { id: "permissions", label: "Permissions", icon: Shield },
    { id: "ai", label: "AI Behavior", icon: Bot },
  ];

  const handleRerunWizard = async (type: "solo" | "studio") => {
    setShowWizard(type);
  };

  const handleResetOnboarding = async () => {
    if (!user?.id || !workspace.workspaceId) return;
    
    setIsResetting(true);
    try {
      // Reset onboarding progress
      const { error } = await supabase
        .from("onboarding_progress")
        .upsert({
          user_id: user.id,
          workspace_id: workspace.workspaceId,
          wizard_type: workspace.workspaceType === "studio" ? "studio_owner" : "solo_artist",
          current_step: workspace.workspaceType === "studio" ? "structure" : "basics",
          steps_completed: [],
          completed_at: null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Onboarding reset. Starting wizard...");
      setShowWizard(workspace.workspaceType === "studio" ? "studio" : "solo");
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      toast.error("Error al resetear el onboarding");
    } finally {
      setIsResetting(false);
    }
  };

  const handleWizardComplete = () => {
    setShowWizard(null);
    toast.success("¡Configuración actualizada!");
    workspace.refetch();
  };

  const currentSteps = workspace.workspaceType === "studio" ? studioSteps : soloSteps;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display text-foreground">Onboarding & Setup</h2>
        <p className="text-muted-foreground mt-1">
          Re-ejecuta el wizard de configuración o ajusta parámetros individuales
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Onboarding Completado
              </CardTitle>
              <CardDescription>
                Tu workspace está configurado como{" "}
                <Badge variant="secondary">
                  {workspace.workspaceType === "studio" ? "Studio" : "Artista Solo"}
                </Badge>
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleResetOnboarding}
              disabled={isResetting}
              className="gap-2"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Reset & Re-run
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Steps Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Pasos del Wizard</CardTitle>
          <CardDescription>
            Haz clic en cualquier paso para editar esa sección específica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {currentSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => handleRerunWizard(workspace.workspaceType === "studio" ? "studio" : "solo")}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{step.label}</p>
                    <p className="text-xs text-muted-foreground">Paso {index + 1}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleRerunWizard("solo")}
          >
            <PlayCircle className="w-4 h-4" />
            Wizard Artista Solo
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleRerunWizard("studio")}
          >
            <PlayCircle className="w-4 h-4" />
            Wizard Studio Owner
          </Button>
        </CardContent>
      </Card>

      {/* Solo Artist Wizard Dialog */}
      <Dialog open={showWizard === "solo"} onOpenChange={() => setShowWizard(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Solo Artist Setup</DialogTitle>
            <DialogDescription>Configure your solo artist workspace</DialogDescription>
          </DialogHeader>
          {user?.id && workspace.workspaceId && (
            <SoloArtistWizard
              userId={user.id}
              workspaceId={workspace.workspaceId}
              onComplete={handleWizardComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Studio Owner Wizard Dialog */}
      <Dialog open={showWizard === "studio"} onOpenChange={() => setShowWizard(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Studio Owner Setup</DialogTitle>
            <DialogDescription>Configure your studio workspace</DialogDescription>
          </DialogHeader>
          {user?.id && workspace.workspaceId && (
            <StudioOwnerWizard
              userId={user.id}
              workspaceId={workspace.workspaceId}
              onComplete={handleWizardComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingSettingsManager;
