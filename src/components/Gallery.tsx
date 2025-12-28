import { useState } from "react";
import { motion } from "framer-motion";
import SacredGeometryBackground from "./SacredGeometryBackground";
import tattoo1 from "@/assets/tattoo-1.jpg";
import tattoo2 from "@/assets/tattoo-2.jpg";
import tattoo3 from "@/assets/tattoo-3.jpg";
import tattoo4 from "@/assets/tattoo-4.jpg";
import tattoo5 from "@/assets/tattoo-5.jpg";
import tattoo6 from "@/assets/tattoo-6.jpg";
import tattoo7 from "@/assets/tattoo-7.jpg";
import tattoo8 from "@/assets/tattoo-8.jpg";
import tattoo9 from "@/assets/tattoo-9.jpg";

const works = [
  { id: 1, src: tattoo1, title: "Awakening & Becoming" },
  { id: 2, src: tattoo2, title: "Wisdom" },
  { id: 3, src: tattoo3, title: "Stoicism" },
  { id: 4, src: tattoo4, title: "Tomorrow Is Not Promised" },
  { id: 5, src: tattoo5, title: "Passion" },
  { id: 6, src: tattoo6, title: "Sacred Geometry Sleeve" },
  { id: 7, src: tattoo7, title: "Ocean Vastness" },
  { id: 8, src: tattoo8, title: "Phoenix Evolution" },
  { id: 9, src: tattoo9, title: "Poseidon's Power" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const Gallery = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section id="work" className="py-24 md:py-32 px-6 md:px-12 relative overflow-hidden">
      {/* Sacred Geometry Background */}
      <SacredGeometryBackground opacity={0.1} />
      
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
              01
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
            Selected Work
          </h2>
        </motion.div>

        {/* Gallery Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
        >
          {works.map((work) => (
            <motion.div
              key={work.id}
              variants={itemVariants}
              className="group relative aspect-[3/4] overflow-hidden bg-secondary cursor-pointer"
              onMouseEnter={() => setHoveredId(work.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <motion.img
                src={work.src}
                alt={work.title}
                className="w-full h-full object-cover"
                animate={{
                  scale: hoveredId === work.id ? 1.1 : 1,
                  opacity: hoveredId !== null && hoveredId !== work.id ? 0.4 : 1,
                }}
                transition={{ duration: 0.5 }}
              />
              {/* Overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent flex items-end p-4 md:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredId === work.id ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="font-display text-lg md:text-xl text-foreground">
                  {work.title}
                </span>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* View More */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <a
            href="https://instagram.com/ferunda"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 font-body text-sm tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 group"
          >
            <span>View more on Instagram</span>
            <motion.svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </motion.svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Gallery;
