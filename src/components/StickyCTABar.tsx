import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, X } from "lucide-react";

interface StickyCTABarProps {
  onBookingClick: () => void;
}

const StickyCTABar = ({ onBookingClick }: StickyCTABarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 50% of viewport height
      const scrollThreshold = window.innerHeight * 0.5;
      setIsVisible(window.scrollY > scrollThreshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-30 bg-foreground text-background border-t border-background/10 md:hidden"
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex-1">
              <p className="font-body text-xs text-background/60 uppercase tracking-wider">
                Limited Availability
              </p>
              <p className="font-body text-sm text-background">
                Book your free consultation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onBookingClick}
                className="flex items-center gap-2 px-4 py-2 bg-background text-foreground font-body text-xs tracking-[0.15em] uppercase hover:bg-background/90 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Book Now
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-2 text-background/60 hover:text-background transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCTABar;
