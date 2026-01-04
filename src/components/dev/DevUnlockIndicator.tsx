import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code, X, Unlock } from "lucide-react";
import { useDevMode } from "@/hooks/useDevMode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DevUnlockIndicator = () => {
  const { isEnabled, toggleDevUnlock } = useDevMode();
  const [minimized, setMinimized] = useState(false);

  if (!isEnabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className={cn(
          "fixed bottom-4 right-4 z-[100] flex items-center gap-2",
          "transition-all duration-200"
        )}
      >
        {!minimized ? (
          <motion.div
            layout
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/90 text-amber-950 backdrop-blur-xl border border-amber-400 shadow-lg shadow-amber-500/20"
          >
            <Unlock className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Dev Mode
            </span>
            <div className="flex items-center gap-1 ml-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-amber-600/30 text-amber-950"
                onClick={() => setMinimized(true)}
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 hover:bg-amber-600/30 text-amber-950 text-xs"
                onClick={toggleDevUnlock}
              >
                Disable
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            layout
            onClick={() => setMinimized(false)}
            className="p-2.5 rounded-xl bg-amber-500/90 text-amber-950 backdrop-blur-xl border border-amber-400 shadow-lg shadow-amber-500/20 hover:bg-amber-500"
          >
            <Code className="h-4 w-4" />
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DevUnlockIndicator;
