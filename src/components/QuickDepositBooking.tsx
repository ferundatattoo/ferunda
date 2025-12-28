import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Users, Zap, AlertTriangle, CheckCircle, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface QuickDepositBookingProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedCity: string;
  onDepositComplete: (bookingId: string, trackingCode: string) => void;
}

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
});

const QuickDepositBooking = ({
  isOpen,
  onClose,
  selectedDate,
  selectedCity,
  onDepositComplete,
}: QuickDepositBookingProps) => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [holdTimeRemaining, setHoldTimeRemaining] = useState(300); // 5 minutes
  const [viewerCount, setViewerCount] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [bookingData, setBookingData] = useState<{ id: string; trackingCode: string } | null>(null);

  // Simulate viewer count for urgency
  useEffect(() => {
    if (isOpen) {
      const baseViewers = Math.floor(Math.random() * 5) + 2;
      setViewerCount(baseViewers);
      
      const interval = setInterval(() => {
        setViewerCount(prev => {
          const change = Math.random() > 0.5 ? 1 : -1;
          return Math.max(1, Math.min(8, prev + change));
        });
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Countdown timer for spot holding
  useEffect(() => {
    if (isOpen && isHolding && holdTimeRemaining > 0) {
      const timer = setInterval(() => {
        setHoldTimeRemaining(prev => {
          if (prev <= 1) {
            toast.error("Your hold has expired. The spot is now available to others.");
            setIsHolding(false);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isOpen, isHolding, holdTimeRemaining]);

  // Start holding when form opens
  useEffect(() => {
    if (isOpen) {
      setIsHolding(true);
      setHoldTimeRemaining(300);
      setStep("form");
      setFormData({ name: "", email: "", phone: "" });
      setErrors({});
    }
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = contactSchema.parse(formData);
      setIsSubmitting(true);

      // Create booking with pending status
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          preferred_date: selectedDate,
          tattoo_description: `Quick booking from calendar - ${selectedCity}`,
          status: "deposit_pending",
          placement: "",
          size: "",
        })
        .select("id, tracking_code")
        .single();

      if (error) throw error;

      setBookingData({ id: data.id, trackingCode: data.tracking_code || "" });
      setStep("payment");
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentClick = async () => {
    if (!bookingData) return;
    
    // Open Clover payment link in new tab
    const paymentUrl = await getPaymentLink();
    if (paymentUrl) {
      window.open(paymentUrl, "_blank");
      // Mark as payment initiated
      await supabase
        .from("bookings")
        .update({ status: "awaiting_deposit" })
        .eq("id", bookingData.id);
      
      setStep("success");
      onDepositComplete(bookingData.id, bookingData.trackingCode);
    }
  };

  const getPaymentLink = async () => {
    // Get payment link from edge function
    try {
      const { data, error } = await supabase.functions.invoke("get-payment-link", {
        body: { 
          bookingId: bookingData?.id,
          amount: 500,
          customerEmail: formData.email,
          customerName: formData.name
        }
      });
      
      if (error) throw error;
      return data.paymentUrl;
    } catch {
      // Fallback to default payment link if edge function fails
      toast.info("Redirecting to payment...");
      return "https://www.clover.com/pay"; // This will be replaced by actual link
    }
  };

  const urgencyLevel = holdTimeRemaining < 60 ? "critical" : holdTimeRemaining < 180 ? "warning" : "normal";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/95 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Urgency Header */}
            <div className={`px-6 py-3 ${
              urgencyLevel === "critical" 
                ? "bg-destructive/20 border-b border-destructive/50" 
                : urgencyLevel === "warning"
                ? "bg-amber-500/20 border-b border-amber-500/50"
                : "bg-accent/20 border-b border-border"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${
                      urgencyLevel === "critical" ? "text-destructive animate-pulse" : "text-amber-400"
                    }`} />
                    <span className={`font-mono text-lg font-bold ${
                      urgencyLevel === "critical" ? "text-destructive" : "text-amber-400"
                    }`}>
                      {formatTime(holdTimeRemaining)}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {viewerCount} viewing now
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-accent/50 rounded transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Warning Banner */}
            {urgencyLevel !== "normal" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className={`px-6 py-2 ${
                  urgencyLevel === "critical" ? "bg-destructive/10" : "bg-amber-500/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    urgencyLevel === "critical" ? "text-destructive" : "text-amber-500"
                  }`} />
                  <span className={`text-sm ${
                    urgencyLevel === "critical" ? "text-destructive" : "text-amber-500"
                  }`}>
                    {urgencyLevel === "critical" 
                      ? "Hurry! Your hold expires in less than a minute!" 
                      : "Your spot is being held temporarily. Complete now to secure."}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Content */}
            <div className="p-6">
              {step === "form" && (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full mb-4">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-primary uppercase tracking-wider">Quick Reserve</span>
                    </div>
                    <h2 className="font-display text-2xl text-foreground mb-2">
                      Reserve Your Spot
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {new Date(selectedDate).toLocaleDateString("en-US", { 
                        weekday: "long", 
                        month: "long", 
                        day: "numeric" 
                      })} • {selectedCity}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Secure with $500 deposit • Full details after payment
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-4 py-3 bg-background border ${
                          errors.name ? "border-destructive" : "border-border"
                        } rounded focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                        placeholder="Your name"
                      />
                      {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-4 py-3 bg-background border ${
                          errors.email ? "border-destructive" : "border-border"
                        } rounded focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                        placeholder="your@email.com"
                      />
                      {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full px-4 py-3 bg-background border ${
                          errors.phone ? "border-destructive" : "border-border"
                        } rounded focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                        placeholder="(555) 123-4567"
                      />
                      {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <span className="text-xs opacity-70">$500 deposit</span>
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Your information is secure. We&apos;ll collect tattoo details after your deposit.
                  </p>
                </>
              )}

              {step === "payment" && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl text-foreground mb-2">
                    Secure Your Spot
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Complete your $500 deposit to lock in your appointment
                  </p>

                  <div className="bg-accent/10 border border-border rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Date</span>
                      <span className="text-foreground font-medium">
                        {new Date(selectedDate).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Location</span>
                      <span className="text-foreground font-medium">{selectedCity}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground font-medium">Deposit</span>
                        <span className="text-xl font-display text-foreground">$500</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePaymentClick}
                    className="w-full py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay $500 Deposit Now
                  </button>

                  <p className="text-xs text-muted-foreground mt-4">
                    You&apos;ll be redirected to our secure payment page
                  </p>
                </div>
              )}

              {step === "success" && (
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 mx-auto mb-6 bg-emerald-500/20 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h2 className="font-display text-2xl text-foreground mb-2">
                    Spot Reserved!
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Complete your payment to confirm. We&apos;ll email you shortly to collect your tattoo details.
                  </p>
                  
                  {bookingData?.trackingCode && (
                    <div className="bg-accent/10 border border-border rounded-lg p-4 mb-6">
                      <p className="text-xs text-muted-foreground mb-1">Your Tracking Code</p>
                      <p className="font-mono text-xl text-foreground font-bold tracking-wider">
                        {bookingData.trackingCode}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Save this code to track your booking status
                      </p>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="px-8 py-3 border border-foreground/30 text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickDepositBooking;