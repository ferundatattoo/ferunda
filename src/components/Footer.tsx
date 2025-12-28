import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Instagram, MapPin, Sparkles } from "lucide-react";

const Footer = () => {
  const locationLinks = [
    { name: "Austin, TX", href: "/tattoo-styles-austin" },
    { name: "Los Angeles, CA", href: "/tattoo-artist-los-angeles" },
    { name: "Houston, TX", href: "/tattoo-artist-houston" },
  ];

  const styleLinks = [
    { name: "Micro-Realism", href: "/micro-realism-tattoo" },
    { name: "Sacred Geometry", href: "/sacred-geometry-tattoos" },
    { name: "Fine Line", href: "/fine-line-tattoos" },
  ];

  const quickLinks = [
    { name: "Gallery", href: "/#work" },
    { name: "About", href: "/#about" },
    { name: "FAQ", href: "/#faq" },
    { name: "Availability", href: "/#availability" },
  ];

  return (
    <footer className="py-16 px-6 md:px-12 border-t border-border">
      <div className="container mx-auto">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Fernando Unda" className="w-8 h-8 invert opacity-80" />
              <span className="font-display text-lg text-foreground">Ferunda</span>
            </div>
            <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
              Award-winning tattoo artist specializing in micro-realism, fine line, and geometric tattoos.
            </p>
            <a
              href="https://instagram.com/ferunda"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span className="font-body text-xs tracking-[0.15em] uppercase">@ferunda</span>
            </a>
          </div>

          {/* Locations */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-accent" />
              <h3 className="font-body text-xs tracking-[0.2em] uppercase text-foreground">Locations</h3>
            </div>
            <ul className="space-y-2">
              {locationLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tattoo Styles */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="font-body text-xs tracking-[0.2em] uppercase text-foreground">Styles</h3>
            </div>
            <ul className="space-y-2">
              {styleLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-body text-xs tracking-[0.2em] uppercase text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="font-body text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fernando Unda. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <a
              href="https://wa.me/51952141416"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="mailto:contact@ferunda.com"
              className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Email
            </a>
            <a
              href="https://link.clover.com/urlshortener/nRLw66"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Book Now
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
