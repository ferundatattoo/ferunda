import { motion } from "framer-motion";
import tattooHero from "@/assets/tattoo-hero.jpg";

const About = () => {
  return (
    <section id="about" className="py-24 md:py-32 px-6 md:px-12 bg-secondary/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-24"
        >
          <div className="flex items-center gap-4 mb-4">
            <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              02
            </span>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-px w-12 bg-border origin-left"
            />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
            About
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="aspect-[4/5] overflow-hidden">
              <motion.img
                src={tattooHero}
                alt="Fernando Unda's work"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {/* Decorative line */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -bottom-4 -right-4 w-24 h-24 border border-accent/30"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <h3 className="font-display text-3xl md:text-4xl font-light text-foreground mb-8">
              Fernando Morales Unda
            </h3>
            <div className="space-y-6 font-body text-base text-secondary-foreground leading-relaxed">
              <p>
                A self-made artist driven by a lifelong passion for creative expression. 
                From sculpture and handcrafting to music and drawing, every medium has 
                shaped my unique approach to tattooing.
              </p>
              <p>
                My work focuses on narrative tattoos—pieces that tell stories, capture 
                moments, and redefine personal expression through ink. Each design is 
                crafted to be as unique as the person wearing it.
              </p>
              <p className="text-muted-foreground italic">
                "Tattoos might be art people wear on their skin, but they can also be 
                so much more. They are a profound form of personal storytelling."
              </p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 pt-8 border-t border-border grid grid-cols-2 gap-8"
            >
              <div>
                <span className="font-display text-4xl text-foreground">10+</span>
                <p className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Years Experience
                </p>
              </div>
              <div>
                <span className="font-display text-4xl text-foreground">∞</span>
                <p className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Unique Stories
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
