import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, Lock, Unlock, Dna, Palette, Sparkles, 
  RefreshCw, CheckCircle, Upload, Image 
} from "lucide-react";

interface StyleToken {
  id: string;
  token_key: string;
  vector_json: number[];
  semantic_label: string;
  min_value: number;
  max_value: number;
  current_value?: number;
  locked?: boolean;
}

interface StyleModel {
  id: string;
  status: string;
  model_type: string;
  provider: string;
  model_ref: string;
  training_progress: number;
  created_at: string;
}

interface Props {
  artistId: string;
}

const ArtistStyleDNA = ({ artistId }: Props) => {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<StyleToken[]>([]);
  const [models, setModels] = useState<StyleModel[]>([]);
  const [tokenizing, setTokenizing] = useState(false);
  const [trainingLora, setTrainingLora] = useState(false);
  const [portfolioCount, setPortfolioCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [artistId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch style tokens
      const { data: tokenData } = await supabase
        .from("style_tokens")
        .select("*")
        .eq("artist_id", artistId);
      
      setTokens((tokenData || []).map((t: any) => ({
        ...t,
        vector_json: t.vector_json as number[] || [],
      })));

      // Fetch style models
      const { data: modelData } = await supabase
        .from("artist_style_models")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      
      setModels((modelData || []).map((m: any) => ({
        ...m,
        training_progress: m.training_progress ?? 0,
      })));

      // Count portfolio assets
      const { count } = await supabase
        .from("artist_portfolio_assets")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", artistId);
      
      setPortfolioCount(count || 0);
    } catch (err) {
      console.error("Error fetching style data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenize = async () => {
    setTokenizing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/style-dna`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "tokenize_portfolio",
            artist_id: artistId,
            workspace_id: workspace.workspaceId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({ title: `Style DNA extracted: ${data.tokens_count} tokens` });
        fetchData();
      } else {
        toast({ title: "Tokenization failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error extracting style", variant: "destructive" });
    } finally {
      setTokenizing(false);
    }
  };

  const handleTrainLoRA = async () => {
    if (portfolioCount < 10) {
      toast({ 
        title: "Need more portfolio images", 
        description: "Upload at least 10 images to train a LoRA model",
        variant: "destructive" 
      });
      return;
    }

    setTrainingLora(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/style-dna`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "train_lora",
            artist_id: artistId,
            workspace_id: workspace.workspaceId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({ title: data.message || "LoRA training started" });
        fetchData();
      } else {
        toast({ title: "Training failed to start", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error starting training", variant: "destructive" });
    } finally {
      setTrainingLora(false);
    }
  };

  const handleTokenUpdate = async (tokenKey: string, value: number, locked: boolean) => {
    await supabase
      .from("style_tokens")
      .update({ current_value: value, locked })
      .eq("artist_id", artistId)
      .eq("token_key", tokenKey);

    setTokens(prev => 
      prev.map(t => 
        t.token_key === tokenKey ? { ...t, current_value: value, locked } : t
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Dna className="w-6 h-6 text-purple-500" />
            Artist Style DNA
          </h2>
          <p className="text-muted-foreground">
            Extract and control your unique artistic style
          </p>
        </div>
        <Badge variant="outline">
          <Image className="w-3 h-3 mr-1" />
          {portfolioCount} portfolio images
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Style Tokens
            </CardTitle>
            <CardDescription>
              Extract mathematical representation of your style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTokenize} 
              disabled={tokenizing || portfolioCount < 5}
              className="w-full"
            >
              {tokenizing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {tokens.length > 0 ? "Refresh Style DNA" : "Build Style DNA"}
            </Button>
            {portfolioCount < 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                Upload at least 5 portfolio images to extract style
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              LoRA Model
            </CardTitle>
            <CardDescription>
              Train a custom AI model with your exact style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTrainLoRA} 
              disabled={trainingLora || portfolioCount < 10}
              variant="secondary"
              className="w-full"
            >
              {trainingLora ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Train Style Model
            </Button>
            {portfolioCount < 10 && (
              <p className="text-xs text-muted-foreground mt-2">
                Need at least 10 portfolio images for LoRA training
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Style Tokens */}
      {tokens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Style Parameters</CardTitle>
            <CardDescription>
              Fine-tune or lock axes to control AI generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tokens.map((token) => (
              <div key={token.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm capitalize">
                      {token.token_key.replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {token.semantic_label}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTokenUpdate(
                      token.token_key,
                      token.current_value ?? 50,
                      !token.locked
                    )}
                    className={token.locked ? "text-amber-500" : "text-muted-foreground"}
                  >
                    {token.locked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[token.current_value ?? 50]}
                    onValueChange={([v]) => handleTokenUpdate(token.token_key, v, token.locked ?? false)}
                    min={token.min_value}
                    max={token.max_value}
                    step={1}
                    disabled={token.locked}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-mono text-sm">
                    {token.current_value ?? 50}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Style Models */}
      {models.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trained Models</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {models.map((model) => (
              <div key={model.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div>
                  <p className="font-medium text-sm">{model.model_type.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                </div>
                <div className="flex items-center gap-3">
                  {model.status === "training" ? (
                    <div className="w-32">
                      <Progress value={model.training_progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {model.training_progress}%
                      </p>
                    </div>
                  ) : model.status === "ready" ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline">{model.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArtistStyleDNA;
