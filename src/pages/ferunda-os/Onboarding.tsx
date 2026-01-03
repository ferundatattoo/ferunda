import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Palette, ArrowRight, ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";

type WorkspaceType = "studio" | "artist";
type StudioRole = "owner_manager" | "front_desk" | "artist";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [step, setStep] = useState<"type" | "role" | "name">("type");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType | null>(null);
  const [studioRole, setStudioRole] = useState<StudioRole | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleTypeSelect = (type: WorkspaceType) => {
    setWorkspaceType(type);
    if (type === "studio") {
      setStep("role");
    } else {
      setStep("name");
    }
  };

  const handleRoleSelect = (role: StudioRole) => {
    setStudioRole(role);
    setStep("name");
  };

  const handleComplete = async () => {
    if (!user || !workspaceName.trim()) return;

    setLoading(true);

    try {
      // Determine the role mapping - all legacy roles map to new simplified roles
      let memberRole: string;
      if (workspaceType === "artist") {
        memberRole = "artist";
      } else {
        // Map studioRole to new role system
        memberRole = studioRole === "owner_manager" ? "studio" : 
                     studioRole === "front_desk" ? "assistant" :
                     studioRole === "artist" ? "artist" : "studio";
      }

      // Map to workspace_members role format (new simplified roles)
      const roleMappings: Record<string, string> = {
        owner_manager: "studio",
        owner: "studio",
        admin: "studio",
        manager: "studio",
        front_desk: "assistant",
        artist: "artist",
      };

      const finalRole = roleMappings[memberRole] || memberRole;

      // Create workspace_settings first (this is the workspace)
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspace_settings")
        .insert({
          workspace_type: workspaceType === "studio" ? "studio" : "solo",
          workspace_name: workspaceName,
          brand_tone: "professional",
          locale: "es",
          currency: "USD",
          settings: {},
          owner_user_id: user.id,
          onboarding_completed: false,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Create workspace member
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceData.id,
          user_id: user.id,
          role: finalRole,
          is_active: true,
          permissions: {},
        });

      if (memberError) throw memberError;

      // Create artist profile if artist role
      if (finalRole === "artist" || workspaceType === "artist") {
        const { data: artistData, error: artistError } = await supabase
          .from("artist_profiles")
          .insert({
            workspace_id: workspaceData.id,
            user_id: user.id,
            display_name: workspaceName,
          })
          .select()
          .single();

        if (artistError) throw artistError;

        // Update workspace member with artist_id
        await supabase
          .from("workspace_members")
          .update({ artist_id: artistData.id })
          .eq("workspace_id", workspaceData.id)
          .eq("user_id", user.id);
      }

      // Update workspace to mark onboarding complete
      await supabase
        .from("workspace_settings")
        .update({ onboarding_completed: true })
        .eq("id", workspaceData.id);

      // Mark onboarding progress as complete with workspace_id
      await supabase
        .from("onboarding_progress")
        .upsert({
          user_id: user.id,
          workspace_id: workspaceData.id,
          wizard_type: workspaceType === "studio" ? "studio_setup" : "solo_setup",
          current_step: "complete",
          completed_at: new Date().toISOString(),
        });

      // Store selected workspace in localStorage for the session
      localStorage.setItem("selectedWorkspaceId", workspaceData.id);

      toast.success("Espacio de trabajo creado");
      
      // Navigate to appropriate inbox
      if (finalRole === "artist") {
        navigate("/artist/inbox");
      } else {
        navigate("/studio/inbox");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Error al crear el espacio de trabajo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6 relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Ferunda OS
          </h1>
          <p className="text-sm text-muted-foreground">
            Configura tu espacio de trabajo
          </p>
        </div>

        {/* Step: Type Selection */}
        {step === "type" && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              ¿Cómo describirías mejor tu trabajo?
            </p>
            
            <div className="grid gap-4">
              <Card 
                className="cursor-pointer bg-card/50 backdrop-blur-xl border-border/30 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                onClick={() => handleTypeSelect("studio")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Estudio</p>
                    <p className="text-sm text-muted-foreground">
                      Gestiono un equipo de artistas
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer bg-card/50 backdrop-blur-xl border-border/30 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                onClick={() => handleTypeSelect("artist")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-accent/10">
                    <Palette className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Artista independiente</p>
                    <p className="text-sm text-muted-foreground">
                      Trabajo por mi cuenta
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </div>
        )}

        {/* Step: Studio Role Selection */}
        {step === "role" && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              ¿Cuál es tu rol en el estudio?
            </p>
            
            <div className="grid gap-3">
              {[
                { role: "owner_manager" as StudioRole, label: "Owner / Manager", desc: "Acceso completo" },
                { role: "front_desk" as StudioRole, label: "Front Desk", desc: "Gestión de citas" },
                { role: "artist" as StudioRole, label: "Artista", desc: "Mi agenda y clientes" },
              ].map(({ role, label, desc }) => (
                <Card 
                  key={role}
                  className="cursor-pointer bg-card/50 backdrop-blur-xl border-border/30 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                  onClick={() => handleRoleSelect(role)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => setStep("type")}
            >
              Volver
            </Button>
          </div>
        )}

        {/* Step: Workspace Name */}
        {step === "name" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>
                {workspaceType === "studio" ? "Nombre del estudio" : "Tu nombre artístico"}
              </Label>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder={workspaceType === "studio" ? "Ferunda Tattoo" : "Tu nombre"}
                className="text-center text-lg h-12"
              />
            </div>

            <Button 
              onClick={handleComplete}
              disabled={!workspaceName.trim() || loading}
              className="w-full h-12"
            >
              {loading ? "Creando..." : "Comenzar"}
            </Button>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => setStep(workspaceType === "studio" ? "role" : "type")}
            >
              Volver
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
