import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Star, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import tattoo7 from "@/assets/tattoo-7.jpg";
import tattoo8 from "@/assets/tattoo-8.jpg";
import tattoo9 from "@/assets/tattoo-9.jpg";

const TattooArtistHouston = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navigation onBookingClick={() => {}} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back to Home</span>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-body text-sm text-accent">Houston, Texas</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
              Premier Tattoo Artist in Houston
            </h1>
            
            <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Fernando Unda (Ferunda) regularly visits Houston for exclusive tattoo sessions. 
              Experience world-class micro-realism and fine line tattoos in Texas's largest city.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Houston Sessions */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <ScrollReveal>
              <img 
                src={tattoo7} 
                alt="Ocean tattoo by Ferunda in Houston"
                className="w-full aspect-[3/4] object-cover"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <img 
                src={tattoo8} 
                alt="Phoenix tattoo by Ferunda"
                className="w-full aspect-[3/4] object-cover"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <img 
                src={tattoo9} 
                alt="Poseidon tattoo by Ferunda"
                className="w-full aspect-[3/4] object-cover"
              />
            </ScrollReveal>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <ScrollReveal>
              <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-6">
                Houston Guest Appearances
              </h2>
              
              <div className="space-y-4 font-body text-muted-foreground">
                <p>
                  As a Texas-based artist, Ferunda makes frequent trips to Houston—just a few hours from 
                  his Austin studio. Houston clients benefit from more available dates compared to his 
                  LA and international visits.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="border border-border p-4">
                    <Clock className="w-5 h-5 text-accent mb-2" />
                    <span className="font-display text-2xl text-foreground block">Full Day</span>
                    <span className="text-sm">Session Length</span>
                  </div>
                  <div className="border border-border p-4">
                    <Calendar className="w-5 h-5 text-accent mb-2" />
                    <span className="font-display text-2xl text-foreground block">Monthly</span>
                    <span className="text-sm">Visit Frequency</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.1}>
              <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-6">
                Specialties for Houston Clients
              </h2>
              
              <div className="space-y-6 font-body text-muted-foreground">
                <div className="border-l-2 border-accent pl-4">
                  <h3 className="text-foreground font-medium mb-2">Micro-Realism</h3>
                  <p className="text-sm">Ferunda's signature style—photorealistic detail at intimate scales</p>
                </div>
                
                <div className="border-l-2 border-accent pl-4">
                  <h3 className="text-foreground font-medium mb-2">Geometric & Sacred Geometry</h3>
                  <p className="text-sm">Mathematical precision with spiritual depth and personal meaning</p>
                </div>
                
                <div className="border-l-2 border-accent pl-4">
                  <h3 className="text-foreground font-medium mb-2">Fine Line Work</h3>
                  <p className="text-sm">Delicate, elegant designs with exceptional aging properties</p>
                </div>
                
                <div className="border-l-2 border-accent pl-4">
                  <h3 className="text-foreground font-medium mb-2">Narrative Pieces</h3>
                  <p className="text-sm">Custom compositions that tell your unique story</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="py-16 px-6 md:px-12 bg-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-6">
              Book Your Houston Tattoo Session
            </h2>
            
            <p className="font-body text-muted-foreground mb-8 max-w-2xl mx-auto">
              Secure your appointment with a $500 deposit. Houston sessions book quickly, 
              especially during convention season.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://link.clover.com/urlshortener/nRLw66"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent text-accent-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors"
              >
                Pay $500 Deposit
              </a>
              
              <Link
                to="/#availability"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-foreground/20 text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/5 transition-colors"
              >
                Check Houston Dates
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="prose prose-invert max-w-none font-body text-muted-foreground">
              <h2 className="text-foreground font-display text-3xl mb-6">
                Best Tattoo Artists in Houston: Why Choose Ferunda
              </h2>
              
              <p>
                Houston's tattoo scene is vibrant and competitive, with talented artists in Montrose, 
                the Heights, Downtown, and across the Greater Houston area. 
                <strong className="text-foreground"> Fernando Unda (Ferunda)</strong> brings something unique 
                to Houston's tattoo community.
              </p>
              
              <h3 className="text-foreground font-display text-2xl mt-8 mb-4">
                What Houston Clients Love About Ferunda
              </h3>
              
              <ul>
                <li><strong className="text-foreground">Full-day dedication</strong> — No rushing, no distractions</li>
                <li><strong className="text-foreground">Same-day design reveal</strong> — Fresh creativity for each piece</li>
                <li><strong className="text-foreground">International recognition</strong> — Featured in Forbes and Flaunt</li>
                <li><strong className="text-foreground">Healing-focused technique</strong> — Combination needle approach</li>
                <li><strong className="text-foreground">Nearby Austin base</strong> — More flexible scheduling for Houstonians</li>
              </ul>
              
              <h3 className="text-foreground font-display text-2xl mt-8 mb-4">
                Houston Tattoo FAQ
              </h3>
              
              <p>
                <strong className="text-foreground">How often does Ferunda visit Houston?</strong><br />
                Ferunda typically visits Houston monthly. Check the availability calendar for specific dates.
              </p>
              
              <p>
                <strong className="text-foreground">Where in Houston does Ferunda work?</strong><br />
                Location details are provided after booking. Sessions take place at professional partner studios.
              </p>
              
              <p>
                <strong className="text-foreground">Can I meet Ferunda before booking?</strong><br />
                Virtual consultations are available via WhatsApp or phone after your deposit is secured.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default TattooArtistHouston;
