import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NavigationProps {
  onBookingClick: () => void;
}

const Navigation = ({ onBookingClick }: NavigationProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-background/90 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 md:px-12 py-6 flex justify-between items-center">
          <a href="#" className="font-body text-xs tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground transition-colors">
            Fernando Unda
          </a>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#work"
              className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300"
            >
              Work
            </a>
            <a
              href="#about"
              className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300"
            >
              About
            </a>
            <a
              href="https://instagram.com/ferunda"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300"
            >
              Instagram
            </a>
            <button
              onClick={onBookingClick}
              className="font-body text-xs tracking-[0.2em] uppercase px-4 py-2 border border-foreground/30 text-foreground hover:bg-foreground hover:text-background transition-all duration-300"
            >
              Book
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground"
          >
            <div className="w-6 h-4 relative flex flex-col justify-between">
              <motion.span
                animate={{ rotate: mobileMenuOpen ? 45 : 0, y: mobileMenuOpen ? 7 : 0 }}
                className="w-full h-px bg-foreground origin-left"
              />
              <motion.span
                animate={{ opacity: mobileMenuOpen ? 0 : 1 }}
                className="w-full h-px bg-foreground"
              />
              <motion.span
                animate={{ rotate: mobileMenuOpen ? -45 : 0, y: mobileMenuOpen ? -7 : 0 }}
                className="w-full h-px bg-foreground origin-left"
              />
            </div>
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-background md:hidden"
          >
            <div className="flex flex-col items-center justify-center h-full gap-8">
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                href="#work"
                onClick={() => setMobileMenuOpen(false)}
                className="font-display text-3xl text-foreground"
              >
                Work
              </motion.a>
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="font-display text-3xl text-foreground"
              >
                About
              </motion.a>
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                href="https://instagram.com/ferunda"
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-3xl text-foreground"
              >
                Instagram
              </motion.a>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onBookingClick();
                }}
                className="font-display text-3xl text-foreground border-b border-foreground pb-1"
              >
                Book
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
