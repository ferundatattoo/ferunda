import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Star } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import SEOBreadcrumb from "@/components/SEOBreadcrumb";
import SEOHead from "@/components/SEOHead";
import ContactFormModal from "@/components/ContactFormModal";
import tattoo4 from "@/assets/tattoo-4.jpg";
import tattoo5 from "@/assets/tattoo-5.jpg";
import tattoo6 from "@/assets/tattoo-6.jpg";

const TattooArtistLosAngeles = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <SEOHead 
        title="Guest Tattoo Artist in Los Angeles CA"
        description="Fernando Unda (Ferunda) brings world-class micro-realism and fine line tattoos to Los Angeles. Book exclusive guest spot sessions when he visits LA. Featured in Forbes and Flaunt."
        canonicalUrl="/tattoo-artist-los-angeles"
        keywords="tattoo artist Los Angeles, guest tattoo artist LA, fine line tattoo LA, micro-realism Los Angeles, best tattoo artist LA, Ferunda Los Angeles"
      />
      <Navigation onBookingClick={() => {}} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <SEOBreadcrumb 
            items={[
              { label: "Locations", href: "/#availability" },
              { label: "Los Angeles, CA" }
            ]} 
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-body text-sm text-accent">Los Angeles, California</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
              Guest Tattoo Artist in Los Angeles
            </h1>
            
            <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Fernando Unda (Ferunda) brings his signature micro-realism and fine line expertise to Los Angeles 
              for exclusive guest spots. Book your session when he's in LA for a one-of-a-kind tattoo experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* LA Guest Spot Info */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <ScrollReveal>
              <img 
                src={tattoo4} 
                alt="Fine line tattoo by Ferunda in Los Angeles"
                className="w-full aspect-[4/5] object-cover"
              />
            </ScrollReveal>
            
            <ScrollReveal delay={0.1}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-accent" />
                <span className="font-body text-sm text-accent uppercase tracking-wider">Guest Spots</span>
              </div>
              
              <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-6">
                Los Angeles Tattoo Sessions
              </h2>
              
              <div className="space-y-4 font-body text-muted-foreground">
                <p>
                  Based in Austin, Texas, Ferunda makes regular trips to Los Angeles to meet with clients 
                  seeking his unique micro-realism and geometric tattoo styles. These exclusive guest spots 
                  fill quickly.
                </p>
                
                <p>
                  LA clients appreciate Ferunda's:
                </p>
                
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                    <span>One-on-one attention with full-day sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                    <span>Custom designs created specifically for your vision</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                    <span>Expertise featured in Forbes and Flaunt Magazine</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                    <span>Unique needle technique for superior healing</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ScrollReveal delay={0.2} className="md:order-2">
              <img 
                src={tattoo5} 
                alt="Geometric tattoo by Ferunda"
                className="w-full aspect-[4/5] object-cover"
              />
            </ScrollReveal>
            
            <ScrollReveal delay={0.3} className="md:order-1">
              <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-6">
                Popular Styles in Los Angeles
              </h2>
              
              <div className="space-y-6 font-body text-muted-foreground">
                <div>
                  <h3 className="text-foreground font-medium mb-2">Micro-Realism</h3>
                  <p>LA's entertainment industry professionals love Ferunda's ability to create incredibly 
                  detailed realistic imagery at intimate scales—perfect for visible placements.</p>
                </div>
                
                <div>
                  <h3 className="text-foreground font-medium mb-2">Sacred Geometry</h3>
                  <p>The spiritual community in Los Angeles gravitates toward Ferunda's sacred geometry 
                  work, which integrates meaningful symbols with mathematical precision.</p>
                </div>
                
                <div>
                  <h3 className="text-foreground font-medium mb-2">Fine Line Portraits</h3>
                  <p>Celebrities and creatives choose Ferunda for delicate portrait work that captures 
                  emotion and detail with minimal linework.</p>
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
              Book Your Los Angeles Session
            </h2>
            
            <p className="font-body text-muted-foreground mb-8 max-w-2xl mx-auto">
              Check the availability calendar for upcoming LA dates. A $500 deposit secures your spot. 
              Spaces are limited during each visit.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setIsContactOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent text-accent-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors"
              >
                Contact for Session
              </button>
              
              <Link
                to="/#availability"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-foreground/20 text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/5 transition-colors"
              >
                View LA Dates
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <ContactFormModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

      {/* SEO Content */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="prose prose-invert max-w-none font-body text-muted-foreground">
              <h2 className="text-foreground font-display text-3xl mb-6">
                Finding the Best Tattoo Artist in Los Angeles
              </h2>
              
              <p>
                Los Angeles is home to thousands of tattoo artists, making it challenging to find someone 
                who truly stands out. <strong className="text-foreground">Fernando Unda (Ferunda)</strong> has built 
                a reputation as one of the most sought-after guest artists in the LA tattoo scene.
              </p>
              
              <p>
                What sets Ferunda apart from other Los Angeles tattoo artists:
              </p>
              
              <ul>
                <li><strong className="text-foreground">Exclusive attention</strong> — One client per day means your session isn't rushed</li>
                <li><strong className="text-foreground">Custom artistry</strong> — Every design is created specifically for you</li>
                <li><strong className="text-foreground">Healing expertise</strong> — Unique needle technique minimizes trauma</li>
                <li><strong className="text-foreground">Press recognition</strong> — Featured in Forbes, Flaunt, and Grazia</li>
                <li><strong className="text-foreground">International experience</strong> — Clients from 5+ countries</li>
              </ul>
              
              <p>
                Whether you're in Hollywood, Santa Monica, Downtown LA, or the Valley, Ferunda's guest spots 
                offer an opportunity to work with a world-class artist without traveling to Austin.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default TattooArtistLosAngeles;
