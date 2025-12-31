import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireWorkspace?: boolean;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  requireWorkspace = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
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

    // No workspace selected/found
    if (requireWorkspace && !workspaceId) {
      // If onboarding is required, go to onboarding. Otherwise go to workspace switch.
      navigate(needsOnboarding ? "/onboarding" : "/workspace-switch", { replace: true });
      return;
    }

    // Has role restrictions and user doesn't have the right role
    if (allowedRoles && role && !allowedRoles.includes(role)) {
      // Redirect to appropriate inbox based on role
      if (role === "artist") {
        navigate("/artist/inbox", { replace: true });
      } else {
        navigate("/studio/inbox", { replace: true });
      }
    }
  }, [authLoading, user, workspaceLoading, workspaceId, needsOnboarding, role, requireWorkspace, allowedRoles, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render children until all checks pass
  if (!user) return null;
  if (requireWorkspace && !workspaceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (allowedRoles && role && !allowedRoles.includes(role)) return null;

  return <>{children}</>;
}
