import { motion, useScroll, useTransform } from "framer-motion";

const VerticalEthereal = () => {
  const { scrollYProgress } = useScroll();
  
  // Move the text upward as user scrolls down
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0.08, 0.12, 0.12, 0.08]);

  return (
    <motion.div
      style={{ y }}
      className="fixed left-4 md:left-8 top-0 z-[5] pointer-events-none hidden md:block"
    >
      <motion.div
        style={{ opacity }}
        className="writing-vertical-lr text-[12vw] lg:text-[10vw] font-futurist tracking-[0.3em] text-foreground/10 select-none"
      >
        ETHEREAL
      </motion.div>
    </motion.div>
  );
};

export default VerticalEthereal;
