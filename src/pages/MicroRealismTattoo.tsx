import { motion } from "framer-motion";
import { Sparkles, Eye, Heart, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import SEOBreadcrumb from "@/components/SEOBreadcrumb";
import SEOHead from "@/components/SEOHead";
import tattoo1 from "@/assets/tattoo-1.jpg";
import tattoo2 from "@/assets/tattoo-2.jpg";
import tattoo3 from "@/assets/tattoo-3.jpg";
import tattoo4 from "@/assets/tattoo-4.jpg";

const MicroRealismTattoo = () => {
  return (
    <main className="min-h-screen bg-background">
      <SEOHead 
        title="Micro-Realism Tattoos"
        description="Discover Ferunda's signature micro-realism tattoo technique—photorealistic detail at intimate scales. Learn about this advanced style and book your custom piece in Austin, LA, or Houston."
        canonicalUrl="/micro-realism-tattoo"
        keywords="micro-realism tattoo, micro realism tattoo artist, photorealistic tattoo, miniature tattoo, detailed small tattoo, Ferunda micro-realism"
      />
      <Navigation onBookingClick={() => {}} />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <SEOBreadcrumb 
            items={[
              { label: "Tattoo Styles", href: "/#work" },
              { label: "Micro-Realism" }
            ]} 
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-body text-sm text-accent uppercase tracking-wider">Signature Style</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
              Micro-Realism Tattoos
            </h1>
            
            <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Discover Ferunda's signature micro-realism technique—photorealistic detail at intimate scales. 
              A perfect fusion of technical mastery and artistic vision that creates timeless pieces.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScrollReveal>
              <img src={tattoo1} alt="Micro-realism tattoo example" className="w-full aspect-square object-cover" />
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <img src={tattoo2} alt="Detailed micro-realism work" className="w-full aspect-square object-cover" />
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <img src={tattoo3} alt="Fine detail micro-realism" className="w-full aspect-square object-cover" />
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <img src={tattoo4} alt="Micro-realism portrait" className="w-full aspect-square object-cover" />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* What is Micro-Realism */}
      <section className="py-16 px-6 md:px-12 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-8 text-center">
              What is Micro-Realism?
            </h2>
            
            <div className="prose prose-invert max-w-none font-body text-muted-foreground">
              <p className="text-lg">
                <strong className="text-foreground">Micro-realism</strong> is an advanced tattoo technique that 
                creates highly detailed, photorealistic imagery at a miniature scale. Unlike traditional realism 
                that often requires large canvas areas, micro-realism captures the same level of detail in 
                significantly smaller dimensions.
              </p>
              
              <p>
                This style demands exceptional skill, precision, and an understanding of how ink behaves in skin 
                at tiny scales. Ferunda has mastered this technique over 10+ years, developing unique methods 
                that ensure his micro-realistic pieces age beautifully.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
              Why Choose Micro-Realism?
            </h2>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-3 gap-8">
            <ScrollReveal delay={0.1}>
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-6 border border-accent/30 flex items-center justify-center">
                  <Eye className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-4">Stunning Detail</h3>
                <p className="font-body text-muted-foreground text-sm">
                  Capture intricate details like individual eyelashes, fabric textures, and light reflections 
                  in surprisingly small spaces.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.2}>
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-6 border border-accent/30 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-4">Subtle Elegance</h3>
                <p className="font-body text-muted-foreground text-sm">
                  Perfect for those who want meaningful, detailed artwork without large, obvious tattoos. 
                  Discreet yet impactful.
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.3}>
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-6 border border-accent/30 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-accent" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-4">Ferunda's Technique</h3>
                <p className="font-body text-muted-foreground text-sm">
                  Unique combination of traditional and single needles ensures better healing and 
                  long-lasting clarity.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
              Micro-Realism FAQ
            </h2>
            
            <div className="space-y-8 font-body text-muted-foreground">
              <div>
                <h3 className="text-foreground font-medium mb-2">Do micro-realism tattoos age well?</h3>
                <p>When done correctly with proper technique, yes. Ferunda's unique needle combination 
                approach minimizes skin trauma, resulting in cleaner healing and better longevity. 
                Proper aftercare and sun protection are essential.</p>
              </div>
              
              <div>
                <h3 className="text-foreground font-medium mb-2">What subjects work best for micro-realism?</h3>
                <p>Portraits, animals, nature scenes, and meaningful objects all translate beautifully. 
                Ferunda often incorporates geometric elements and sacred geometry to enhance compositions.</p>
              </div>
              
              <div>
                <h3 className="text-foreground font-medium mb-2">How small can micro-realism tattoos be?</h3>
                <p>Size depends on complexity. Ferunda will advise on the minimum size needed to maintain 
                detail integrity. The goal is creating art that remains clear and impactful over time.</p>
              </div>
              
              <div>
                <h3 className="text-foreground font-medium mb-2">Where can I get a micro-realism tattoo from Ferunda?</h3>
                <p>Ferunda is based in Austin, TX with regular guest spots in Los Angeles and Houston. 
                Check the availability calendar for dates in each city.</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 md:px-12 bg-secondary/30">
        <div className="container mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-6">
              Ready for Your Micro-Realism Piece?
            </h2>
            
            <p className="font-body text-muted-foreground mb-8 max-w-2xl mx-auto">
              Book a session with Ferunda to bring your vision to life with stunning micro-realistic detail.
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

export default MicroRealismTattoo;
