import ScrollReveal from "./ScrollReveal";
import { Calendar, Clock, CheckCircle } from "lucide-react";

interface BookingCTASectionProps {
  onBookingClick: () => void;
}

const BookingCTASection = ({ onBookingClick }: BookingCTASectionProps) => {
  return (
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
              Book Now
            </span>
            <div className="h-px w-12 bg-background/30" />
          </div>

          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-background mb-6">
            Ready to Tell Your Story?
          </h2>

          <p className="font-body text-background/70 max-w-2xl mx-auto mb-10 text-lg">
            I take only one client per day. Secure your session with a $500 deposit 
            and let's create something meaningful together.
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
              <span className="font-body text-sm">$500 Deposit</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://link.clover.com/urlshortener/nRLw66"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-background text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-background/90 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Pay $500 Deposit
            </a>
            <button
              onClick={onBookingClick}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 border border-background/30 text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-background/10 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Ask a Question First
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default BookingCTASection;
