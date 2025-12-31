import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Palette, ArrowRight, Plus, Loader2, ArrowLeft } from "lucide-react";

interface WorkspaceMembership {
  workspace_id: string;
  role: string;
  workspace_settings: {
    id: string;
    workspace_type: string;
    workspace_name: string | null;
  };
}

export default function WorkspaceSwitch() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.id) {
      fetchWorkspaces();
    }
  }, [user?.id]);

  const fetchWorkspaces = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        workspace_id,
        role,
        workspace_settings!inner (
          id,
          workspace_type,
          workspace_name
        )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (data) {
      const memberships = data as unknown as WorkspaceMembership[];
      setWorkspaces(memberships);
      
      // If user has exactly one workspace, auto-select it
      if (memberships.length === 1) {
        handleSelectWorkspace(memberships[0]);
        return;
      }
      
      // If no workspaces, redirect to onboarding
      if (memberships.length === 0) {
        navigate("/onboarding", { replace: true });
        return;
      }
    } else if (!data || (data as unknown[]).length === 0) {
      // No workspaces found - redirect to onboarding
      navigate("/onboarding", { replace: true });
      return;
    }
    setLoading(false);
  };

  const handleSelectWorkspace = (workspace: WorkspaceMembership) => {
    // Store selected workspace in localStorage for session
    localStorage.setItem("selectedWorkspaceId", workspace.workspace_id);

    const targetPath =
      workspace.role === "artist" || workspace.workspace_settings.workspace_type === "solo"
        ? "/artist/inbox"
        : "/studio/inbox";

    // Navigate (SPA)
    navigate(targetPath, { replace: true });

    // Safety fallback for some mobile webviews where navigation can be flaky
    window.setTimeout(() => {
      if (window.location.pathname === "/workspace-switch") {
        window.location.assign(targetPath);
      }
    }, 350);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </Button>
          <div className="text-sm font-medium text-foreground">Workspace</div>
          <div className="w-[72px]" />
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-light tracking-tight text-foreground">Ferunda OS</h1>
            <p className="text-sm text-muted-foreground">Selecciona un espacio de trabajo</p>
          </div>

          {/* Workspace List */}
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <button
                key={workspace.workspace_id}
                type="button"
                onClick={() => handleSelectWorkspace(workspace)}
                className="w-full text-left"
              >
                <Card className="border-border/40 hover:border-foreground/40 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      {workspace.workspace_settings.workspace_type === "studio" ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Palette className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{workspace.workspace_settings.workspace_name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {workspace.role} · {workspace.workspace_settings.workspace_type}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {/* Create New Workspace */}
          <Button variant="outline" className="w-full" onClick={() => navigate("/onboarding")}>
            <Plus className="w-4 h-4 mr-2" />
            Crear nuevo espacio
          </Button>
        </div>
      </div>
    </div>
  );
}
