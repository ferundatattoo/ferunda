import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  X, Mail, Phone, Calendar, Clock, DollarSign, 
  FileText, Image as ImageIcon, MessageCircle, Send,
  ChevronRight, Check, Trash2, ExternalLink, Copy, 
  Loader2, Star, ArrowRight, History, Edit2, Save,
  MapPin, User, CreditCard, Bell, Link as LinkIcon
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "./BookingPipeline";

interface BookingActivity {
  id: string;
  booking_id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_by: string;
  created_at: string;
}

interface Stage {
  id: string;
  label: string;
  color: string;
  description: string;
}

interface BookingDetailPanelProps {
  booking: Booking;
  activities: BookingActivity[];
  loadingActivities: boolean;
  stages: Stage[];
  updating: string | null;
  onClose: () => void;
  onUpdateStage: (bookingId: string, stage: string) => void;
  onUpdateField: (bookingId: string, field: string, value: any) => void;
  onDelete: (bookingId: string) => void;
  onCopyCode: (code: string) => void;
  onRefreshActivities: () => void;
}

const BookingDetailPanel = ({
  booking,
  activities,
  loadingActivities,
  stages,
  updating,
  onClose,
  onUpdateStage,
  onUpdateField,
  onDelete,
  onCopyCode,
  onRefreshActivities
}: BookingDetailPanelProps) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<"details" | "actions" | "timeline">("details");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);
  const [generatingPortalLink, setGeneratingPortalLink] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingEmail, setEditingEmail] = useState<{
    templateName: string;
    subject: string;
    body: string;
  } | null>(null);

  const currentStage = stages.find(s => s.id === (booking.pipeline_stage || "new_inquiry"));
  const currentStageIndex = stages.findIndex(s => s.id === (booking.pipeline_stage || "new_inquiry"));
  const nextStage = stages[currentStageIndex + 1];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true);
    setTemplates(data || []);
  };

  const handleSaveField = (field: string) => {
    onUpdateField(booking.id, field, tempValue);
    setEditingField(null);
    setTempValue("");
  };

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setTempValue(currentValue || "");
  };

  const prepareTemplateEmail = async (templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (!template) {
      toast({ title: "Error", description: "Template not found", variant: "destructive" });
      return;
    }

    // Replace template variables
    let body = template.body
      .replace(/\{\{name\}\}/g, booking.name)
      .replace(/\{\{date\}\}/g, booking.scheduled_date ? format(new Date(booking.scheduled_date), "MMMM d, yyyy") : "TBD")
      .replace(/\{\{balance\}\}/g, String((booking.session_rate || 2500) - (booking.deposit_amount || 500)));

    // Get payment link if needed
    if (body.includes("{{payment_link}}")) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.error("No session for payment link");
        } else {
          const linkResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-payment-link`,
            {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ 
                bookingId: booking.id,
                amount: booking.deposit_amount || 500,
                customerEmail: booking.email,
                customerName: booking.name
              }),
            }
          );
          if (linkResponse.ok) {
            const linkData = await linkResponse.json();
            body = body.replace(/\{\{payment_link\}\}/g, linkData.paymentUrl || "");
          } else {
            console.error("Payment link error:", await linkResponse.text());
          }
        }
      } catch (e) {
        console.error("Failed to get payment link:", e);
      }
    }

    const subject = template.subject.replace(/\{\{name\}\}/g, booking.name);
    
    setEditingEmail({
      templateName: template.name,
      subject,
      body
    });
  };

  const sendEditedEmail = async () => {
    if (!editingEmail) return;
    
    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: booking.email,
            subject: editingEmail.subject,
            body: editingEmail.body,
            customerName: booking.name,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send email");

      // Log activity
      await supabase.from("booking_activities").insert({
        booking_id: booking.id,
        activity_type: "email_sent",
        description: `Sent "${editingEmail.templateName.replace(/_/g, " ")}" email`,
        metadata: { template: editingEmail.templateName, to: booking.email }
      });

      // Update last contacted
      onUpdateField(booking.id, "last_contacted_at", new Date().toISOString());

      toast({ title: "Sent!", description: `Email sent to ${booking.email}` });
      setEditingEmail(null);
      onRefreshActivities();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const openWhatsApp = () => {
    if (!booking.phone) return;
    const message = encodeURIComponent(`Hi ${booking.name}, this is Fernando regarding your tattoo inquiry.`);
    window.open(`https://wa.me/${booking.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleCopyPortalLink = async () => {
    setGeneratingPortalLink(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/magic-link?action=admin-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ booking_id: booking.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate portal link");
      }

      const data = await response.json();
      await navigator.clipboard.writeText(data.portal_url);
      
      toast({ 
        title: "Portal Link Copied!", 
        description: "Open in a new tab to test the Customer Portal." 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setGeneratingPortalLink(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "stage_change": return <ArrowRight className="w-3 h-3" />;
      case "email_sent": return <Mail className="w-3 h-3" />;
      case "field_update": return <Edit2 className="w-3 h-3" />;
      default: return <History className="w-3 h-3" />;
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-xl bg-background border-l border-border z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${currentStage?.color}`} />
          <div>
            <h2 className="font-display text-xl text-foreground">{booking.name}</h2>
            <p className="font-body text-xs text-muted-foreground">{currentStage?.label}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Actions Bar */}
      <div className="p-3 border-b border-border flex items-center gap-2 overflow-x-auto">
        {nextStage && nextStage.id !== "cancelled" && (
          <button
            onClick={() => onUpdateStage(booking.id, nextStage.id)}
            disabled={updating === booking.id}
            className="flex items-center gap-2 px-3 py-2 bg-foreground text-background font-body text-xs whitespace-nowrap hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {updating === booking.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
            Move to {nextStage.label}
          </button>
        )}
        <a
          href={`mailto:${booking.email}`}
          className="flex items-center gap-2 px-3 py-2 border border-border font-body text-xs whitespace-nowrap hover:bg-accent transition-colors"
        >
          <Mail className="w-3 h-3" />
          Email
        </a>
        {booking.phone && (
          <button
            onClick={openWhatsApp}
            className="flex items-center gap-2 px-3 py-2 border border-[#25D366]/50 text-[#25D366] font-body text-xs whitespace-nowrap hover:bg-[#25D366]/10 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </button>
        )}
        {booking.tracking_code && (
          <button
            onClick={() => onCopyCode(booking.tracking_code!)}
            className="flex items-center gap-2 px-3 py-2 border border-border font-body text-xs font-mono whitespace-nowrap hover:bg-accent transition-colors"
          >
            <Copy className="w-3 h-3" />
            {booking.tracking_code}
          </button>
        )}
        <button
          onClick={handleCopyPortalLink}
          disabled={generatingPortalLink}
          className="flex items-center gap-2 px-3 py-2 border border-primary/50 text-primary font-body text-xs whitespace-nowrap hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {generatingPortalLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
          Copy Portal Link
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        {(["details", "actions", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={`flex-1 py-3 font-body text-sm capitalize ${
              activeSection === tab
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === "details" && (
          <div className="space-y-6">
            {/* Pipeline Progress */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Pipeline Stage
              </h3>
              <div className="flex flex-wrap gap-2">
                {stages.slice(0, -1).map((stage, index) => {
                  const isActive = stage.id === (booking.pipeline_stage || "new_inquiry");
                  const isPast = index < currentStageIndex;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => onUpdateStage(booking.id, stage.id)}
                      disabled={updating === booking.id}
                      className={`px-3 py-1.5 font-body text-xs transition-colors ${
                        isActive
                          ? `${stage.color} text-white`
                          : isPast
                          ? "bg-foreground/10 text-foreground"
                          : "bg-accent text-muted-foreground hover:bg-accent/80"
                      }`}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Contact Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-accent/30">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-body text-sm text-foreground">{booking.email}</span>
                </div>
                {booking.phone && (
                  <div className="flex items-center gap-3 p-2 bg-accent/30">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-body text-sm text-foreground">{booking.phone}</span>
                  </div>
                )}
                {booking.full_name && (
                  <div className="flex items-center gap-3 p-2 bg-accent/30">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-body text-sm text-foreground">Full name: {booking.full_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tattoo Details */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Tattoo Details
              </h3>
              <p className="font-body text-sm text-foreground/80 whitespace-pre-wrap mb-3">
                {booking.tattoo_description}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {booking.placement && (
                  <div className="p-2 bg-accent/30">
                    <span className="font-body text-xs text-muted-foreground">Placement</span>
                    <p className="font-body text-sm text-foreground">{booking.placement}</p>
                  </div>
                )}
                {booking.size && (
                  <div className="p-2 bg-accent/30">
                    <span className="font-body text-xs text-muted-foreground">Size</span>
                    <p className="font-body text-sm text-foreground capitalize">{booking.size}</p>
                  </div>
                )}
                {booking.preferred_date && (
                  <div className="p-2 bg-accent/30">
                    <span className="font-body text-xs text-muted-foreground">Preferred Date</span>
                    <p className="font-body text-sm text-foreground">
                      {format(new Date(booking.preferred_date), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                <div className="p-2 bg-accent/30">
                  <span className="font-body text-xs text-muted-foreground">Submitted</span>
                  <p className="font-body text-sm text-foreground">
                    {format(new Date(booking.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>

            {/* Reference Images */}
            {booking.reference_images && booking.reference_images.length > 0 && (
              <div>
                <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Reference Images ({booking.reference_images.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {booking.reference_images.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square border border-border hover:border-foreground/50 transition-colors overflow-hidden"
                    >
                      <img src={url} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Financial */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Financial
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-accent/30">
                  <span className="font-body text-sm text-muted-foreground">Session Rate</span>
                  {editingField === "session_rate" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-24 px-2 py-1 bg-background border border-border text-foreground font-body text-sm"
                      />
                      <button onClick={() => handleSaveField("session_rate")} className="text-green-500">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing("session_rate", booking.session_rate)}
                      className="font-body text-sm text-foreground hover:text-foreground/80"
                    >
                      ${booking.session_rate || 2500}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/30">
                  <span className="font-body text-sm text-muted-foreground">Deposit</span>
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm text-foreground">${booking.deposit_amount || 500}</span>
                    {booking.deposit_paid ? (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs">PAID</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs">PENDING</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/30">
                  <span className="font-body text-sm text-muted-foreground">Balance Due</span>
                  <span className="font-body text-sm text-foreground font-medium">
                    ${(booking.session_rate || 2500) - (booking.deposit_paid ? (booking.deposit_amount || 500) : 0)}
                  </span>
                </div>
                {booking.payment_method && (
                  <div className="flex items-center justify-between p-3 bg-accent/30">
                    <span className="font-body text-sm text-muted-foreground">Payment Method</span>
                    <span className="font-body text-sm text-foreground capitalize">{booking.payment_method}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Scheduling
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-accent/30">
                  <span className="font-body text-sm text-muted-foreground">Scheduled Date</span>
                  {editingField === "scheduled_date" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="px-2 py-1 bg-background border border-border text-foreground font-body text-sm"
                      />
                      <button onClick={() => handleSaveField("scheduled_date")} className="text-green-500">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing("scheduled_date", booking.scheduled_date)}
                      className="font-body text-sm text-foreground hover:text-foreground/80"
                    >
                      {booking.scheduled_date 
                        ? format(new Date(booking.scheduled_date), "MMM d, yyyy")
                        : "Not scheduled"}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/30">
                  <span className="font-body text-sm text-muted-foreground">Time</span>
                  <span className="font-body text-sm text-foreground">{booking.scheduled_time || "1:00 PM"}</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-accent/30">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-xs text-muted-foreground">
                    1834 E Oltorf St Ste 200, Austin, TX 78741
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Admin Notes
              </h3>
              {editingField === "admin_notes" ? (
                <div className="space-y-2">
                  <textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none resize-none"
                    placeholder="Add notes..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveField("admin_notes")}
                      className="px-3 py-1 bg-foreground text-background font-body text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="px-3 py-1 border border-border font-body text-xs text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEditing("admin_notes", booking.admin_notes)}
                  className="w-full text-left p-3 border border-dashed border-border hover:border-foreground/50 transition-colors"
                >
                  {booking.admin_notes ? (
                    <p className="font-body text-sm text-foreground/80 whitespace-pre-wrap">
                      {booking.admin_notes}
                    </p>
                  ) : (
                    <p className="font-body text-sm text-muted-foreground">Click to add notes...</p>
                  )}
                </button>
              )}
            </div>

            {/* Priority & Follow-up */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Priority
                </h3>
                <select
                  value={booking.priority || "normal"}
                  onChange={(e) => onUpdateField(booking.id, "priority", e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none"
                >
                  <option value="high">⭐ High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Follow-up Date
                </h3>
                <input
                  type="date"
                  value={booking.follow_up_date || ""}
                  onChange={(e) => onUpdateField(booking.id, "follow_up_date", e.target.value || null)}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => onDelete(booking.id)}
                className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-500 font-body text-sm hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Booking
              </button>
            </div>
          </div>
        )}

        {activeSection === "actions" && (
          <div className="space-y-6">
            {/* Email Editor Modal */}
            {editingEmail && (
              <div className="p-4 border border-foreground/20 bg-accent/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-body text-sm font-medium text-foreground">
                    Edit Email Before Sending
                  </h3>
                  <button
                    onClick={() => setEditingEmail(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="font-body text-xs text-muted-foreground">To</label>
                  <p className="font-body text-sm text-foreground">{booking.email}</p>
                </div>
                <div>
                  <label className="font-body text-xs text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    value={editingEmail.subject}
                    onChange={(e) => setEditingEmail({ ...editingEmail, subject: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-body text-xs text-muted-foreground">Body</label>
                  <textarea
                    value={editingEmail.body}
                    onChange={(e) => setEditingEmail({ ...editingEmail, body: e.target.value })}
                    rows={10}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={sendEditedEmail}
                    disabled={sendingEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  >
                    {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Email
                  </button>
                  <button
                    onClick={() => setEditingEmail(null)}
                    className="px-4 py-2 border border-border font-body text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Quick Send Emails */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Send Template Email
              </h3>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => prepareTemplateEmail(template.name)}
                    disabled={sendingEmail || !!editingEmail}
                    className="w-full flex items-center justify-between p-3 border border-border hover:border-foreground/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-body text-sm text-foreground capitalize">
                          {template.name.replace(/_/g, " ")}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          {template.subject}
                        </p>
                      </div>
                    </div>
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Stage Actions */}
            <div>
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Quick Stage Actions
              </h3>
              <div className="space-y-2">
                {booking.pipeline_stage === "new_inquiry" && (
                  <button
                    onClick={() => {
                      prepareTemplateEmail("reference_request");
                    }}
                    disabled={sendingEmail || !!editingEmail}
                    className="w-full flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="font-body text-sm">Request References (Edit Email First)</span>
                  </button>
                )}
                {booking.pipeline_stage === "references_received" && (
                  <button
                    onClick={() => {
                      prepareTemplateEmail("deposit_request");
                    }}
                    disabled={sendingEmail || !!editingEmail}
                    className="w-full flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 text-purple-500 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="font-body text-sm">Request Deposit (Edit Email First)</span>
                  </button>
                )}
                {booking.pipeline_stage === "deposit_paid" && (
                  <button
                    onClick={() => {
                      prepareTemplateEmail("appointment_confirmation");
                    }}
                    disabled={sendingEmail || !!editingEmail || !booking.scheduled_date}
                    className="w-full flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 text-green-500 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="font-body text-sm">
                      {booking.scheduled_date ? "Confirm Appointment (Edit Email First)" : "Set date first"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Payment Actions */}
            {!booking.deposit_paid && (
              <div>
                <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Payment Actions
                </h3>
                <div className="space-y-2">
                  {/* Send Stripe Payment Link */}
                  <button
                    onClick={async () => {
                      setSendingPaymentLink(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
                          body: {
                            booking_id: booking.id,
                            payment_type: "deposit",
                          }
                        });
                        if (error) throw error;
                        if (data?.url) {
                          // Copy link and notify
                          navigator.clipboard.writeText(data.url);
                          toast({
                            title: "Payment link created!",
                            description: "Link copied to clipboard. You can send it to the client.",
                          });
                          // Open in new tab for reference
                          window.open(data.url, "_blank");
                        }
                      } catch (err: any) {
                        toast({
                          title: "Error",
                          description: err.message || "Failed to create payment link",
                          variant: "destructive",
                        });
                      } finally {
                        setSendingPaymentLink(false);
                      }
                    }}
                    disabled={sendingPaymentLink}
                    className="w-full flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 text-purple-500 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                  >
                    {sendingPaymentLink ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span className="font-body text-sm">Send Stripe Deposit Link ($500)</span>
                  </button>
                  
                  {/* Manual payment buttons */}
                  <button
                    onClick={() => {
                      onUpdateField(booking.id, "deposit_paid", true);
                      onUpdateField(booking.id, "deposit_paid_at", new Date().toISOString());
                      onUpdateField(booking.id, "payment_method", "zelle");
                      onUpdateStage(booking.id, "deposit_paid");
                    }}
                    className="w-full flex items-center gap-3 p-3 border border-border hover:border-green-500/50 hover:bg-green-500/10 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body text-sm">Mark Deposit Paid (Zelle)</span>
                  </button>
                  <button
                    onClick={() => {
                      onUpdateField(booking.id, "deposit_paid", true);
                      onUpdateField(booking.id, "deposit_paid_at", new Date().toISOString());
                      onUpdateField(booking.id, "payment_method", "clover");
                      onUpdateStage(booking.id, "deposit_paid");
                    }}
                    className="w-full flex items-center gap-3 p-3 border border-border hover:border-green-500/50 hover:bg-green-500/10 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="font-body text-sm">Mark Deposit Paid (Clover)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mark References Received */}
            {booking.pipeline_stage === "references_requested" && (
              <div>
                <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  References Status
                </h3>
                <button
                  onClick={() => onUpdateStage(booking.id, "references_received")}
                  className="w-full flex items-center gap-3 p-3 border border-border hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-sm">Mark References Received</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeSection === "timeline" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                Activity Timeline
              </h3>
              {loadingActivities && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border">
                <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-body text-sm text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 bg-accent/30"
                  >
                    <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-foreground">
                        {activity.description}
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Show creation as first event */}
                <div className="flex gap-3 p-3 bg-accent/30">
                  <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-sm text-foreground">
                      Booking created
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BookingDetailPanel;
