import { motion } from 'framer-motion';
import { 
  Lightbulb, Image, CreditCard, Palette, Calendar, Heart, Award, 
  CheckCircle, Circle, ChevronRight 
} from 'lucide-react';

interface ProjectTimelineProps {
  currentStage: string;
  bookingData?: {
    deposit_paid?: boolean;
    scheduled_date?: string;
    reference_images_customer?: any[];
  };
}

const TIMELINE_STAGES = [
  { 
    key: 'idea_submitted', 
    label: 'Idea Submitted', 
    subLabel: 'Your vision received',
    icon: Lightbulb,
    color: 'emerald'
  },
  { 
    key: 'references_reviewed', 
    label: 'References Reviewed', 
    subLabel: 'Inspiration gathered',
    icon: Image,
    color: 'blue'
  },
  { 
    key: 'deposit_paid', 
    label: 'Deposit Paid', 
    subLabel: 'Spot secured',
    icon: CreditCard,
    color: 'amber'
  },
  { 
    key: 'design_in_progress', 
    label: 'Design In Progress', 
    subLabel: 'Creating your art',
    icon: Palette,
    color: 'purple'
  },
  { 
    key: 'appointment_day', 
    label: 'Appointment Day', 
    subLabel: 'The big day',
    icon: Calendar,
    color: 'rose'
  },
  { 
    key: 'healing', 
    label: 'Healing & Aftercare', 
    subLabel: 'Taking care of your new art',
    icon: Heart,
    color: 'pink'
  },
  { 
    key: 'healed', 
    label: 'Healed Check-In', 
    subLabel: 'Your masterpiece complete',
    icon: Award,
    color: 'yellow'
  }
];

// Map pipeline stages to timeline stages
const STAGE_MAPPING: Record<string, string> = {
  'new_inquiry': 'idea_submitted',
  'references_requested': 'idea_submitted',
  'references_received': 'references_reviewed',
  'deposit_requested': 'references_reviewed',
  'deposit_paid': 'deposit_paid',
  'scheduled': 'appointment_day',
  'completed': 'healing'
};

export default function ProjectTimeline({ currentStage, bookingData }: ProjectTimelineProps) {
  // Map the pipeline stage to timeline stage
  const mappedStage = STAGE_MAPPING[currentStage] || 'idea_submitted';
  const currentIndex = TIMELINE_STAGES.findIndex(s => s.key === mappedStage);
  
  // Check if deposit is paid to advance design stage
  const effectiveIndex = bookingData?.deposit_paid && currentIndex >= 2 ? 
    Math.max(currentIndex, 3) : currentIndex;

  const getStageStatus = (index: number) => {
    if (index < effectiveIndex) return 'completed';
    if (index === effectiveIndex) return 'current';
    return 'upcoming';
  };

  const getColorClasses = (color: string, status: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
      emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' },
      blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/30' },
      amber: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
      purple: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
      rose: { bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/30' },
      pink: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-400', glow: 'shadow-pink-500/30' },
      yellow: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' },
    };
    
    if (status === 'completed') {
      return { ...colors[color], opacity: 'opacity-100' };
    }
    if (status === 'current') {
      return { ...colors[color], opacity: 'opacity-100' };
    }
    return { bg: 'bg-muted', border: 'border-muted', text: 'text-muted-foreground', glow: '', opacity: 'opacity-50' };
  };

  return (
    <div className="relative py-8">
      {/* Main Timeline Container */}
      <div className="relative">
        {/* Desktop Timeline - Horizontal */}
        <div className="hidden md:block">
          {/* Progress Line Background */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-muted rounded-full" />
          
          {/* Progress Line Active */}
          <motion.div 
            className="absolute top-8 left-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${(effectiveIndex / (TIMELINE_STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Stage Nodes */}
          <div className="flex justify-between relative">
            {TIMELINE_STAGES.map((stage, index) => {
              const status = getStageStatus(index);
              const colorClasses = getColorClasses(stage.color, status);
              const Icon = stage.icon;

              return (
                <motion.div
                  key={stage.key}
                  className={`flex flex-col items-center w-32 ${colorClasses.opacity}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Node Circle */}
                  <motion.div
                    className={`
                      relative w-16 h-16 rounded-full flex items-center justify-center
                      ${status === 'completed' ? colorClasses.bg : status === 'current' ? `border-2 ${colorClasses.border} bg-background` : 'border-2 border-muted bg-background'}
                      ${status === 'current' ? `shadow-lg ${colorClasses.glow}` : ''}
                    `}
                    whileHover={status !== 'upcoming' ? { scale: 1.1 } : {}}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-7 h-7 text-background" />
                    ) : (
                      <Icon className={`w-6 h-6 ${status === 'current' ? colorClasses.text : 'text-muted-foreground'}`} />
                    )}
                    
                    {/* Current Stage Pulse */}
                    {status === 'current' && (
                      <motion.div
                        className={`absolute inset-0 rounded-full ${colorClasses.border} border-2`}
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>

                  {/* Label */}
                  <div className="mt-4 text-center">
                    <p className={`text-sm font-medium ${status !== 'upcoming' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {stage.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stage.subLabel}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile Timeline - Vertical */}
        <div className="md:hidden space-y-4">
          {TIMELINE_STAGES.map((stage, index) => {
            const status = getStageStatus(index);
            const colorClasses = getColorClasses(stage.color, status);
            const Icon = stage.icon;
            const isLast = index === TIMELINE_STAGES.length - 1;

            return (
              <motion.div
                key={stage.key}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Left Column - Node & Line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      ${status === 'completed' ? colorClasses.bg : status === 'current' ? `border-2 ${colorClasses.border} bg-background shadow-lg ${colorClasses.glow}` : 'border-2 border-muted bg-background'}
                    `}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-background" />
                    ) : (
                      <Icon className={`w-4 h-4 ${status === 'current' ? colorClasses.text : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  
                  {!isLast && (
                    <div className={`w-0.5 h-12 ${index < effectiveIndex ? 'bg-gradient-to-b from-emerald-500 to-blue-500' : 'bg-muted'}`} />
                  )}
                </div>

                {/* Right Column - Content */}
                <div className={`pt-2 ${status === 'upcoming' ? 'opacity-50' : ''}`}>
                  <p className={`font-medium ${status !== 'upcoming' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stage.subLabel}
                  </p>
                  
                  {status === 'current' && (
                    <motion.p
                      className={`text-xs ${colorClasses.text} mt-1 flex items-center gap-1`}
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Circle className="w-2 h-2 fill-current" />
                      You are here
                    </motion.p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Message */}
      <motion.div
        className="mt-8 p-4 bg-card/50 border border-border rounded-lg text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm text-muted-foreground">
          {effectiveIndex === 0 && "We've received your idea and are reviewing it carefully."}
          {effectiveIndex === 1 && "Your references are being reviewed. We'll reach out if we need more info."}
          {effectiveIndex === 2 && "Your deposit is confirmed! Your spot is secured."}
          {effectiveIndex === 3 && "Your custom design is in progress. We'll share updates soon."}
          {effectiveIndex === 4 && "Your appointment is coming up! Check the prep guide below."}
          {effectiveIndex === 5 && "Your new tattoo is healing. Track your progress in the Healing tab."}
          {effectiveIndex === 6 && "Congratulations! Your tattoo has fully healed."}
        </p>
      </motion.div>
    </div>
  );
}
