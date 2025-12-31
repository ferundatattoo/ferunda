import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Wand2, 
  Settings2, 
  ChevronRight,
  Zap,
  Clock,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SetupMethodSelectorProps {
  artistName: string;
  onSelectSmart: () => void;
  onSelectManual: () => void;
}

const SetupMethodSelector = ({ artistName, onSelectSmart, onSelectManual }: SetupMethodSelectorProps) => {
  const [hoveredMethod, setHoveredMethod] = useState<"smart" | "manual" | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-2xl text-foreground">
          Welcome, {artistName}!
        </h2>
        <p className="text-muted-foreground mt-2">
          Choose how you'd like to set up your services and policies
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-4">
        {/* Smart Setup */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onSelectSmart}
          onMouseEnter={() => setHoveredMethod("smart")}
          onMouseLeave={() => setHoveredMethod(null)}
          className={`relative overflow-hidden p-6 rounded-xl border-2 text-left transition-all ${
            hoveredMethod === "smart"
              ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
              : "border-border hover:border-primary/50"
          }`}
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-50" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  hoveredMethod === "smart" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/20 text-primary"
                }`}>
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl text-foreground">Smart Setup</h3>
                    <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
                      AI Powered
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Describe your style, AI generates everything
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-6 h-6 transition-transform ${
                hoveredMethod === "smart" ? "translate-x-1 text-primary" : "text-muted-foreground"
              }`} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">2 minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wand2 className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Auto pricing</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Fully editable</span>
              </div>
            </div>

            {/* Features List */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Hugging Face Vision
                </span>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Smart Pricing
                </span>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Policy Templates
                </span>
              </div>
            </div>
          </div>
        </motion.button>

        {/* Manual Setup */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onSelectManual}
          onMouseEnter={() => setHoveredMethod("manual")}
          onMouseLeave={() => setHoveredMethod(null)}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            hoveredMethod === "manual"
              ? "border-muted-foreground/50 bg-muted/30"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                hoveredMethod === "manual" 
                  ? "bg-muted-foreground text-background" 
                  : "bg-muted text-muted-foreground"
              }`}>
                <Settings2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-display text-xl text-foreground">Manual Setup</h3>
                <p className="text-muted-foreground mt-1">
                  Configure each service and policy yourself
                </p>
              </div>
            </div>
            <ChevronRight className={`w-6 h-6 transition-transform ${
              hoveredMethod === "manual" ? "translate-x-1 text-foreground" : "text-muted-foreground"
            }`} />
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>5-10 minutes</span>
            <span className="mx-2">•</span>
            <span>Full control over every setting</span>
          </div>
        </motion.button>
      </div>

      {/* Recommendation */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
          Recommended: Let AI do the heavy lifting, then customize as needed
        </p>
      </div>
    </div>
  );
};

export default SetupMethodSelector;
