import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import all assets to preload
import tattoo1 from "@/assets/tattoo-1.jpg";
import tattoo2 from "@/assets/tattoo-2.jpg";
import tattoo3 from "@/assets/tattoo-3.jpg";
import tattoo4 from "@/assets/tattoo-4.jpg";
import tattoo5 from "@/assets/tattoo-5.jpg";
import tattoo6 from "@/assets/tattoo-6.jpg";
import tattoo7 from "@/assets/tattoo-7.jpg";
import tattoo8 from "@/assets/tattoo-8.jpg";
import tattoo9 from "@/assets/tattoo-9.jpg";
import tattooHero from "@/assets/tattoo-hero.jpg";
import ferundaDali from "@/assets/ferunda-dali.jpg";
import ferundaFocus from "@/assets/ferunda-focus.jpg";
import ferundaNeon from "@/assets/ferunda-neon.jpg";
import ferundaOverhead from "@/assets/ferunda-overhead.jpg";
import ferundaStudio1 from "@/assets/ferunda-studio-1.jpg";
import ferundaWorking1 from "@/assets/ferunda-working-1.jpg";
import heroVideo from "@/assets/hero-video.mp4";
import smokeVideo from "@/assets/smoke-atmosphere-video.mp4";
import rotatingVideo from "@/assets/rotating-art-video.mp4";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

const imagesToPreload = [
  tattoo1, tattoo2, tattoo3, tattoo4, tattoo5,
  tattoo6, tattoo7, tattoo8, tattoo9, tattooHero,
  ferundaDali, ferundaFocus, ferundaNeon, ferundaOverhead,
  ferundaStudio1, ferundaWorking1
];

const videosToPreload = [heroVideo, smokeVideo, rotatingVideo];

const MetatronsCube = () => {
  // Metatron's Cube sacred geometry
  const size = 120;
  const center = size / 2;
  const outerRadius = 50;
  const innerRadius = 25;
  
  // 6 outer circles positions (hexagon)
  const outerCircles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    return {
      cx: center + outerRadius * Math.cos(angle),
      cy: center + outerRadius * Math.sin(angle)
    };
  });

  // 6 inner circles positions (smaller hexagon)
  const innerCircles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 60) * (Math.PI / 180);
    return {
      cx: center + innerRadius * Math.cos(angle),
      cy: center + innerRadius * Math.sin(angle)
    };
  });

  // All 13 circle centers for Metatron's Cube
  const allCenters = [
    { cx: center, cy: center }, // Center
    ...outerCircles,
    ...innerCircles
  ];

  // Generate all connecting lines between circles
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < allCenters.length; i++) {
    for (let j = i + 1; j < allCenters.length; j++) {
      lines.push({
        x1: allCenters[i].cx,
        y1: allCenters[i].cy,
        x2: allCenters[j].cx,
        y2: allCenters[j].cy
      });
    }
  }

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Outer rotating group */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      >
        {/* All connecting lines */}
        {lines.map((line, i) => (
          <motion.line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeWidth="0.5"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 0.3, pathLength: 1 }}
            transition={{ 
              duration: 2,
              delay: i * 0.02,
              ease: "easeOut"
            }}
            className="text-foreground"
          />
        ))}
      </motion.g>

      {/* Inner counter-rotating group with circles */}
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      >
        {/* Center circle */}
        <motion.circle
          cx={center}
          cy={center}
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-foreground"
        />

        {/* Outer hexagon circles */}
        {outerCircles.map((circle, i) => (
          <motion.circle
            key={`outer-${i}`}
            cx={circle.cx}
            cy={circle.cy}
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.75"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
            className="text-foreground"
          />
        ))}

        {/* Inner hexagon circles */}
        {innerCircles.map((circle, i) => (
          <motion.circle
            key={`inner-${i}`}
            cx={circle.cx}
            cy={circle.cy}
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 0.5, delay: 1.4 + i * 0.08 }}
            className="text-foreground"
          />
        ))}
      </motion.g>

      {/* Pulsing center dot */}
      <motion.circle
        cx={center}
        cy={center}
        r="2"
        fill="currentColor"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-foreground"
      />
    </motion.svg>
  );
};

const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const loadedRef = useRef(false);

  // Preload actual assets
  useEffect(() => {
    let loadedCount = 0;
    const totalAssets = imagesToPreload.length + videosToPreload.length;

    const updateProgress = () => {
      loadedCount++;
      const newProgress = Math.floor((loadedCount / totalAssets) * 100);
      setProgress(newProgress);
      
      if (loadedCount >= totalAssets && !loadedRef.current) {
        loadedRef.current = true;
        // Wait a moment at 100% before exiting
        setTimeout(() => {
          setIsExiting(true);
        }, 600);
      }
    };

    // Preload images
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.onload = updateProgress;
      img.onerror = updateProgress;
      img.src = src;
    });

    // Preload videos
    videosToPreload.forEach((src) => {
      const video = document.createElement("video");
      video.onloadeddata = updateProgress;
      video.onerror = updateProgress;
      video.preload = "auto";
      video.src = src;
    });

    // Fallback timeout - reduced to 5 seconds
    const timeout = setTimeout(() => {
      if (!loadedRef.current) {
        loadedRef.current = true;
        setProgress(100);
        setTimeout(() => {
          setIsExiting(true);
        }, 400);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleExitComplete = () => {
    onLoadingComplete();
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '60px 60px'
            }} />
          </div>

          {/* Main content */}
          <div className="relative flex flex-col items-center">
            {/* Metatron's Cube */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mb-12"
            >
              <MetatronsCube />
            </motion.div>

            {/* Brand name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-center mb-16"
            >
              <h1 className="font-display text-3xl md:text-4xl tracking-[0.3em] uppercase text-foreground">
                Ferunda
              </h1>
              <p className="font-body text-xs tracking-[0.4em] uppercase text-foreground/50 mt-2">
                Tattoo Artist
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "200px" }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="relative"
            >
              {/* Track */}
              <div className="h-px w-[200px] bg-foreground/10" />
              
              {/* Fill */}
              <motion.div
                className="absolute top-0 left-0 h-px bg-foreground"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
              
              {/* Percentage */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center mt-4 font-body text-xs tracking-[0.2em] text-foreground/40"
              >
                {progress}%
              </motion.p>
            </motion.div>
          </div>

          {/* Ethereal text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 font-display text-sm tracking-[0.5em] uppercase text-foreground/20"
          >
            Ethereal
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
