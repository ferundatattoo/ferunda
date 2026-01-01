import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Video,
  Mail,
  Image,
  Instagram,
  Megaphone,
  TrendingUp,
  Wand2,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// SIMPLE MARKETING WIZARD - 3-Step Content Creation
// ============================================================================

type ContentType = "post" | "reel" | "story" | "email" | "promo";
type ContentAbout = "recent_work" | "promotion" | "educational" | "trend" | "custom";

interface WizardStep {
  step: 1 | 2 | 3;
  contentType: ContentType | null;
  contentAbout: ContentAbout | null;
  customPrompt: string;
  result: GeneratedContent | null;
}

interface GeneratedContent {
  caption: string;
  hashtags: string[];
  visualIdea: string;
  bestTime: string;
  platform: string;
}

const CONTENT_TYPES: Array<{ id: ContentType; label: string; icon: typeof Video; desc: string }> = [
  { id: "post", label: "Instagram Post", icon: Image, desc: "Carousel or single image" },
  { id: "reel", label: "Reel / TikTok", icon: Video, desc: "Short-form video content" },
  { id: "story", label: "Story", icon: Instagram, desc: "24h ephemeral content" },
  { id: "email", label: "Email", icon: Mail, desc: "Newsletter or follow-up" },
  { id: "promo", label: "Promotion", icon: Megaphone, desc: "Special offer or discount" },
];

const CONTENT_TOPICS: Array<{ id: ContentAbout; label: string; icon: typeof Star; desc: string }> = [
  { id: "recent_work", label: "Recent Work", icon: Sparkles, desc: "Showcase latest tattoo" },
  { id: "promotion", label: "Promotion", icon: Megaphone, desc: "Special offer or sale" },
  { id: "educational", label: "Educational", icon: TrendingUp, desc: "Tips, aftercare, process" },
  { id: "trend", label: "Trending Now", icon: Zap, desc: "Ride current viral trends" },
  { id: "custom", label: "Custom Idea", icon: Wand2, desc: "Your own concept" },
];

