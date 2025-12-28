import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Check,
  X,
  Copy,
  Eye,
  Code,
  FileText,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  template_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_VARIABLES = [
  { key: "{{name}}", description: "Client's name" },
  { key: "{{date}}", description: "Scheduled date" },
  { key: "{{time}}", description: "Scheduled time" },
  { key: "{{balance}}", description: "Remaining balance" },
  { key: "{{payment_link}}", description: "Clover payment link" },
  { key: "{{deposit}}", description: "Deposit amount" },
  { key: "{{city}}", description: "Session city" },
  { key: "{{studio}}", description: "Studio name" },
  { key: "{{address}}", description: "Studio address" },
  { key: "{{tracking_code}}", description: "Booking tracking code" }
];

const TEMPLATE_TYPES = [
  { value: "inquiry_response", label: "Inquiry Response" },
  { value: "reference_request", label: "Reference Request" },
  { value: "deposit_request", label: "Deposit Request" },
  { value: "appointment_confirmation", label: "Appointment Confirmation" },
  { value: "reminder_24h", label: "24-Hour Reminder" },
  { value: "aftercare", label: "Aftercare Instructions" },
  { value: "followup", label: "Follow-up" },
  { value: "custom", label: "Custom" }
];

const EmailTemplateManager = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    template_type: "custom",
    is_active: true
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_type", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      body: "",
      template_type: "custom",
      is_active: true
    });
    setEditingTemplate(null);
    setIsCreating(false);
    setShowPreview(false);
  };

  const openEditForm = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      template_type: template.template_type,
      is_active: template.is_active
    });
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      toast({ title: "Error", description: "Name, subject, and body are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            name: formData.name,
            subject: formData.subject,
            body: formData.body,
            template_type: formData.template_type,
            is_active: formData.is_active
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast({ title: "Updated", description: "Template saved successfully." });
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert({
            name: formData.name,
            subject: formData.subject,
            body: formData.body,
            template_type: formData.template_type,
            is_active: formData.is_active
          });

        if (error) throw error;
        toast({ title: "Created", description: "New template added." });
      }

      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete "${template.name}" template?`)) return;

    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;
      toast({ title: "Deleted", description: "Template removed." });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("template-body") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = formData.body.substring(0, start) + variable + formData.body.substring(end);
      setFormData({ ...formData, body: newBody });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const generateWithAI = async () => {
    if (!formData.template_type || formData.template_type === "custom") {
      toast({ title: "Select a type", description: "Choose a template type first for AI generation.", variant: "destructive" });
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Generate a professional, warm email template for a tattoo artist's ${formData.template_type.replace(/_/g, " ")} email. 
            The artist is Ferunda, a renowned tattoo artist known for micro-realism and fine-line work.
            Include appropriate placeholders: {{name}}, {{date}}, {{city}}, {{deposit}}, {{payment_link}}, {{balance}}, {{tracking_code}}.
            Keep it concise but personal. Return ONLY the email body, no subject line.`,
            conversationHistory: []
          })
        }
      );

      const data = await response.json();
      if (data.response) {
        setFormData({
          ...formData,
          body: data.response,
          subject: formData.subject || generateSubjectFromType(formData.template_type)
        });
        toast({ title: "Generated", description: "AI template created. Review and customize." });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "AI generation failed. Try again.", variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  const generateSubjectFromType = (type: string) => {
    const subjects: Record<string, string> = {
      inquiry_response: "Re: Your Tattoo Inquiry - Ferunda",
      reference_request: "Reference Images Needed - {{name}}",
      deposit_request: "Secure Your Session - Deposit Required",
      appointment_confirmation: "Confirmed: Your Tattoo Session on {{date}}",
      reminder_24h: "Tomorrow: Your Tattoo Session with Ferunda",
      aftercare: "Aftercare Instructions for Your New Tattoo",
      followup: "How's Your Tattoo Healing? - Ferunda"
    };
    return subjects[type] || "";
  };

  const duplicateTemplate = (template: EmailTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      body: template.body,
      template_type: template.template_type,
      is_active: true
    });
    setIsCreating(true);
  };

  const getPreviewContent = () => {
    return formData.body
      .replace(/\{\{name\}\}/g, "John Doe")
      .replace(/\{\{date\}\}/g, "January 15, 2025")
      .replace(/\{\{time\}\}/g, "2:00 PM")
      .replace(/\{\{city\}\}/g, "Austin")
      .replace(/\{\{studio\}\}/g, "Ferunda Studio Austin")
      .replace(/\{\{address\}\}/g, "123 Main St, Austin, TX")
      .replace(/\{\{deposit\}\}/g, "$500")
      .replace(/\{\{balance\}\}/g, "$2,000")
      .replace(/\{\{payment_link\}\}/g, "https://pay.example.com/abc123")
      .replace(/\{\{tracking_code\}\}/g, "ABCD1234");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Email Templates
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Create and manage email templates for client communication
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreating(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Edit/Create Form */}
      <AnimatePresence>
        {(isCreating || editingTemplate) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-border overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-light text-foreground">
                  {editingTemplate ? `Edit Template` : "Create New Template"}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateWithAI}
                    disabled={generatingAI}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 font-body text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    AI Generate
                  </button>
                  <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-body text-sm text-muted-foreground">Template Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., deposit_request"
                        className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                      />
                    </div>
                    <div>
                      <label className="font-body text-sm text-muted-foreground">Type</label>
                      <select
                        value={formData.template_type}
                        onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                      >
                        {TEMPLATE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Subject Line *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g., Your Booking Confirmation - Ferunda"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-body text-sm text-muted-foreground">Email Body *</label>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {showPreview ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showPreview ? "Edit" : "Preview"}
                      </button>
                    </div>
                    {showPreview ? (
                      <div className="w-full mt-1 px-4 py-3 bg-accent/30 border border-border text-foreground font-body text-sm whitespace-pre-wrap min-h-[300px]">
                        {getPreviewContent()}
                      </div>
                    ) : (
                      <textarea
                        id="template-body"
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        placeholder="Write your email template here..."
                        rows={12}
                        className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50 resize-none"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        formData.is_active ? "bg-emerald-500" : "bg-muted"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        formData.is_active ? "left-5" : "left-1"
                      }`} />
                    </button>
                    <span className="font-body text-sm text-foreground">
                      {formData.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Variables Panel */}
                <div className="space-y-4">
                  <h4 className="font-body text-sm uppercase tracking-wider text-muted-foreground">
                    Available Variables
                  </h4>
                  <p className="font-body text-xs text-muted-foreground">
                    Click to insert at cursor position
                  </p>
                  <div className="grid gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        className="flex items-center justify-between p-2 border border-border hover:border-foreground/30 transition-colors text-left"
                      >
                        <code className="font-mono text-sm text-amber-400">{v.key}</code>
                        <span className="font-body text-xs text-muted-foreground">{v.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 border border-border font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template List */}
      <div className="space-y-3">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border p-4 transition-colors ${
              template.is_active ? "border-border hover:border-foreground/30" : "border-border/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-body text-sm font-medium text-foreground">
                      {template.name.replace(/_/g, " ")}
                    </h3>
                    <span className="px-2 py-0.5 bg-accent text-muted-foreground text-xs font-body">
                      {TEMPLATE_TYPES.find(t => t.value === template.template_type)?.label || template.template_type}
                    </span>
                    {!template.is_active && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-body">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    {template.subject}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => duplicateTemplate(template)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditForm(template)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-20 border border-border">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground">No email templates yet</p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 px-6 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
          >
            Create Your First Template
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateManager;
