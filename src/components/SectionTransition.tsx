import { motion, useScroll, useTransform } from "framer-motion";
import { forwardRef, ReactNode, useRef } from "react";

interface SectionTransitionProps {
  children: ReactNode;
  className?: string;
}

const SectionTransition = forwardRef<HTMLDivElement, SectionTransitionProps>(
  ({ children, className = "" }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;
    
    const { scrollYProgress } = useScroll({
      target: ref,
      offset: ["start end", "end start"],
    });

    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0.8]);
    const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [100, 0, 0, -50]);
    const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.98]);

    return (
      <motion.div
        ref={ref}
        style={{ opacity, y, scale }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }
);

SectionTransition.displayName = "SectionTransition";

export default SectionTransition;
