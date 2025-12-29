import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import SacredGeometryBackground from "./SacredGeometryBackground";
import { Filter } from "lucide-react";

// Fallback static images
import tattoo1 from "@/assets/tattoo-1.jpg";
import tattoo2 from "@/assets/tattoo-2.jpg";
import tattoo3 from "@/assets/tattoo-3.jpg";
import tattoo4 from "@/assets/tattoo-4.jpg";
import tattoo5 from "@/assets/tattoo-5.jpg";
import tattoo6 from "@/assets/tattoo-6.jpg";
import tattoo7 from "@/assets/tattoo-7.jpg";
import tattoo8 from "@/assets/tattoo-8.jpg";
import tattoo9 from "@/assets/tattoo-9.jpg";

interface GalleryImage {
  id: string;
  title: string;
  image_url: string;
  display_order: number;
  section?: string;
}

// Tattoo style categories for filtering
const TATTOO_STYLES = [
  { id: "all", label: "All Styles" },
  { id: "micro-realism", label: "Micro Realism" },
  { id: "sacred-geometry", label: "Sacred Geometry" },
  { id: "fine-line", label: "Fine Line" },
  { id: "blackwork", label: "Blackwork" },
  { id: "ornamental", label: "Ornamental" },
  { id: "portrait", label: "Portrait" },
];

const staticWorks = [
  { id: "1", src: tattoo1, title: "Awakening & Becoming", style: "sacred-geometry" },
  { id: "2", src: tattoo2, title: "Wisdom", style: "micro-realism" },
  { id: "3", src: tattoo3, title: "Stoicism", style: "blackwork" },
  { id: "4", src: tattoo4, title: "Tomorrow Is Not Promised", style: "fine-line" },
  { id: "5", src: tattoo5, title: "Passion", style: "micro-realism" },
  { id: "6", src: tattoo6, title: "Sacred Geometry Sleeve", style: "sacred-geometry" },
  { id: "7", src: tattoo7, title: "Ocean Vastness", style: "ornamental" },
  { id: "8", src: tattoo8, title: "Phoenix Evolution", style: "blackwork" },
  { id: "9", src: tattoo9, title: "Poseidon's Power", style: "portrait" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const Gallery = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dbImages, setDbImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const { data, error } = await supabase
          .from("gallery_images")
          .select("id, title, image_url, display_order, section")
          .eq("is_visible", true)
          .order("display_order");

        if (error) throw error;
        setDbImages(data || []);
      } catch (error) {
        console.error("Error fetching gallery images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryImages();
  }, []);

  // Derive style from section or title for DB images
  const inferStyle = (img: GalleryImage): string => {
    const titleLower = img.title.toLowerCase();
    const sectionLower = (img.section || "").toLowerCase();
    
    if (titleLower.includes("sacred") || sectionLower.includes("sacred")) return "sacred-geometry";
    if (titleLower.includes("micro") || titleLower.includes("realism")) return "micro-realism";
    if (titleLower.includes("fine") || titleLower.includes("line")) return "fine-line";
    if (titleLower.includes("black") || titleLower.includes("dark")) return "blackwork";
    if (titleLower.includes("ornament")) return "ornamental";
    if (titleLower.includes("portrait") || titleLower.includes("face")) return "portrait";
    return "blackwork"; // default
  };

  // Use database images if available, otherwise use static fallback
  const works = dbImages.length > 0 
    ? dbImages.map(img => ({ 
        id: img.id, 
        src: img.image_url, 
        title: img.title,
        style: inferStyle(img)
      }))
    : staticWorks;

  // Filter works based on active filter
  const filteredWorks = activeFilter === "all" 
    ? works 
    : works.filter(w => w.style === activeFilter);

  return (
    <section id="work" className="py-24 md:py-32 px-6 md:px-12 relative overflow-hidden">
      {/* Sacred Geometry Background */}
      <SacredGeometryBackground opacity={0.1} />
      
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-24"
        >
          <div className="flex items-center gap-4 mb-4">
            <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              01
            </span>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-px w-12 bg-border origin-left"
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
              Selected Work
            </h2>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 font-body text-sm tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filter by Style</span>
            </button>
          </div>
        </motion.div>

        {/* Style Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-12 overflow-hidden"
            >
              <div className="flex flex-wrap gap-3">
                {TATTOO_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setActiveFilter(style.id)}
                    className={`px-4 py-2 font-body text-xs tracking-[0.15em] uppercase border transition-all duration-300 ${
                      activeFilter === style.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
              
              {/* Active filter indicator */}
              {activeFilter !== "all" && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-sm text-muted-foreground"
                >
                  Showing {filteredWorks.length} {activeFilter.replace("-", " ")} designs
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
          key={activeFilter} // Force re-animation on filter change
        >
          <AnimatePresence mode="popLayout">
            {filteredWorks.map((work) => (
              <motion.div
                key={work.id}
                variants={itemVariants}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="group relative aspect-[3/4] overflow-hidden bg-secondary cursor-pointer"
                onMouseEnter={() => setHoveredId(work.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <motion.img
                  src={work.src}
                  alt={work.title}
                  className="w-full h-full object-cover"
                  animate={{
                    scale: hoveredId === work.id ? 1.1 : 1,
                    opacity: hoveredId !== null && hoveredId !== work.id ? 0.4 : 1,
                  }}
                  transition={{ duration: 0.5 }}
                />
                {/* Overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent flex flex-col items-start justify-end p-4 md:p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredId === work.id ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-display text-lg md:text-xl text-foreground">
                    {work.title}
                  </span>
                  <span className="font-body text-xs uppercase tracking-wider text-muted-foreground mt-1">
                    {work.style.replace("-", " ")}
                  </span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* No results message */}
        {filteredWorks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="font-body text-muted-foreground">
              No designs found for this style. Check back soon for more work.
            </p>
          </motion.div>
        )}

        {/* View More */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <a
            href="https://instagram.com/ferunda"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 font-body text-sm tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-300 group"
          >
            <span>View more on Instagram</span>
            <motion.svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </motion.svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Gallery;