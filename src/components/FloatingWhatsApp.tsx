import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { trackWhatsAppClick } from "@/lib/analytics";

// WhatsApp number
const WHATSAPP_NUMBER = "13236007905";
const WHATSAPP_MESSAGE = "Hi Fernando, I'm interested in booking a tattoo consultation.";

const FloatingWhatsApp = () => {
  const handleClick = () => {
    trackWhatsAppClick("floating_button");
  };

  return (
    <motion.a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-full shadow-lg hover:shadow-xl transition-shadow group"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Contact on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
      
      {/* Pulse effect */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
      
      {/* Tooltip */}
      <motion.span
        className="absolute right-full mr-3 px-3 py-2 bg-card text-foreground text-sm font-body whitespace-nowrap rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        initial={{ x: 10 }}
        whileHover={{ x: 0 }}
      >
        Chat on WhatsApp
      </motion.span>
    </motion.a>
  );
};

export default FloatingWhatsApp;
