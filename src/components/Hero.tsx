import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import logo from "@/assets/logo.png";
import heroVideo from "@/assets/hero-video.mp4";

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  return (
    <section
      ref={containerRef}
      className="min-h-screen flex flex-col items-center justify-center relative px-6 overflow-hidden"
    >
      {/* Video Background with Parallax */}
      <motion.div className="absolute inset-0 z-0" style={{ scale }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-50"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Multi-layer overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />
      </motion.div>

      {/* Animated grain texture overlay */}
      <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />

      {/* Logo with enhanced animation */}
      <motion.div
        style={{ opacity, y }}
        className="relative z-10"
      >
        <motion.img
          initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          src={logo}
          alt="Fernando Unda Logo"
          className="w-48 md:w-64 lg:w-80 h-auto invert opacity-95"
        />
        
        {/* Subtle glow effect behind logo */}
        <div className="absolute inset-0 blur-3xl bg-foreground/5 -z-10 scale-150" />
      </motion.div>

      {/* Tagline with staggered reveal */}
      <motion.div
        style={{ opacity, y }}
        className="relative z-10 mt-16 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-16 h-px bg-accent mx-auto mb-8 origin-center"
          />
          
          <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-light tracking-tight text-foreground">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="block"
            >
              Micro-Realism
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="block text-muted-foreground/70 text-2xl md:text-3xl lg:text-4xl mt-2"
            >
              Maestro
            </motion.span>
          </h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="font-body text-sm md:text-base text-muted-foreground mt-8 tracking-wide max-w-md mx-auto"
          >
            Elevating ink to new heights. Creating enduring works of art on the human canvas.
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Featured in badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.8 }}
        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10"
      >
        <span className="font-body text-[9px] tracking-[0.4em] uppercase text-muted-foreground/60">
          Featured in Forbes • Flaunt • Grazia
        </span>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 2 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Discover
          </span>
          <div className="w-px h-10 bg-gradient-to-b from-muted-foreground to-transparent" />
        </motion.div>
      </motion.div>

      {/* Corner decorations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute top-8 left-8 w-16 h-16 border-l border-t border-foreground/20"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1, delay: 1.6 }}
        className="absolute top-8 right-8 w-16 h-16 border-r border-t border-foreground/20"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1, delay: 1.7 }}
        className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-foreground/20"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1, delay: 1.8 }}
        className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-foreground/20"
      />
    </section>
  );
};

export default Hero;
