import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Instagram, Mail, MapPin, Calendar, Loader2, MessageCircle, Phone } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// WhatsApp number
const WHATSAPP_NUMBER = "51952141416";

// Validation schema
const bookingSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .transform(val => val.trim()),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .transform(val => val.trim().toLowerCase()),
  phone: z.string()
    .max(20, "Phone number must be less than 20 characters")
    .transform(val => val.trim())
    .optional()
    .nullable(),
  preferred_date: z.string().optional().nullable(),
  placement: z.string()
    .max(100, "Placement must be less than 100 characters")
    .transform(val => val.trim())
    .optional()
    .nullable(),
  size: z.enum(["", "tiny", "small", "medium", "large"]).optional().nullable(),
  tattoo_description: z.string()
    .min(10, "Please describe your tattoo idea in at least 10 characters")
    .max(2000, "Description must be less than 2000 characters")
    .transform(val => val.trim()),
});

type BookingFormData = z.infer<typeof bookingSchema>;

const BookingModal = ({ isOpen, onClose }: BookingModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferred_date: "",
    placement: "",
    size: "",
    tattoo_description: "",
  });

  const validateForm = (): BookingFormData | null => {
    try {
      const validated = bookingSchema.parse(formData);
      setErrors({});
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          if (field && !fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validated = validateForm();
    if (!validated) {
      toast({
        title: "Validation Error",
        description: "Please check the form for errors.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("bookings").insert({
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        preferred_date: validated.preferred_date || null,
        placement: validated.placement || null,
        size: validated.size || null,
        tattoo_description: validated.tattoo_description,
      });

      if (error) throw error;

      toast({
        title: "Booking Request Sent",
        description: "I'll get back to you within 48 hours to discuss your vision.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        preferred_date: "",
        placement: "",
        size: "",
        tattoo_description: "",
      });
      setErrors({});
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again or contact me directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-background/98 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="relative min-h-screen flex items-start md:items-center justify-center p-6 py-16">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-2xl relative"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute -top-10 right-0 md:top-0 md:-right-12 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Header */}
              <div className="mb-10">
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    Book
                  </span>
                  <div className="h-px w-12 bg-border" />
                </div>
                <h2 className="font-display text-4xl md:text-5xl font-light text-foreground">
                  Book Your Consultation
                </h2>
                <p className="font-body text-muted-foreground mt-4">
                  Tell me about your vision. I'll respond within 48 hours.
                </p>
                
                {/* Quick Contact Options */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Fernando, I'm interested in booking a tattoo consultation.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition-colors font-body text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                  <a
                    href="mailto:fernando@ferunda.com?subject=Tattoo Consultation Request"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 text-foreground/80 hover:bg-accent/20 transition-colors font-body text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                </div>
                
                <div className="flex items-center gap-4 my-6">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-body text-xs text-muted-foreground uppercase tracking-widest">or fill out the form</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors ${
                        errors.name ? "border-destructive" : "border-border focus:border-foreground"
                      }`}
                      placeholder="Your name"
                    />
                    {errors.name && (
                      <p className="text-destructive text-xs mt-1 font-body">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={255}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors ${
                        errors.email ? "border-destructive" : "border-border focus:border-foreground"
                      }`}
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1 font-body">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Phone
                    </label>
                    <input
                      type="tel"
                      maxLength={20}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors ${
                        errors.phone ? "border-destructive" : "border-border focus:border-foreground"
                      }`}
                      placeholder="+1 (555) 000-0000"
                    />
                    {errors.phone && (
                      <p className="text-destructive text-xs mt-1 font-body">{errors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      <Calendar className="w-3 h-3 inline mr-2" />
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                      className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Placement
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={formData.placement}
                      onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                      className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors ${
                        errors.placement ? "border-destructive" : "border-border focus:border-foreground"
                      }`}
                      placeholder="e.g., Inner forearm"
                    />
                    {errors.placement && (
                      <p className="text-destructive text-xs mt-1 font-body">{errors.placement}</p>
                    )}
                  </div>
                  <div>
                    <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                      Size
                    </label>
                    <select
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-background">Select size</option>
                      <option value="tiny" className="bg-background">Tiny (1-2 inches)</option>
                      <option value="small" className="bg-background">Small (2-4 inches)</option>
                      <option value="medium" className="bg-background">Medium (4-6 inches)</option>
                      <option value="large" className="bg-background">Large (6+ inches)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                    Tell me about your vision *
                  </label>
                  <textarea
                    required
                    rows={4}
                    maxLength={2000}
                    value={formData.tattoo_description}
                    onChange={(e) => setFormData({ ...formData, tattoo_description: e.target.value })}
                    className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors resize-none ${
                      errors.tattoo_description ? "border-destructive" : "border-border focus:border-foreground"
                    }`}
                    placeholder="Describe your idea, the story behind it, any references or inspirations..."
                  />
                  {errors.tattoo_description && (
                    <p className="text-destructive text-xs mt-1 font-body">{errors.tattoo_description}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1 font-body text-right">
                    {formData.tattoo_description.length}/2000
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-12 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </form>

              {/* Social Links */}
              <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[#25D366] hover:text-[#25D366]/80 transition-colors group"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-body text-sm">WhatsApp</span>
                </a>
                <a
                  href="https://instagram.com/ferunda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="font-body text-sm">@ferunda</span>
                </a>
                <a
                  href="mailto:fernando@ferunda.com"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-body text-sm">fernando@ferunda.com</span>
                </a>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5" />
                  <span className="font-body text-sm">Based in Los Angeles</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BookingModal;
