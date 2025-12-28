import { motion, useScroll, useTransform } from "framer-motion";

const VerticalEthereal = () => {
  const { scrollYProgress } = useScroll();

  // subtle parallax so it feels "attached" to the page while staying on top
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "-18vh"]);

  return (
    <motion.div
      aria-hidden="true"
      style={{ y }}
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="font-ethereal select-none whitespace-nowrap text-center text-foreground/15 mix-blend-screen blur-[0.2px] font-black tracking-[0.55em] text-[42vw] sm:text-[32vw] md:text-[22vw] lg:text-[16vw]">
          ETHEREAL
        </div>
      </div>
    </motion.div>
  );
};

export default VerticalEthereal;
