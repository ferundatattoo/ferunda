import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import sacredGeometryVideo from "@/assets/sacred-geometry-video.mp4";

interface SacredGeometryBackgroundProps {
  className?: string;
  opacity?: number;
}

const SacredGeometryBackground = ({ 
  className = "", 
  opacity = 0.15 
}: SacredGeometryBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.1, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 15]);

  return (
    <div ref={containerRef} className={`absolute inset-0 z-0 overflow-hidden ${className}`}>
      <motion.div
        style={{ scale, rotate }}
        className="absolute inset-0"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          style={{ opacity }}
        >
          <source src={sacredGeometryVideo} type="video/mp4" />
        </video>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
    </div>
  );
};

export default SacredGeometryBackground;
