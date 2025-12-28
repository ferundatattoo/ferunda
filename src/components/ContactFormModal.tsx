import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Mail, Phone, User, MessageSquare, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillMessage?: string;
}

const ContactFormModal = ({ isOpen, onClose, prefillMessage }: ContactFormModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: prefillMessage || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and highlight when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowHighlight(true);
      // Focus on name input after animation
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 400);
      
      // Remove highlight after a moment
      const highlightTimer = setTimeout(() => {
        setShowHighlight(false);
      }, 2000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(highlightTimer);
      };
    }
  }, [isOpen]);

  // Update message if prefillMessage changes
  useEffect(() => {
    if (prefillMessage) {
      setFormData(prev => ({ ...prev, message: prefillMessage }));
    }
  }, [prefillMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in your name, email, and message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          message: formData.message.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: "Thanks for reaching out. I'll get back to you soon.",
      });

      setFormData({ name: "", email: "", phone: "", message: "" });
      onClose();
    } catch (error: any) {
      console.error("Error sending contact email:", error);
      toast({
        title: "Error sending message",
        description: "Please try again or contact me via WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50"
          >
            <motion.div 
              className={`bg-card border rounded-lg shadow-2xl overflow-hidden transition-all duration-500 ${
                showHighlight 
                  ? "border-accent shadow-accent/20 ring-2 ring-accent/30" 
                  : "border-border"
              }`}
              animate={showHighlight ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {/* Header with highlight effect */}
              <div className={`flex items-center justify-between p-6 border-b transition-colors duration-500 ${
                showHighlight ? "border-accent/30 bg-accent/5" : "border-border"
              }`}>
                <div className="flex items-center gap-3">
                  {showHighlight && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, type: "spring" }}
                    >
                      <Sparkles className="w-5 h-5 text-accent" />
                    </motion.div>
                  )}
                  <div>
                    <h2 className="font-display text-2xl text-foreground">Get in Touch</h2>
                    <p className="font-body text-sm text-muted-foreground mt-1">
                      I'll respond within 24-48 hours
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block font-body text-sm text-foreground mb-2">
                    Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      className={`w-full pl-10 pr-4 py-3 bg-background border rounded-lg font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-300 ${
                        showHighlight 
                          ? "border-accent/50 ring-1 ring-accent/20" 
                          : "border-border focus:ring-foreground/20"
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-body text-sm text-foreground mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-body text-sm text-foreground mb-2">
                    Phone (optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-body text-sm text-foreground mb-2">
                    Message *
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell me about your tattoo idea..."
                      rows={4}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContactFormModal;
