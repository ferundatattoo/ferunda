import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import LuxuryEntryScreen from "@/components/luxury-booking/LuxuryEntryScreen";
import LuxuryConciergeScreen from "@/components/luxury-booking/LuxuryConciergeScreen";
import LuxuryStyleFitScreen from "@/components/luxury-booking/LuxuryStyleFitScreen";
import LuxurySchedulingScreen from "@/components/luxury-booking/LuxurySchedulingScreen";
import LuxuryCommitmentScreen from "@/components/luxury-booking/LuxuryCommitmentScreen";
import LuxuryConfirmationScreen from "@/components/luxury-booking/LuxuryConfirmationScreen";
import type { TattooBrief } from "@/components/TattooBriefCard";

export type BookingStep = 
  | 'entry' 
  | 'concierge' 
  | 'style-fit' 
  | 'scheduling' 
  | 'commitment' 
  | 'confirmation';

export interface BookingState {
  tattooBrief: TattooBrief | null;
  selectedSlot: {
    date: string;
    time: string;
    duration: string;
    rationale: string;
  } | null;
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  bookingId: string | null;
  conversationId: string | null;
  fitScore: {
    alignment: 'strong' | 'moderate' | 'weak';
    explanation: string;
  } | null;
}

const LuxuryBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('entry');
  const [bookingState, setBookingState] = useState<BookingState>({
    tattooBrief: null,
    selectedSlot: null,
    clientInfo: null,
    bookingId: null,
    conversationId: null,
    fitScore: null,
  });

  // Handle deep linking
  useEffect(() => {
    const step = searchParams.get('step');
    if (step && ['entry', 'concierge', 'style-fit', 'scheduling', 'commitment', 'confirmation'].includes(step)) {
      setCurrentStep(step as BookingStep);
    }
  }, [searchParams]);

  const updateBookingState = (updates: Partial<BookingState>) => {
    setBookingState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: BookingStep) => {
    setCurrentStep(step);
    navigate(`/book?step=${step}`, { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen"
        >
          {currentStep === 'entry' && (
            <LuxuryEntryScreen 
              onBegin={() => goToStep('concierge')} 
            />
          )}
          
          {currentStep === 'concierge' && (
            <LuxuryConciergeScreen
              bookingState={bookingState}
              updateBookingState={updateBookingState}
              onComplete={() => goToStep('style-fit')}
              onBack={() => goToStep('entry')}
            />
          )}
          
          {currentStep === 'style-fit' && (
            <LuxuryStyleFitScreen
              bookingState={bookingState}
              updateBookingState={updateBookingState}
              onContinue={() => goToStep('scheduling')}
              onRequestConsult={() => {/* Handle consult request */}}
              onBack={() => goToStep('concierge')}
            />
          )}
          
          {currentStep === 'scheduling' && (
            <LuxurySchedulingScreen
              bookingState={bookingState}
              updateBookingState={updateBookingState}
              onConfirm={() => goToStep('commitment')}
              onBack={() => goToStep('style-fit')}
            />
          )}
          
          {currentStep === 'commitment' && (
            <LuxuryCommitmentScreen
              bookingState={bookingState}
              updateBookingState={updateBookingState}
              onConfirm={() => goToStep('confirmation')}
              onBack={() => goToStep('scheduling')}
            />
          )}
          
          {currentStep === 'confirmation' && (
            <LuxuryConfirmationScreen
              bookingState={bookingState}
              onViewProject={() => navigate('/customer-portal')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default LuxuryBooking;
