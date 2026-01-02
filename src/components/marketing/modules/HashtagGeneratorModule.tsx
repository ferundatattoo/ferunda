import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Hash, Sparkles, Copy, Check, Users, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Hashtag {
  tag: string;
  reach: string;
  competition: "low" | "medium" | "high";
  relevance: number;
}

const defaultHashtags: Hashtag[] = [
  { tag: "#tattoo", reach: "89M", competition: "high", relevance: 95 },
  { tag: "#tattooart", reach: "42M", competition: "high", relevance: 92 },
  { tag: "#inked", reach: "28M", competition: "high", relevance: 88 },
  { tag: "#tattooist", reach: "12M", competition: "medium", relevance: 90 },
  { tag: "#tattoodesign", reach: "8.5M", competition: "medium", relevance: 85 },
  { tag: "#customtattoo", reach: "2.1M", competition: "low", relevance: 94 },
  { tag: "#finelinetattoo", reach: "1.8M", competition: "low", relevance: 96 },
  { tag: "#minimalisttattoo", reach: "1.2M", competition: "low", relevance: 88 },
];

const competitionColors = {
  low: "bg-green-500/20 text-green-500 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  high: "bg-red-500/20 text-red-500 border-red-500/30",
};

const HashtagGeneratorModule = () => {
  const [topic, setTopic] = useState("");
  const [hashtags, setHashtags] = useState<Hashtag[]>(defaultHashtags);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-marketing-nexus", {
        body: {
          action: "generate_hashtags",
          payload: {
            topic: topic.trim(),
            count: 15,
          },
        },
      });

      if (error) throw error;

      if (data?.success && data?.data?.hashtags) {
        const newHashtags: Hashtag[] = data.data.hashtags.map((h: any) => ({
          tag: h.tag.startsWith("#") ? h.tag : `#${h.tag}`,
          reach: h.reach || `${(Math.random() * 10 + 1).toFixed(1)}M`,
          competition: h.competition || (Math.random() > 0.6 ? "high" : Math.random() > 0.3 ? "medium" : "low"),
          relevance: h.relevance || Math.floor(Math.random() * 20 + 80),
        }));
        setHashtags(newHashtags);
        toast.success("Hashtags generated successfully");
      }
    } catch (error) {
      console.error("Error generating hashtags:", error);
      toast.error("Error generating hashtags");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(selectedTags.join(" "));
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hashtag Generator</h1>
        <p className="text-muted-foreground">Find the perfect hashtags for your content</p>
      </div>

      {/* Generator Input */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic or keywords (e.g., 'fine line tattoo', 'traditional flash')"
                className="w-full"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()} className="gap-2">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hashtag List */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                Suggested Hashtags
              </CardTitle>
              <CardDescription>Click to select hashtags for your post</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hashtags.map((hashtag) => (
                  <button
                    key={hashtag.tag}
                    onClick={() => toggleTag(hashtag.tag)}
                    className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between ${
                      selectedTags.includes(hashtag.tag)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{hashtag.tag}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {hashtag.reach}
                      </div>
                      <Badge variant="outline" className={competitionColors[hashtag.competition]}>
                        {hashtag.competition}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        {hashtag.relevance}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Hashtags */}
        <div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 sticky top-4">
            <CardHeader>
              <CardTitle>Selected ({selectedTags.length}/30)</CardTitle>
              <CardDescription>Click to remove</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTags.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button onClick={copyToClipboard} className="w-full gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy All"}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hashtags selected
                </p>
              )}

              {/* Tips */}
              <div className="pt-4 border-t border-border/50 space-y-2">
                <p className="text-xs font-medium">Tips:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use 5-10 highly relevant hashtags</li>
                  <li>• Mix high and low competition tags</li>
                  <li>• Include niche-specific hashtags</li>
                  <li>• Avoid banned or spammy hashtags</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HashtagGeneratorModule;
