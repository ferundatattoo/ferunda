import { memo } from "react";
import LazyVideo from "./LazyVideo";
import sacredGeometryVideo from "@/assets/sacred-geometry-video.mp4";

interface SacredGeometryBackgroundProps {
  className?: string;
  opacity?: number;
}

const SacredGeometryBackground = memo(({ 
  className = "", 
  opacity = 0.15 
}: SacredGeometryBackgroundProps) => {
  return (
    <div className={`absolute inset-0 z-0 overflow-hidden ${className}`}>
      <LazyVideo
        src={sacredGeometryVideo}
        className="w-full h-full"
        opacity={opacity}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
    </div>
  );
});

SacredGeometryBackground.displayName = "SacredGeometryBackground";

export default SacredGeometryBackground;
