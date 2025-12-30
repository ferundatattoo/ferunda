import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Palette, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type WorkspaceType = "studio" | "artist";
type StudioRole = "owner_manager" | "front_desk" | "artist";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState<"type" | "role" | "name">("type");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType | null>(null);
  const [studioRole, setStudioRole] = useState<StudioRole | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

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
      // Determine the role mapping
      let memberRole: string;
      if (workspaceType === "artist") {
        memberRole = "artist";
      } else {
        memberRole = studioRole || "owner";
      }

      // Map to workspace_members role format
      const roleMappings: Record<string, string> = {
        owner_manager: "owner",
        front_desk: "assistant",
        artist: "artist",
      };

      const finalRole = roleMappings[memberRole] || memberRole;

      // Create workspace_settings first (this is the workspace)
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspace_settings")
        .insert({
          workspace_type: workspaceType === "studio" ? "studio" : "solo",
          studio_name: workspaceName,
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

      // Mark onboarding as complete
      await supabase
        .from("onboarding_progress")
        .upsert({
          user_id: user.id,
          wizard_type: workspaceType === "studio" ? "studio_setup" : "solo_setup",
          current_step: "complete",
          completed_at: new Date().toISOString(),
        });

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
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
                className="cursor-pointer border-border/40 hover:border-foreground/40 transition-colors"
                onClick={() => handleTypeSelect("studio")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-muted">
                    <Building2 className="w-6 h-6" />
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
                className="cursor-pointer border-border/40 hover:border-foreground/40 transition-colors"
                onClick={() => handleTypeSelect("artist")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-muted">
                    <Palette className="w-6 h-6" />
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
                  className="cursor-pointer border-border/40 hover:border-foreground/40 transition-colors"
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
