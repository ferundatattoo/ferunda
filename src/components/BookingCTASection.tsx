import { useState } from "react";
import ScrollReveal from "./ScrollReveal";
import { Mail, Sparkles, CheckCircle } from "lucide-react";
import ContactFormModal from "./ContactFormModal";

interface BookingCTASectionProps {
  onBookingClick: () => void;
  onOpenChat?: () => void;
}

const BookingCTASection = ({ onBookingClick, onOpenChat }: BookingCTASectionProps) => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleAskQuestion = () => {
    // Trigger the Luna chatbot to open
    if (onOpenChat) {
      onOpenChat();
    } else {
      // Fallback: dispatch custom event to open chat
      window.dispatchEvent(new CustomEvent('openLunaChat'));
    }
  };

  return (
    <>
      <section className="py-24 md:py-32 bg-foreground text-background relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <ScrollReveal>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-background/30" />
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-background/60">
                Let's Connect
              </span>
              <div className="h-px w-12 bg-background/30" />
            </div>

            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-background mb-6">
              Ready to Tell Your Story?
            </h2>

            <p className="font-body text-background/70 max-w-2xl mx-auto mb-10 text-lg">
              I take only one client per day. Let's discuss your vision 
              and create something meaningful together.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
              <div className="flex items-center gap-2 text-background/60">
                <CheckCircle className="w-4 h-4" />
                <span className="font-body text-sm">One Client Per Day</span>
              </div>
              <div className="flex items-center gap-2 text-background/60">
                <CheckCircle className="w-4 h-4" />
                <span className="font-body text-sm">Custom Design Included</span>
              </div>
              <div className="flex items-center gap-2 text-background/60">
                <CheckCircle className="w-4 h-4" />
                <span className="font-body text-sm">Free Consultation</span>
              </div>
              <div className="flex items-center gap-2 text-background/60">
                <CheckCircle className="w-4 h-4" />
                <span className="font-body text-sm">Google Calendar Sync</span>
              </div>
            </div>

            <p className="font-body text-background/50 text-xs mb-8 max-w-xl mx-auto">
              We use Google Calendar integration to seamlessly schedule your appointments. Your booking data is handled securely per our{" "}
              <a href="/privacy-policy" className="text-background underline hover:text-background/80 transition-colors">Privacy Policy</a>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setIsContactOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-background text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-background/90 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Contact Me
              </button>
              <button
                onClick={handleAskQuestion}
                className="group inline-flex items-center justify-center gap-2 px-10 py-4 border border-background/30 text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-background/10 transition-colors"
              >
                <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
                Chat with Luna
              </button>
            </div>

            <p className="font-body text-background/50 text-xs mt-6">
              Luna is my AI assistant — she knows everything about my work and can answer your questions instantly
            </p>
          </ScrollReveal>
        </div>
      </section>
      
      <ContactFormModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
};

export default BookingCTASection;
