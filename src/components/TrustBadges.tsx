import { motion } from "framer-motion";
import { Shield, Award, Clock, Sparkles } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const badges = [
  {
    icon: Shield,
    title: "Licensed & Certified",
    description: "Health department approved",
  },
  {
    icon: Award,
    title: "10+ Years Experience",
    description: "Trusted by 500+ clients",
  },
  {
    icon: Clock,
    title: "48hr Response",
    description: "Fast consultation booking",
  },
  {
    icon: Sparkles,
    title: "100% Custom",
    description: "Unique designs only",
  },
];

const TrustBadges = () => {
  return (
    <section className="py-16 bg-accent/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {badges.map((badge, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -2 }}
                className="text-center"
              >
                <badge.icon className="w-8 h-8 mx-auto mb-3 text-foreground/70" />
                <h3 className="font-body text-sm font-medium text-foreground mb-1">
                  {badge.title}
                </h3>
                <p className="font-body text-xs text-muted-foreground">
                  {badge.description}
                </p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
