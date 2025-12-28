import { motion } from "framer-motion";
import { Compass, Triangle, Circle, Hexagon } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import SEOBreadcrumb from "@/components/SEOBreadcrumb";
import tattoo2 from "@/assets/tattoo-2.jpg";
import tattoo6 from "@/assets/tattoo-6.jpg";

const SacredGeometryTattoos = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navigation onBookingClick={() => {}} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <SEOBreadcrumb 
            items={[
              { label: "Tattoo Styles", href: "/#work" },
              { label: "Sacred Geometry" }
            ]} 
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-accent" />
              <span className="font-body text-sm text-accent uppercase tracking-wider">Geometric Art</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
              Sacred Geometry Tattoos
            </h1>
            
            <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Mathematical precision meets spiritual depth. Ferunda creates sacred geometry tattoos that 
              integrate ancient symbols with personal meaning, resulting in pieces with both visual 
              impact and profound significance.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Work */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <ScrollReveal>
              <img 
                src={tattoo6} 
                alt="Sacred geometry sleeve by Ferunda" 
                className="w-full aspect-[3/4] object-cover"
              />
              <p className="font-body text-sm text-muted-foreground mt-4 text-center">Sacred Geometry Sleeve</p>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <img 
                src={tattoo2} 
                alt="Geometric wisdom tattoo" 
                className="w-full aspect-[3/4] object-cover"
              />
              <p className="font-body text-sm text-muted-foreground mt-4 text-center">Wisdom — Geometric Integration</p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Sacred Geometry Explained */}
      <section className="py-16 px-6 md:px-12 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-8 text-center">
              Understanding Sacred Geometry
            </h2>
            
            <div className="prose prose-invert max-w-none font-body text-muted-foreground">
              <p className="text-lg">
                <strong className="text-foreground">Sacred geometry</strong> refers to geometric patterns 
                and shapes that hold spiritual and symbolic significance across cultures and throughout 
                history. These patterns appear throughout nature, architecture, and art—from the spirals 
                of galaxies to the structure of DNA.
              </p>
              
              <p>
                In tattoo art, sacred geometry creates a bridge between the physical and spiritual, 
                encoding meaning into mathematical precision. Ferunda specializes in weaving these 
                ancient patterns with personal symbolism to create pieces that resonate on multiple levels.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Common Symbols */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
              Popular Sacred Geometry Symbols
            </h2>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ScrollReveal delay={0.1}>
              <div className="text-center p-6 border border-border">
                <Triangle className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h3 className="font-display text-xl text-foreground mb-3">Flower of Life</h3>
                <p className="font-body text-muted-foreground text-sm">
                  Overlapping circles representing the cycle of creation. Found in ancient temples worldwide.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.2}>
              <div className="text-center p-6 border border-border">
                <Circle className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h3 className="font-display text-xl text-foreground mb-3">Metatron's Cube</h3>
                <p className="font-body text-muted-foreground text-sm">
                  Contains all five Platonic solids. Represents balance between the finite and infinite.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.3}>
              <div className="text-center p-6 border border-border">
                <Hexagon className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h3 className="font-display text-xl text-foreground mb-3">Sri Yantra</h3>
                <p className="font-body text-muted-foreground text-sm">
                  Nine interlocking triangles symbolizing the cosmos and human body's energy centers.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.4}>
              <div className="text-center p-6 border border-border">
                <Compass className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h3 className="font-display text-xl text-foreground mb-3">Golden Ratio</h3>
                <p className="font-body text-muted-foreground text-sm">
                  The mathematical proportion found throughout nature, art, and architecture.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Ferunda's Approach */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-8 text-center">
              Ferunda's Geometric Approach
            </h2>
            
            <div className="prose prose-invert max-w-none font-body text-muted-foreground">
              <p>
                Rather than copying existing geometric patterns, <strong className="text-foreground">Ferunda 
                creates custom compositions</strong> that integrate sacred geometry with elements meaningful 
                to each client. His process includes:
              </p>
              
              <ul>
                <li><strong className="text-foreground">Personal consultation</strong> — Understanding your 
                symbols, dates, names, and the story you want to tell</li>
                <li><strong className="text-foreground">Geometric integration</strong> — Weaving sacred 
                patterns with micro-realism and blackwork elements</li>
                <li><strong className="text-foreground">Astronomical elements</strong> — Often incorporating 
                celestial bodies and cosmic imagery</li>
                <li><strong className="text-foreground">Perfect precision</strong> — Mathematical accuracy 
                in every line and angle</li>
              </ul>
              
              <p>
                The result is a piece that's visually striking, personally meaningful, and unlike 
                anything else—100% unique to you.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 md:px-12 bg-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-6">
              Create Your Sacred Geometry Piece
            </h2>
            
            <p className="font-body text-muted-foreground mb-8 max-w-2xl mx-auto">
              Book a session with Ferunda in Austin, Los Angeles, or Houston to design a 
              geometric tattoo with profound personal meaning.
            </p>
            
            <a
              href="https://link.clover.com/urlshortener/nRLw66"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-accent-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors"
            >
              Book Your Session
            </a>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default SacredGeometryTattoos;
