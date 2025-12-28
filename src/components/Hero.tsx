import logo from "@/assets/logo.png";

const Hero = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative px-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20 pointer-events-none" />
      
      {/* Logo */}
      <div className="relative z-10 opacity-0 animate-fade-in-slow" style={{ animationDelay: "0.3s" }}>
        <img
          src={logo}
          alt="Fernando Unda Logo"
          className="w-40 md:w-56 lg:w-64 h-auto invert opacity-90"
        />
      </div>

      {/* Tagline */}
      <div className="relative z-10 mt-16 text-center opacity-0 animate-fade-in" style={{ animationDelay: "0.8s" }}>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground">
          Narrative Tattoos
        </h1>
        <p className="font-body text-sm md:text-base text-muted-foreground mt-4 tracking-wide">
          Redefining personal storytelling through ink
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in" style={{ animationDelay: "1.4s" }}>
        <div className="flex flex-col items-center gap-2">
          <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Scroll
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground to-transparent" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
