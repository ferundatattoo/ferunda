import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { trackBookingClick, trackNavigationClick } from "@/lib/analytics";

interface NavigationProps {
  onBookingClick: () => void;
  onStatusClick?: () => void;
}

const styleLinks = [
  { name: "Micro-Realism", href: "/micro-realism-tattoo" },
  { name: "Sacred Geometry", href: "/sacred-geometry-tattoos" },
  { name: "Fine Line", href: "/fine-line-tattoos" },
];

const locationLinks = [
  { name: "Austin, TX", href: "/tattoo-styles-austin" },
  { name: "Los Angeles, CA", href: "/tattoo-artist-los-angeles" },
  { name: "Houston, TX", href: "/tattoo-artist-houston" },
];

const Navigation = ({ onBookingClick, onStatusClick }: NavigationProps) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stylesDropdownOpen, setStylesDropdownOpen] = useState(false);
  const [locationsDropdownOpen, setLocationsDropdownOpen] = useState(false);
  const stylesRef = useRef<HTMLDivElement>(null);
  const locationsRef = useRef<HTMLDivElement>(null);

  const goToBooking = () => {
    setStylesDropdownOpen(false);
    setLocationsDropdownOpen(false);
    setMobileMenuOpen(false);
    trackBookingClick("navigation");
    // Always route to homepage and open the booking modal there
    navigate("/?book=1");
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stylesRef.current && !stylesRef.current.contains(event.target as Node)) {
        setStylesDropdownOpen(false);
      }
      if (locationsRef.current && !locationsRef.current.contains(event.target as Node)) {
        setLocationsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          <Link to="/" className="font-body text-xs tracking-[0.3em] uppercase text-muted-foreground hover:text-foreground transition-colors">
            Fernando Unda
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="/#work"
              className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300"
            >
              Work
            </a>
            
            {/* Styles Dropdown */}
            <div ref={stylesRef} className="relative">
              <button
                onClick={() => {
                  setStylesDropdownOpen(!stylesDropdownOpen);
                  setLocationsDropdownOpen(false);
                }}
                className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300 flex items-center gap-1"
              >
                Styles
                <ChevronDown className={`w-3 h-3 transition-transform ${stylesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {stylesDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-background border border-border shadow-lg z-50"
                  >
                    <div className="py-2">
                      {styleLinks.map((link) => (
                        <Link
                          key={link.name}
                          to={link.href}
                          onClick={() => setStylesDropdownOpen(false)}
                          className="block px-4 py-2 font-body text-xs tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Locations Dropdown */}
            <div ref={locationsRef} className="relative">
              <button
                onClick={() => {
                  setLocationsDropdownOpen(!locationsDropdownOpen);
                  setStylesDropdownOpen(false);
                }}
                className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300 flex items-center gap-1"
              >
                Locations
                <ChevronDown className={`w-3 h-3 transition-transform ${locationsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {locationsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-background border border-border shadow-lg z-50"
                  >
                    <div className="py-2">
                      {locationLinks.map((link) => (
                        <Link
                          key={link.name}
                          to={link.href}
                          onClick={() => setLocationsDropdownOpen(false)}
                          className="block px-4 py-2 font-body text-xs tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <a
              href="/#about"
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
              type="button"
              onClick={onStatusClick}
              className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300"
            >
              Track Booking
            </button>
            <button
              type="button"
              onClick={() => {
                // keep backward compat for homepage
                onBookingClick?.();
                goToBooking();
              }}
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
            className="fixed inset-0 z-40 bg-background md:hidden overflow-y-auto"
          >
            <div className="flex flex-col items-center justify-center min-h-full py-24 gap-6">
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                href="/#work"
                onClick={() => setMobileMenuOpen(false)}
                className="font-display text-3xl text-foreground"
              >
                Work
              </motion.a>
              
              {/* Mobile Styles Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center"
              >
                <span className="font-display text-3xl text-foreground/50 block mb-3">Styles</span>
                <div className="flex flex-col gap-2">
                  {styleLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-body text-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </motion.div>
              
              {/* Mobile Locations Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <span className="font-display text-3xl text-foreground/50 block mb-3">Locations</span>
                <div className="flex flex-col gap-2">
                  {locationLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-body text-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </motion.div>
              
              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                href="/#about"
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
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                onClick={() => {
                  onBookingClick?.();
                  goToBooking();
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
