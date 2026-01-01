import { motion, useScroll, useTransform } from "framer-motion";
import { forwardRef, useRef } from "react";
import goldFluidVideo from "@/assets/gold-fluid-video.mp4";
import ferundaStudio from "@/assets/ferunda-studio-1.jpg";
import ferundaWorking from "@/assets/ferunda-working-1.jpg";
import ferundaFocus from "@/assets/ferunda-focus.jpg";
import ferundaNeon from "@/assets/ferunda-neon.jpg";
import ferundaDali from "@/assets/ferunda-dali.jpg";
import ferundaOverhead from "@/assets/ferunda-overhead.jpg";

const artistImages = [
  { src: ferundaStudio, alt: "Ferunda in luxurious studio with dome ceiling" },
  { src: ferundaWorking, alt: "Ferunda working on client" },
  { src: ferundaFocus, alt: "Ferunda in deep concentration" },
  { src: ferundaNeon, alt: "Ferunda in neon-lit studio" },
  { src: ferundaDali, alt: "Ferunda with Dali artwork" },
  { src: ferundaOverhead, alt: "Overhead view of Ferunda at work" },
];

const ArtistCinematic = forwardRef<HTMLDivElement>((props, forwardedRef) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [50, -150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [150, -50]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-5, 5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.05, 0.95]);

  return (
    <section 
      ref={containerRef}
      className="py-32 md:py-48 px-6 md:px-12 relative overflow-hidden min-h-screen"
    >
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-30"
        >
          <source src={goldFluidVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="font-body text-[10px] tracking-[0.4em] uppercase text-accent block mb-4">
            The Craft
          </span>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-light text-foreground">
            Precision Meets Passion
          </h2>
        </motion.div>

        {/* Cinematic Image Grid with Parallax */}
        <div className="relative max-w-7xl mx-auto">
          {/* Main large image - center */}
          <motion.div
            style={{ y: y1, scale }}
            className="relative z-20 mx-auto w-full md:w-3/4 aspect-[4/5] mb-8 md:mb-0"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative w-full h-full group"
            >
              <img
                src={artistImages[0].src}
                alt={artistImages[0].alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              
              {/* Caption overlay */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="absolute bottom-8 left-8 right-8"
              >
                <p className="font-display text-xl md:text-2xl text-foreground/90 italic">
                  "The dome studio—where every session becomes a ceremony"
                </p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Floating side images with different parallax speeds */}
          <motion.div
            style={{ y: y2, rotate }}
            className="hidden md:block absolute -left-8 top-1/4 w-1/3 aspect-[3/4] z-10"
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative w-full h-full"
            >
              <img
                src={artistImages[1].src}
                alt={artistImages[1].alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-background/20" />
            </motion.div>
          </motion.div>

          <motion.div
            style={{ y: y3 }}
            className="hidden md:block absolute -right-8 top-1/3 w-1/4 aspect-square z-10"
          >
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative w-full h-full"
            >
              <img
                src={artistImages[2].src}
                alt={artistImages[2].alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-background/20" />
            </motion.div>
          </motion.div>
        </div>

        {/* Second Row - Three images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 md:mt-24">
          {artistImages.slice(3).map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative group aspect-[4/5] overflow-hidden"
            >
              <motion.img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

ArtistCinematic.displayName = "ArtistCinematic";

export default ArtistCinematic;
