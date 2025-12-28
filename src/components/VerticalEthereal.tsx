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
        className="writing-vertical-lr text-[14vw] font-black tracking-[0.45em] text-foreground/10 select-none whitespace-nowrap font-ethereal"
      >
        ETHEREAL
      </div>
    </motion.div>
  );
};

export default VerticalEthereal;