export function SimpleMarketingWizard() {
  const [wizard, setWizard] = useState<WizardStep>({
    step: 1,
    contentType: null,
    contentAbout: null,
    customPrompt: "",
    result: null,
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const goToStep = (step: 1 | 2 | 3) => {
    setWizard((prev) => ({ ...prev, step }));
  };

  const selectContentType = (type: ContentType) => {
    setWizard((prev) => ({ ...prev, contentType: type, step: 2 }));
  };

  const selectContentAbout = (about: ContentAbout) => {
    setWizard((prev) => ({ ...prev, contentAbout: about }));
    if (about !== "custom") {
      generateContent(about);
    }
  };

  const generateContent = async (about: ContentAbout = wizard.contentAbout!) => {
    if (!wizard.contentType) return;

    setLoading(true);
    setWizard((prev) => ({ ...prev, step: 3 }));

    try {
      const { data, error } = await supabase.functions.invoke("ai-marketing-studio", {
        body: {
          action: "quick_generate",
          content_type: wizard.contentType,
          content_about: about,
          custom_prompt: wizard.customPrompt || undefined,
          language: "es",
        },
      });

      if (error) throw error;

      if (data.success) {
        setWizard((prev) => ({
          ...prev,
          result: {
            caption: data.caption || data.content || "",
            hashtags: data.hashtags || [],
            visualIdea: data.visual_idea || "",
            bestTime: data.best_time || "6:00 PM",
            platform: data.platform || "instagram",
          },
        }));
        toast.success("Content generated!");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err) {
      console.error("Generation error:", err);
      // Fallback content
      setWizard((prev) => ({
        ...prev,
        result: {
          caption: getDefaultCaption(wizard.contentType!, about),
          hashtags: ["#tattoo", "#tattooartist", "#ink", "#tattoodesign", "#tattooideas"],
          visualIdea: getDefaultVisualIdea(wizard.contentType!),
          bestTime: "6:00 PM",
          platform: wizard.contentType === "email" ? "email" : "instagram",
        },
      }));
      toast.success("Content generated with templates");
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCaption = (type: ContentType, about: ContentAbout): string => {
    const captions: Record<ContentAbout, string> = {
      recent_work: "✨ Fresh ink alert!\n\nEvery piece tells a story. This one was special because [add your story].\n\n📩 DM for bookings\n📍 Houston, TX",
      promotion: "🔥 LIMITED TIME!\n\nBooking slots for [month] are now open!\n\n✅ Flash designs starting at $150\n✅ Custom pieces welcome\n\n📩 DM or link in bio to book",
      educational: "💡 Did you know?\n\n[Add your tattoo tip or fact here]\n\nDouble tap if this helped! 👆\n\n#tattootips",
      trend: "POV: The client said 'something small' 👀\n\n*shows full sleeve reference*\n\n😂 Tag someone who does this!",
      custom: "✨ [Your content here]\n\n📩 DM for inquiries",
    };
    return captions[about] || captions.custom;
  };

  const getDefaultVisualIdea = (type: ContentType): string => {
    const ideas: Record<ContentType, string> = {
      post: "Carousel: 1) Full piece shot 2) Detail close-ups 3) Before/after or process shots",
      reel: "Hook → Process clips → Reveal with trending audio → CTA overlay",
      story: "Behind-the-scenes clip with poll sticker 'Should I post this?'",
      email: "Subject line with emoji, personal greeting, clear CTA button",
      promo: "Bold graphics, countdown timer urgency, swipe-up or link",
    };
    return ideas[type] || ideas.post;
  };

  const copyToClipboard = () => {
    if (wizard.result) {
      const text = `${wizard.result.caption}\n\n${wizard.result.hashtags.join(" ")}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard!");
    }
  };

  const resetWizard = () => {
    setWizard({
      step: 1,
      contentType: null,
      contentAbout: null,
      customPrompt: "",
      result: null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">3-Step Content Creator</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Create Marketing Content</h2>
        <p className="text-muted-foreground mt-1">
          {wizard.step === 1 && "What do you want to create?"}
          {wizard.step === 2 && "What's it about?"}
          {wizard.step === 3 && (loading ? "Generating your content..." : "Your content is ready!")}
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "w-10 h-1 rounded-full transition-colors",
              wizard.step >= s ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Content Type */}
        {wizard.step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {CONTENT_TYPES.map((type) => (
              <Card
                key={type.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                  wizard.contentType === type.id && "border-primary bg-primary/5"
                )}
                onClick={() => selectContentType(type.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <type.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{type.label}</h3>
                    <p className="text-sm text-muted-foreground">{type.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Step 2: Content About */}
        {wizard.step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(1)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTENT_TOPICS.map((topic) => (
                <Card
                  key={topic.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                    wizard.contentAbout === topic.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => selectContentAbout(topic.id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <topic.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{topic.label}</h3>
                      <p className="text-sm text-muted-foreground">{topic.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {wizard.contentAbout === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3 mt-4"
              >
                <Textarea
                  placeholder="Describe your content idea... e.g., 'Promote my new microrealism flash sheet'"
                  value={wizard.customPrompt}
                  onChange={(e) => setWizard((prev) => ({ ...prev, customPrompt: e.target.value }))}
                  rows={3}
                />
                <Button
                  onClick={() => generateContent("custom")}
                  disabled={!wizard.customPrompt.trim()}
                  className="w-full"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Content
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 3: Result */}
        {wizard.step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Creating your content...</p>
              </div>
            ) : wizard.result ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToStep(2)}
                  className="mb-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change topic
                </Button>

                {/* Caption */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary">Caption</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground">
                      {wizard.result.caption}
                    </p>
                  </CardContent>
                </Card>

                {/* Hashtags */}
                <Card>
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-3">Hashtags</Badge>
                    <div className="flex flex-wrap gap-2">
                      {wizard.result.hashtags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Visual Idea */}
                <Card>
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-3">Visual Idea</Badge>
                    <p className="text-muted-foreground">
                      {wizard.result.visualIdea}
                    </p>
                  </CardContent>
                </Card>

                {/* Best Time */}
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <Badge variant="secondary">Best Time to Post</Badge>
                      <p className="text-lg font-medium text-foreground mt-1">
                        {wizard.result.bestTime}
                      </p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0">
                      {wizard.result.platform}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => generateContent()}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={resetWizard}
                  >
                    Create Another
                  </Button>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SimpleMarketingWizard;
