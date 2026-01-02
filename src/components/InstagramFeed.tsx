import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Instagram } from "lucide-react";

// Note: For actual Instagram integration, you would need to use Instagram Basic Display API
// This component shows a stylized link to your Instagram profile
const InstagramFeed = forwardRef<HTMLElement>((_, ref) => {
  const instagramPosts = [
    { id: 1, alt: "Tattoo work 1" },
    { id: 2, alt: "Tattoo work 2" },
    { id: 3, alt: "Tattoo work 3" },
    { id: 4, alt: "Tattoo work 4" },
  ];

  return (
    <section ref={ref} className="py-24 md:py-32 px-6 md:px-12 overflow-hidden">
      <div className="container mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="h-px w-12 bg-border origin-right"
            />
            <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              03
            </span>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="h-px w-12 bg-border origin-left"
            />
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
            Follow the Journey
          </h2>
          <p className="font-body text-muted-foreground mt-4">
            See the latest work and behind-the-scenes
          </p>
        </motion.div>

        {/* Instagram CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <a
            href="https://instagram.com/ferunda"
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            {/* Decorative grid preview */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-8 opacity-50 group-hover:opacity-70 transition-opacity duration-500">
              {instagramPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="aspect-square bg-secondary relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent" />
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-4 py-8 border border-border hover:border-foreground/30 transition-colors duration-300"
            >
              <Instagram className="w-6 h-6 text-foreground" />
              <span className="font-display text-2xl md:text-3xl text-foreground">
                @ferunda
              </span>
              <motion.svg
                className="w-5 h-5 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                whileHover={{ x: 4 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </motion.svg>
            </motion.div>
          </a>
        </motion.div>
      </div>
    </section>
  );
});

InstagramFeed.displayName = "InstagramFeed";

export default InstagramFeed;
