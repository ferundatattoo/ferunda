import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BookingState } from "@/pages/LuxuryBooking";

interface LuxuryStyleFitScreenProps {
  bookingState: BookingState;
  updateBookingState: (updates: Partial<BookingState>) => void;
  onContinue: () => void;
  onRequestConsult: () => void;
  onBack: () => void;
}

const LuxuryStyleFitScreen = ({ 
  bookingState, 
  onContinue, 
  onRequestConsult,
  onBack 
}: LuxuryStyleFitScreenProps) => {
  // In production, this would come from the AI evaluation
  const fitScore = bookingState.fitScore || {
    alignment: 'strong' as const,
    explanation: "Your vision aligns well with the studio's aesthetic. Fine-line botanical work is a specialty, and your preferred placement offers excellent visibility for detailed linework."
  };

  const alignmentValue = 
    fitScore.alignment === 'strong' ? 90 :
    fitScore.alignment === 'moderate' ? 60 : 30;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full">
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
          className="space-y-12"
        >
          {/* Title - centered */}
          <h1 className="font-display text-3xl md:text-4xl text-foreground text-center tracking-tight">
            Project alignment
          </h1>
          
          {/* Explanation paragraph */}
          <p className="text-base text-muted-foreground font-body leading-relaxed text-center max-w-md mx-auto">
            {fitScore.explanation}
          </p>
          
          {/* Alignment meter - subtle, not labeled "score" */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground font-body uppercase tracking-widest">
              <span>Alignment</span>
              <span>{fitScore.alignment}</span>
            </div>
            <Progress 
              value={alignmentValue} 
              className="h-1 bg-secondary"
            />
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={onContinue}
              className="px-10 py-6 text-base font-display bg-foreground text-background hover:bg-foreground/90"
            >
              Continue
            </Button>
            <Button
              variant="ghost"
              onClick={onRequestConsult}
              className="text-muted-foreground hover:text-foreground font-body"
            >
              Request a consult
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LuxuryStyleFitScreen;
