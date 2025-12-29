import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { TattooBrief } from "@/components/TattooBriefCard";

interface LuxuryTattooPlanProps {
  brief: TattooBrief | null;
  onConfirm?: () => void;
  isEditable?: boolean;
}

const colorTypeLabels: Record<string, string> = {
  black_grey: "Black & Grey",
  color: "Color",
  mixed: "Mixed",
  undecided: "Undecided"
};

const LuxuryTattooPlan = ({ brief, onConfirm, isEditable = true }: LuxuryTattooPlanProps) => {
  const formatSize = () => {
    if (!brief?.size_estimate_inches_min) return null;
    if (brief.size_estimate_inches_max && brief.size_estimate_inches_max !== brief.size_estimate_inches_min) {
      return `${brief.size_estimate_inches_min}–${brief.size_estimate_inches_max} inches`;
    }
    return `~${brief.size_estimate_inches_min} inches`;
  };

  const formatDuration = () => {
    if (!brief?.session_estimate_hours_min) return null;
    if (brief.session_estimate_hours_max && brief.session_estimate_hours_max !== brief.session_estimate_hours_min) {
      return `${brief.session_estimate_hours_min}–${brief.session_estimate_hours_max} hours`;
    }
    return `~${brief.session_estimate_hours_min} hours`;
  };

  const fields = [
    { label: "Style", value: brief?.style },
    { label: "Subject", value: brief?.subject },
    { label: "Placement", value: brief?.placement },
    { label: "Approximate size", value: formatSize() },
    { label: "Color", value: brief?.color_type ? colorTypeLabels[brief.color_type] : null },
    { label: "Estimated session time", value: formatDuration() },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header - styled like a private dossier */}
      <div className="mb-6">
        <h3 className="font-display text-2xl text-foreground tracking-tight">
          Tattoo Plan
        </h3>
        <div className="mt-2 w-full h-px bg-border" />
      </div>
      
      {/* Fields - not "inputs", soft hover state */}
      <div className="flex-1 space-y-5">
        {fields.map((field, index) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`group ${isEditable ? 'cursor-pointer hover:bg-secondary/30' : ''} -mx-3 px-3 py-2 transition-colors`}
          >
            <p className="text-xs text-muted-foreground font-body uppercase tracking-widest mb-1">
              {field.label}
            </p>
            <p className={`font-display text-lg ${
              field.value ? 'text-foreground' : 'text-muted-foreground/40 italic'
            }`}>
              {field.value || "—"}
            </p>
          </motion.div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground font-body uppercase tracking-widest">
            Status
          </span>
          <span className="text-xs text-muted-foreground font-body">
            {brief?.status === 'ready' ? 'Ready' : 'Draft'}
          </span>
        </div>
        
        {onConfirm && (
          <Button
            onClick={onConfirm}
            className="w-full bg-foreground text-background hover:bg-foreground/90 font-display text-base py-6"
          >
            Confirm details
          </Button>
        )}
      </div>
    </div>
  );
};

export default LuxuryTattooPlan;
