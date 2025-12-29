import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingState } from "@/pages/LuxuryBooking";

interface LuxuryConfirmationScreenProps {
  bookingState: BookingState;
  onViewProject: () => void;
}

const LuxuryConfirmationScreen = ({ 
  bookingState,
  onViewProject 
}: LuxuryConfirmationScreenProps) => {
  const handleAddToCalendar = () => {
    // Generate calendar link (Google Calendar format)
    if (bookingState.selectedSlot) {
      const title = encodeURIComponent("Tattoo Session - Ferunda Studio");
      const details = encodeURIComponent(
        bookingState.tattooBrief?.style 
          ? `Style: ${bookingState.tattooBrief.style}\nPlacement: ${bookingState.tattooBrief.placement || 'TBD'}`
          : "Tattoo consultation and session"
      );
      
      // In production, parse actual date/time
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
      window.open(calendarUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Subtle decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-16 h-px bg-foreground mx-auto"
          />
          
          {/* Confirmation message - centered, quiet */}
          <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
            Your session is confirmed.
          </h1>
          
          {/* Subtext */}
          <p className="text-base text-muted-foreground font-body leading-relaxed max-w-sm mx-auto">
            I'll guide you through preparation and aftercare.
          </p>
          
          {/* Session summary */}
          {bookingState.selectedSlot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="border border-border p-6 text-left"
            >
              <p className="font-display text-xl text-foreground">
                {bookingState.selectedSlot.date}
              </p>
              <p className="text-muted-foreground font-body mt-1">
                {bookingState.selectedSlot.time} · {bookingState.selectedSlot.duration}
              </p>
            </motion.div>
          )}
          
          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <Button
              variant="outline"
              onClick={handleAddToCalendar}
              className="border-border text-foreground hover:bg-secondary font-body"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add to calendar
            </Button>
            <Button
              onClick={onViewProject}
              className="bg-foreground text-background hover:bg-foreground/90 font-display"
            >
              View project
            </Button>
          </motion.div>
          
          {/* Subtle closing line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="w-16 h-px bg-border mx-auto mt-16"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default LuxuryConfirmationScreen;
