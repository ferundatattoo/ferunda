import { motion } from "framer-motion";

const pressLogos = [
  { name: "Forbes", url: "https://forbes.com.mx/patrocinado-fernando-morales-unda-maestro-del-microrealismo/" },
  { name: "Flaunt", url: "https://www.flaunt.com/post/elevating-ink-to-new-heights-the-unconventional-art-of-fernando-morales-unda" },
  { name: "Grazia", url: "https://graziamagazine.com/us/articles/tattooing-with-a-delicate-touch-fernando-morales-undas-micro-realism-marvels/" },
  { name: "Inked", url: "https://inkedmag.com/original-news/tatupanda" },
  { name: "West Hollywood Weekly", url: "https://www.westhollywoodweekly.com/2023/11/in-skin-of-artist-fernando-undas.html" },
];

const quotes = [
  {
    quote: "A true force of artistic nature, his unwavering commitment to creating lifelike pieces has set him apart from his competitors.",
    source: "Grazia Magazine",
  },
  {
    quote: "Fernando shines as a beacon of creativity, pushing boundaries and redefining what it means to create an enduring work of art on the human canvas.",
    source: "Flaunt Magazine",
  },
  {
    quote: "Recognized internationally for his refined technique, personalized approach, and ability to transmit profound emotions in minimal formats.",
    source: "Forbes México",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const PressSection = () => {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-24"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-body text-[10px] tracking-[0.4em] uppercase text-muted-foreground block mb-4"
          >
            Featured In
          </motion.span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-light text-foreground">
            As Seen In
          </h2>
        </motion.div>

        {/* Press Logos */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-24"
        >
          {pressLogos.map((press) => (
            <motion.a
              key={press.name}
              variants={itemVariants}
              href={press.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
            >
              <span className="font-display text-2xl md:text-3xl lg:text-4xl text-muted-foreground/40 group-hover:text-foreground transition-colors duration-500 italic">
                {press.name}
              </span>
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-px bg-foreground origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.a>
          ))}
        </motion.div>

        {/* Quotes Carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {quotes.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="text-center mb-16 last:mb-0"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="w-16 h-px bg-accent mx-auto mb-8"
              />
              <blockquote className="font-display text-xl md:text-2xl lg:text-3xl text-foreground/90 leading-relaxed italic mb-6">
                "{item.quote}"
              </blockquote>
              <cite className="font-body text-xs tracking-[0.3em] uppercase text-muted-foreground not-italic">
                — {item.source}
              </cite>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PressSection;
