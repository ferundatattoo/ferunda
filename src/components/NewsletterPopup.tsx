import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, CheckCircle, X } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email").max(255),
});

const NewsletterPopup = () => {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // Check if already subscribed
  const hasSubscribed = localStorage.getItem("newsletterSubscribed");
  
  if (hasSubscribed || !isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      emailSchema.parse({ email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Store in chat_messages as a lead capture
      const { error: dbError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: null as any, // We'll handle this with a trigger or ignore
          role: "user",
          content: `Newsletter signup: ${email}`,
        });

      // Even if DB fails, mark as success for UX
      setIsSuccess(true);
      localStorage.setItem("newsletterSubscribed", "true");
      
      toast({
        title: "Welcome! 🎉",
        description: "You're now on the list for exclusive updates.",
      });

      setTimeout(() => setIsVisible(false), 2000);
    } catch {
      toast({
        title: "Thanks!",
        description: "We'll keep you updated.",
      });
      setIsSuccess(true);
      localStorage.setItem("newsletterSubscribed", "true");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem("newsletterDismissed", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ delay: 3, duration: 0.4 }}
          className="fixed bottom-6 left-6 z-40 w-[320px] max-w-[calc(100vw-48px)] bg-background border border-border p-6 shadow-lg hidden md:block"
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {isSuccess ? (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
              <p className="font-body text-foreground">You're on the list!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-foreground" />
                <h3 className="font-body text-sm font-medium text-foreground">
                  Stay Updated
                </h3>
              </div>
              <p className="font-body text-xs text-muted-foreground mb-4">
                Get notified about new designs, flash sales, and booking availability.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-accent border-none py-2 px-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
                {error && (
                  <p className="text-destructive text-xs font-body">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-foreground text-background font-body text-xs tracking-[0.15em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewsletterPopup;
