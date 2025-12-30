import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Check, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PolicyAcceptanceStepProps {
  clientEmail: string;
  bookingId?: string;
  onAccept: (acceptanceId: string) => void;
  onBack?: () => void;
}

interface PolicyData {
  id: string;
  summary_text: string;
  full_policy_text: string;
  settings: {
    deposit_amount_or_percent?: string;
    cancellation_window_hours?: number;
    late_threshold_minutes?: number;
  };
}

const PolicyAcceptanceStep = ({ 
  clientEmail, 
  bookingId,
  onAccept, 
  onBack 
}: PolicyAcceptanceStepProps) => {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActivePolicy();
  }, []);

  const fetchActivePolicy = async () => {
    try {
      const { data, error } = await supabase
        .from("studio_policies" as any)
        .select("id, summary_text, full_policy_text, settings")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setPolicy(data as unknown as PolicyData);
    } catch (err) {
      console.error("Error fetching policy:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!policy || !accepted) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("policy_acceptances" as any)
        .insert({
          booking_id: bookingId || null,
          client_email: clientEmail,
          policy_version_id: policy.id,
          acceptance_method: "checkbox",
          user_agent: navigator.userAgent
        })
        .select("id")
        .single();

      if (error) throw error;
      onAccept((data as any).id);
    } catch (err) {
      console.error("Error recording policy acceptance:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Unable to load studio policies. Please try again.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg text-foreground">Studio Policies</h3>
          <p className="text-sm text-muted-foreground">Please review before continuing</p>
        </div>
      </div>

      {/* Policy Summary */}
      <div className="bg-muted/50 rounded-lg p-5 space-y-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {policy.summary_text.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-foreground/90 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Expandable Full Policy */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowFullPolicy(!showFullPolicy)}
          className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-accent/50 transition-colors"
        >
          <span className="font-body text-sm text-foreground">
            View full studio policies
          </span>
          {showFullPolicy ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        
        <AnimatePresence>
          {showFullPolicy && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-5 py-4 border-t border-border bg-muted/30 max-h-80 overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {policy.full_policy_text.split('\n\n').map((section, i) => {
                    if (section.startsWith('## ')) {
                      return (
                        <h4 key={i} className="text-foreground font-display mt-4 first:mt-0">
                          {section.replace('## ', '')}
                        </h4>
                      );
                    }
                    if (section.startsWith('**') && section.includes(':**')) {
                      const [label, value] = section.split(':**');
                      return (
                        <p key={i} className="text-foreground/90">
                          <strong>{label.replace('**', '')}:</strong> {value}
                        </p>
                      );
                    }
                    if (section.startsWith('---')) {
                      return <hr key={i} className="my-4 border-border" />;
                    }
                    return (
                      <p key={i} className="text-foreground/80 leading-relaxed">
                        {section}
                      </p>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Acceptance Checkbox */}
      <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
        <Checkbox
          id="policy-accept"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
          className="mt-0.5"
        />
        <label 
          htmlFor="policy-accept" 
          className="text-sm text-foreground cursor-pointer leading-relaxed"
        >
          I have read and accept the studio policies
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Back
          </Button>
        )}
        <Button
          onClick={handleAccept}
          disabled={!accepted || submitting}
          className="flex-1 gap-2"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Accept & Continue
        </Button>
      </div>
    </motion.div>
  );
};

export default PolicyAcceptanceStep;
