import { motion, useScroll, useTransform } from "framer-motion";

const VerticalEthereal = () => {
  const { scrollYProgress } = useScroll();

  // Move the watermark upward as user scrolls down
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "-60vh"]);

  return (
    <motion.div
      aria-hidden="true"
      style={{ y }}
      className="fixed inset-0 z-0 pointer-events-none"
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <div className="writing-vertical-lr font-ethereal font-black tracking-[0.55em] text-foreground/20 select-none whitespace-nowrap text-[28vw] sm:text-[22vw] md:text-[18vw] lg:text-[14vw]">
          ETHEREAL
        </div>
      </div>
    </motion.div>
  );
};

export default VerticalEthereal;
