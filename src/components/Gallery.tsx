import { useState } from "react";
import tattoo1 from "@/assets/tattoo-1.jpg";
import tattoo2 from "@/assets/tattoo-2.jpg";
import tattoo3 from "@/assets/tattoo-3.jpg";
import tattoo4 from "@/assets/tattoo-4.jpg";
import tattoo5 from "@/assets/tattoo-5.jpg";
import tattoo6 from "@/assets/tattoo-6.jpg";

const works = [
  { id: 1, src: tattoo1, title: "Geometric Flow" },
  { id: 2, src: tattoo2, title: "Delicate Bloom" },
  { id: 3, src: tattoo3, title: "Continuous Line" },
  { id: 4, src: tattoo4, title: "Constellation" },
  { id: 5, src: tattoo5, title: "Symbolic" },
  { id: 6, src: tattoo6, title: "Botanical" },
];

const Gallery = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section id="work" className="py-24 md:py-32 px-6 md:px-12">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="mb-16 md:mb-24">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              01
            </span>
            <div className="h-px w-12 bg-border origin-left animate-line-grow" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
            Selected Work
          </h2>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {works.map((work, index) => (
            <div
              key={work.id}
              className="group relative aspect-square overflow-hidden bg-secondary opacity-0 animate-fade-in cursor-pointer"
              style={{ animationDelay: `${0.1 * index}s` }}
              onMouseEnter={() => setHoveredId(work.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <img
                src={work.src}
                alt={work.title}
                className={`w-full h-full object-cover transition-all duration-700 ${
                  hoveredId === work.id ? "scale-110" : "scale-100"
                } ${hoveredId !== null && hoveredId !== work.id ? "opacity-40" : "opacity-100"}`}
              />
              {/* Overlay */}
              <div
                className={`absolute inset-0 bg-background/60 flex items-end p-4 md:p-6 transition-opacity duration-500 ${
                  hoveredId === work.id ? "opacity-100" : "opacity-0"
                }`}
              >
                <span className="font-display text-lg md:text-xl text-foreground">
                  {work.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* View More */}
        <div className="mt-16 text-center">
          <a
            href="https://instagram.com/ferunda"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 font-body text-sm tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 group"
          >
            <span>View more on Instagram</span>
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Gallery;
