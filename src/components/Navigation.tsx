import { useEffect, useState } from "react";

interface NavigationProps {
  onContactClick: () => void;
}

const Navigation = ({ onContactClick }: NavigationProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/90 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 py-6 flex justify-between items-center">
        <div className="font-body text-xs tracking-[0.3em] uppercase text-muted-foreground">
          Fernando Unda
        </div>
        <div className="flex items-center gap-8">
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
          <button
            onClick={onContactClick}
            className="font-body text-xs tracking-[0.2em] uppercase text-foreground/70 hover:text-foreground transition-colors duration-300"
          >
            Contact
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
