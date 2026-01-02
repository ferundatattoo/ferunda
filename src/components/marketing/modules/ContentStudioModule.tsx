import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Sparkles, Copy, Check, RefreshCw } from "lucide-react";

const platforms = [
  { id: "instagram", label: "Instagram", maxLength: 2200 },
  { id: "tiktok", label: "TikTok", maxLength: 300 },
  { id: "facebook", label: "Facebook", maxLength: 63206 },
  { id: "twitter", label: "Twitter/X", maxLength: 280 },
];

const tones = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "humorous", label: "Humorous" },
  { id: "inspirational", label: "Inspirational" },
  { id: "educational", label: "Educational" },
];

const ContentStudioModule = () => {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("professional");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockContent = `✨ Transform your look with custom ink! ✨

Our talented artists bring your vision to life with precision and creativity. From intricate fine-line work to bold traditional pieces, we've got you covered.

📅 Book your consultation today
🎨 Custom designs crafted just for you
💯 Premium quality guaranteed

Ready to start your tattoo journey? Link in bio!

#tattoo #ink #tattooart #customtattoo #tattooartist #inked #bodyart #tattoodesign`;

    setGeneratedContent(mockContent);
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedPlatform = platforms.find(p => p.id === platform);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Studio</h1>
        <p className="text-muted-foreground">Create AI-powered content for your social media</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Content Brief
            </CardTitle>
            <CardDescription>Describe what you want to create</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platform & Tone Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">What should this post be about?</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Promote our new fine-line tattoo collection, highlight our skilled artists..."
                className="min-h-[120px] resize-none"
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={!prompt.trim() || isGenerating}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Generated Content
                </CardTitle>
                <CardDescription>
                  {selectedPlatform && `Optimized for ${selectedPlatform.label}`}
                </CardDescription>
              </div>
              {generatedContent && (
                <Badge variant="outline">
                  {generatedContent.length}/{selectedPlatform?.maxLength}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedContent ? (
              <>
                <div className="p-4 rounded-lg bg-background border border-border min-h-[200px]">
                  <p className="text-sm whitespace-pre-wrap">{generatedContent}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button variant="outline" onClick={handleGenerate} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button className="flex-1">
                    Schedule Post
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
                Generated content will appear here
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentStudioModule;
