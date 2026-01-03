import React, { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Users,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Copy,
  Clock,
  Zap,
  Image,
  Video,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

type GoalId = "bookings" | "promo" | "followers" | "engagement";
type WizardStep = "goal" | "details" | "generating" | "results";

interface MarketingGoal {
  id: GoalId;
  title: string;
  description: string;
  icon: typeof Target;
  color: string;
}

interface GeneratedContent {
  caption: string;
  hashtags: string[];
  bestTime: string;
  contentType: "image" | "video" | "carousel";
  tips: string[];
  callToAction: string;
}

interface MarketingWizardProps {
  workspaceId?: string;
  artistName?: string;
  hasAvatar?: boolean;
  onComplete?: () => void;
}

// ============================================================================
// DATA
// ============================================================================

const GOALS: MarketingGoal[] = [
  {
    id: "bookings",
    title: "Get More Bookings",
    description: "Fill your calendar with qualified clients",
    icon: Calendar,
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "promo",
    title: "Launch a Promo",
    description: "Flash day, seasonal special, or limited offer",
    icon: Zap,
    color: "from-orange-500 to-red-600",
  },
  {
    id: "followers",
    title: "Grow Followers",
    description: "Expand your reach and audience",
    icon: Users,
    color: "from-purple-500 to-pink-600",
  },
  {
    id: "engagement",
    title: "Boost Engagement",
    description: "More likes, comments, and shares",
    icon: TrendingUp,
    color: "from-blue-500 to-cyan-600",
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MarketingWizard = forwardRef<HTMLDivElement, MarketingWizardProps>(({ workspaceId, artistName, hasAvatar, onComplete }, ref) => {
  const [step, setStep] = useState<WizardStep>("goal");
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGoalSelect = (goalId: GoalId) => {
    setSelectedGoal(goalId);
    setStep("details");
  };

  const handleGenerate = async () => {
    if (!selectedGoal) return;

    setStep("generating");
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-marketing-studio", {
        body: {
          action: "generate_campaign",
          goal: selectedGoal,
          context: additionalContext,
          artistName: artistName || "the artist",
          workspaceId,
        },
      });

      if (error) throw error;

      setGeneratedContent({
        caption: data.caption || getDefaultCaption(selectedGoal),
        hashtags: data.hashtags || getDefaultHashtags(selectedGoal),
        bestTime: data.bestTime || "Tuesday 6-8 PM",
        contentType: data.contentType || "image",
        tips: data.tips || getDefaultTips(selectedGoal),
        callToAction: data.callToAction || "Link in bio to book!",
      });

      setStep("results");
    } catch (err) {
      console.error("Failed to generate content:", err);
      // Use fallback content
      setGeneratedContent({
        caption: getDefaultCaption(selectedGoal),
        hashtags: getDefaultHashtags(selectedGoal),
        bestTime: "Tuesday 6-8 PM",
        contentType: "image",
        tips: getDefaultTips(selectedGoal),
        callToAction: "Link in bio to book!",
      });
      setStep("results");
    } finally {
      setIsGenerating(false);
    }
  };

  const getDefaultCaption = (goal: GoalId): string => {
    const captions: Record<GoalId, string> = {
      bookings: "✨ Spots are opening up for next month! If you've been dreaming about that piece, now's the time.\n\nI specialize in fine line and micro-realism work that tells your story.\n\n📩 DM me 'BOOK' or tap the link in bio to start your journey.",
      promo: "⚡ FLASH FRIDAY is here!\n\nLimited designs, limited spots. First come, first served.\n\n💰 Special pricing for this weekend only\n🎨 Check stories for available designs\n\n📩 DM to claim yours!",
      followers: "Behind every tattoo is a story waiting to be told. ✨\n\nI'm @artist_name — specializing in turning your ideas into art that lives on your skin forever.\n\n👆 Follow for daily inspiration and behind-the-scenes\n💫 Save this for when you're ready",
      engagement: "Hot take: The best tattoo placement is... 👇\n\nDrop your answer in the comments! I'll share my thoughts + some examples in stories tomorrow.\n\n(Spoiler: there's no wrong answer 😉)",
    };
    return captions[goal];
  };

  const getDefaultHashtags = (goal: GoalId): string[] => {
    const base = ["tattoo", "tattooartist", "inked", "tattooart", "tattooideas"];
    const goalSpecific: Record<GoalId, string[]> = {
      bookings: ["tattooappointment", "bookingsopen", "tattoobooking", "getinked"],
      promo: ["flashtattoo", "tattooflash", "flashday", "tattoodeal"],
      followers: ["tattooinspo", "tattooinspiration", "tattoolove", "followme"],
      engagement: ["tattoolife", "inkaddict", "tattoocommunity", "tattoolovers"],
    };
    return [...base, ...goalSpecific[goal]];
  };

  const getDefaultTips = (goal: GoalId): string[] => {
    const tips: Record<GoalId, string[]> = {
      bookings: [
        "Post during your audience's peak hours",
        "Include a clear call-to-action",
        "Show your best recent work",
        "Respond to DMs within 1 hour",
      ],
      promo: [
        "Create urgency with limited availability",
        "Show the flash designs in stories",
        "Use countdown stickers",
        "Repost to stories multiple times",
      ],
      followers: [
        "Use trending audio in reels",
        "Collaborate with other artists",
        "Post consistently (daily if possible)",
        "Engage with similar accounts",
      ],
      engagement: [
        "Ask questions in your captions",
        "Reply to every comment",
        "Use polls and quizzes in stories",
        "Go live to connect with followers",
      ],
    };
    return tips[goal];
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const selectedGoalData = GOALS.find(g => g.id === selectedGoal);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI Marketing</span>
        </div>
        <h2 className="text-2xl font-editorial text-foreground">
          {step === "goal" && "What's your goal today?"}
          {step === "details" && `Let's ${selectedGoalData?.title.toLowerCase()}`}
          {step === "generating" && "Creating your content..."}
          {step === "results" && "Your content is ready! 🎉"}
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Goal Selection */}
        {step === "goal" && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {GOALS.map((goal) => (
              <Card
                key={goal.id}
                className="cursor-pointer hover:border-primary/50 transition-all group"
                onClick={() => handleGoalSelect(goal.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${goal.color} text-white`}>
                      <goal.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {goal.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {goal.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Step 2: Additional Details */}
        {step === "details" && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Any specific details? (optional)
                </CardTitle>
                <CardDescription>
                  Tell us more about what you want to promote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={
                    selectedGoal === "bookings"
                      ? "e.g., I have 3 spots open next week, specializing in botanical designs..."
                      : selectedGoal === "promo"
                      ? "e.g., Flash Friday with 10 mini designs, $150 each..."
                      : "e.g., I want to showcase my fine line work..."
                  }
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Avatar Option */}
            {hasAvatar && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Use your AI Avatar?</p>
                      <p className="text-xs text-muted-foreground">
                        We can create a video with your trained avatar
                      </p>
                    </div>
                    <Badge variant="secondary">Coming soon</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("goal")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button className="flex-1" onClick={handleGenerate}>
                Generate Content
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="py-12 text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">
              AI is crafting your perfect post...
            </p>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === "results" && generatedContent && (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Caption */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Caption</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.caption, "caption")}
                  >
                    {copiedField === "caption" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{generatedContent.caption}</p>
              </CardContent>
            </Card>

            {/* Hashtags */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Hashtags</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.hashtags.map(h => `#${h}`).join(" "), "hashtags")}
                  >
                    {copiedField === "hashtags" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {generatedContent.hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Best Time & Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Best time to post</p>
                      <p className="text-sm font-medium">{generatedContent.bestTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    {generatedContent.contentType === "video" ? (
                      <Video className="h-5 w-5 text-primary" />
                    ) : (
                      <Image className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Recommended format</p>
                      <p className="text-sm font-medium capitalize">{generatedContent.contentType}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pro Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {generatedContent.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setStep("goal");
                setGeneratedContent(null);
              }}>
                Start Over
              </Button>
              <Button className="flex-1" onClick={onComplete}>
                Done
                <Check className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MarketingWizard.displayName = "MarketingWizard";

export default MarketingWizard;
