import { memo } from "react";
import ferundaPhoto from "@/assets/ferunda-neon.jpg";
import LazyVideo from "./LazyVideo";
import needleVideo from "@/assets/needle-video.mp4";

const About = memo(() => {
  return (
    <section id="about" className="py-24 md:py-32 px-6 md:px-12 relative overflow-hidden">
      {/* Lazy-loaded video background */}
      <div className="absolute inset-0 z-0">
        <LazyVideo
          src={needleVideo}
          className="w-full h-full"
          opacity={0.1}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/50 via-background to-background" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <div className="mb-16 md:mb-24 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              02
            </span>
            <div className="h-px w-12 bg-border animate-scale-x" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
            The Artist
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          {/* Image */}
          <div className="relative animate-slide-in-left">
            <div className="aspect-[4/5] overflow-hidden relative group">
              <img
                src={ferundaPhoto}
                alt="Fernando Unda - Ferunda"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 border border-accent/20 animate-fade-in-delayed" />
            <div className="absolute -top-6 -left-6 w-24 h-24 border border-accent/20 animate-fade-in-delayed" />
          </div>

          {/* Content */}
          <div className="animate-slide-in-right">
            <span className="font-body text-[10px] tracking-[0.4em] uppercase text-accent block mb-4">
              Based in Austin · Guest in LA & Houston
            </span>
            
            <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-light text-foreground mb-8">
              Fernando Morales Unda
            </h3>
            
            <div className="space-y-6 font-body text-base text-secondary-foreground leading-relaxed">
              <p>
                Known in the artistic world as "Ferunda," this Mexican-born artist has 
                redefined micro-realism. Now based in Austin, Texas, he regularly returns
                to Los Angeles and Houston for guest spots.
              </p>
              
              <p>
                His work stands out for a style that respects the traditional foundations 
                of tattooing while boldly exploring new aesthetic and conceptual possibilities—
                combining technical mastery with a creative vision that has built a solid 
                identity in a highly competitive market.
              </p>
              
              <p className="text-foreground/80 italic border-l-2 border-accent pl-6">
                "Unlike many artists who solely rely on single needles, I use a combination 
                of traditional and single needles and larger needle groupings. Although it's 
                an unusual method, it allows for much better healing."
              </p>
            </div>

            {/* Stats */}
            <div className="mt-12 pt-8 border-t border-border grid grid-cols-3 gap-8">
              <div>
                <span className="font-display text-3xl md:text-4xl text-foreground block">
                  10+
                </span>
                <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Years
                </p>
              </div>
              <div>
                <span className="font-display text-3xl md:text-4xl text-foreground block">
                  5+
                </span>
                <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Countries
                </p>
              </div>
              <div>
                <span className="font-display text-3xl md:text-4xl text-foreground block">
                  ∞
                </span>
                <p className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-2">
                  Stories
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

About.displayName = "About";

export default About;
