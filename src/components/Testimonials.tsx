import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const testimonials = [
  {
    name: "Sarah M.",
    location: "Los Angeles, CA",
    text: "Fernando understood my vision perfectly. The tattoo exceeded my expectations - it's truly a piece of art that tells my story.",
    rating: 5,
  },
  {
    name: "Alex K.",
    location: "Santa Monica, CA",
    text: "The attention to detail is incredible. Fernando took the time to understand what I wanted and created something unique and meaningful.",
    rating: 5,
  },
  {
    name: "Maria L.",
    location: "Beverly Hills, CA",
    text: "Best tattoo experience I've ever had. Clean studio, professional service, and the result is absolutely stunning.",
    rating: 5,
  },
  {
    name: "James T.",
    location: "Pasadena, CA",
    text: "I flew in from NYC specifically for Fernando's work. Worth every mile. His fine line work is unmatched.",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="py-24 md:py-32 bg-background relative" id="testimonials">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-border" />
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Client Stories
              </span>
              <div className="h-px w-12 bg-border" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-light text-foreground">
              What Clients Say
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                className="border border-border p-8 hover:border-foreground/20 transition-all duration-300"
              >
                <Quote className="w-8 h-8 text-foreground/20 mb-4" />
                
                <p className="font-body text-foreground/80 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-body text-foreground font-medium">
                      {testimonial.name}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      {testimonial.location}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-foreground text-foreground"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        {/* Trust indicators */}
        <ScrollReveal delay={0.4}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-center">
            <div>
              <p className="font-display text-3xl font-light text-foreground">500+</p>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                Happy Clients
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-display text-3xl font-light text-foreground">10+</p>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                Years Experience
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-display text-3xl font-light text-foreground">4.9</p>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                Average Rating
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="font-display text-3xl font-light text-foreground">100%</p>
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                Custom Designs
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Testimonials;
