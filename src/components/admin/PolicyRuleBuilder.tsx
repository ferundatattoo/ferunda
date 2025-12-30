import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Shield, AlertTriangle, CheckCircle, Eye, Copy, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PolicyRule {
  id: string;
  rule_id: string;
  name: string;
  description: string;
  scope_type: string;
  scope_id: string | null;
  priority: number;
  enabled: boolean;
  condition_json: any;
  action: {
    decision: string;
    reasonCode: string;
    nextActions?: any[];
  };
  warning_key: string | null;
  explain_public: string;
  explain_internal: string;
}

interface PolicyWarning {
  warning_key: string;
  warning_title: string;
  client_message: string;
  severity: string;
}

const RULE_TEMPLATES = [
  {
    id: 'block_color',
    name: 'Block Color Work',
    category: 'style',
    condition: { "==": [{ "var": "declared.wantsColor" }, true] },
    action: { decision: 'BLOCK', reasonCode: 'COLOR_NOT_OFFERED' },
    explain: 'This artist specializes in black & grey work only.',
  },
  {
    id: 'block_coverup',
    name: 'Block Cover-ups',
    category: 'work_type',
    condition: { "==": [{ "var": "workType.value" }, "coverup"] },
    action: { decision: 'BLOCK', reasonCode: 'COVERUPS_NOT_OFFERED' },
    explain: 'Cover-up projects are not currently accepted.',
  },
  {
    id: 'block_touchup',
    name: 'Block Touch-ups',
    category: 'work_type',
    condition: { "==": [{ "var": "workType.value" }, "touchup"] },
    action: { decision: 'BLOCK', reasonCode: 'TOUCHUPS_NOT_OFFERED' },
    explain: 'Touch-up projects are not currently accepted.',
  },
  {
    id: 'review_small_realism',
    name: 'Review Small Micro-Realism',
    category: 'feasibility',
    condition: {
      "and": [
        { "in": ["micro_realism", { "var": "stylesDetected.tags" }] },
        { "<": [{ "var": "inferred.sizeInchesEstimate" }, 3] }
      ]
    },
    action: { decision: 'REVIEW', reasonCode: 'SMALL_REALISM_REVIEW' },
    explain: 'Very small micro-realism pieces require review to ensure detail viability.',
  },
  {
    id: 'warn_first_tattoo',
    name: 'Warn First-Time Clients',
    category: 'client',
    condition: { "==": [{ "var": "declared.firstTattoo" }, true] },
    action: { decision: 'ALLOW_WITH_WARNING', reasonCode: 'FIRST_TATTOO' },
    explain: 'First tattoo guidance will be provided.',
  },
  {
    id: 'review_hands_face',
    name: 'Review Hands/Face/Neck',
    category: 'placement',
    condition: {
      "or": [
        { "in": [{ "var": "inferred.placement" }, ["hands", "hand", "fingers", "face", "neck"]] }
      ]
    },
    action: { decision: 'REVIEW', reasonCode: 'VISIBLE_PLACEMENT_REVIEW' },
    explain: 'Highly visible placements require additional consultation.',
  },
  {
    id: 'block_high_risk',
    name: 'Block High-Risk Clients',
    category: 'client',
    condition: { ">": [{ "var": "clientRisk.riskScore" }, 70] },
    action: { decision: 'BLOCK', reasonCode: 'HIGH_RISK_CLIENT' },
    explain: 'This booking cannot be processed at this time.',
  },
];

const DECISION_OPTIONS = [
  { value: 'ALLOW', label: 'Allow', icon: CheckCircle, color: 'text-green-500' },
  { value: 'ALLOW_WITH_WARNING', label: 'Allow with Warning', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'REVIEW', label: 'Require Review', icon: Eye, color: 'text-blue-500' },
  { value: 'BLOCK', label: 'Block', icon: Shield, color: 'text-red-500' },
];

