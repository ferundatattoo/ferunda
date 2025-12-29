import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, Plus, Trash2, Edit2, Save, Loader2, 
  Eye, EyeOff, Copy, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface MessageTemplate {
  id: string;
  template_key: string;
  template_name: string;
  category: string;
  message_content: string;
  trigger_mode: string | null;
  trigger_event: string | null;
  is_required: boolean;
  allow_ai_variation: boolean;
  available_variables: string[];
  is_active: boolean;
  use_count: number;
}

const CATEGORIES = [
  { value: "greeting", label: "Greetings" },
  { value: "intake", label: "Intake Questions" },
  { value: "booking", label: "Booking" },
  { value: "payment", label: "Payment" },
  { value: "aftercare", label: "Aftercare" },
  { value: "follow_up", label: "Follow Up" }
];

const TRIGGER_MODES = ["explore", "qualify", "commit", "prepare", "aftercare", "rebook"];

const AVAILABLE_VARS = [
  "client_name", "artist_name", "deposit_amount", "scheduled_date", 
  "scheduled_time", "city_name", "placement", "style", "session_hours"
];

const MessageTemplatesManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newTemplate, setNewTemplate] = useState({
    template_key: "",
    template_name: "",
    category: "greeting",
    message_content: "",
    trigger_mode: "",
    trigger_event: "",
    is_required: false,
    allow_ai_variation: true,
    available_variables: [] as string[]
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("concierge_message_templates")
      .select("*")
      .order("category")
      .order("template_name");
    
    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const addTemplate = async () => {
    if (!newTemplate.template_key || !newTemplate.template_name || !newTemplate.message_content) {
      toast({ title: "Error", description: "Fill in all required fields", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("concierge_message_templates").insert({
      template_key: newTemplate.template_key,
      template_name: newTemplate.template_name,
      category: newTemplate.category,
      message_content: newTemplate.message_content,
      trigger_mode: newTemplate.trigger_mode || null,
      trigger_event: newTemplate.trigger_event || null,
      is_required: newTemplate.is_required,
      allow_ai_variation: newTemplate.allow_ai_variation,
      available_variables: newTemplate.available_variables
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: "Template key already exists", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to add template", variant: "destructive" });
      }
    } else {
      toast({ title: "Added", description: "Message template created" });
      setShowAddForm(false);
      setNewTemplate({
        template_key: "", template_name: "", category: "greeting",
        message_content: "", trigger_mode: "", trigger_event: "",
        is_required: false, allow_ai_variation: true, available_variables: []
      });
      fetchTemplates();
    }
  };

  const updateTemplate = async (template: MessageTemplate) => {
    const { error } = await supabase
      .from("concierge_message_templates")
      .update({
        template_name: template.template_name,
        category: template.category,
        message_content: template.message_content,
        trigger_mode: template.trigger_mode,
        trigger_event: template.trigger_event,
        is_required: template.is_required,
        allow_ai_variation: template.allow_ai_variation,
        available_variables: template.available_variables,
        is_active: template.is_active
      })
      .eq("id", template.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Template saved" });
      setEditingTemplate(null);
      fetchTemplates();
    }
  };

  const deleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    const { error } = await supabase.from("concierge_message_templates").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Template removed" });
      fetchTemplates();
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Template copied to clipboard" });
  };

  const toggleVariable = (vars: string[], varName: string) => {
    return vars.includes(varName) 
      ? vars.filter(v => v !== varName)
      : [...vars, varName];
  };

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

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
          Customize key messages. Use {"{{variable}}"} for dynamic content. Toggle AI variation for strict or flexible messaging.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1 text-sm whitespace-nowrap transition-colors ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1 text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {cat.label}
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
                <label className="text-sm text-muted-foreground mb-1 block">Template Key *</label>
                <input
                  type="text"
                  placeholder="e.g., custom_greeting"
                  value={newTemplate.template_key}
                  onChange={(e) => setNewTemplate(prev => ({ 
                    ...prev, 
                    template_key: e.target.value.toLowerCase().replace(/\s+/g, "_") 
                  }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Template Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Custom Greeting"
                  value={newTemplate.template_name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, template_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Message Content *</label>
              <textarea
                placeholder="Type your message here. Use {{client_name}}, {{artist_name}}, etc. for dynamic content."
                value={newTemplate.message_content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, message_content: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Trigger Mode</label>
                <select
                  value={newTemplate.trigger_mode}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, trigger_mode: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                >
                  <option value="">Any mode</option>
                  {TRIGGER_MODES.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Trigger Event</label>
                <input
                  type="text"
                  placeholder="e.g., conversation_start"
                  value={newTemplate.trigger_event}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, trigger_event: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Available Variables</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARS.map(v => (
                  <button
                    key={v}
                    onClick={() => setNewTemplate(prev => ({
                      ...prev,
                      available_variables: toggleVariable(prev.available_variables, v)
                    }))}
                    className={`px-2 py-1 text-xs border transition-colors ${
                      newTemplate.available_variables.includes(v)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={newTemplate.is_required}
                  onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, is_required: checked }))}
                />
                Required (exact message)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={newTemplate.allow_ai_variation}
                  onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, allow_ai_variation: checked }))}
                />
                <Sparkles className="w-3 h-3" />
                Allow AI variation
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={addTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                <Save className="w-4 h-4" />
                Save Template
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

      {/* Templates List */}
      <div className="space-y-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`p-4 bg-card border ${template.is_active ? "border-border" : "border-muted opacity-60"}`}
          >
            {editingTemplate?.id === template.id ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editingTemplate.template_name}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, template_name: e.target.value } : null)}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                />
                <textarea
                  value={editingTemplate.message_content}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, message_content: e.target.value } : null)}
                  rows={4}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground resize-none"
                />
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={editingTemplate.is_required}
                      onCheckedChange={(checked) => setEditingTemplate(prev => prev ? { ...prev, is_required: checked } : null)}
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={editingTemplate.allow_ai_variation}
                      onCheckedChange={(checked) => setEditingTemplate(prev => prev ? { ...prev, allow_ai_variation: checked } : null)}
                    />
                    AI variation
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateTemplate(editingTemplate)}
                    className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-sm"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="px-3 py-1 text-muted-foreground text-sm hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <h3 className="font-medium text-foreground">{template.template_name}</h3>
                    <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                    {template.trigger_mode && (
                      <Badge variant="outline" className="text-xs">{template.trigger_mode}</Badge>
                    )}
                    {template.is_required && (
                      <Badge variant="default" className="text-xs">Required</Badge>
                    )}
                    {template.allow_ai_variation && (
                      <span title="AI can vary this"><Sparkles className="w-3 h-3 text-primary" /></span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(template.message_content)}
                      className="p-2 text-muted-foreground hover:text-foreground"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateTemplate({ ...template, is_active: !template.is_active })}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      {template.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id, template.template_name)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground bg-secondary/50 p-2 rounded">
                  {template.message_content}
                </p>
                {template.available_variables?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.available_variables.map(v => (
                      <span key={v} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No templates in this category.
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageTemplatesManager;
