import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const faqs = [
  {
    question: "How does the design process work?",
    answer: "I create a fully custom design for you based on your specifics, but the creative direction is my work. I'll design something unique using my artistic style. We can make small adjustments the day of the session, but the design is revealed that day so we can work on it together during our time.",
  },
  {
    question: "What's the booking process?",
    answer: "First, book a session to lock in your date. After booking, you'll send me details about your piece via email: references, meanings, symbols, elements, dates, names, or even a poem—anything that helps me understand what you want to transmit. I'll also need photos of the placement area so I can design over it.",
  },
  {
    question: "What style do you specialize in?",
    answer: "I specialize in realism, using references from books, paintings, and places I've visited. My compositions often incorporate geometry, sacred geometry, and astronomical elements mixed with symbols meaningful to you. Every piece is 100% unique—I don't copy or repeat tattoos.",
  },
  {
    question: "Why do you only take one client per day?",
    answer: "I dedicate my full, undivided attention to each client. One appointment per day means you get my complete focus for your project. This approach is directly related to my session pricing rather than the size of the piece—quality and presence matter more than rushing through multiple clients.",
  },
  {
    question: "How long is a session?",
    answer: "We spend a full day together working on your project. The exact time depends on the complexity and elements of your piece. After booking, we'll have a consultation (phone or in person) to discuss the design and timing in detail.",
  },
  {
    question: "What do I need to provide before my appointment?",
    answer: "Email me: references and inspiration images, what the piece means to you, symbols or elements to include, any dates/names/words, photos of the placement area from multiple angles, and anything else that captures what you want to express.",
  },
  {
    question: "When do I see the design?",
    answer: "The design is revealed the day of your appointment. This allows me to work on your piece with fresh creative energy. If small adjustments are needed, we can make them together before we start tattooing.",
  },
  {
    question: "What's the deposit?",
    answer: "A $500 deposit is required to secure your appointment. This deposit is deducted from the total session price. It's non-refundable for no-shows or late cancellations.",
  },
  {
    question: "Where are you located?",
    answer: "I'm based in Austin, Texas, with regular guest spots in Los Angeles and Houston. Check the availability calendar to see when I'll be in each city and book accordingly.",
  },
];

const FAQ = forwardRef<HTMLElement>((_, ref) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section ref={ref} className="py-24 md:py-32 bg-background relative" id="faq">
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
});

FAQ.displayName = "FAQ";

export default FAQ;
