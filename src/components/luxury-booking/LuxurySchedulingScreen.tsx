import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addDays } from "date-fns";
import type { BookingState } from "@/pages/LuxuryBooking";

interface TimeSlot {
  date: string;
  time: string;
  duration: string;
  rationale: string;
}

interface LuxurySchedulingScreenProps {
  bookingState: BookingState;
  updateBookingState: (updates: Partial<BookingState>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const LuxurySchedulingScreen = ({ 
  bookingState, 
  updateBookingState, 
  onConfirm,
  onBack 
}: LuxurySchedulingScreenProps) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(bookingState.selectedSlot);
  const [isLoading, setIsLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  // Fetch curated time slots
  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoading(true);
      
      try {
        const today = new Date();
        const endDate = addDays(today, 60);
        
        const { data } = await supabase
          .from("availability")
          .select("*")
          .eq("is_available", true)
          .gte("date", format(today, 'yyyy-MM-dd'))
          .lte("date", format(endDate, 'yyyy-MM-dd'))
          .order("date", { ascending: true })
          .limit(20);
        
        if (data && data.length > 0) {
          // Transform and rank slots
          const transformedSlots: TimeSlot[] = data.slice(0, 6).map((slot, index) => {
            const date = parseISO(slot.date);
            const dayOfWeek = format(date, 'EEEE');
            
            // Generate rationale based on day and position
            let rationale = "";
            if (index === 0) {
              rationale = "Earliest available. Minimal wait.";
            } else if (dayOfWeek === 'Tuesday' || dayOfWeek === 'Wednesday') {
              rationale = "Uninterrupted block. Ideal for this project.";
            } else if (dayOfWeek === 'Friday') {
              rationale = "Extended session available. Good for larger work.";
            } else {
              rationale = "Quiet studio day. Focused session.";
            }
            
            return {
              date: format(date, "EEEE, MMMM d"),
              time: "11:00",
              duration: bookingState.tattooBrief?.session_estimate_hours_min 
                ? `${bookingState.tattooBrief.session_estimate_hours_min} hours`
                : "4 hours",
              rationale
            };
          });
          
          setSlots(transformedSlots);
        } else {
          // Fallback curated slots if no availability data
          setSlots([
            {
              date: "Tuesday, January 14",
              time: "11:00",
              duration: "4 hours",
              rationale: "Uninterrupted block. Ideal for this project."
            },
            {
              date: "Friday, January 17",
              time: "10:00",
              duration: "5 hours",
              rationale: "Extended session available. Good for detailed work."
            },
            {
              date: "Wednesday, January 22",
              time: "12:00",
              duration: "4 hours",
              rationale: "Quiet studio day. Focused session."
            }
          ]);
        }
      } catch (error) {
        console.error("Error fetching slots:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSlots();
  }, [bookingState.tattooBrief?.session_estimate_hours_min]);

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    updateBookingState({ selectedSlot: slot });
  };

  const displayedSlots = showMore ? slots : slots.slice(0, 3);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-8 text-muted-foreground hover:text-foreground -ml-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Title */}
            <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
              Select your session
            </h1>
            
            {/* Curated time cards - vertically stacked */}
            <div className="space-y-4">
              {displayedSlots.map((slot, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSelectSlot(slot)}
                  className={`w-full text-left p-6 border transition-all duration-200 ${
                    selectedSlot === slot 
                      ? 'border-foreground bg-secondary/30' 
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <div className="space-y-2">
                    <p className="font-display text-xl text-foreground">
                      {slot.date} — {slot.time}
                    </p>
                    <p className="text-sm text-muted-foreground font-body">
                      {slot.duration}
                    </p>
                    <p className="text-xs text-muted-foreground/70 font-body italic">
                      {slot.rationale}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
            
            {/* View more - text only */}
            {slots.length > 3 && !showMore && (
              <button
                onClick={() => setShowMore(true)}
                className="text-sm text-muted-foreground hover:text-foreground font-body transition-colors"
              >
                View other options
              </button>
            )}
            
            {/* Confirm button */}
            {selectedSlot && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-4"
              >
                <Button
                  onClick={onConfirm}
                  className="w-full py-6 text-base font-display bg-foreground text-background hover:bg-foreground/90"
                >
                  Select this time
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LuxurySchedulingScreen;
