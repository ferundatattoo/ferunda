import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import inkVideo from "@/assets/ink-video.mp4";

const milestones = [
  {
    year: "Finance to Art",
    title: "The Transformation",
    description: "After a successful career in finance at various Mexican government institutions, a life-changing accident at 28 became the catalyst for pursuing his true calling—tattoo artistry as a path to physical and emotional recovery.",
  },
  {
    year: "Denmark",
    title: "European Mastery",
    description: "Traveled to Europe to perfect his craft, working as a guest artist in some of the world's most prestigious studios, developing his signature micro-realism technique.",
  },
  {
    year: "Los Angeles",
    title: "Ganga Tattoo",
    description: "Achieved his lifelong dream of establishing himself in LA, securing his own corner at the renowned Ganga Tattoo studio, where he now serves an exclusive clientele of celebrities and art collectors.",
  },
  {
    year: "Global",
    title: "International Recognition",
    description: "Featured in Forbes, Flaunt, Grazia, and major publications worldwide. Now working with icons of entertainment, sports, and art who seek his unique ability to capture profound emotions in minimal formats.",
  },
];

const StorySection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={containerRef} className="py-24 md:py-40 px-6 md:px-12 relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-15"
        >
          <source src={inkVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20 md:mb-32"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-body text-[10px] tracking-[0.4em] uppercase text-muted-foreground block mb-4"
          >
            The Journey
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
            Every Struggle Is a Stepping Stone
          </h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto">
            Towards the masterpiece that awaits the journey's end. It's not just about creating art—it's about living it.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Animated Progress Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border/30">
            <motion.div
              className="w-full bg-accent origin-top"
              style={{ height: lineHeight }}
            />
          </div>

          {/* Milestones */}
          {milestones.map((milestone, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`relative grid md:grid-cols-2 gap-8 mb-16 md:mb-24 last:mb-0 ${
                index % 2 === 0 ? "" : "md:text-right"
              }`}
            >
              {/* Timeline Dot */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="absolute left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-accent z-10"
              />

              {/* Content */}
              <div className={`pl-20 md:pl-0 ${index % 2 === 0 ? "md:pr-16" : "md:order-2 md:pl-16"}`}>
                <span className="font-body text-[10px] tracking-[0.3em] uppercase text-accent mb-2 block">
                  {milestone.year}
                </span>
                <h3 className="font-display text-2xl md:text-3xl text-foreground mb-4">
                  {milestone.title}
                </h3>
                <p className="font-body text-secondary-foreground leading-relaxed">
                  {milestone.description}
                </p>
              </div>

              {/* Empty space for alternating layout */}
              <div className={`hidden md:block ${index % 2 === 0 ? "md:order-2" : ""}`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StorySection;
