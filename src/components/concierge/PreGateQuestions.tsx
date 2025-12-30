import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  X as XIcon, 
  ArrowRight, 
  Palette, 
  RefreshCw, 
  Scissors, 
  Copy, 
  Calendar,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PreGateQuestion {
  id: string;
  question_key: string;
  question_text: string;
  description?: string;
  targets_field: string;
  block_on_value?: boolean;
  display_order: number;
}

interface PreGateResponses {
  wantsColor?: boolean;
  isCoverUp?: boolean;
  isTouchUp?: boolean;
  isRework?: boolean;
  isRepeatDesign?: boolean;
  is18Plus?: boolean;
}

interface BlockReason {
  question_key: string;
  reason_code: string;
  message: string;
}

interface PreGateResult {
  passed: boolean;
  responses: PreGateResponses;
  blocked_by: string[];
  block_reasons: BlockReason[];
}

interface ArtistCapabilities {
  accepts_color_work?: boolean;
  accepts_coverups?: boolean;
  accepts_touchups?: boolean;
  accepts_reworks?: boolean;
  will_repeat_designs?: boolean;
}

interface PreGateQuestionsProps {
  onComplete: (result: PreGateResult) => void;
  onBack?: () => void;
  artistId?: string;
}

const QUESTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wantsColor: Palette,
  isCoverUp: RefreshCw,
  isTouchUp: Scissors,
  isRework: RefreshCw,
  isRepeatDesign: Copy,
  is18Plus: Calendar,
};

const GRACEFUL_MESSAGES: Record<string, string> = {
  color_requested: "I specialize exclusively in black and grey work — it's where my passion and expertise lie. While I can't take on color pieces, I'd be happy to suggest talented color artists, or we could explore a stunning black and grey interpretation of your idea.",
  coverup_not_offered: "Cover-ups require specialized techniques that aren't my focus. I want to make sure your piece gets the attention it deserves from an artist who specializes in transforming existing tattoos. Would you like me to suggest some excellent cover-up artists?",
  touchup_not_offered: "I only offer touch-ups on my own previous work to ensure continuity and quality. For touch-ups on other artists' work, I'd recommend reaching out to the original artist or a specialist who focuses on tattoo restoration.",
  rework_not_offered: "Reworking existing tattoos requires a different skill set than what I specialize in. I focus on creating fresh, original pieces. Would you like to explore a new design instead?",
  repeat_not_offered: "Each piece I create is one-of-a-kind, designed specifically for you. While I won't replicate another tattoo, I'd love to create something original inspired by elements you love.",
  age_verification_required: "Thank you for your interest! Tattoo services are only available to clients who are 18 years or older. Feel free to reach out again when you've reached that milestone.",
};

