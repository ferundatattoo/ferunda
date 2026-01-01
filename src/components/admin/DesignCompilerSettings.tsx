import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Zap, Shield, FlaskConical, Brain, Sparkles, Eye, Rocket, Settings2 } from "lucide-react";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  config_json: Record<string, any>;
}

interface OfferPolicy {
  min_messages_before_preview_offer: number;
  preview_offer_cooldown_minutes: number;
  max_preview_offers_per_session: number;
  sleeve_requires_min_references: number;
  single_requires_min_references: number;
  require_placement_photo_for_ar_live: boolean;
}

const DEFAULT_OFFER_POLICY: OfferPolicy = {
  min_messages_before_preview_offer: 3,
  preview_offer_cooldown_minutes: 15,
  max_preview_offers_per_session: 3,
  sleeve_requires_min_references: 8,
  single_requires_min_references: 3,
  require_placement_photo_for_ar_live: true,
};

const GOD_MODE_FEATURES = [
  { key: "GODMODE_NEURAL_CODESIGN", label: "Neural Co-Design", icon: Brain, description: "Interactive preference learning studio" },
  { key: "GODMODE_AR_LIVE_PHOTOREAL", label: "AR Live Photoreal", icon: Eye, description: "Neural relighting + skin shader" },
  { key: "GODMODE_CONVERSION_ENGINE", label: "Conversion Engine", icon: Rocket, description: "Multi-armed bandit for booking optimization" },
  { key: "GODMODE_PROVIDER_CHAOS_FALLBACK", label: "Chaos Fallback", icon: Shield, description: "Auto-failover between providers" },
  { key: "GODMODE_QUANTUM_LAYOUT", label: "Quantum Layout", icon: Zap, description: "Quantum-inspired sleeve optimization" },
];

const OFFER_PRESETS = {
  conservative: {
    label: "Conservative",
    policy: {
      min_messages_before_preview_offer: 5,
      preview_offer_cooldown_minutes: 30,
      max_preview_offers_per_session: 2,
      sleeve_requires_min_references: 10,
      single_requires_min_references: 4,
      require_placement_photo_for_ar_live: true,
    },
  },
  balanced: {
    label: "Balanced",
    policy: DEFAULT_OFFER_POLICY,
  },
  aggressive: {
    label: "Aggressive",
    policy: {
      min_messages_before_preview_offer: 2,
      preview_offer_cooldown_minutes: 10,
      max_preview_offers_per_session: 5,
      sleeve_requires_min_references: 6,
      single_requires_min_references: 2,
      require_placement_photo_for_ar_live: false,
    },
  },
};

