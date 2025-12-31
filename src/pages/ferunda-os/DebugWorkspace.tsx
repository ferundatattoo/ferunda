import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  } catch {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

function clearStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export default function DebugWorkspace() {
  const [searchParams] = useSearchParams();
  const enabled = useMemo(() => searchParams.get("enabled") === "1", [searchParams]);

  const { user, loading: authLoading } = useAuth();
  const ws = useWorkspace(user?.id ?? null);

  useEffect(() => {
    if (!enabled) return;
    console.debug("DebugWorkspace", {
      pathname: window.location.pathname,
      authLoading,
      user,
      workspaceLoading: ws.loading,
      workspaceId: ws.workspaceId,
      workspaceType: ws.workspaceType,
      role: ws.role,
      artistId: ws.artistId,
      needsOnboarding: ws.needsOnboarding,
      wizardType: ws.wizardType,
      currentStep: ws.currentStep,
    });
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardContent className="p-6 space-y-3">
            <h1 className="text-xl font-medium">Debug desactivado</h1>
            <p className="text-sm text-muted-foreground">
              Abre <code className="px-1 py-0.5 rounded bg-muted">/debug/workspace?enabled=1</code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedWorkspaceId = typeof window !== "undefined" ? readStorage("selectedWorkspaceId") : null;
  const lastSelection = typeof window !== "undefined" ? readStorage("lastWorkspaceSelection") : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardContent className="p-6 space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-medium">Debug Workspace</h1>
            <p className="text-sm text-muted-foreground">Estado real de auth + workspace (sin consola).</p>
          </header>

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">pathname</span><span className="font-mono">{window.location.pathname}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">authLoading</span><span className="font-mono">{String(authLoading)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">user</span><span className="font-mono">{user?.email ?? "(null)"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">userId</span><span className="font-mono">{user?.id ?? "(null)"}</span></div>

            <div className="h-px bg-border my-2" />

            <div className="flex justify-between gap-4"><span className="text-muted-foreground">workspaceLoading</span><span className="font-mono">{String(ws.loading)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">workspaceId</span><span className="font-mono">{ws.workspaceId ?? "(null)"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">workspaceType</span><span className="font-mono">{ws.workspaceType ?? "(null)"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">role</span><span className="font-mono">{ws.role ?? "(null)"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">artistId</span><span className="font-mono">{ws.artistId ?? "(null)"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">needsOnboarding</span><span className="font-mono">{String(ws.needsOnboarding)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">wizardType</span><span className="font-mono">{ws.wizardType ?? "(null)"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">currentStep</span><span className="font-mono">{ws.currentStep ?? "(null)"}</span></div>

            <div className="h-px bg-border my-2" />

            <div className="flex justify-between gap-4"><span className="text-muted-foreground">selectedWorkspaceId (storage)</span><span className="font-mono">{selectedWorkspaceId ?? "(null)"}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">lastWorkspaceSelection</span><span className="font-mono break-all">{lastSelection ?? "(null)"}</span></div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearStorage("selectedWorkspaceId");
                clearStorage("lastWorkspaceSelection");
                window.location.assign("/workspace-switch");
              }}
            >
              Limpiar selección + ir a /workspace-switch
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
