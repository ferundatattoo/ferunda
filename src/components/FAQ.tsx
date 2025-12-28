import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const faqs = [
  {
    question: "How much does a tattoo cost?",
    answer: "Tattoo pricing varies based on size, complexity, and placement. Small pieces start around $150-300, medium pieces $300-600, and larger pieces are priced per session ($200-400/hour). Book a free consultation for an accurate quote tailored to your design.",
  },
  {
    question: "How do I book an appointment?",
    answer: "You can book a free consultation through the booking form on this website, via WhatsApp at +51952141416, or by email at contact@ferunda.com. I'll respond within 48 hours to discuss your vision and schedule your session.",
  },
  {
    question: "How long does a tattoo session take?",
    answer: "Session length depends on the tattoo size and complexity. Small pieces take 1-2 hours, medium pieces 2-4 hours, and larger pieces may require multiple sessions. We'll discuss timing during your consultation.",
  },
  {
    question: "What styles do you specialize in?",
    answer: "I specialize in fine line, geometric, blackwork, and narrative tattoos. Each piece is custom-designed to tell your unique story. I don't do flash tattoos - every design is created specifically for you.",
  },
  {
    question: "Does it hurt?",
    answer: "Pain varies by person and placement. Generally, areas with more muscle or fat hurt less, while bony areas are more sensitive. Most clients describe it as manageable discomfort. I work at a pace that keeps you comfortable.",
  },
  {
    question: "How should I prepare for my appointment?",
    answer: "Get a good night's sleep, eat a full meal before your session, stay hydrated, and avoid alcohol for 24 hours prior. Wear comfortable clothing that provides easy access to the tattoo area. Bring snacks for longer sessions.",
  },
  {
    question: "What's the healing process like?",
    answer: "Initial healing takes 2-3 weeks. Keep the tattoo clean and moisturized, avoid direct sunlight, and don't submerge it in water. I'll provide detailed aftercare instructions. Full healing takes about 4-6 weeks.",
  },
  {
    question: "Do you require a deposit?",
    answer: "Yes, a deposit of $100-200 (depending on tattoo size) is required to secure your appointment. This is applied to your final cost. Deposits are non-refundable for no-shows or cancellations with less than 48 hours notice.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 md:py-32 bg-background relative" id="faq">
      <div className="max-w-3xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-border" />
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Questions
              </span>
              <div className="h-px w-12 bg-border" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-light text-foreground mb-4">
              Frequently Asked
            </h2>
            <p className="font-body text-muted-foreground">
              Everything you need to know before your tattoo journey
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <ScrollReveal key={index} delay={index * 0.05}>
              <div className="border border-border hover:border-foreground/20 transition-colors">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-body text-foreground pr-4">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6">
                        <p className="font-body text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.4}>
          <div className="mt-12 text-center">
            <p className="font-body text-muted-foreground mb-4">
              Still have questions?
            </p>
            <a
              href="https://wa.me/51952141416?text=Hi%20Fernando%2C%20I%20have%20a%20question%20about%20getting%20a%20tattoo."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-accent transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Ask on WhatsApp
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FAQ;
