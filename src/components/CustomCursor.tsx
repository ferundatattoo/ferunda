import { useEffect, useState, useRef, useCallback } from "react";

const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const updateCursor = useCallback(() => {
    if (cursorRef.current) {
      cursorRef.current.style.left = `${posRef.current.x}px`;
      cursorRef.current.style.top = `${posRef.current.y}px`;
    }
    rafRef.current = null;
  }, []);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateCursor);
      }
      
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.dataset.cursor === "pointer"
      ) {
        setIsHovering(true);
      }
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    const handleMouseOut = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", moveCursor, { passive: true });
    document.addEventListener("mouseover", handleMouseEnter, { passive: true });
    document.addEventListener("mouseout", handleMouseLeave, { passive: true });
    document.addEventListener("mouseleave", handleMouseOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseover", handleMouseEnter);
      document.removeEventListener("mouseout", handleMouseLeave);
      document.removeEventListener("mouseleave", handleMouseOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible, updateCursor]);

  // Hide on mobile/touch devices
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="fixed pointer-events-none z-[9999] mix-blend-difference"
      style={{ willChange: "left, top" }}
    >
      {/* Outer ring */}
      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/80 transition-all duration-150 ${
          isHovering ? "w-16 h-16 border-2" : "w-6 h-6"
        } ${isVisible ? "opacity-100" : "opacity-0"}`}
      />
      {/* Center dot */}
      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-foreground transition-opacity duration-100 ${
          isHovering ? "opacity-0" : isVisible ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

export default CustomCursor;
