import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Save, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  FileText,
  History,
  Plus,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PolicySettings {
  deposit_amount_or_percent: string;
  deposit_due_hours: number;
  cancellation_window_hours: number;
  reschedule_window_hours: number;
  late_threshold_minutes: number;
  no_show_rule: string;
  reschedule_fee_or_deposit_forfeit_rule: string;
  cancellation_rule: string;
  late_policy_rule: string;
  future_booking_requirement: string;
  minimum_age: number;
  id_requirement_text: string;
  deposit_refund_option: "non_refundable" | "refundable_with_notice" | "transferable";
}

interface Policy {
  id: string;
  version: number;
  is_active: boolean;
  settings: PolicySettings;
  summary_text: string;
  full_policy_text: string;
  created_at: string;
}

interface PolicyAcceptance {
  id: string;
  client_email: string;
  accepted_at: string;
  acceptance_method: string;
  booking_id: string | null;
}

const defaultSettings: PolicySettings = {
  deposit_amount_or_percent: "$500",
  deposit_due_hours: 48,
  cancellation_window_hours: 72,
  reschedule_window_hours: 72,
  late_threshold_minutes: 30,
  no_show_rule: "deposit forfeited",
  reschedule_fee_or_deposit_forfeit_rule: "original deposit applies to rescheduled session",
  cancellation_rule: "deposit forfeited",
  late_policy_rule: "session may need to be rescheduled",
  future_booking_requirement: "deposit and 24-hour confirmation",
  minimum_age: 18,
  id_requirement_text: "government-issued photo ID",
  deposit_refund_option: "non_refundable"
};

const PolicySettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [policyHistory, setPolicyHistory] = useState<Policy[]>([]);
  const [acceptances, setAcceptances] = useState<PolicyAcceptance[]>([]);
  const [settings, setSettings] = useState<PolicySettings>(defaultSettings);
  const [summaryText, setSummaryText] = useState("");
  const [fullPolicyText, setFullPolicyText] = useState("");
  const [activeTab, setActiveTab] = useState("settings");
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicies();
    fetchAcceptances();
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from("studio_policies" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const policies = (data || []) as unknown as Policy[];
      setPolicyHistory(policies);
      
      const active = policies.find(p => p.is_active);
      if (active) {
        setActivePolicy(active);
        setSettings(active.settings);
        setSummaryText(active.summary_text);
        setFullPolicyText(active.full_policy_text);
      }
    } catch (err) {
      console.error("Error fetching policies:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptances = async () => {
    try {
      const { data, error } = await supabase
        .from("policy_acceptances" as any)
        .select("id, client_email, accepted_at, acceptance_method, booking_id")
        .order("accepted_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAcceptances((data || []) as unknown as PolicyAcceptance[]);
    } catch (err) {
      console.error("Error fetching acceptances:", err);
    }
  };

  const generateSummaryText = () => {
    return `A deposit of ${settings.deposit_amount_or_percent} secures your session and is applied to the final total.

Cancellations or reschedules require ${settings.cancellation_window_hours} hours notice.

Late arrivals may reduce session time. If you are more than ${settings.late_threshold_minutes} minutes late, the appointment may need to be rescheduled.

If you have questions about healing or aftercare, contact the studio. If symptoms feel urgent or worsen, seek medical care.`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Deactivate current policy
      if (activePolicy) {
        await supabase
          .from("studio_policies" as any)
          .update({ is_active: false })
          .eq("id", activePolicy.id);
      }

      // Create new version
      const newVersion = (activePolicy?.version || 0) + 1;
      const { data, error } = await supabase
        .from("studio_policies" as any)
        .insert({
          artist_id: null,
          version: newVersion,
          is_active: true,
          settings,
          summary_text: summaryText || generateSummaryText(),
          full_policy_text: fullPolicyText
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Policy saved",
        description: `Version ${newVersion} is now active.`
      });

      fetchPolicies();
    } catch (err) {
      console.error("Error saving policy:", err);
      toast({
        title: "Error",
        description: "Failed to save policy settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PolicySettings>(key: K, value: PolicySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h2 className="font-display text-xl text-foreground">Studio Policies</h2>
            <p className="text-sm text-muted-foreground">
              {activePolicy ? `Version ${activePolicy.version} active` : "No active policy"}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save New Version
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileText className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="acceptances" className="gap-2">
            <Check className="w-4 h-4" />
            Acceptances
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Deposit Settings */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Deposit Settings
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit Amount</Label>
                <Input
                  value={settings.deposit_amount_or_percent}
                  onChange={(e) => updateSetting("deposit_amount_or_percent", e.target.value)}
                  placeholder="$500 or 50%"
                />
              </div>
              <div className="space-y-2">
                <Label>Deposit Due (hours)</Label>
                <Input
                  type="number"
                  value={settings.deposit_due_hours}
                  onChange={(e) => updateSetting("deposit_due_hours", parseInt(e.target.value) || 48)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deposit Refund Option</Label>
              <Select
                value={settings.deposit_refund_option}
                onValueChange={(v) => updateSetting("deposit_refund_option", v as PolicySettings["deposit_refund_option"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_refundable">Non-refundable (protects reserved time)</SelectItem>
                  <SelectItem value="refundable_with_notice">Refundable with proper notice</SelectItem>
                  <SelectItem value="transferable">Transferable to rescheduled date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timing Rules */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Timing Rules
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cancellation Notice (hours)</Label>
                <Input
                  type="number"
                  value={settings.cancellation_window_hours}
                  onChange={(e) => updateSetting("cancellation_window_hours", parseInt(e.target.value) || 72)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reschedule Notice (hours)</Label>
                <Input
                  type="number"
                  value={settings.reschedule_window_hours}
                  onChange={(e) => updateSetting("reschedule_window_hours", parseInt(e.target.value) || 72)}
                />
              </div>
              <div className="space-y-2">
                <Label>Late Threshold (minutes)</Label>
                <Input
                  type="number"
                  value={settings.late_threshold_minutes}
                  onChange={(e) => updateSetting("late_threshold_minutes", parseInt(e.target.value) || 30)}
                />
              </div>
            </div>
          </div>

          {/* Consequences */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Consequences
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cancellation Rule</Label>
                <Input
                  value={settings.cancellation_rule}
                  onChange={(e) => updateSetting("cancellation_rule", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>No-Show Rule</Label>
                <Input
                  value={settings.no_show_rule}
                  onChange={(e) => updateSetting("no_show_rule", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Late Policy Rule</Label>
                <Input
                  value={settings.late_policy_rule}
                  onChange={(e) => updateSetting("late_policy_rule", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reschedule Rule</Label>
                <Input
                  value={settings.reschedule_fee_or_deposit_forfeit_rule}
                  onChange={(e) => updateSetting("reschedule_fee_or_deposit_forfeit_rule", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Future Booking Requirement (after no-show)</Label>
              <Input
                value={settings.future_booking_requirement}
                onChange={(e) => updateSetting("future_booking_requirement", e.target.value)}
              />
            </div>
          </div>

          {/* Legal Requirements */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Legal Requirements
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Age</Label>
                <Input
                  type="number"
                  value={settings.minimum_age}
                  onChange={(e) => updateSetting("minimum_age", parseInt(e.target.value) || 18)}
                />
              </div>
              <div className="space-y-2">
                <Label>ID Requirement</Label>
                <Input
                  value={settings.id_requirement_text}
                  onChange={(e) => updateSetting("id_requirement_text", e.target.value)}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Policy Summary</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSummaryText(generateSummaryText())}
              >
                Auto-generate
              </Button>
            </div>
            <Textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              rows={6}
              placeholder="The concise summary shown during booking..."
              className="font-mono text-sm"
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <h3 className="font-display text-lg">Full Policy Document</h3>
            <Textarea
              value={fullPolicyText}
              onChange={(e) => setFullPolicyText(e.target.value)}
              rows={20}
              placeholder="The complete policy document (supports markdown)..."
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {policyHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No policy versions yet.
              </div>
            ) : (
              policyHistory.map((policy) => (
                <div 
                  key={policy.id} 
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display">Version {policy.version}</span>
                      {policy.is_active && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(policy.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(policy.settings as PolicySettings).deposit_amount_or_percent} deposit
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Acceptances Tab */}
        <TabsContent value="acceptances" className="mt-6">
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {acceptances.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No policy acceptances recorded yet.
              </div>
            ) : (
              acceptances.map((acceptance) => (
                <div 
                  key={acceptance.id} 
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-body text-foreground">{acceptance.client_email}</p>
                    <p className="text-sm text-muted-foreground">
                      Accepted via {acceptance.acceptance_method} on{" "}
                      {new Date(acceptance.accepted_at).toLocaleString()}
                    </p>
                  </div>
                  {acceptance.booking_id && (
                    <span className="text-xs text-muted-foreground">
                      Linked to booking
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PolicySettingsManager;
