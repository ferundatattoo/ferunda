import { motion, useScroll, useTransform } from "framer-motion";

const VerticalEthereal = () => {
  const { scrollYProgress } = useScroll();
  
  // Move the text upward as user scrolls down
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "-100vh"]);

  return (
    <motion.div
      style={{ y }}
      className="fixed left-0 top-[10vh] z-[5] pointer-events-none hidden lg:block"
    >
      <div 
        className="text-[14vw] font-bold tracking-[0.2em] text-foreground/[0.06] select-none whitespace-nowrap"
        style={{ 
          writingMode: "vertical-lr",
          fontFamily: "'Courier New', Courier, monospace",
          letterSpacing: "0.5em",
          fontWeight: 900,
        }}
      >
        ETHEREAL
      </div>
    </motion.div>
  );
};

export default VerticalEthereal;
