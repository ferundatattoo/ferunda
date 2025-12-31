import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import SetupMethodSelector from "./SetupMethodSelector";
import SmartSetupWizard from "./SmartSetupWizard";
import ArtistSetupWizard from "./ArtistSetupWizard";

interface UnifiedArtistSetupProps {
  artistId: string;
  workspaceId: string;
  artistName: string;
  onComplete: () => void;
  onClose: () => void;
}

type SetupMode = "select" | "smart" | "manual";

const UnifiedArtistSetup = ({ artistId, workspaceId, artistName, onComplete, onClose }: UnifiedArtistSetupProps) => {
  const [mode, setMode] = useState<SetupMode>("select");

  if (mode === "smart") {
    return (
      <SmartSetupWizard
        artistId={artistId}
        workspaceId={workspaceId}
        artistName={artistName}
        onComplete={onComplete}
        onClose={onClose}
      />
    );
  }

  if (mode === "manual") {
    return (
      <ArtistSetupWizard
        artistId={artistId}
        workspaceId={workspaceId}
        artistName={artistName}
        onComplete={onComplete}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display text-lg">Artist Setup</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <SetupMethodSelector
            artistName={artistName}
            onSelectSmart={() => setMode("smart")}
            onSelectManual={() => setMode("manual")}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default UnifiedArtistSetup;
