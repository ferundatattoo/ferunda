import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Clock } from "lucide-react";

interface ExitIntentPopupProps {
  onBookingClick: () => void;
}

const ExitIntentPopup = ({ onBookingClick }: ExitIntentPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

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

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[60]"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[90%] max-w-lg bg-background border border-border p-8 shadow-2xl"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-foreground/10 flex items-center justify-center">
                <Gift className="w-8 h-8 text-foreground" />
              </div>

              <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
                Wait! Before You Go...
              </h2>

              <p className="font-body text-muted-foreground mb-6">
                I only take one client per day. Secure your session now with a $500 deposit 
                and get a fully custom piece designed just for you.
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
                <Clock className="w-4 h-4" />
                <span className="font-body">Limited spots available</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://link.clover.com/urlshortener/nRLw66"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsVisible(false)}
                  className="px-8 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
                >
                  Pay $500 Deposit
                </a>
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
  );
};

export default ExitIntentPopup;