const DesignCompilerSettings = () => {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [mockModeEnabled, setMockModeEnabled] = useState(false);
  const [godModeEnabled, setGodModeEnabled] = useState(false);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [offerPolicy, setOfferPolicy] = useState<OfferPolicy>(DEFAULT_OFFER_POLICY);
  const [activePreset, setActivePreset] = useState<string>("balanced");

  useEffect(() => {
    if (workspace.workspaceId) {
      fetchSettings();
    }
  }, [workspace.workspaceId]);

  const fetchSettings = async () => {
    if (!workspace.workspaceId) return;
    setLoading(true);
    
    try {
      // Fetch feature flags
      const { data: flags } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("workspace_id", workspace.workspaceId);
      
      if (flags) {
        const flagMap: Record<string, boolean> = {};
        flags.forEach((f: any) => {
          if (f.key === "DESIGN_COMPILER_MOCK_MODE") {
            setMockModeEnabled(f.enabled);
          } else if (f.key === "GOD_MODE_ENABLED") {
            setGodModeEnabled(f.enabled);
          } else {
            flagMap[f.key] = f.enabled;
          }
        });
        setFeatures(flagMap);
      }

      // Fetch offer policy
      const { data: policy } = await supabase
        .from("concierge_offer_policy")
        .select("*")
        .eq("workspace_id", workspace.workspaceId)
        .maybeSingle();
      
      if (policy?.policy_json) {
        setOfferPolicy(policy.policy_json as unknown as OfferPolicy);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveFeatureFlag = async (key: string, enabled: boolean) => {
    if (!workspace.workspaceId) return;
    
    const { error } = await supabase
      .from("feature_flags")
      .upsert({
        workspace_id: workspace.workspaceId,
        key,
        enabled,
        config_json: {},
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,key" });

    if (error) {
      toast({ title: "Error saving flag", variant: "destructive" });
    }
  };

  const handleMockModeToggle = async (enabled: boolean) => {
    setMockModeEnabled(enabled);
    await saveFeatureFlag("DESIGN_COMPILER_MOCK_MODE", enabled);
    toast({ title: enabled ? "Mock Mode ON" : "Mock Mode OFF" });
  };

  const handleGodModeToggle = async (enabled: boolean) => {
    setGodModeEnabled(enabled);
    await saveFeatureFlag("GOD_MODE_ENABLED", enabled);
    toast({ title: enabled ? "GOD MODE Activated 🚀" : "GOD MODE Disabled" });
  };

  const handleFeatureToggle = async (key: string, enabled: boolean) => {
    setFeatures(prev => ({ ...prev, [key]: enabled }));
    await saveFeatureFlag(key, enabled);
  };

  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    const presetPolicy = OFFER_PRESETS[preset as keyof typeof OFFER_PRESETS]?.policy;
    if (presetPolicy) {
      setOfferPolicy(presetPolicy);
    }
  };

  const saveOfferPolicy = async () => {
    if (!workspace.workspaceId) return;
    setSaving(true);

    try {
      // Check if exists
      const { data: existing } = await supabase
        .from("concierge_offer_policy")
        .select("id")
        .eq("workspace_id", workspace.workspaceId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("concierge_offer_policy")
          .update({ policy_json: offerPolicy as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq("workspace_id", workspace.workspaceId);
      } else {
        await supabase
          .from("concierge_offer_policy")
          .insert({ workspace_id: workspace.workspaceId, policy_json: offerPolicy as unknown as Record<string, unknown> });
      }

      toast({ title: "Offer policy saved" });
    } catch (err) {
      toast({ title: "Error saving policy", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Design Compiler</h2>
        <p className="text-muted-foreground">Configure AI generation, GOD MODE features, and offer policies</p>
      </div>

      <Tabs defaultValue="modes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modes" className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            Modes
          </TabsTrigger>
          <TabsTrigger value="godmode" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            GOD MODE
          </TabsTrigger>
          <TabsTrigger value="policy" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Offer Policy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modes" className="mt-6 space-y-4">
          {/* Mock Mode */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-amber-500" />
                    Mock Mode
                  </CardTitle>
                  <CardDescription>
                    Generate placeholder outputs for UX testing without calling real providers
                  </CardDescription>
                </div>
                <Switch
                  checked={mockModeEnabled}
                  onCheckedChange={handleMockModeToggle}
                />
              </div>
            </CardHeader>
            {mockModeEnabled && (
              <CardContent>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                  Mock outputs active - no real AI calls
                </Badge>
              </CardContent>
            )}
          </Card>

          {/* GOD MODE Master Switch */}
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    GOD MODE
                  </CardTitle>
                  <CardDescription>
                    Enable cutting-edge experimental features
                  </CardDescription>
                </div>
                <Switch
                  checked={godModeEnabled}
                  onCheckedChange={handleGodModeToggle}
                />
              </div>
            </CardHeader>
            {godModeEnabled && (
              <CardContent>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                  Experimental features unlocked
                </Badge>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="godmode" className="mt-6 space-y-4">
          {!godModeEnabled ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enable GOD MODE to configure experimental features</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {GOD_MODE_FEATURES.map((feature) => (
                <Card key={feature.key}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <feature.icon className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{feature.label}</p>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={features[feature.key] ?? false}
                        onCheckedChange={(enabled) => handleFeatureToggle(feature.key, enabled)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="policy" className="mt-6 space-y-6">
          {/* Preset Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Offer Strategy Preset</CardTitle>
              <CardDescription>Quick presets for different offer strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={activePreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OFFER_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Detailed Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Min messages before preview offer</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[offerPolicy.min_messages_before_preview_offer]}
                    onValueChange={([v]) => setOfferPolicy(p => ({ ...p, min_messages_before_preview_offer: v }))}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-mono">{offerPolicy.min_messages_before_preview_offer}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preview offer cooldown (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[offerPolicy.preview_offer_cooldown_minutes]}
                    onValueChange={([v]) => setOfferPolicy(p => ({ ...p, preview_offer_cooldown_minutes: v }))}
                    min={5}
                    max={60}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-mono">{offerPolicy.preview_offer_cooldown_minutes}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max preview offers per session</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[offerPolicy.max_preview_offers_per_session]}
                    onValueChange={([v]) => setOfferPolicy(p => ({ ...p, max_preview_offers_per_session: v }))}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-mono">{offerPolicy.max_preview_offers_per_session}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Single piece min references</Label>
                  <Input
                    type="number"
                    value={offerPolicy.single_requires_min_references}
                    onChange={(e) => setOfferPolicy(p => ({ ...p, single_requires_min_references: parseInt(e.target.value) || 0 }))}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sleeve min references</Label>
                  <Input
                    type="number"
                    value={offerPolicy.sleeve_requires_min_references}
                    onChange={(e) => setOfferPolicy(p => ({ ...p, sleeve_requires_min_references: parseInt(e.target.value) || 0 }))}
                    min={1}
                    max={20}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Require placement photo for AR Live</Label>
                  <p className="text-sm text-muted-foreground">Must have photo to enable live AR try-on</p>
                </div>
                <Switch
                  checked={offerPolicy.require_placement_photo_for_ar_live}
                  onCheckedChange={(v) => setOfferPolicy(p => ({ ...p, require_placement_photo_for_ar_live: v }))}
                />
              </div>

              <Button onClick={saveOfferPolicy} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Policy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DesignCompilerSettings;