export default function PolicyRuleBuilder() {
  const { toast } = useToast();
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [warnings, setWarnings] = useState<PolicyWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    fetchRules();
    fetchWarnings();
  }, []);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from("policy_rules")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      toast({ title: "Error loading rules", description: error.message, variant: "destructive" });
    } else {
      setRules((data || []) as unknown as PolicyRule[]);
    }
    setLoading(false);
  };

  const fetchWarnings = async () => {
    const { data } = await supabase
      .from("policy_warnings")
      .select("warning_key, warning_title, client_message, severity")
      .eq("is_active", true);
    setWarnings(data || []);
  };

  const createFromTemplate = async (template: typeof RULE_TEMPLATES[0]) => {
    const newRuleData = {
      rule_id: `rule_${template.id}_${Date.now()}`,
      name: template.name,
      description: `Auto-generated from ${template.name} template`,
      scope_type: 'global',
      priority: 50,
      enabled: true,
      condition_json: template.condition,
      action: template.action,
      explain_public: template.explain,
      explain_internal: `Template: ${template.id}`,
    };

    const { data, error } = await supabase
      .from("policy_rules")
      .insert(newRuleData)
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating rule", description: error.message, variant: "destructive" });
    } else {
      setRules([data as unknown as PolicyRule, ...rules]);
      toast({ title: "Rule created", description: `${template.name} rule added` });
      setShowTemplates(false);
    }
  };

  const toggleRule = async (rule: PolicyRule) => {
    const { error } = await supabase
      .from("policy_rules")
      .update({ enabled: !rule.enabled })
      .eq("id", rule.id);

    if (error) {
      toast({ title: "Error updating rule", variant: "destructive" });
    } else {
      setRules(rules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    const { error } = await supabase
      .from("policy_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      toast({ title: "Error deleting rule", variant: "destructive" });
    } else {
      setRules(rules.filter(r => r.id !== ruleId));
      toast({ title: "Rule deleted" });
    }
  };

  const saveRule = async () => {
    if (!editingRule) return;

    const { error } = await supabase
      .from("policy_rules")
      .update({
        name: editingRule.name,
        description: editingRule.description,
        priority: editingRule.priority,
        enabled: editingRule.enabled,
        condition_json: editingRule.condition_json,
        action: editingRule.action,
        warning_key: editingRule.warning_key,
        explain_public: editingRule.explain_public,
        explain_internal: editingRule.explain_internal,
      })
      .eq("id", editingRule.id);

    if (error) {
      toast({ title: "Error saving rule", variant: "destructive" });
    } else {
      setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
      setEditingRule(null);
      toast({ title: "Rule saved" });
    }
  };

  const getDecisionBadge = (decision: string) => {
    const opt = DECISION_OPTIONS.find(o => o.value === decision);
    if (!opt) return null;
    const Icon = opt.icon;
    return (
      <Badge variant="outline" className={`${opt.color} border-current`}>
        <Icon className="w-3 h-3 mr-1" />
        {opt.label}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading rules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Policy Rules</h2>
          <p className="text-muted-foreground">Configure automatic booking decisions</p>
        </div>
        <Button onClick={() => setShowTemplates(!showTemplates)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Rule Templates */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Rule Templates</CardTitle>
                <CardDescription>Quick-start with common rule patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {RULE_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => createFromTemplate(template)}
                      className="p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                        {getDecisionBadge(template.action.decision)}
                      </div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{template.explain}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Rules */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Policy Rules</h3>
            <p className="text-muted-foreground mb-4">Create rules to automate booking decisions</p>
            <Button onClick={() => setShowTemplates(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Rule
            </Button>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className={`transition-opacity ${!rule.enabled ? 'opacity-60' : ''}`}>
              {editingRule?.id === rule.id ? (
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Rule Name</Label>
                      <Input
                        value={editingRule.name}
                        onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Priority (higher = evaluated first)</Label>
                      <Input
                        type="number"
                        value={editingRule.priority}
                        onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Decision</Label>
                    <Select
                      value={editingRule.action.decision}
                      onValueChange={(v) => setEditingRule({
                        ...editingRule,
                        action: { ...editingRule.action, decision: v }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DECISION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className={opt.color}>{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editingRule.action.decision === 'ALLOW_WITH_WARNING' && (
                    <div>
                      <Label>Warning Template</Label>
                      <Select
                        value={editingRule.warning_key || ''}
                        onValueChange={(v) => setEditingRule({ ...editingRule, warning_key: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a warning..." />
                        </SelectTrigger>
                        <SelectContent>
                          {warnings.map((w) => (
                            <SelectItem key={w.warning_key} value={w.warning_key}>
                              {w.warning_title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Public Explanation (shown to clients)</Label>
                    <Textarea
                      value={editingRule.explain_public}
                      onChange={(e) => setEditingRule({ ...editingRule, explain_public: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Condition (JSON)</Label>
                    <Textarea
                      className="font-mono text-sm"
                      rows={4}
                      value={JSON.stringify(editingRule.condition_json, null, 2)}
                      onChange={(e) => {
                        try {
                          setEditingRule({ ...editingRule, condition_json: JSON.parse(e.target.value) });
                        } catch { }
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveRule}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditingRule(null)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{rule.name}</h3>
                        {getDecisionBadge(rule.action.decision)}
                        <Badge variant="secondary" className="text-xs">Priority: {rule.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.explain_public}</p>
                      <p className="text-xs font-mono text-muted-foreground/60 mt-2">
                        {rule.rule_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => toggleRule(rule)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => setEditingRule(rule)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
