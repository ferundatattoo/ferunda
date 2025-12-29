import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Check, 
  Clock, 
  Calendar, 
  X, 
  Loader2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  CheckCircle2,
  Circle,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingStatusTrackerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BookingStatus {
  tracking_code: string;
  status: string;
  pipeline_stage: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  deposit_paid: boolean | null;
  deposit_amount: number | null;
  session_rate: number | null;
  created_at: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "Request Received", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "scheduled", label: "Scheduled", icon: Calendar },
  { key: "completed", label: "Completed", icon: Check },
];

const BookingStatusTracker = ({ isOpen, onClose }: BookingStatusTrackerProps) => {
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: "Enter tracking code",
        description: "Please enter your 8-character tracking code.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setBooking(null);

    try {
      const { data, error } = await supabase.functions.invoke("public-booking-status", {
        body: { trackingCode: trackingCode.toUpperCase().trim() },
      });

      if (error) {
        setNotFound(true);
        return;
      }

      const bookingData = (data as any)?.booking as BookingStatus | undefined;
      if (!bookingData) {
        setNotFound(true);
        return;
      }

      setBooking(bookingData);
    } catch {
      toast({
        title: "Error",
        description: "Failed to look up booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIndex = (status: string): number => {
    if (status === "cancelled") return -1;
    const index = STATUS_STEPS.findIndex(s => s.key === status);
    // If confirmed and has scheduled_date, consider it scheduled
    if (status === "confirmed" && booking?.scheduled_date) {
      return 2;
    }
    return index >= 0 ? index : 0;
  };

  const statusIndex = booking ? getStatusIndex(booking.status) : -1;

  const handleClose = () => {
    setTrackingCode("");
    setBooking(null);
    setNotFound(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/98 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative min-h-screen flex items-start md:items-center justify-center p-6 py-16">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-lg relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute -top-10 right-0 md:top-0 md:-right-12 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Track
                  </span>
                  <div className="h-px w-12 bg-border" />
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
                  Check Booking Status
                </h2>
                <p className="font-body text-muted-foreground mt-2">
                  Enter your tracking code to view your booking status.
                </p>
              </div>

              {/* Search Form */}
              <div className="flex gap-2 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Enter tracking code"
                    maxLength={8}
                    className="w-full pl-12 pr-4 py-4 bg-transparent border border-border font-body text-foreground text-lg tracking-widest uppercase placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-base placeholder:normal-case focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-6 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Not Found State */}
              <AnimatePresence>
                {notFound && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-8 border border-border"
                  >
                    <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-display text-xl text-foreground mb-2">
                      Booking Not Found
                    </h3>
                    <p className="font-body text-muted-foreground text-sm">
                      Please check your tracking code and try again.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Booking Status Display */}
              <AnimatePresence>
                {booking && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Cancelled State */}
                    {booking.status === "cancelled" ? (
                      <div className="p-6 border border-destructive/30 bg-destructive/5">
                        <div className="flex items-center gap-3 mb-4">
                          <X className="w-6 h-6 text-destructive" />
                          <h3 className="font-display text-xl text-foreground">
                            Booking Cancelled
                          </h3>
                        </div>
                        <p className="font-body text-muted-foreground text-sm">
                          This booking has been cancelled. If you have questions, please contact us.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Status Progress */}
                        <div className="p-6 border border-border">
                          <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-6">
                            Booking Progress
                          </h3>
                          <div className="relative">
                            {/* Progress Line */}
                            <div className="absolute top-4 left-4 right-4 h-px bg-border" />
                            <div 
                              className="absolute top-4 left-4 h-px bg-foreground transition-all duration-500"
                              style={{ width: `${(statusIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                            />

                            <div className="flex justify-between relative">
                              {STATUS_STEPS.map((step, index) => {
                                const isComplete = index <= statusIndex;
                                const isCurrent = index === statusIndex;
                                const StepIcon = step.icon;

                                return (
                                  <div key={step.key} className="flex flex-col items-center">
                                    <div 
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
                                        isComplete 
                                          ? "bg-foreground text-background" 
                                          : "bg-background border border-border text-muted-foreground"
                                      } ${isCurrent ? "ring-4 ring-foreground/20" : ""}`}
                                    >
                                      {isComplete ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Circle className="w-4 h-4" />
                                      )}
                                    </div>
                                    <span className={`mt-2 font-body text-[10px] text-center uppercase tracking-wider ${
                                      isComplete ? "text-foreground" : "text-muted-foreground"
                                    }`}>
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Booking Details */}
                        <div className="p-6 border border-border space-y-4">
                          <h3 className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                            Booking Details
                          </h3>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-body text-xs text-muted-foreground">Tracking Code</span>
                              <p className="font-mono text-foreground">{booking.tracking_code}</p>
                            </div>
                            <div>
                              <span className="font-body text-xs text-muted-foreground">Submitted</span>
                              <p className="font-body text-foreground">
                                {format(new Date(booking.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>

                          {booking.scheduled_date && (
                            <div className="p-4 bg-foreground/5 border border-foreground/20">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-foreground" />
                                <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                                  Scheduled Session
                                </span>
                              </div>
                              <p className="font-display text-lg text-foreground">
                                {format(new Date(booking.scheduled_date), "EEEE, MMMM d, yyyy")}
                              </p>
                              <p className="font-body text-xs text-muted-foreground mt-1">
                                {booking.scheduled_time || "1:00 PM"}
                              </p>
                            </div>
                          )}

                          <div className="pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="font-body text-xs text-muted-foreground">Deposit</span>
                              <div className="flex items-center gap-2">
                                <span className="font-body text-sm text-foreground">${booking.deposit_amount || 500}</span>
                                {booking.deposit_paid ? (
                                  <span className="px-2 py-0.5 text-[10px] bg-green-500/20 text-green-500 border border-green-500/30 uppercase tracking-wider">
                                    Paid
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 uppercase tracking-wider">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Contact Info */}
                    <div className="text-center py-4">
                      <p className="font-body text-sm text-muted-foreground">
                        Questions? Contact me at{" "}
                        <a href="mailto:fernando@ferunda.com" className="text-foreground hover:underline">
                          fernando@ferunda.com
                        </a>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BookingStatusTracker;