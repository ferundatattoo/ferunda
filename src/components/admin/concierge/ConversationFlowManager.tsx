import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  GitBranch, Plus, Trash2, Edit2, Save, Loader2, 
  GripVertical, ArrowDown, CheckCircle, Circle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface FlowStep {
  id: string;
  step_order: number;
  step_key: string;
  step_name: string;
  concierge_mode: string;
  default_question: string;
  collects_field: string | null;
  is_required: boolean;
  skip_if_known: boolean;
  depends_on: string[] | null;
  follow_up_on_unclear: boolean;
  max_follow_ups: number;
  is_active: boolean;
}

const MODES = ["explore", "qualify", "commit", "prepare", "aftercare", "rebook"];
const BRIEF_FIELDS = [
  "subject", "style", "mood_keywords", "placement", "size_estimate", 
  "color_type", "budget", "deadline", "references", "confirmation"
];

const ConversationFlowManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [newStep, setNewStep] = useState({
    step_key: "",
    step_name: "",
    concierge_mode: "explore",
    default_question: "",
    collects_field: "",
    is_required: true,
    skip_if_known: true,
    follow_up_on_unclear: true,
    max_follow_ups: 2
  });

  useEffect(() => {
    fetchSteps();
  }, []);

  const fetchSteps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("concierge_flow_config")
      .select("*")
      .order("step_order");
    
    if (!error && data) {
      setSteps(data);
    }
    setLoading(false);
  };

  const addStep = async () => {
    if (!newStep.step_key || !newStep.step_name || !newStep.default_question) {
      toast({ title: "Error", description: "Fill in all required fields", variant: "destructive" });
      return;
    }

    const maxOrder = Math.max(...steps.map(s => s.step_order), 0);

    const { error } = await supabase.from("concierge_flow_config").insert({
      step_order: maxOrder + 1,
      step_key: newStep.step_key,
      step_name: newStep.step_name,
      concierge_mode: newStep.concierge_mode,
      default_question: newStep.default_question,
      collects_field: newStep.collects_field || null,
      is_required: newStep.is_required,
      skip_if_known: newStep.skip_if_known,
      follow_up_on_unclear: newStep.follow_up_on_unclear,
      max_follow_ups: newStep.max_follow_ups
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "Step key already exists", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to add step", variant: "destructive" });
      }
    } else {
      toast({ title: "Added", description: "Flow step created" });
      setShowAddForm(false);
      setNewStep({
        step_key: "", step_name: "", concierge_mode: "explore",
        default_question: "", collects_field: "", is_required: true,
        skip_if_known: true, follow_up_on_unclear: true, max_follow_ups: 2
      });
      fetchSteps();
    }
  };

  const updateStep = async (step: FlowStep) => {
    const { error } = await supabase
      .from("concierge_flow_config")
      .update({
        step_name: step.step_name,
        concierge_mode: step.concierge_mode,
        default_question: step.default_question,
        collects_field: step.collects_field,
        is_required: step.is_required,
        skip_if_known: step.skip_if_known,
        follow_up_on_unclear: step.follow_up_on_unclear,
        max_follow_ups: step.max_follow_ups,
        is_active: step.is_active
      })
      .eq("id", step.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Flow step updated" });
      setEditingStep(null);
      fetchSteps();
    }
  };

  const deleteStep = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    const { error } = await supabase.from("concierge_flow_config").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Step removed" });
      fetchSteps();
    }
  };

  const moveStep = async (stepId: string, direction: "up" | "down") => {
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const currentStep = steps[currentIndex];
    const targetStep = steps[targetIndex];

    // Swap orders
    await Promise.all([
      supabase.from("concierge_flow_config").update({ step_order: targetStep.step_order }).eq("id", currentStep.id),
      supabase.from("concierge_flow_config").update({ step_order: currentStep.step_order }).eq("id", targetStep.id)
    ]);

    fetchSteps();
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "explore": return "bg-blue-500/20 text-blue-400";
      case "qualify": return "bg-amber-500/20 text-amber-400";
      case "commit": return "bg-green-500/20 text-green-400";
      case "prepare": return "bg-purple-500/20 text-purple-400";
      case "aftercare": return "bg-pink-500/20 text-pink-400";
      case "rebook": return "bg-cyan-500/20 text-cyan-400";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const filteredSteps = selectedMode === "all" 
    ? steps 
    : steps.filter(s => s.concierge_mode === selectedMode);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Define the conversation flow. Each step asks one question at a time for a natural feel.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>
      </div>

      {/* Mode Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedMode("all")}
          className={`px-3 py-1 text-sm whitespace-nowrap transition-colors ${
            selectedMode === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          All Modes
        </button>
        {MODES.map(mode => (
          <button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            className={`px-3 py-1 text-sm whitespace-nowrap capitalize transition-colors ${
              selectedMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-card border border-border space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Step Key *</label>
                <input
                  type="text"
                  placeholder="e.g., ask_style"
                  value={newStep.step_key}
                  onChange={(e) => setNewStep(prev => ({ 
                    ...prev, 
                    step_key: e.target.value.toLowerCase().replace(/\s+/g, "_") 
                  }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Step Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Ask About Style"
                  value={newStep.step_name}
                  onChange={(e) => setNewStep(prev => ({ ...prev, step_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Mode</label>
                <select
                  value={newStep.concierge_mode}
                  onChange={(e) => setNewStep(prev => ({ ...prev, concierge_mode: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground capitalize"
                >
                  {MODES.map(mode => (
                    <option key={mode} value={mode} className="capitalize">{mode}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Question *</label>
              <textarea
                placeholder="The question the Concierge will ask at this step..."
                value={newStep.default_question}
                onChange={(e) => setNewStep(prev => ({ ...prev, default_question: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Collects Field</label>
                <select
                  value={newStep.collects_field}
                  onChange={(e) => setNewStep(prev => ({ ...prev, collects_field: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                >
                  <option value="">None (conversational)</option>
                  {BRIEF_FIELDS.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Max Follow-ups</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={newStep.max_follow_ups}
                  onChange={(e) => setNewStep(prev => ({ ...prev, max_follow_ups: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={newStep.is_required}
                  onCheckedChange={(checked) => setNewStep(prev => ({ ...prev, is_required: checked }))}
                />
                Required step
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={newStep.skip_if_known}
                  onCheckedChange={(checked) => setNewStep(prev => ({ ...prev, skip_if_known: checked }))}
                />
                Skip if already known
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={newStep.follow_up_on_unclear}
                  onCheckedChange={(checked) => setNewStep(prev => ({ ...prev, follow_up_on_unclear: checked }))}
                />
                Follow up if unclear
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={addStep}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                <Save className="w-4 h-4" />
                Save Step
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flow Steps List */}
      <div className="space-y-2">
        {filteredSteps.map((step, index) => (
          <div key={step.id}>
            <div
              className={`p-4 bg-card border ${step.is_active ? "border-border" : "border-muted opacity-60"}`}
            >
              {editingStep?.id === step.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={editingStep.step_name}
                      onChange={(e) => setEditingStep(prev => prev ? { ...prev, step_name: e.target.value } : null)}
                      className="px-3 py-2 bg-background border border-border text-foreground"
                    />
                    <select
                      value={editingStep.concierge_mode}
                      onChange={(e) => setEditingStep(prev => prev ? { ...prev, concierge_mode: e.target.value } : null)}
                      className="px-3 py-2 bg-background border border-border text-foreground capitalize"
                    >
                      {MODES.map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={editingStep.default_question}
                    onChange={(e) => setEditingStep(prev => prev ? { ...prev, default_question: e.target.value } : null)}
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground resize-none"
                  />
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={editingStep.is_required}
                        onCheckedChange={(checked) => setEditingStep(prev => prev ? { ...prev, is_required: checked } : null)}
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={editingStep.skip_if_known}
                        onCheckedChange={(checked) => setEditingStep(prev => prev ? { ...prev, skip_if_known: checked } : null)}
                      />
                      Skip if known
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStep(editingStep)}
                      className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-sm"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingStep(null)}
                      className="px-3 py-1 text-muted-foreground text-sm hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => moveStep(step.id, "up")}
                      disabled={index === 0}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3 rotate-180" />
                    </button>
                    <span className="text-xs text-muted-foreground font-mono">{step.step_order}</span>
                    <button
                      onClick={() => moveStep(step.id, "down")}
                      disabled={index === filteredSteps.length - 1}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {step.is_required ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <h3 className="font-medium text-foreground">{step.step_name}</h3>
                      <Badge className={`text-xs ${getModeColor(step.concierge_mode)}`}>
                        {step.concierge_mode}
                      </Badge>
                      {step.collects_field && (
                        <Badge variant="outline" className="text-xs">
                          → {step.collects_field}
                        </Badge>
                      )}
                      {step.skip_if_known && (
                        <span className="text-xs text-muted-foreground">(skip if known)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      "{step.default_question}"
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateStep({ ...step, is_active: !step.is_active })}
                      className={`p-2 transition-colors ${
                        step.is_active ? "text-primary" : "text-muted-foreground"
                      } hover:text-foreground`}
                    >
                      <GitBranch className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingStep(step)}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteStep(step.id, step.step_name)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            {index < filteredSteps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
              </div>
            )}
          </div>
        ))}

        {filteredSteps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No flow steps in this mode. Add your first step.
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationFlowManager;
