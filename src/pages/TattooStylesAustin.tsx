import { motion } from "framer-motion";
import { MapPin, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import SEOBreadcrumb from "@/components/SEOBreadcrumb";
import SEOHead from "@/components/SEOHead";
import tattoo1 from "@/assets/tattoo-1.jpg";
import tattoo2 from "@/assets/tattoo-2.jpg";
import tattoo3 from "@/assets/tattoo-3.jpg";

const styles = [
  {
    name: "Fine Line Tattoos",
    description: "Delicate, precise linework creating elegant designs with minimal ink. Perfect for subtle, sophisticated pieces that age beautifully.",
    features: ["Single needle precision", "Minimal scarring", "Elegant aging", "Subtle placement options"],
    image: tattoo1,
  },
  {
    name: "Geometric Tattoos",
    description: "Mathematical precision meets artistic vision. Sacred geometry, mandalas, and abstract patterns that hold deep symbolic meaning.",
    features: ["Sacred geometry integration", "Perfect symmetry", "Symbolic depth", "Custom compositions"],
    image: tattoo2,
  },
  {
    name: "Micro-Realism",
    description: "Ferunda's signature style. Incredibly detailed realistic imagery scaled down to intimate sizes without losing clarity or impact.",
    features: ["Photorealistic detail", "Miniature scale mastery", "Long-lasting clarity", "Unique technique"],
    image: tattoo3,
  },
  {
    name: "Blackwork",
    description: "Bold, striking designs using solid black ink. From dotwork to geometric blackout, creating powerful visual statements.",
    features: ["High contrast impact", "Timeless appeal", "Versatile styles", "Strong visual presence"],
    image: tattoo1,
  },
];

const TattooStylesAustin = () => {
  return (
    <main className="min-h-screen bg-background">
      <SEOHead 
        title="Best Tattoo Artist in Austin TX"
        description="Discover signature tattoo styles by Fernando Unda (Ferunda) in Austin, Texas. Specializing in micro-realism, fine line, geometric, and blackwork tattoos. Book your custom tattoo session today."
        canonicalUrl="/tattoo-styles-austin"
        keywords="tattoo artist Austin TX, best tattoo Austin, fine line tattoo Austin, geometric tattoo Austin, micro-realism Austin, Ferunda Austin"
      />
      <Navigation onBookingClick={() => {}} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <SEOBreadcrumb 
            items={[
              { label: "Locations", href: "/#availability" },
              { label: "Austin, TX" }
            ]} 
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-body text-sm text-accent">Austin, Texas</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
              Tattoo Styles in Austin
            </h1>
            
            <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Discover the signature tattoo styles offered by Fernando Unda (Ferunda) in Austin, TX. 
              From micro-realism to sacred geometry, each piece is custom-designed to tell your unique story.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Styles Grid */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-16">
            {styles.map((style, index) => (
              <ScrollReveal key={style.name} delay={index * 0.1}>
                <article className="grid md:grid-cols-2 gap-8 items-center">
                  <div className={`${index % 2 === 1 ? 'md:order-2' : ''}`}>
                    <img 
                      src={style.image} 
                      alt={`${style.name} example by Ferunda in Austin`}
                      className="w-full aspect-[4/5] object-cover"
                    />
                  </div>
                  <div className={`${index % 2 === 1 ? 'md:order-1' : ''}`}>
                    <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
                      {style.name}
                    </h2>
                    <p className="font-body text-muted-foreground leading-relaxed mb-6">
                      {style.description}
                    </p>
                    <ul className="space-y-3">
                      {style.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-accent" />
                          <span className="font-body text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Local SEO Content */}
      <section className="py-16 px-6 md:px-12 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-8 text-center">
              Why Choose Ferunda for Your Austin Tattoo?
            </h2>
            
            <div className="prose prose-invert max-w-none font-body text-muted-foreground">
              <p>
                <strong className="text-foreground">Fernando Unda</strong>, known professionally as Ferunda, 
                has established himself as one of Austin's premier tattoo artists specializing in micro-realism, 
                fine line work, and geometric designs. With over 10 years of experience and clients from 5+ countries, 
                his unique technique combines traditional foundations with innovative approaches.
              </p>
              
              <p>
                Located in <strong className="text-foreground">Austin, Texas</strong>, Ferunda dedicates one full day 
                to each client, ensuring every piece receives the attention and artistry it deserves. This approach 
                sets him apart from other tattoo artists in the Austin area who may rush through multiple appointments.
              </p>
              
              <h3 className="text-foreground font-display text-2xl mt-8 mb-4">
                What Makes Ferunda Different?
              </h3>
              
              <ul>
                <li>One client per day policy for undivided attention</li>
                <li>Custom designs revealed on appointment day for fresh creative energy</li>
                <li>Combination of traditional and single needles for better healing</li>
                <li>Featured in Forbes, Flaunt, and Grazia magazines</li>
                <li>10+ years of professional experience</li>
              </ul>
              
              <h3 className="text-foreground font-display text-2xl mt-8 mb-4">
                Ready to Book Your Austin Tattoo Session?
              </h3>
              
              <p>
                Book a consultation to discuss your vision. Whether you're looking for a small fine line piece 
                or a full sleeve featuring sacred geometry, Ferunda will create something truly unique for you.
              </p>
            </div>
            
            <div className="mt-8 text-center">
              <a
                href="https://link.clover.com/urlshortener/nRLw66"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-accent-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-accent/90 transition-colors"
              >
                Book Austin Session
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default TattooStylesAustin;