export const PreGateQuestions = forwardRef<HTMLDivElement, PreGateQuestionsProps>(
  function PreGateQuestions({ onComplete, onBack, artistId }, ref) {
  const [questions, setQuestions] = useState<PreGateQuestion[]>([]);
  const [responses, setResponses] = useState<PreGateResponses>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<ArtistCapabilities | null>(null);
  const [blockResult, setBlockResult] = useState<{ blocked: boolean; reasons: BlockReason[] } | null>(null);

  const DEFAULT_QUESTIONS: PreGateQuestion[] = [
    {
      id: "default-wantsColor",
      question_key: "wantsColor",
      question_text: "Are you looking for a tattoo with any color?",
      description: "Ferunda specializes in black & grey fine-line and micro-realism.",
      targets_field: "wantsColor",
      block_on_value: true,
      display_order: 1,
    },
    {
      id: "default-isCoverUp",
      question_key: "isCoverUp",
      question_text: "Is this a cover-up?",
      description: "Cover-ups require a different approach than original work.",
      targets_field: "isCoverUp",
      block_on_value: true,
      display_order: 2,
    },
    {
      id: "default-isTouchUp",
      question_key: "isTouchUp",
      question_text: "Is this a touch-up?",
      description: "Touch-ups are typically only available for Ferunda's own work.",
      targets_field: "isTouchUp",
      block_on_value: true,
      display_order: 3,
    },
    {
      id: "default-isRework",
      question_key: "isRework",
      question_text: "Is this a rework of an existing tattoo?",
      description: "Reworks can be very different from creating a new piece.",
      targets_field: "isRework",
      block_on_value: true,
      display_order: 4,
    },
    {
      id: "default-isRepeatDesign",
      question_key: "isRepeatDesign",
      question_text: "Are you wanting an exact repeat/copy of another tattoo?",
      description: "Ferunda creates 100% custom, one-of-a-kind designs.",
      targets_field: "isRepeatDesign",
      block_on_value: true,
      display_order: 5,
    },
    {
      id: "default-is18Plus",
      question_key: "is18Plus",
      question_text: "Are you 18 or older?",
      description: "Tattoo services are only available to clients 18+.",
      targets_field: "is18Plus",
      block_on_value: true,
      display_order: 6,
    },
  ];

  // Fetch questions and artist capabilities
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      // Fetch pre-gate questions (fallback to defaults if none configured)
      const { data: questionsData } = await supabase
        .from("pre_gate_questions")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (questionsData && questionsData.length > 0) {
        setQuestions(questionsData);
      } else {
        setQuestions(DEFAULT_QUESTIONS);
      }

      // Fetch artist capabilities if we have an artist ID
      if (artistId) {
        const { data: capData } = await supabase
          .from("artist_capabilities")
          .select("accepts_color_work, accepts_coverups, accepts_touchups, accepts_reworks, will_repeat_designs")
          .eq("artist_id", artistId)
          .single();

        if (capData) {
          setCapabilities(capData);
        }
      } else {
        // Fetch primary artist's capabilities
        const { data: artistData } = await supabase
          .from("studio_artists")
          .select("id")
          .eq("is_primary", true)
          .single();

        if (artistData) {
          const { data: capData } = await supabase
            .from("artist_capabilities")
            .select("accepts_color_work, accepts_coverups, accepts_touchups, accepts_reworks, will_repeat_designs")
            .eq("artist_id", artistData.id)
            .single();

          if (capData) {
            setCapabilities(capData);
          }
        }
      }

      setIsLoading(false);
    }

    fetchData();
  }, [artistId]);

  // Check if a response triggers a block
  const checkForBlock = (field: string, value: boolean): BlockReason | null => {
    if (!capabilities) return null;

    // Color work check
    if (field === "wantsColor" && value === true && capabilities.accepts_color_work === false) {
      return {
        question_key: "wantsColor",
        reason_code: "color_requested",
        message: GRACEFUL_MESSAGES.color_requested,
      };
    }

    // Cover-up check
    if (field === "isCoverUp" && value === true && capabilities.accepts_coverups === false) {
      return {
        question_key: "isCoverUp",
        reason_code: "coverup_not_offered",
        message: GRACEFUL_MESSAGES.coverup_not_offered,
      };
    }

    // Touch-up check
    if (field === "isTouchUp" && value === true && capabilities.accepts_touchups === false) {
      return {
        question_key: "isTouchUp",
        reason_code: "touchup_not_offered",
        message: GRACEFUL_MESSAGES.touchup_not_offered,
      };
    }

    // Rework check
    if (field === "isRework" && value === true && capabilities.accepts_reworks === false) {
      return {
        question_key: "isRework",
        reason_code: "rework_not_offered",
        message: GRACEFUL_MESSAGES.rework_not_offered,
      };
    }

    // Repeat design check
    if (field === "isRepeatDesign" && value === true && capabilities.will_repeat_designs === false) {
      return {
        question_key: "isRepeatDesign",
        reason_code: "repeat_not_offered",
        message: GRACEFUL_MESSAGES.repeat_not_offered,
      };
    }

    // Age verification (always required)
    if (field === "is18Plus" && value === false) {
      return {
        question_key: "is18Plus",
        reason_code: "age_verification_required",
        message: GRACEFUL_MESSAGES.age_verification_required,
      };
    }

    return null;
  };

  // Handle answer
  const handleAnswer = (value: boolean) => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const field = currentQuestion.targets_field as keyof PreGateResponses;
    const newResponses = { ...responses, [field]: value };
    setResponses(newResponses);

    // Check for block
    const blockReason = checkForBlock(field, value);
    if (blockReason) {
      setBlockResult({ blocked: true, reasons: [blockReason] });
      return;
    }

    // Move to next question or complete
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All questions answered, passed
      onComplete({
        passed: true,
        responses: newResponses,
        blocked_by: [],
        block_reasons: [],
      });
    }
  };

  // Handle continue after block
  const handleBlockedContinue = () => {
    if (!blockResult) return;
    
    onComplete({
      passed: false,
      responses,
      blocked_by: blockResult.reasons.map(r => r.question_key),
      block_reasons: blockResult.reasons,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  // Show block screen
  if (blockResult) {
    const reason = blockResult.reasons[0];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 py-4"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-secondary flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="font-display text-xl text-foreground mb-2">
            A Quick Note
          </h4>
        </div>

        <div className="bg-secondary/50 border border-border p-4">
          <p className="text-sm text-foreground font-body leading-relaxed">
            {reason?.message}
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleBlockedContinue}
            variant="outline"
            className="w-full border-border hover:border-foreground/50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Explore Alternatives
          </Button>
          
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Start Over
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) {
    return null;
  }

  const IconComponent = QUESTION_ICONS[currentQuestion.targets_field] || Calendar;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div ref={ref} className="space-y-6 py-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
          <span>Quick Questions</span>
          <span>{currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="h-1 bg-secondary overflow-hidden">
          <motion.div 
            className="h-full bg-foreground"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-foreground/5 flex items-center justify-center shrink-0">
              <IconComponent className="w-6 h-6 text-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="font-display text-lg text-foreground">
                {currentQuestion.question_text}
              </h4>
              {currentQuestion.description && (
                <p className="text-sm text-muted-foreground font-body mt-1">
                  {currentQuestion.description}
                </p>
              )}
            </div>
          </div>

          {/* Answer buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAnswer(true)}
              variant="outline"
              className="h-14 border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all group"
            >
              <Check className="w-5 h-5 mr-2 opacity-50 group-hover:opacity-100" />
              Yes
            </Button>
            <Button
              onClick={() => handleAnswer(false)}
              variant="outline"
              className="h-14 border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all group"
            >
              <XIcon className="w-5 h-5 mr-2 opacity-50 group-hover:opacity-100" />
              No
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Skip link */}
      {onBack && currentIndex === 0 && (
        <div className="text-center">
          <button 
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground font-body underline-offset-4 hover:underline transition-colors"
          >
            I'll skip these and just chat
          </button>
        </div>
      )}
    </div>
  );
});

export default PreGateQuestions;
