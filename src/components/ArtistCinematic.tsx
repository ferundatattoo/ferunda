import { forwardRef, useRef, useImperativeHandle, memo } from "react";
import LazyVideo from "./LazyVideo";
import goldFluidVideo from "@/assets/gold-fluid-video.mp4";
import ferundaStudio from "@/assets/ferunda-studio-1.jpg";
import ferundaWorking from "@/assets/ferunda-working-1.jpg";
import ferundaFocus from "@/assets/ferunda-focus.jpg";
import ferundaNeon from "@/assets/ferunda-neon.jpg";
import ferundaDali from "@/assets/ferunda-dali.jpg";
import ferundaOverhead from "@/assets/ferunda-overhead.jpg";

const artistImages = [
  { src: ferundaStudio, alt: "Ferunda in luxurious studio with dome ceiling" },
  { src: ferundaWorking, alt: "Ferunda working on client" },
  { src: ferundaFocus, alt: "Ferunda in deep concentration" },
  { src: ferundaNeon, alt: "Ferunda in neon-lit studio" },
  { src: ferundaDali, alt: "Ferunda with Dali artwork" },
  { src: ferundaOverhead, alt: "Overhead view of Ferunda at work" },
];

const ArtistCinematic = memo(forwardRef<HTMLDivElement>((props, forwardedRef) => {
  const internalRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(forwardedRef, () => internalRef.current!);

  return (
    <section 
      ref={internalRef}
      className="py-32 md:py-48 px-6 md:px-12 relative overflow-hidden min-h-screen"
    >
      {/* Lazy-loaded video background */}
      <div className="absolute inset-0 z-0">
        <LazyVideo
          src={goldFluidVideo}
          className="w-full h-full"
          opacity={0.3}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20 animate-fade-in">
          <span className="font-body text-[10px] tracking-[0.4em] uppercase text-accent block mb-4">
            The Craft
          </span>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-light text-foreground">
            Precision Meets Passion
          </h2>
        </div>

        {/* Image Grid */}
        <div className="relative max-w-7xl mx-auto">
          {/* Main large image */}
          <div className="relative z-20 mx-auto w-full md:w-3/4 aspect-[4/5] mb-8 md:mb-0">
            <div className="relative w-full h-full group">
              <img
                src={artistImages[0].src}
                alt={artistImages[0].alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              
              {/* Caption overlay */}
              <div className="absolute bottom-8 left-8 right-8">
                <p className="font-display text-xl md:text-2xl text-foreground/90 italic">
                  "The dome studio—where every session becomes a ceremony"
                </p>
              </div>
            </div>
          </div>

          {/* Floating side images */}
          <div className="hidden md:block absolute -left-8 top-1/4 w-1/3 aspect-[3/4] z-10">
            <div className="relative w-full h-full">
              <img
                src={artistImages[1].src}
                alt={artistImages[1].alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-background/20" />
            </div>
          </div>

          <div className="hidden md:block absolute -right-8 top-1/3 w-1/4 aspect-square z-10">
            <div className="relative w-full h-full">
              <img
                src={artistImages[2].src}
                alt={artistImages[2].alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-background/20" />
            </div>
          </div>
        </div>

        {/* Second Row - Three images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 md:mt-24">
          {artistImages.slice(3).map((img, index) => (
            <div
              key={index}
              className="relative group aspect-[4/5] overflow-hidden"
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}));

ArtistCinematic.displayName = "ArtistCinematic";

export default ArtistCinematic;
