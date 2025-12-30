import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  ArrowRight,
  MessageCircle,
  Calendar,
  Camera,
  Heart,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

// The artist/studio introduction data - could come from database
const STUDIO_INFO = {
  artistName: "Ferunda",
  greeting: "Welcome to Ferunda's studio",
  tagline: "Fine line & micro-realism tattoo artistry",
  specialties: ["Fine Line", "Micro-Realism", "Botanical", "Sacred Geometry"],
  experience: "10+ years",
  location: "Austin • Houston • Los Angeles"
};

// Conversational quick actions that feel natural
const QUICK_ACTIONS = [
  { 
    id: 'new-tattoo', 
    label: "I have a tattoo idea", 
    icon: Sparkles,
    trigger: "I have a tattoo idea I'd like to explore with you."
  },
  { 
    id: 'see-work', 
    label: "Show me your work", 
    icon: Camera,
    trigger: "I'd love to see more of your work before deciding."
  },
  { 
    id: 'availability', 
    label: "Check availability", 
    icon: Calendar,
    trigger: "I'd like to know about your availability."
  },
  { 
    id: 'just-looking', 
    label: "Just exploring", 
    icon: Heart,
    trigger: "I'm just exploring and learning about your process."
  }
];

interface ConciergeEntryProps {
  onProceed: (userIntent: string, skipPreGate?: boolean) => void;
}

export const ConciergeEntry = forwardRef<HTMLDivElement, ConciergeEntryProps>(
  function ConciergeEntry({ onProceed }, ref) {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  
  const introMessage = `Welcome to ${STUDIO_INFO.artistName}'s studio. What brings you in today?`;
  
  // Typewriter effect for intro
  useEffect(() => {
    if (typedText.length < introMessage.length) {
      const timer = setTimeout(() => {
        setTypedText(introMessage.slice(0, typedText.length + 1));
      }, 25);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
      // Show quick actions after typing completes
      setTimeout(() => setShowQuickActions(true), 300);
    }
  }, [typedText, introMessage]);
  
  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    // 'see-work' and 'just-looking' skip pre-gate
    const skipPreGate = action.id === 'see-work' || action.id === 'just-looking';
    onProceed(action.trigger, skipPreGate);
  };
  
  return (
    <div ref={ref} className="flex flex-col h-full">
      {/* Artist/Studio Introduction */}
      <div className="text-center py-6 px-4 border-b border-border/50">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          {/* Studio badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-foreground/5 border border-border/50 text-xs text-muted-foreground uppercase tracking-widest">
            <Star className="w-3 h-3" />
            {STUDIO_INFO.experience} Experience
          </div>
          
          {/* Artist name */}
          <h3 className="font-display text-3xl text-foreground tracking-tight">
            {STUDIO_INFO.artistName}
          </h3>
          
          {/* Tagline */}
          <p className="text-sm text-muted-foreground font-body">
            {STUDIO_INFO.tagline}
          </p>
          
          {/* Specialties */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {STUDIO_INFO.specialties.map((specialty) => (
              <span 
                key={specialty}
                className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border border-border/30 bg-background"
              >
                {specialty}
              </span>
            ))}
          </div>
          
          {/* Location */}
          <p className="text-xs text-muted-foreground/70 pt-2">
            {STUDIO_INFO.location}
          </p>
        </motion.div>
      </div>
      
      {/* Conversation Start */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Luna's greeting with typewriter effect */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 bg-foreground/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm text-foreground font-body leading-relaxed">
                {typedText}
                {isTyping && (
                  <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse" />
                )}
              </p>
            </div>
          </motion.div>
          
          {/* Quick action buttons */}
          <AnimatePresence>
            {showQuickActions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, staggerChildren: 0.1 }}
                className="space-y-2 pt-4"
              >
                {QUICK_ACTIONS.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickAction(action)}
                    className="w-full p-3 bg-card hover:bg-secondary/80 border border-border hover:border-foreground/20 text-left flex items-center gap-3 transition-all duration-200 group"
                  >
                    <div className="w-8 h-8 bg-foreground/5 group-hover:bg-foreground/10 flex items-center justify-center transition-colors">
                      <action.icon className="w-4 h-4 text-foreground/70 group-hover:text-foreground transition-colors" />
                    </div>
                    <span className="flex-1 text-sm font-body text-foreground/80 group-hover:text-foreground transition-colors">
                      {action.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors opacity-0 group-hover:opacity-100" />
                  </motion.button>
                ))}
                
                {/* Or type freely hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-xs text-muted-foreground/60 pt-4"
                >
                  or type anything below to start a conversation
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

export default ConciergeEntry;
