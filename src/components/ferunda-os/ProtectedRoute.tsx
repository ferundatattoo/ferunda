import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace, WorkspaceRole, normalizeRole } from "@/hooks/useWorkspace";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireWorkspace?: boolean;
  // Accepts new simplified roles: "studio" | "artist" | "assistant"
  allowedRoles?: WorkspaceRole[];
}

export function ProtectedRoute({
  children,
  requireWorkspace = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { workspaceId, role, needsOnboarding, loading: workspaceLoading } = useWorkspace(user?.id ?? null);

  const isLoading = authLoading || (user && workspaceLoading);

  useEffect(() => {
    if (authLoading) return;

    // Not authenticated → redirect to auth
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (workspaceLoading) return;

    // Phase 2: Check for multiple workspaces scenario
    const hasMultipleWorkspaces = typeof window !== "undefined" && 
      window.localStorage.getItem("multipleWorkspaces") === "true";

    // No workspace selected/found
    if (requireWorkspace && !workspaceId) {
      // If multiple workspaces exist, always go to workspace-switch
      if (hasMultipleWorkspaces) {
        // Don't redirect if already on workspace-switch
        if (location.pathname !== "/workspace-switch") {
          navigate("/workspace-switch", { replace: true });
        }
        return;
      }
      // If onboarding is required, go to onboarding. Otherwise go to workspace switch.
      navigate(needsOnboarding ? "/onboarding" : "/workspace-switch", { replace: true });
      return;
    }

    // Has role restrictions and user doesn't have the right role
    const normalizedRole = normalizeRole(role);
    if (allowedRoles && normalizedRole && !allowedRoles.includes(normalizedRole)) {
      // Redirect to appropriate inbox based on normalized role
      if (normalizedRole === "artist") {
        navigate("/artist/inbox", { replace: true });
      } else if (normalizedRole === "assistant") {
        navigate("/assistant/inbox", { replace: true });
      } else {
        navigate("/studio/inbox", { replace: true });
      }
    }
  }, [authLoading, user, workspaceLoading, workspaceId, needsOnboarding, role, requireWorkspace, allowedRoles, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render children until all checks pass
  if (!user) return null;
  
  // Check for multiple workspaces scenario
  const hasMultipleWorkspaces = typeof window !== "undefined" && 
    window.localStorage.getItem("multipleWorkspaces") === "true";
  
  if (requireWorkspace && !workspaceId) {
    // If on workspace-switch with multiple workspaces, that's fine - render children
    if (hasMultipleWorkspaces && location.pathname === "/workspace-switch") {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const normalizedRole = normalizeRole(role);
  if (allowedRoles && normalizedRole && !allowedRoles.includes(normalizedRole)) return null;

  return <>{children}</>;
}
