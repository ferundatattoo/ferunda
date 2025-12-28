import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Clock } from "lucide-react";
import ContactFormModal from "./ContactFormModal";

interface ExitIntentPopupProps {
  onBookingClick: () => void;
}

const ExitIntentPopup = ({ onBookingClick }: ExitIntentPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  useEffect(() => {
    // Check if popup was already shown this session
    const shown = sessionStorage.getItem("exitIntentShown");
    if (shown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
        sessionStorage.setItem("exitIntentShown", "true");
      }
    };

    // Also show after 45 seconds on page
    const timer = setTimeout(() => {
      if (!hasShown) {
        setIsVisible(true);
        setHasShown(true);
        sessionStorage.setItem("exitIntentShown", "true");
      }
    }, 45000);

    document.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, [hasShown]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleBook = () => {
    setIsVisible(false);
    onBookingClick();
  };

  const handleContact = () => {
    setIsVisible(false);
    setIsContactOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />

            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50"
            >
              <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden p-8 text-center relative">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 hover:bg-accent/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className="w-16 h-16 mx-auto mb-6 border border-accent/30 rounded-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-accent" />
                </div>

                <h3 className="font-display text-2xl md:text-3xl text-foreground mb-4">
                  Wait! Don't Leave Yet
                </h3>

                <p className="font-body text-muted-foreground mb-6">
                  Ready to start your tattoo journey? Get in touch and let's discuss your vision.
                </p>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
                  <Clock className="w-4 h-4" />
                  <span className="font-body">Limited spots available</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleContact}
                    className="px-8 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
                  >
                    Contact Me
                  </button>
                  <button
                    onClick={handleBook}
                    className="px-8 py-4 border border-border text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-accent transition-colors"
                  >
                    Ask a Question First
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <ContactFormModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
};

export default ExitIntentPopup;
