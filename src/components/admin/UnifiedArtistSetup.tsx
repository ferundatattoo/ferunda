import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Artist Setup</DialogTitle>
        </DialogHeader>
        <SetupMethodSelector
          artistName={artistName}
          onSelectSmart={() => setMode("smart")}
          onSelectManual={() => setMode("manual")}
        />
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedArtistSetup;
