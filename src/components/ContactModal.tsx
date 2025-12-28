import { useState } from "react";
import { X, Instagram, Mail, MapPin } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal = ({ isOpen, onClose }: ContactModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Open email client with pre-filled content
    const subject = encodeURIComponent(`Tattoo Inquiry from ${formData.name}`);
    const body = encodeURIComponent(`${formData.message}\n\n---\nFrom: ${formData.name}\nEmail: ${formData.email}`);
    window.location.href = `mailto:contact@ferunda.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/95 backdrop-blur-sm animate-fade-in-slow"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative h-full flex items-center justify-center p-6">
        <div className="w-full max-w-2xl opacity-0 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 md:top-12 md:right-12 p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                03
              </span>
              <div className="h-px w-12 bg-border" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
              Get in Touch
            </h2>
            <p className="font-body text-muted-foreground mt-4">
              Ready to bring your story to life? Let's create something unique together.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                Tell me about your idea
              </label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
                placeholder="Describe your vision..."
              />
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-12 py-4 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
            >
              Send Message
            </button>
          </form>

          {/* Social Links */}
          <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-8">
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
              href="mailto:contact@ferunda.com"
              className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Mail className="w-5 h-5" />
              <span className="font-body text-sm">contact@ferunda.com</span>
            </a>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="w-5 h-5" />
              <span className="font-body text-sm">Based in Los Angeles</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
