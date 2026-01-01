import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, ArrowLeft, RefreshCw, Check, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Style parameters
const STYLE_PARAMS = [
  { key: "line_weight", label: "Line Weight", min: "Fine", max: "Bold" },
  { key: "contrast", label: "Contrast", min: "Soft", max: "High" },
  { key: "realism_vs_stylized", label: "Style", min: "Stylized", max: "Realistic" },
  { key: "ornament_density", label: "Detail Density", min: "Minimal", max: "Dense" },
  { key: "negative_space", label: "Negative Space", min: "Filled", max: "Open" },
  { key: "symmetry", label: "Symmetry", min: "Organic", max: "Perfect" },
  { key: "motion_flow", label: "Motion Flow", min: "Static", max: "Dynamic" },
];

interface Variant {
  id: string;
  idx: number;
  image_url: string;
  params_json: Record<string, number>;
  scores_json?: Record<string, number>;
}

interface CoDesignSession {
  id: string;
  session_id: string;
  status: string;
  current_vector_json: Record<string, number>;
}

export default function CoDesign() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codesignSession, setCodesignSession] = useState<CoDesignSession | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [lockedParams, setLockedParams] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [abMode, setAbMode] = useState(false);
  const [abPair, setAbPair] = useState<[Variant, Variant] | null>(null);

  useEffect(() => {
    if (sessionId) {
      initCodesign();
    }
  }, [sessionId]);

  const initCodesign = async () => {
    setLoading(true);
    try {
      // Check if codesign session exists
      const { data: existing } = await supabase
        .from("codesign_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (existing) {
        setCodesignSession({
          id: existing.id,
          session_id: existing.session_id,
          status: existing.status || "active",
          current_vector_json: (existing.current_vector_json as Record<string, number>) || getDefaultParams(),
        });
        setParams((existing.current_vector_json as Record<string, number>) || getDefaultParams());
        await fetchVariants(existing.id);
      } else {
        // Create new codesign session
        const defaultParams = getDefaultParams();
        const { data: created, error } = await supabase
          .from("codesign_sessions")
          .insert({
            session_id: sessionId,
            status: "active",
            current_vector_json: defaultParams,
          })
          .select()
          .single();

        if (error) throw error;
        setCodesignSession({
          id: created.id,
          session_id: created.session_id,
          status: created.status || "active",
          current_vector_json: (created.current_vector_json as Record<string, number>) || defaultParams,
        });
        setParams(defaultParams);
      }
    } catch (err) {
      console.error("Failed to init codesign:", err);
      toast({ title: "Failed to load co-design studio", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultParams = () => {
    const defaults: Record<string, number> = {};
    STYLE_PARAMS.forEach((p) => {
      defaults[p.key] = 50;
    });
    return defaults;
  };

  const fetchVariants = async (codesignId: string) => {
    const { data } = await supabase
      .from("codesign_variants")
      .select("*")
      .eq("codesign_session_id", codesignId)
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) {
      setVariants(data.map(v => ({
        id: v.id,
        idx: v.idx,
        image_url: v.image_url,
        params_json: (v.params_json as Record<string, number>) || {},
        scores_json: (v.scores_json as Record<string, number>) || undefined,
      })));
    }
  };

  const handleParamChange = async (key: string, value: number) => {
    if (lockedParams.has(key)) return;

    const newParams = { ...params, [key]: value };
    setParams(newParams);

    // Log event
    await supabase.from("codesign_events").insert({
      codesign_session_id: codesignSession?.id,
      event_type: "slider_change",
      payload_json: { key, value },
    });
  };

  const toggleLock = (key: string) => {
    const newLocked = new Set(lockedParams);
    if (newLocked.has(key)) {
      newLocked.delete(key);
    } else {
      newLocked.add(key);
    }
    setLockedParams(newLocked);
  };

  const generateVariants = async () => {
    if (!codesignSession) return;
    setGenerating(true);

    try {
      // Update session with current params
      await supabase
        .from("codesign_sessions")
        .update({ current_vector_json: params })
        .eq("id", codesignSession.id);

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-compiler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "codesign_generate",
            session_id: sessionId,
            codesign_id: codesignSession.id,
            params,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.variants) {
          setVariants(data.variants);
        } else {
          await fetchVariants(codesignSession.id);
        }
        toast({ title: "Variants generated!" });
      }
    } catch (err) {
      console.error("Failed to generate:", err);
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const startABChoice = () => {
    if (variants.length < 2) return;
    const shuffled = [...variants].sort(() => Math.random() - 0.5);
    setAbPair([shuffled[0], shuffled[1]]);
    setAbMode(true);
  };

  const handleABChoice = async (chosenIdx: number) => {
    if (!abPair || !codesignSession) return;

    const chosen = abPair[chosenIdx];
    const rejected = abPair[1 - chosenIdx];

    // Log AB choice
    await supabase.from("codesign_events").insert({
      codesign_session_id: codesignSession.id,
      event_type: "ab_choice",
      payload_json: {
        chosen_id: chosen.id,
        rejected_id: rejected.id,
      },
    });

    // Update preference model (simplified - just move toward chosen params)
    const newParams = { ...params };
    Object.keys(chosen.params_json || {}).forEach((key) => {
      if (!lockedParams.has(key)) {
        const chosenVal = chosen.params_json[key] ?? 50;
        newParams[key] = Math.round((params[key] + chosenVal) / 2);
      }
    });
    setParams(newParams);

    // Next pair or exit AB mode
    const remaining = variants.filter((v) => v.id !== chosen.id && v.id !== rejected.id);
    if (remaining.length >= 2) {
      setAbPair([remaining[0], remaining[1]]);
    } else {
      setAbMode(false);
      setAbPair(null);
      toast({ title: "Preferences updated!" });
    }
  };

  const lockDirection = async () => {
    if (!selectedVariant || !codesignSession) return;

    const variant = variants.find((v) => v.id === selectedVariant);
    if (!variant) return;

    // Log lock event
    await supabase.from("codesign_events").insert({
      codesign_session_id: codesignSession.id,
      event_type: "lock",
      payload_json: { variant_id: variant.id },
    });

    toast({ title: "Direction locked! Generating final sketch..." });

    // Navigate to finalize
    navigate(`/design/finalize?session=${sessionId}&variant=${variant.id}`);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No session specified</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-xl font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Neural Co-Design Studio
              </h1>
              <p className="text-sm text-muted-foreground">
                Fine-tune your design with AI preference learning
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={startABChoice} disabled={variants.length < 2}>
              A/B Compare
            </Button>
            <Button onClick={generateVariants} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Left: Style Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Style Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {STYLE_PARAMS.map((param) => (
                <div key={param.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{param.label}</span>
                    <button
                      onClick={() => toggleLock(param.key)}
                      className={`p-1 rounded ${
                        lockedParams.has(param.key)
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">{param.min}</span>
                    <Slider
                      value={[params[param.key] ?? 50]}
                      onValueChange={([v]) => handleParamChange(param.key, v)}
                      min={0}
                      max={100}
                      step={1}
                      disabled={lockedParams.has(param.key)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {param.max}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Variants / AB Mode */}
        <div className="lg:col-span-2">
          {abMode && abPair ? (
            <Card>
              <CardHeader>
                <CardTitle>Which feels more YOU?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {abPair.map((variant, idx) => (
                    <motion.button
                      key={variant.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleABChoice(idx)}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-border hover:border-purple-500 transition-colors"
                    >
                      <img
                        src={variant.image_url || "/placeholder.svg"}
                        alt={`Option ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <Badge variant="secondary">Option {idx + 1}</Badge>
                      </div>
                    </motion.button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => {
                    setAbMode(false);
                    setAbPair(null);
                  }}
                >
                  Skip A/B
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Generated Variants</h2>
                {selectedVariant && (
                  <Button onClick={lockDirection}>
                    <Check className="w-4 h-4 mr-2" />
                    Lock This Direction
                  </Button>
                )}
              </div>

              {variants.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Adjust the sliders and click Generate to create variants
                    </p>
                    <Button onClick={generateVariants} disabled={generating}>
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Generate Variants
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {variants.map((variant) => (
                    <motion.button
                      key={variant.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                        selectedVariant === variant.id
                          ? "border-purple-500 ring-2 ring-purple-500/30"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <img
                        src={variant.image_url || "/placeholder.svg"}
                        alt={`Variant ${variant.idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {variant.scores_json && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {Math.round((variant.scores_json.style_alignment_score || 0) * 100)}%
                          </Badge>
                        </div>
                      )}
                      {selectedVariant === variant.id && (
                        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
