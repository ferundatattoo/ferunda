import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-16 px-6 md:px-12 border-t border-border">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-center gap-8"
        >
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img src={logo} alt="Fernando Unda" className="w-8 h-8 invert opacity-60" />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">
              Fernando Unda
            </span>
          </div>

          {/* Social */}
          <a
            href="https://instagram.com/ferunda"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Instagram className="w-4 h-4" />
            <span className="font-body text-xs tracking-[0.15em] uppercase">@ferunda</span>
          </a>

          {/* Copyright */}
          <p className="font-body text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fernando Unda. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
