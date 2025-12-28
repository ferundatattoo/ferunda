import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Loader2, CheckCircle, Clock, Calendar, 
  MapPin, DollarSign, FileText, AlertCircle, ArrowLeft,
  Phone, Mail, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";

interface BookingStatus {
  id: string;
  name: string;
  email: string;
  tracking_code: string;
  status: string;
  pipeline_stage: string;
  tattoo_description: string;
  placement: string | null;
  size: string | null;
  preferred_date: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  deposit_paid: boolean;
  deposit_amount: number;
  session_rate: number;
  created_at: string;
}

const STAGE_INFO: Record<string, { label: string; description: string; icon: typeof Clock; color: string; progress: number }> = {
  new_inquiry: { 
    label: "Inquiry Received", 
    description: "We've received your booking request and will review it shortly.",
    icon: Clock,
    color: "text-blue-500",
    progress: 15
  },
  references_requested: { 
    label: "References Needed", 
    description: "Please send your reference images so we can prepare your design.",
    icon: FileText,
    color: "text-yellow-500",
    progress: 30
  },
  references_received: { 
    label: "References Received", 
    description: "We've received your references and are reviewing your project.",
    icon: CheckCircle,
    color: "text-orange-500",
    progress: 45
  },
  deposit_requested: { 
    label: "Deposit Required", 
    description: "Your project is ready! Please submit your deposit to secure your appointment.",
    icon: DollarSign,
    color: "text-purple-500",
    progress: 60
  },
  deposit_paid: { 
    label: "Deposit Confirmed", 
    description: "Thank you! Your deposit has been received. We're scheduling your appointment.",
    icon: CheckCircle,
    color: "text-green-500",
    progress: 75
  },
  scheduled: { 
    label: "Appointment Scheduled", 
    description: "You're all set! See you at the studio.",
    icon: Calendar,
    color: "text-emerald-500",
    progress: 90
  },
  completed: { 
    label: "Session Complete", 
    description: "Thank you for choosing Ferunda Ink!",
    icon: CheckCircle,
    color: "text-slate-500",
    progress: 100
  },
  cancelled: { 
    label: "Cancelled", 
    description: "This booking has been cancelled.",
    icon: AlertCircle,
    color: "text-red-500",
    progress: 0
  },
};

