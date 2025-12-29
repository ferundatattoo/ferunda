import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface LuxuryEntryScreenProps {
  onBegin: () => void;
}

const LuxuryEntryScreen = ({ onBegin }: LuxuryEntryScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        {/* Wide margins, centered composition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-12"
        >
          {/* Headline - serif, large, calm */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight tracking-tight">
            Plan your tattoo with clarity.
          </h1>
          
          {/* Subtext - small, light */}
          <p className="text-sm text-muted-foreground font-body tracking-wide">
            Booking, preparation, and aftercare — handled quietly.
          </p>
          
          {/* Primary CTA - single button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Button
              onClick={onBegin}
              className="px-12 py-6 text-lg font-display bg-foreground text-background hover:bg-foreground/90 border-0 tracking-wide"
            >
              Begin
            </Button>
          </motion.div>
        </motion.div>
        
        {/* Subtle decorative element */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-24 mx-auto w-16 h-px bg-border"
        />
      </div>
    </div>
  );
};

export default LuxuryEntryScreen;
