import { useRef, useState, useEffect, memo } from "react";

interface LazyVideoProps {
  src: string;
  className?: string;
  opacity?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
}

const LazyVideo = memo(({ 
  src, 
  className = "", 
  opacity = 1,
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true
}: LazyVideoProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (autoPlay && videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        } else {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      },
      { 
        rootMargin: '200px',
        threshold: 0 
      }
    );
    
    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlay]);

  return (
    <div ref={containerRef} className={className}>
      {isVisible ? (
        <video
          ref={videoRef}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline={playsInline}
          onLoadedData={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? '' : 'opacity-0'}`}
          style={{ opacity: isLoaded ? opacity : 0 }}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <div 
          className="w-full h-full bg-background/50"
          style={{ opacity }}
        />
      )}
    </div>
  );
});

LazyVideo.displayName = "LazyVideo";

export default LazyVideo;
