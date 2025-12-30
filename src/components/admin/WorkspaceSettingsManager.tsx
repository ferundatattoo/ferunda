import { useState, useEffect } from "react";
import { 
  Settings2, 
  Save, 
  Globe,
  Clock,
  DollarSign,
  Bell,
  Bot,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceSettings {
  id: string;
  workspace_name: string;
  brand_tone: string;
  primary_timezone: string;
  locale: string;
  currency: string;
  settings: {
    session_blocks_hours: number[];
    min_lead_time_hours: number;
    notice_window_hours: number;
    hold_slot_minutes: number;
    buffers: {
      consult: { before_min: number; after_min: number };
      session: { before_min: number; after_min: number; extra_after_for_6h_plus_min: number };
    };
    deposits: {
      enabled: boolean;
      model: string;
    };
    reminders: {
      quiet_hours: string;
      schedule: string[];
      require_confirmation_hours_before: number;
    };
    ai: {
      intake_enabled: boolean;
      one_question_at_a_time: boolean;
      fit_gate_enabled: boolean;
      scheduling_mode: string;
      aftercare_companion: boolean;
      risk_scoring_enabled: boolean;
    };
  };
}

const defaultSettings: WorkspaceSettings = {
  id: "",
  workspace_name: "Ferunda Studio",
  brand_tone: "luxury",
  primary_timezone: "America/Los_Angeles",
  locale: "en-US",
  currency: "USD",
  settings: {
    session_blocks_hours: [3, 4, 6, 8],
    min_lead_time_hours: 48,
    notice_window_hours: 72,
    hold_slot_minutes: 15,
    buffers: {
      consult: { before_min: 10, after_min: 10 },
      session: { before_min: 15, after_min: 20, extra_after_for_6h_plus_min: 10 }
    },
    deposits: {
      enabled: true,
      model: "fixed_by_service"
    },
    reminders: {
      quiet_hours: "21:00-09:00",
      schedule: ["7d", "48h", "24h", "morning_of"],
      require_confirmation_hours_before: 24
    },
    ai: {
      intake_enabled: true,
      one_question_at_a_time: true,
      fit_gate_enabled: true,
      scheduling_mode: "curated_three_options",
      aftercare_companion: true,
      risk_scoring_enabled: true
    }
  }
};

const WorkspaceSettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkspaceSettings();
  }, []);

  const fetchWorkspaceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings exist, use defaults
          setWorkspace(defaultSettings);
        } else {
          throw error;
        }
      } else if (data) {
        setWorkspace({
          ...data,
          settings: data.settings as WorkspaceSettings['settings']
        } as WorkspaceSettings);
      }
    } catch (err) {
      console.error("Error fetching workspace settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (workspace.id) {
        const { error } = await supabase
          .from("workspace_settings")
          .update({
            workspace_name: workspace.workspace_name,
            brand_tone: workspace.brand_tone,
            primary_timezone: workspace.primary_timezone,
            locale: workspace.locale,
            currency: workspace.currency,
            settings: workspace.settings
          })
          .eq("id", workspace.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workspace_settings")
          .insert({
            workspace_name: workspace.workspace_name,
            brand_tone: workspace.brand_tone,
            primary_timezone: workspace.primary_timezone,
            locale: workspace.locale,
            currency: workspace.currency,
            settings: workspace.settings
          })
          .select()
          .single();

        if (error) throw error;
        setWorkspace(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Settings saved",
        description: "Workspace configuration updated."
      });
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => {
    setWorkspace(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSettings = (path: string, value: unknown) => {
    setWorkspace(prev => {
      const newSettings = { ...prev.settings };
      const keys = path.split('.');
      let current: Record<string, unknown> = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      
      return { ...prev, settings: newSettings };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="font-display text-xl text-foreground">Workspace Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure your studio's behavior and defaults
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="timing" className="gap-2">
            <Clock className="w-4 h-4" />
            Timing
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="w-4 h-4" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="w-4 h-4" />
            AI Settings
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Studio Identity
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workspace Name</Label>
                <Input
                  value={workspace.workspace_name}
                  onChange={(e) => updateField("workspace_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Brand Tone</Label>
                <Select
                  value={workspace.brand_tone}
                  onValueChange={(v) => updateField("brand_tone", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="luxury">Luxury (Quiet, Curated)</SelectItem>
                    <SelectItem value="friendly">Friendly (Warm, Approachable)</SelectItem>
                    <SelectItem value="professional">Professional (Direct, Efficient)</SelectItem>
                    <SelectItem value="artistic">Artistic (Creative, Expressive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Localization
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={workspace.primary_timezone}
                  onValueChange={(v) => updateField("primary_timezone", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Locale</Label>
                <Select
                  value={workspace.locale}
                  onValueChange={(v) => updateField("locale", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                    <SelectItem value="fr-FR">French (France)</SelectItem>
                    <SelectItem value="de-DE">German (Germany)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={workspace.currency}
                  onValueChange={(v) => updateField("currency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Booking Rules
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Lead Time (hours)</Label>
                <Input
                  type="number"
                  value={workspace.settings.min_lead_time_hours}
                  onChange={(e) => updateNestedSettings("min_lead_time_hours", parseInt(e.target.value) || 48)}
                />
                <p className="text-xs text-muted-foreground">Prevent impulse same-day bookings</p>
              </div>
              <div className="space-y-2">
                <Label>Notice Window (hours)</Label>
                <Input
                  type="number"
                  value={workspace.settings.notice_window_hours}
                  onChange={(e) => updateNestedSettings("notice_window_hours", parseInt(e.target.value) || 72)}
                />
                <p className="text-xs text-muted-foreground">Required for cancel/reschedule</p>
              </div>
              <div className="space-y-2">
                <Label>Hold Slot Time (min)</Label>
                <Input
                  type="number"
                  value={workspace.settings.hold_slot_minutes}
                  onChange={(e) => updateNestedSettings("hold_slot_minutes", parseInt(e.target.value) || 15)}
                />
                <p className="text-xs text-muted-foreground">Time to complete payment</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg">Buffer Settings</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Consultation Buffers</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Before (min)</Label>
                    <Input
                      type="number"
                      value={workspace.settings.buffers.consult.before_min}
                      onChange={(e) => updateNestedSettings("buffers.consult.before_min", parseInt(e.target.value) || 10)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>After (min)</Label>
                    <Input
                      type="number"
                      value={workspace.settings.buffers.consult.after_min}
                      onChange={(e) => updateNestedSettings("buffers.consult.after_min", parseInt(e.target.value) || 10)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Session Buffers</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Before (min)</Label>
                    <Input
                      type="number"
                      value={workspace.settings.buffers.session.before_min}
                      onChange={(e) => updateNestedSettings("buffers.session.before_min", parseInt(e.target.value) || 15)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>After (min)</Label>
                    <Input
                      type="number"
                      value={workspace.settings.buffers.session.after_min}
                      onChange={(e) => updateNestedSettings("buffers.session.after_min", parseInt(e.target.value) || 20)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Extra (6h+)</Label>
                    <Input
                      type="number"
                      value={workspace.settings.buffers.session.extra_after_for_6h_plus_min}
                      onChange={(e) => updateNestedSettings("buffers.session.extra_after_for_6h_plus_min", parseInt(e.target.value) || 10)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Reminder Schedule
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quiet Hours</Label>
                <Input
                  value={workspace.settings.reminders.quiet_hours}
                  onChange={(e) => updateNestedSettings("reminders.quiet_hours", e.target.value)}
                  placeholder="21:00-09:00"
                />
                <p className="text-xs text-muted-foreground">No messages sent during this window</p>
              </div>
              <div className="space-y-2">
                <Label>Confirm Before (hours)</Label>
                <Input
                  type="number"
                  value={workspace.settings.reminders.require_confirmation_hours_before}
                  onChange={(e) => updateNestedSettings("reminders.require_confirmation_hours_before", parseInt(e.target.value) || 24)}
                />
                <p className="text-xs text-muted-foreground">One-tap confirmation request</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="mb-3 block">Reminder Schedule</Label>
              <div className="flex flex-wrap gap-2">
                {workspace.settings.reminders.schedule.map((timing, idx) => (
                  <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {timing}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">7 days, 48 hours, 24 hours, and morning of appointment</p>
            </div>
          </div>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              AI Behavior Controls
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">AI Intake Enabled</p>
                  <p className="text-sm text-muted-foreground">Luna handles initial consultation via chat</p>
                </div>
                <Switch
                  checked={workspace.settings.ai.intake_enabled}
                  onCheckedChange={(checked) => updateNestedSettings("ai.intake_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">One Question at a Time</p>
                  <p className="text-sm text-muted-foreground">Luxury pacing: never overwhelm with multiple questions</p>
                </div>
                <Switch
                  checked={workspace.settings.ai.one_question_at_a_time}
                  onCheckedChange={(checked) => updateNestedSettings("ai.one_question_at_a_time", checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Fit Gate Enabled</p>
                  <p className="text-sm text-muted-foreground">Gracefully redirect clients who aren't a good fit</p>
                </div>
                <Switch
                  checked={workspace.settings.ai.fit_gate_enabled}
                  onCheckedChange={(checked) => updateNestedSettings("ai.fit_gate_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Aftercare Companion</p>
                  <p className="text-sm text-muted-foreground">Automated healing check-ins with photo analysis</p>
                </div>
                <Switch
                  checked={workspace.settings.ai.aftercare_companion}
                  onCheckedChange={(checked) => updateNestedSettings("ai.aftercare_companion", checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Risk Scoring</p>
                  <p className="text-sm text-muted-foreground">AI assesses client risk based on behavior patterns</p>
                </div>
                <Switch
                  checked={workspace.settings.ai.risk_scoring_enabled}
                  onCheckedChange={(checked) => updateNestedSettings("ai.risk_scoring_enabled", checked)}
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg">Scheduling Mode</h3>
            <Select
              value={workspace.settings.ai.scheduling_mode}
              onValueChange={(v) => updateNestedSettings("ai.scheduling_mode", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="curated_three_options">Curated (3 options)</SelectItem>
                <SelectItem value="curated_five_options">Curated (5 options)</SelectItem>
                <SelectItem value="calendar_view">Calendar Grid View</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Luxury recommendation: Never show a raw calendar grid. Offer 3 curated options.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkspaceSettingsManager;
