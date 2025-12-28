import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import smokeVideo from "@/assets/smoke-atmosphere-video.mp4";
import rotatingArtVideo from "@/assets/rotating-art-video.mp4";

interface VideoInterludeProps {
  variant: "smoke" | "rotating";
  quote?: string;
  author?: string;
}

const VideoInterlude = ({ variant, quote, author }: VideoInterludeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 1.1]);
  const y = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  const videoSrc = variant === "smoke" ? smokeVideo : rotatingArtVideo;

  return (
    <section 
      ref={ref}
      className="relative h-[60vh] md:h-[80vh] overflow-hidden"
    >
      {/* Video Background with parallax */}
      <motion.div 
        style={{ scale, y }}
        className="absolute inset-0 z-0"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/40" />
      </motion.div>

      {/* Quote Overlay */}
      {quote && (
        <motion.div
          style={{ opacity }}
          className="absolute inset-0 flex items-center justify-center z-10 px-6"
        >
          <div className="max-w-4xl text-center">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="w-24 h-px bg-accent mx-auto mb-8"
            />
            <motion.blockquote
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="font-display text-2xl md:text-4xl lg:text-5xl text-foreground/95 leading-relaxed italic"
            >
              "{quote}"
            </motion.blockquote>
            {author && (
              <motion.cite
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="font-body text-xs tracking-[0.3em] uppercase text-foreground/60 not-italic block mt-8"
              >
                — {author}
              </motion.cite>
            )}
          </div>
        </motion.div>
      )}

      {/* Decorative Elements */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10"
      />
      <motion.div
        style={{ opacity }}
        className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-10"
      />
    </section>
  );
};

export default VideoInterlude;
