import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BookingState } from "@/pages/LuxuryBooking";

interface LuxuryCommitmentScreenProps {
  bookingState: BookingState;
  updateBookingState: (updates: Partial<BookingState>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const DEPOSIT_AMOUNT = 150;

const LuxuryCommitmentScreen = ({ 
  bookingState, 
  updateBookingState, 
  onConfirm,
  onBack 
}: LuxuryCommitmentScreenProps) => {
  const [name, setName] = useState(bookingState.clientInfo?.name || "");
  const [email, setEmail] = useState(bookingState.clientInfo?.email || "");
  const [phone, setPhone] = useState(bookingState.clientInfo?.phone || "");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);

  const policies = [
    {
      id: 'deposit',
      title: 'Deposit',
      content: 'A non-refundable deposit of $150 secures your session. This amount is applied to your final total.'
    },
    {
      id: 'cancellation',
      title: 'Cancellation',
      content: 'Cancellations made more than 72 hours before your session may be rescheduled once. Cancellations within 72 hours forfeit the deposit.'
    },
    {
      id: 'rescheduling',
      title: 'Rescheduling',
      content: 'One reschedule is permitted with at least 48 hours notice. Subsequent reschedules require a new deposit.'
    },
    {
      id: 'aftercare',
      title: 'Aftercare',
      content: 'You will receive detailed aftercare instructions. Follow-up touch-ups within 3 months are complimentary for normal healing issues.'
    }
  ];

  const colorTypeLabels: Record<string, string> = {
    black_grey: "Black & Grey",
    color: "Color",
    mixed: "Mixed",
    undecided: "Undecided"
  };

  const handleConfirm = async () => {
    if (!name || !email || !policyAccepted) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create booking
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          name,
          email,
          phone: phone || null,
          tattoo_description: bookingState.tattooBrief?.subject || "Tattoo consultation",
          placement: bookingState.tattooBrief?.placement,
          size: bookingState.tattooBrief?.size_estimate_inches_min 
            ? `${bookingState.tattooBrief.size_estimate_inches_min} inches` 
            : null,
          scheduled_date: bookingState.selectedSlot?.date,
          scheduled_time: bookingState.selectedSlot?.time,
          deposit_amount: DEPOSIT_AMOUNT,
          status: "new",
          pipeline_stage: "new_lead",
          source: "luxury_booking",
          tattoo_brief_id: bookingState.tattooBrief?.id,
        })
        .select()
        .single();

      if (error) throw error;

      updateBookingState({ 
        bookingId: booking.id,
        clientInfo: { name, email, phone }
      });

      // In production, redirect to Stripe for deposit
      toast.success("Booking confirmed");
      onConfirm();
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-8 text-muted-foreground hover:text-foreground -ml-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight mb-12">
            Confirm your booking
          </h1>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left column - Summary */}
            <div className="space-y-8">
              {/* Tattoo Plan summary */}
              <div className="space-y-4">
                <h3 className="text-xs text-muted-foreground font-body uppercase tracking-widest">
                  Tattoo Plan
                </h3>
                <div className="border border-border p-6 space-y-3">
                  {bookingState.tattooBrief?.style && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-body">Style</span>
                      <span className="font-display text-foreground">{bookingState.tattooBrief.style}</span>
                    </div>
                  )}
                  {bookingState.tattooBrief?.placement && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-body">Placement</span>
                      <span className="font-display text-foreground">{bookingState.tattooBrief.placement}</span>
                    </div>
                  )}
                  {bookingState.tattooBrief?.size_estimate_inches_min && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-body">Size</span>
                      <span className="font-display text-foreground">~{bookingState.tattooBrief.size_estimate_inches_min} inches</span>
                    </div>
                  )}
                  {bookingState.tattooBrief?.color_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-body">Color</span>
                      <span className="font-display text-foreground">{colorTypeLabels[bookingState.tattooBrief.color_type]}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Appointment details */}
              {bookingState.selectedSlot && (
                <div className="space-y-4">
                  <h3 className="text-xs text-muted-foreground font-body uppercase tracking-widest">
                    Appointment
                  </h3>
                  <div className="border border-border p-6">
                    <p className="font-display text-xl text-foreground">
                      {bookingState.selectedSlot.date}
                    </p>
                    <p className="text-muted-foreground font-body mt-1">
                      {bookingState.selectedSlot.time} · {bookingState.selectedSlot.duration}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right column - Deposit & Policies */}
            <div className="space-y-8">
              {/* Contact info */}
              <div className="space-y-4">
                <h3 className="text-xs text-muted-foreground font-body uppercase tracking-widest">
                  Your details
                </h3>
                <div className="space-y-4">
                  <Input
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary/30 border-border focus:border-foreground/30"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary/30 border-border focus:border-foreground/30"
                  />
                  <Input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-secondary/30 border-border focus:border-foreground/30"
                  />
                </div>
              </div>
              
              {/* Deposit */}
              <div className="space-y-4">
                <h3 className="text-xs text-muted-foreground font-body uppercase tracking-widest">
                  Deposit
                </h3>
                <div className="border border-border p-6">
                  <p className="font-display text-3xl text-foreground">
                    ${DEPOSIT_AMOUNT}
                  </p>
                  <p className="text-sm text-muted-foreground font-body mt-2">
                    This secures your session and is applied to your final total.
                  </p>
                </div>
              </div>
              
              {/* Policies (accordion) */}
              <div className="space-y-2">
                {policies.map((policy) => (
                  <Collapsible
                    key={policy.id}
                    open={openPolicy === policy.id}
                    onOpenChange={(open) => setOpenPolicy(open ? policy.id : null)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-left border-b border-border">
                      <span className="text-sm text-foreground font-body">{policy.title}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openPolicy === policy.id ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="py-3">
                      <p className="text-sm text-muted-foreground font-body leading-relaxed">
                        {policy.content}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
              
              {/* Policy checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="policy"
                  checked={policyAccepted}
                  onCheckedChange={(checked) => setPolicyAccepted(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="policy" className="text-sm text-muted-foreground font-body leading-relaxed cursor-pointer">
                  I've read and accept the studio policies.
                </label>
              </div>
              
              {/* Confirm button */}
              <Button
                onClick={handleConfirm}
                disabled={!name || !email || !policyAccepted || isSubmitting}
                className="w-full py-6 text-base font-display bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Confirm booking"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LuxuryCommitmentScreen;
