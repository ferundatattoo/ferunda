import { motion } from "framer-motion";
import ferundaPhoto from "@/assets/ferunda-neon.jpg";
import needleVideo from "@/assets/needle-video.mp4";

const About = () => {
  return (
    <section id="about" className="py-24 md:py-32 px-6 md:px-12 relative overflow-hidden">
      {/* Subtle video background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-10"
        >
          <source src={needleVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 via-background to-background" />
      </div>

      <div className="container mx-auto relative z-10">
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
            The Artist
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
            <div className="aspect-[4/5] overflow-hidden relative group">
              <motion.img
                src={ferundaPhoto}
                alt="Fernando Unda - Ferunda"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.7 }}
              />
              {/* Hover overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"
              />
            </div>
            {/* Decorative elements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -bottom-6 -right-6 w-32 h-32 border border-accent/20"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -top-6 -left-6 w-24 h-24 border border-accent/20"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-body text-[10px] tracking-[0.4em] uppercase text-accent block mb-4"
            >
              Based in Austin · Guest in LA & Houston
            </motion.span>
            
            <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-light text-foreground mb-8">
              Fernando Morales Unda
            </h3>
            
            <div className="space-y-6 font-body text-base text-secondary-foreground leading-relaxed">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Known in the artistic world as "Ferunda," this Mexican-born artist has 
                redefined micro-realism. Now based in Austin, Texas, he regularly returns
                to Los Angeles and Houston for guest spots.
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                His work stands out for a style that respects the traditional foundations 
                of tattooing while boldly exploring new aesthetic and conceptual possibilities—
                combining technical mastery with a creative vision that has built a solid 
                identity in a highly competitive market.
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-foreground/80 italic border-l-2 border-accent pl-6"
              >
                "Unlike many artists who solely rely on single needles, I use a combination 
                of traditional and single needles and larger needle groupings. Although it's 
                an unusual method, it allows for much better healing."
              </motion.p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 pt-8 border-t border-border grid grid-cols-3 gap-8"
            >
              <div>
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="font-display text-3xl md:text-4xl text-foreground block"
                >
                  10+
                </motion.span>
                <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Years
                </p>
              </div>
              <div>
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="font-display text-3xl md:text-4xl text-foreground block"
                >
                  5+
                </motion.span>
                <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Countries
                </p>
              </div>
              <div>
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="font-display text-3xl md:text-4xl text-foreground block"
                >
                  ∞
                </motion.span>
                <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Stories
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