const BookingStatus = () => {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!trackingCode.trim()) {
      setError("Please enter a tracking code");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select("id, name, email, tracking_code, status, pipeline_stage, tattoo_description, placement, size, preferred_date, scheduled_date, scheduled_time, deposit_paid, deposit_amount, session_rate, created_at")
        .eq("tracking_code", trackingCode.toUpperCase().trim())
        .single();

      if (fetchError || !data) {
        setError("No booking found with that tracking code. Please check and try again.");
        setBooking(null);
      } else {
        setBooking(data);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if code is in URL
  useState(() => {
    if (initialCode) {
      handleSearch();
    }
  });

  const stageInfo = booking ? STAGE_INFO[booking.pipeline_stage || "new_inquiry"] : null;

  return (
    <>
      <SEOHead
        title="Check Booking Status | Ferunda Ink"
        description="Track your tattoo booking status with your unique tracking code."
        canonicalUrl="/booking-status"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="font-body text-sm">Back to Home</span>
            </Link>
            <span className="font-display text-lg text-foreground">FERUNDA INK</span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-4xl md:text-5xl font-light text-foreground mb-4">
              Track Your Booking
            </h1>
            <p className="font-body text-muted-foreground max-w-md mx-auto">
              Enter your tracking code to check the status of your tattoo appointment
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-12"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Enter tracking code (e.g., A1B2C3D4)"
                className="w-full pl-12 pr-4 py-4 bg-background border border-border text-foreground font-mono text-lg placeholder:text-muted-foreground focus:outline-none focus:border-foreground tracking-wider"
                maxLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Track"}
            </button>
          </motion.form>

          {/* Error State */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-500 max-w-lg mx-auto mb-8"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-body text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Booking Details */}
          <AnimatePresence>
            {booking && stageInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Status Card */}
                <div className="border border-border p-6 md:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-full bg-accent flex items-center justify-center ${stageInfo.color}`}>
                      <stageInfo.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display text-2xl text-foreground mb-1">
                        {stageInfo.label}
                      </h2>
                      <p className="font-body text-muted-foreground">
                        {stageInfo.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 bg-accent rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stageInfo.progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-foreground"
                    />
                  </div>
                  <p className="font-body text-xs text-muted-foreground text-right">
                    {stageInfo.progress}% complete
                  </p>
                </div>

                {/* Booking Info Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Booking Details */}
                  <div className="border border-border p-6 space-y-4">
                    <h3 className="font-display text-lg text-foreground border-b border-border pb-3">
                      Booking Details
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-sm text-muted-foreground">Name</span>
                        <span className="font-body text-sm text-foreground">{booking.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-body text-sm text-muted-foreground">Tracking Code</span>
                        <span className="font-mono text-sm text-foreground">{booking.tracking_code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-body text-sm text-muted-foreground">Submitted</span>
                        <span className="font-body text-sm text-foreground">
                          {format(new Date(booking.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      {booking.placement && (
                        <div className="flex items-center justify-between">
                          <span className="font-body text-sm text-muted-foreground">Placement</span>
                          <span className="font-body text-sm text-foreground">{booking.placement}</span>
                        </div>
                      )}
                      {booking.size && (
                        <div className="flex items-center justify-between">
                          <span className="font-body text-sm text-muted-foreground">Size</span>
                          <span className="font-body text-sm text-foreground capitalize">{booking.size}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Appointment/Payment */}
                  <div className="border border-border p-6 space-y-4">
                    <h3 className="font-display text-lg text-foreground border-b border-border pb-3">
                      Appointment Info
                    </h3>
                    
                    <div className="space-y-3">
                      {booking.scheduled_date ? (
                        <>
                          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30">
                            <Calendar className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="font-body text-sm font-medium text-foreground">
                                {format(new Date(booking.scheduled_date), "EEEE, MMMM d, yyyy")}
                              </p>
                              <p className="font-body text-xs text-muted-foreground">
                                {booking.scheduled_time || "1:00 PM"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-accent/50">
                            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-body text-sm text-foreground">
                                1834 E Oltorf St Ste 200
                              </p>
                              <p className="font-body text-sm text-muted-foreground">
                                Austin, TX 78741
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-accent/50">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                          <p className="font-body text-sm text-muted-foreground">
                            Appointment not yet scheduled
                          </p>
                        </div>
                      )}

                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-body text-sm text-muted-foreground">Deposit</span>
                          <div className="flex items-center gap-2">
                            <span className="font-body text-sm text-foreground">
                              ${booking.deposit_amount || 500}
                            </span>
                            {booking.deposit_paid ? (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-body">
                                PAID
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-body">
                                PENDING
                              </span>
                            )}
                          </div>
                        </div>
                        {booking.deposit_paid && (
                          <div className="flex items-center justify-between">
                            <span className="font-body text-sm text-muted-foreground">Balance Due</span>
                            <span className="font-body text-sm font-medium text-foreground">
                              ${(booking.session_rate || 2500) - (booking.deposit_amount || 500)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tattoo Description */}
                <div className="border border-border p-6">
                  <h3 className="font-display text-lg text-foreground border-b border-border pb-3 mb-4">
                    Your Tattoo Project
                  </h3>
                  <p className="font-body text-foreground/80 whitespace-pre-wrap">
                    {booking.tattoo_description}
                  </p>
                </div>

                {/* Contact Section */}
                <div className="border border-border p-6 bg-accent/30">
                  <h3 className="font-display text-lg text-foreground mb-4">
                    Questions?
                  </h3>
                  <p className="font-body text-sm text-muted-foreground mb-4">
                    If you have any questions about your booking or need to make changes, please reach out:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="mailto:Fernando.moralesunda@gmail.com"
                      className="flex items-center gap-2 px-4 py-2 border border-border bg-background text-foreground font-body text-sm hover:bg-accent transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email Us
                    </a>
                    <a
                      href="https://instagram.com/ferundaink"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border border-border bg-background text-foreground font-body text-sm hover:bg-accent transition-colors"
                    >
                      Instagram
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {searched && !booking && !loading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-body text-muted-foreground">
                Enter your tracking code above to see your booking status
              </p>
            </motion.div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 text-center">
            <p className="font-body text-sm text-muted-foreground">
              © {new Date().getFullYear()} Ferunda Ink. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default BookingStatus;
