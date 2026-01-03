import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Settings2, Zap, Calendar, Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface WorkspaceSettings {
  workspace_id: string;
  mix_mode: boolean;
  allow_direct_flash: boolean;
  allow_direct_touchup: boolean;
  custom_always_request: boolean;
  coverup_always_request: boolean;
  notice_window_hours: number;
  hold_minutes: number;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { workspaceId, role, loading: workspaceLoading } = useWorkspace(user?.id ?? null);
  
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      fetchSettings();
    }
  }, [workspaceId]);

  const fetchSettings = async () => {
    if (!workspaceId) return;
    
    const { data, error } = await supabase
      .from("workspace_settings")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (data) {
      setSettings({
        workspace_id: data.id,
        mix_mode: data.mix_mode ?? true,
        allow_direct_flash: data.allow_direct_flash ?? true,
        allow_direct_touchup: data.allow_direct_touchup ?? true,
        custom_always_request: data.custom_always_request ?? true,
        coverup_always_request: data.coverup_always_request ?? true,
        notice_window_hours: data.notice_window_hours ?? 72,
        hold_minutes: data.hold_minutes ?? 15,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings || !workspaceId) return;

    setSaving(true);
    const { error } = await supabase
      .from("workspace_settings")
      .update({
        mix_mode: settings.mix_mode,
        allow_direct_flash: settings.allow_direct_flash,
        allow_direct_touchup: settings.allow_direct_touchup,
        custom_always_request: settings.custom_always_request,
        coverup_always_request: settings.coverup_always_request,
        notice_window_hours: settings.notice_window_hours,
        hold_minutes: settings.hold_minutes,
      })
      .eq("id", workspaceId);

    setSaving(false);

    if (error) {
      toast.error("Error al guardar configuración");
      return;
    }

    toast.success("Configuración guardada");
  };

  const updateSetting = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isOwnerManager = role === "studio";
  const isArtist = role === "artist";

  if (workspaceLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-12">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Configuración
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isOwnerManager ? "Gestiona tu espacio de trabajo" : "Tus preferencias"}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 container mx-auto px-6 py-8 space-y-8">
        {/* MIXTO Rules - Owner/Manager Only */}
        {isOwnerManager && settings && (
          <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Reglas MIXTO
              </CardTitle>
              <CardDescription>
                Controla qué tipos de servicio pueden reservarse directamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo MIXTO activo</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite reservas directas según reglas
                  </p>
                </div>
                <Switch
                  checked={settings.mix_mode}
                  onCheckedChange={(v) => updateSetting("mix_mode", v)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-medium">Reservas directas permitidas</p>
                
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Flash</Label>
                  <Switch
                    checked={settings.allow_direct_flash}
                    onCheckedChange={(v) => updateSetting("allow_direct_flash", v)}
                    disabled={!settings.mix_mode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Retoques</Label>
                  <Switch
                    checked={settings.allow_direct_touchup}
                    onCheckedChange={(v) => updateSetting("allow_direct_touchup", v)}
                    disabled={!settings.mix_mode}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-medium">Siempre requieren aprobación</p>
                
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Custom</Label>
                  <Switch
                    checked={settings.custom_always_request}
                    onCheckedChange={(v) => updateSetting("custom_always_request", v)}
                    disabled={!settings.mix_mode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Cover-ups</Label>
                  <Switch
                    checked={settings.coverup_always_request}
                    onCheckedChange={(v) => updateSetting("coverup_always_request", v)}
                    disabled={!settings.mix_mode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timing Settings - Owner/Manager Only */}
        {isOwnerManager && settings && (
          <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Tiempos
              </CardTitle>
              <CardDescription>
                Configura los tiempos de espera y reservas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Ventana de aviso (horas)</Label>
                  <Input
                    type="number"
                    value={settings.notice_window_hours}
                    onChange={(e) => updateSetting("notice_window_hours", parseInt(e.target.value) || 72)}
                    min={24}
                    max={168}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tiempo mínimo de aviso para cancelaciones
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tiempo de hold (minutos)</Label>
                  <Input
                    type="number"
                    value={settings.hold_minutes}
                    onChange={(e) => updateSetting("hold_minutes", parseInt(e.target.value) || 15)}
                    min={5}
                    max={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tiempo que se reserva un horario antes de confirmar
                  </p>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Artist Settings */}
        {isArtist && (
          <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Mi perfil de artista
              </CardTitle>
              <CardDescription>
                Configura tu perfil y preferencias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Conectar Google Calendar
              </Button>
              <p className="text-xs text-muted-foreground">
                Sincroniza tu disponibilidad automáticamente
              </p>
            </CardContent>
          </Card>
        )}

        {/* Account */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/30 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sesión activa</p>
              <p className="text-sm">{user?.email}</p>
            </div>
            <Separator />
            <Button 
              variant="outline" 
              className="w-full text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
