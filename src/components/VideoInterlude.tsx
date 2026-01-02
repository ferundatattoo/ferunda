import { forwardRef, useRef, useImperativeHandle, memo } from "react";
import LazyVideo from "./LazyVideo";
import sacredGeometryVideo from "@/assets/sacred-geometry-video.mp4";

interface VideoInterludeProps {
  variant: "smoke" | "rotating";
  quote?: string;
  author?: string;
}

const VideoInterlude = memo(forwardRef<HTMLDivElement, VideoInterludeProps>(
  ({ variant, quote, author }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    
    useImperativeHandle(forwardedRef, () => internalRef.current!);

    return (
      <section 
        ref={internalRef}
        className="relative h-[60vh] md:h-[80vh] overflow-hidden"
      >
        {/* Lazy-loaded video background */}
        <div className="absolute inset-0 z-0">
          <LazyVideo
            src={sacredGeometryVideo}
            className="w-full h-full"
            opacity={0.3}
          />
          <div className="absolute inset-0 bg-background/60" />
        </div>

        {/* Quote Overlay */}
        {quote && (
          <div className="absolute inset-0 flex items-center justify-center z-10 px-6 animate-fade-in">
            <div className="max-w-4xl text-center">
              <div className="w-24 h-px bg-accent mx-auto mb-8 animate-scale-x" />
              <blockquote className="font-display text-2xl md:text-4xl lg:text-5xl text-foreground/95 leading-relaxed italic">
                "{quote}"
              </blockquote>
              {author && (
                <cite className="font-body text-xs tracking-[0.3em] uppercase text-foreground/60 not-italic block mt-8">
                  — {author}
                </cite>
              )}
            </div>
          </div>
        )}

        {/* Decorative gradients */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-10" />
      </section>
    );
  }
));

VideoInterlude.displayName = "VideoInterlude";

export default VideoInterlude;
