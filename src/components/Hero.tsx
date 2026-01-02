import { memo, useState, useRef, useEffect } from "react";
import logo from "@/assets/logo.png";
import heroVideo from "@/assets/hero-video.mp4";

const Hero = memo(() => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Preload video when component mounts
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative px-6 overflow-hidden">
      {/* Static background gradient - shows immediately */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-background/80 to-background" />
      
      {/* Video Background - loads progressively */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-50' : 'opacity-0'}`}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Multi-layer overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />
      </div>

      {/* Animated grain texture overlay */}
      <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />

      {/* Logo with CSS animation - instant load */}
      <div className="relative z-10 animate-fade-in">
        <img
          src={logo}
          alt="Fernando Unda Logo"
          className="w-48 md:w-64 lg:w-80 h-auto invert opacity-95 animate-scale-in"
          loading="eager"
        />
        
        {/* Subtle glow effect behind logo */}
        <div className="absolute inset-0 blur-3xl bg-foreground/5 -z-10 scale-150" />
      </div>

      {/* Tagline with CSS animations */}
      <div className="relative z-10 mt-16 text-center animate-fade-in-delayed">
        <div className="w-16 h-px bg-accent mx-auto mb-8 animate-scale-x" />
        
        <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-light tracking-tight text-foreground">
          <span className="block animate-slide-up">
            Micro-Realism
          </span>
          <span className="block text-muted-foreground/70 text-2xl md:text-3xl lg:text-4xl mt-2 animate-slide-up-delayed">
            Maestro
          </span>
        </h1>
        
        <p className="font-body text-sm md:text-base text-muted-foreground mt-8 tracking-wide max-w-md mx-auto animate-fade-in-slow">
          Elevating ink to new heights. Creating enduring works of art on the human canvas.
        </p>
      </div>

      {/* Featured in badge */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 animate-fade-in-late">
        <span className="font-body text-[9px] tracking-[0.4em] uppercase text-muted-foreground/60">
          Featured in Forbes • Flaunt • Grazia
        </span>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 animate-fade-in-late">
        <div className="flex flex-col items-center gap-2 animate-bounce-slow">
          <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Discover
          </span>
          <div className="w-px h-10 bg-gradient-to-b from-muted-foreground to-transparent" />
        </div>
      </div>

      {/* Corner decorations - CSS only */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-foreground/20 opacity-30 animate-fade-in-corners" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-foreground/20 opacity-30 animate-fade-in-corners" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-foreground/20 opacity-30 animate-fade-in-corners" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-foreground/20 opacity-30 animate-fade-in-corners" />
    </section>
  );
});

Hero.displayName = "Hero";

export default Hero;
