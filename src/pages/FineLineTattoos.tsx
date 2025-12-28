import { motion } from "framer-motion";
import { ArrowLeft, Feather, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import tattoo1 from "@/assets/tattoo-1.jpg";
import tattoo3 from "@/assets/tattoo-3.jpg";

const FineLineTattoos = () => {
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
              <Feather className="w-4 h-4 text-accent" />
              <span className="font-body text-sm text-accent uppercase tracking-wider">Delicate Art</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
              Fine Line Tattoos
            </h1>
            
            <p className="font-body text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Elegant, delicate linework that creates sophisticated tattoos with timeless appeal. 
              Ferunda's fine line work combines precision with artistry for pieces that age beautifully.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <ScrollReveal>
              <img 
                src={tattoo1} 
                alt="Fine line tattoo by Ferunda" 
                className="w-full aspect-[3/4] object-cover"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <img 
                src={tattoo3} 
                alt="Delicate fine line work" 
                className="w-full aspect-[3/4] object-cover"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* About Fine Line */}
      <section className="py-16 px-6 md:px-12 bg-secondary/30">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-8 text-center">
              The Art of Fine Line Tattooing
            </h2>
            
            <div className="prose prose-invert max-w-none font-body text-muted-foreground">
              <p className="text-lg">
                <strong className="text-foreground">Fine line tattoos</strong> use thin, delicate lines 
                to create designs with an elegant, minimalist aesthetic. This style requires exceptional 
                skill, as there's no margin for error—every line must be precise and intentional.
              </p>
              
              <p>
                Ferunda's approach to fine line work is distinctive. While many artists rely solely on 
                single needles, he uses a combination of traditional and single needles that results in:
              </p>
              
              <ul>
                <li>Better ink saturation and longevity</li>
                <li>Reduced skin trauma during the session</li>
                <li>Superior healing with minimal scarring</li>
                <li>Clean lines that maintain their crispness over time</li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 md:px-12">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
              Why Choose Fine Line?
            </h2>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-2 gap-8">
            <ScrollReveal delay={0.1}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Check className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Subtle Sophistication</h3>
                    <p className="font-body text-muted-foreground text-sm">
                      Perfect for those who want meaningful artwork without bold, obvious tattoos.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Professional Friendly</h3>
                    <p className="font-body text-muted-foreground text-sm">
                      Easier to conceal for work environments while still expressing yourself.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Timeless Appeal</h3>
                    <p className="font-body text-muted-foreground text-sm">
                      Clean, elegant designs that never go out of style.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.2}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Check className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Faster Sessions</h3>
                    <p className="font-body text-muted-foreground text-sm">
                      Smaller, simpler pieces often require less time than large, complex designs.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Gentle Healing</h3>
                    <p className="font-body text-muted-foreground text-sm">
                      Less skin trauma means faster, more comfortable recovery.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Versatile Placement</h3>
                    <p className="font-body text-muted-foreground text-sm">
                      Works beautifully on wrists, ankles, fingers, and other delicate areas.
                    </p>
                  </div>
                </div>
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
              Fine Line Tattoo FAQ
            </h2>
            
            <div className="space-y-8 font-body text-muted-foreground">
              <div>
                <h3 className="text-foreground font-medium mb-2">Do fine line tattoos fade faster?</h3>
                <p>When done correctly by a skilled artist like Ferunda, fine line tattoos hold up well over time. 
                His unique needle technique ensures proper ink saturation. Sun protection and proper aftercare 
                are essential for maintaining any tattoo.</p>
              </div>
              
              <div>
                <h3 className="text-foreground font-medium mb-2">Are fine line tattoos more painful?</h3>
                <p>Pain varies by placement and individual tolerance. Many clients find fine line work 
                less painful than heavy blackwork or color pieces due to less skin trauma.</p>
              </div>
              
              <div>
                <h3 className="text-foreground font-medium mb-2">What subjects work for fine line?</h3>
                <p>Botanicals, animals, portraits, script, and minimalist designs are popular choices. 
                Ferunda often incorporates geometric elements for added visual interest.</p>
              </div>
              
              <div>
                <h3 className="text-foreground font-medium mb-2">Where can I get a fine line tattoo from Ferunda?</h3>
                <p>Ferunda tattoos in Austin (home base), Los Angeles, and Houston. Check the availability 
                calendar for dates in your preferred city.</p>
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
              Ready for Your Fine Line Tattoo?
            </h2>
            
            <p className="font-body text-muted-foreground mb-8 max-w-2xl mx-auto">
              Book a session with Ferunda to create an elegant, timeless piece of art.
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

export default FineLineTattoos;
