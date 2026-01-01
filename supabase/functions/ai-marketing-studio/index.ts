import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI endpoint (correct gateway URL)
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface MarketingRequest {
  action: 
    | "generate_copy" 
    | "generate_strategy" 
    | "generate_email" 
    | "compare_designs" 
    | "generate_image"
    | "generate_caption"
    | "analyze_competitor"
    | "optimize_hashtags"
    | "generate_hooks"
    | "ab_test_copy"
    | "quick_generate";
  prompt?: string;
  language?: string;
  imageUrl1?: string;
  imageUrl2?: string;
  style?: string;
  platform?: "tiktok" | "instagram" | "both";
  variants?: number;
  content_type?: string;
  content_about?: string;
  custom_prompt?: string;
}

// Cosine similarity for embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Lovable AI with model selection and proper authorization
async function lovableAI(prompt: string, model: string = "openai/gpt-5-mini"): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }
  
  console.log(`[AI-Marketing] Using Lovable AI: ${model}`);
  
  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI-Marketing] Lovable AI error (${response.status}): ${errorText.slice(0, 200)}`);
    throw new Error(`Lovable AI failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate viral marketing copy
async function generateMarketingCopy(hf: HfInference, prompt: string, language: string = "es", platform: string = "instagram"): Promise<string> {
  const platformGuidelines = {
    instagram: "Keep it aesthetic, use line breaks, max 2200 chars, strategic emoji placement",
    tiktok: "Punchy, conversational, hook in first line, trending phrases",
    both: "Adaptable for both platforms, multiple hooks included"
  };

  const systemPrompt = `You are a viral social media marketing expert for tattoo studios.
Platform: ${platform}
Guidelines: ${platformGuidelines[platform as keyof typeof platformGuidelines] || platformGuidelines.instagram}
Language: ${language === "es" ? "Spanish" : "English"}

Generate viral social media copy with:
- Attention-grabbing hook
- Emotional storytelling
- Clear CTA
- Strategic hashtags (5-10)
- Emojis for visual breaks

Request: ${prompt}`;

  try {
    return await lovableAI(systemPrompt, "openai/gpt-5-mini");
  } catch (error) {
    console.error("[AI-Marketing] Copy generation failed:", error);
    
    // Fallback to HuggingFace
    const result = await hf.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      inputs: `[INST] ${systemPrompt} [/INST]`,
      parameters: { max_new_tokens: 300, temperature: 0.8 },
    });
    return result.generated_text.split("[/INST]").pop()?.trim() || "";
  }
}

// Generate comprehensive campaign strategy
async function generateCampaignStrategy(prompt: string): Promise<any> {
  const systemPrompt = `You are a tattoo studio marketing strategist. Create a comprehensive 30-day content strategy.

Brief: ${prompt}

Respond in JSON format:
{
  "overview": "Campaign summary",
  "goals": ["goal1", "goal2"],
  "content_pillars": [
    { "name": "pillar", "percentage": 30, "content_types": ["type1"] }
  ],
  "weekly_schedule": [
    { "day": "Monday", "time": "12:00", "content_type": "string", "hook": "string" }
  ],
  "hashtag_strategy": {
    "primary": ["5 main hashtags"],
    "secondary": ["10 niche hashtags"],
    "trending_rotation": ["5 trending to test"]
  },
  "content_ideas": [
    { "title": "string", "platform": "tiktok|instagram", "hook": "string", "cta": "string", "viral_potential": 85 }
  ],
  "kpis": { "views_target": 50000, "engagement_rate": 5, "booking_leads": 10 }
}`;

  try {
    const response = await lovableAI(systemPrompt, "google/gemini-2.5-flash");
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { strategy: response };
  } catch (error) {
    console.error("[AI-Marketing] Strategy generation failed:", error);
    return {
      overview: "Error generating strategy",
      content_ideas: [
        { title: "Process Video", platform: "instagram", hook: "Watch this transformation...", cta: "Book now", viral_potential: 75 }
      ]
    };
  }
}

// Generate personalized email sequences
async function generateEmail(prompt: string, language: string = "es"): Promise<any> {
  const systemPrompt = `You are an email marketing expert for luxury tattoo studios.
Language: ${language === "es" ? "Spanish" : "English"}

Context: ${prompt}

Generate a 3-email sequence in JSON format:
{
  "sequence": [
    {
      "email_number": 1,
      "subject_line": "string",
      "preview_text": "string",
      "body": "string (with HTML formatting)",
      "cta_text": "string",
      "cta_url": "#book",
      "send_delay_days": 0
    }
  ],
  "a_b_subjects": ["variant1", "variant2"]
}`;

  try {
    const response = await lovableAI(systemPrompt, "openai/gpt-5-mini");
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { email: response };
  } catch (error) {
    console.error("[AI-Marketing] Email generation failed:", error);
    return { email: "Error generating email sequence" };
  }
}

// Auto-generate video captions with timing
async function generateCaptions(prompt: string, platform: string = "tiktok"): Promise<any> {
  const systemPrompt = `You are a viral video caption expert.
Platform: ${platform}
Video description: ${prompt}

Generate engaging captions in JSON format:
{
  "hook_options": [
    { "text": "string", "style": "question|shock|curiosity|relatable", "viral_score": 85 }
  ],
  "caption": "Full caption with line breaks and emojis",
  "hashtags": {
    "primary": ["5 main hashtags"],
    "trending": ["3 currently trending"],
    "niche": ["5 tattoo-specific"]
  },
  "cta_options": ["CTA 1", "CTA 2"],
  "best_posting_times": ["12:00 PM", "6:00 PM", "9:00 PM"],
  "engagement_prediction": {
    "estimated_views": "10K-50K",
    "engagement_rate": 8.5,
    "save_rate": 3.2
  }
}`;

  try {
    const response = await lovableAI(systemPrompt, "openai/gpt-5-mini");
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { caption: response };
  } catch (error) {
    console.error("[AI-Marketing] Caption generation failed:", error);
    return { caption: "Error generating captions" };
  }
}

// Analyze competitor content
async function analyzeCompetitor(prompt: string): Promise<any> {
  const systemPrompt = `You are a competitive intelligence analyst for tattoo marketing.

Analyze this competitor: ${prompt}

Provide analysis in JSON format:
{
  "summary": "Brief overview of their strategy",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "content_style": {
    "primary_formats": ["reels", "carousel"],
    "posting_frequency": "daily",
    "engagement_tactics": ["tactic1"]
  },
  "opportunities": ["What you can do better"],
  "recommended_differentiators": ["How to stand out"],
  "content_gaps": ["Topics they miss that you can cover"]
}`;

  try {
    const response = await lovableAI(systemPrompt, "google/gemini-2.5-flash");
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { analysis: response };
  } catch (error) {
    console.error("[AI-Marketing] Competitor analysis failed:", error);
    return { analysis: "Error analyzing competitor" };
  }
}

// Optimize hashtag strategy
async function optimizeHashtags(prompt: string, platform: string = "instagram"): Promise<any> {
  const systemPrompt = `You are a hashtag optimization expert for ${platform}.

Content: ${prompt}

Generate optimized hashtag strategy in JSON format:
{
  "primary_hashtags": {
    "tags": ["#tag1", "#tag2"],
    "reasoning": "Why these work"
  },
  "secondary_hashtags": {
    "tags": ["#tag1", "#tag2"],
    "reasoning": "Supporting reach"
  },
  "niche_hashtags": {
    "tags": ["#tattoo specific tags"],
    "reasoning": "Targeted audience"
  },
  "trending_now": {
    "tags": ["Currently viral hashtags"],
    "expires_in": "24-48 hours"
  },
  "hashtag_sets": [
    { "name": "Set A - Reach", "tags": ["30 hashtags for reach"] },
    { "name": "Set B - Engagement", "tags": ["30 hashtags for engagement"] }
  ],
  "banned_hashtags": ["Hashtags to avoid"],
  "optimal_count": 15
}`;

  try {
    const response = await lovableAI(systemPrompt, "openai/gpt-5-mini");
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { hashtags: response };
  } catch (error) {
    console.error("[AI-Marketing] Hashtag optimization failed:", error);
    return { hashtags: "Error optimizing hashtags" };
  }
}

// Generate viral hooks
async function generateHooks(prompt: string, variants: number = 5): Promise<any> {
  const systemPrompt = `You are a viral content hook specialist.

Content topic: ${prompt}

Generate ${variants} viral hooks in JSON format:
{
  "hooks": [
    {
      "text": "Hook text",
      "type": "question|shock|curiosity|story|relatable|controversial",
      "platform_best_for": "tiktok|instagram|both",
      "viral_score": 85,
      "psychological_trigger": "FOMO|curiosity|social_proof|etc",
      "use_case": "When to use this hook"
    }
  ],
  "best_performing_type": "curiosity",
  "tips": ["Pro tips for hooks"]
}`;

  try {
    const response = await lovableAI(systemPrompt, "openai/gpt-5-mini");
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { hooks: response };
  } catch (error) {
    console.error("[AI-Marketing] Hook generation failed:", error);
    return { hooks: "Error generating hooks" };
  }
}

// A/B test copy variants
async function abTestCopy(prompt: string, variants: number = 3): Promise<any> {
  const systemPrompt = `You are an A/B testing expert for social media marketing.

Base concept: ${prompt}

Generate ${variants} copy variants for A/B testing in JSON format:
{
  "variants": [
    {
      "id": "A",
      "copy": "Full post copy",
      "hook": "Opening hook",
      "cta": "Call to action",
      "tone": "playful|professional|urgent|casual",
      "predicted_performance": {
        "engagement_rate": 8.5,
        "click_rate": 2.1,
        "save_rate": 3.0
      },
      "best_for": "Audience segment this works best for"
    }
  ],
  "testing_recommendation": {
    "test_duration_hours": 24,
    "sample_size": "minimum 1000 impressions",
    "primary_metric": "engagement_rate"
  }
}`;

  try {
    const response = await lovableAI(systemPrompt, "google/gemini-2.5-flash");
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { variants: response };
  } catch (error) {
    console.error("[AI-Marketing] A/B test generation failed:", error);
    return { variants: "Error generating variants" };
  }
}

// Quick generate for SimpleMarketingWizard
async function quickGenerateContent(
  contentType: string,
  contentAbout: string,
  customPrompt?: string,
  language: string = "es"
): Promise<any> {
  const contentTypeLabels: Record<string, string> = {
    post: "Instagram post/carousel",
    reel: "Reel/TikTok video",
    story: "Instagram Story",
    email: "Email newsletter",
    promo: "Promotional campaign",
  };

  const topicPrompts: Record<string, string> = {
    recent_work: "Showcase a recently completed tattoo piece",
    promotion: "Create a limited-time booking offer",
    educational: "Share tattoo aftercare tips or industry knowledge",
    trend: "Ride a current viral trend in the tattoo community",
    custom: customPrompt || "Create engaging content",
  };

  const lang = language === "es" ? "Spanish" : "English";
  const typeLabel = contentTypeLabels[contentType] || contentTypeLabels.post;
  const topicDesc = topicPrompts[contentAbout] || topicPrompts.custom;

  const systemPrompt = `You are a viral social media marketing expert for tattoo artists.

Create content for: ${typeLabel}
Topic: ${topicDesc}
Language: ${lang}

Respond in JSON format:
{
  "caption": "Full caption with emojis and line breaks (max 300 chars for stories, 2200 for posts)",
  "hashtags": ["#hashtag1", "#hashtag2", "...10 relevant hashtags"],
  "visual_idea": "Brief description of what visuals to use",
  "best_time": "Best posting time like '6:00 PM'",
  "platform": "instagram or tiktok based on content type"
}`;

  try {
    const response = await lovableAI(systemPrompt, "openai/gpt-5-mini");
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        caption: parsed.caption,
        hashtags: parsed.hashtags || [],
        visual_idea: parsed.visual_idea,
        best_time: parsed.best_time || "6:00 PM",
        platform: parsed.platform || (contentType === "reel" ? "tiktok" : "instagram"),
        model: "gpt-5-mini",
      };
    }
    
    return { success: true, content: response, model: "gpt-5-mini" };
  } catch (error) {
    console.error("[AI-Marketing] Quick generate failed:", error);
    
    // Return fallback content
    const fallbacks: Record<string, any> = {
      recent_work: {
        caption: "✨ Fresh ink!\n\nEvery piece tells a story. This one was special.\n\n📩 DM for bookings",
        hashtags: ["#tattoo", "#tattooartist", "#ink", "#tattoodesign", "#freshink"],
        visual_idea: "High-quality photo of the finished piece with good lighting",
        best_time: "6:00 PM",
        platform: "instagram",
      },
      promotion: {
        caption: "🔥 LIMITED TIME!\n\nBooking slots now open!\n\n✅ Flash designs from $150\n📩 DM to book",
        hashtags: ["#tattoo", "#flashtattoo", "#booking", "#tattooartist", "#limitedoffer"],
        visual_idea: "Flash sheet or booking calendar visual",
        best_time: "12:00 PM",
        platform: "instagram",
      },
      educational: {
        caption: "💡 Aftercare tip:\n\nKeep it moisturized but don't overdo it!\n\nSave this for later 👆",
        hashtags: ["#tattooaftercare", "#tattooheling", "#tattootips", "#tattoocare", "#newink"],
        visual_idea: "Infographic or before/after healing shots",
        best_time: "10:00 AM",
        platform: "instagram",
      },
      trend: {
        caption: "POV: Client says 'something small' 👀\n\n*shows full sleeve reference*\n\n😂 Tag someone!",
        hashtags: ["#tattoo", "#fyp", "#viral", "#tattooartist", "#tattoofun"],
        visual_idea: "Reaction video or funny skit format",
        best_time: "8:00 PM",
        platform: "tiktok",
      },
      custom: {
        caption: "✨ Check this out!\n\n📩 DM for inquiries",
        hashtags: ["#tattoo", "#tattooartist", "#ink", "#art", "#custom"],
        visual_idea: "High-quality visual matching your concept",
        best_time: "6:00 PM",
        platform: "instagram",
      },
    };

    return {
      success: true,
      ...fallbacks[contentAbout] || fallbacks.custom,
      model: "fallback",
    };
  }
}

// Compare designs using CLIP
async function compareDesigns(hf: HfInference, imageUrl1: string, imageUrl2: string): Promise<any> {
  try {
    console.log("[AI-Marketing] Comparing designs with CLIP...");
    
    const [embedding1, embedding2] = await Promise.all([
      hf.featureExtraction({
        model: "openai/clip-vit-base-patch32",
        inputs: imageUrl1,
      }),
      hf.featureExtraction({
        model: "openai/clip-vit-base-patch32",
        inputs: imageUrl2,
      }),
    ]);

    const similarity = cosineSimilarity(embedding1 as number[], embedding2 as number[]);

    let analysis = "";
    let recommendation = "";
    
    if (similarity > 0.85) {
      analysis = "Los diseños son muy similares - excelente match con el estilo del artista";
      recommendation = "Perfecto para portfolio consistency. Procede con confianza.";
    } else if (similarity > 0.7) {
      analysis = "Los diseños tienen elementos compatibles - buen potencial de adaptación";
      recommendation = "Considera ajustar algunos elementos para mejor coherencia visual.";
    } else if (similarity > 0.5) {
      analysis = "Los diseños tienen algunas diferencias - requiere ajustes creativos";
      recommendation = "Evalúa si el cliente está abierto a adaptaciones del diseño.";
    } else {
      analysis = "Los diseños son bastante diferentes - considera revisar las referencias";
      recommendation = "Sugiere una consulta para alinear expectativas del cliente.";
    }

    return { similarity, analysis, recommendation, model: "clip" };
  } catch (error) {
    console.error("[AI-Marketing] CLIP comparison failed:", error);
    return {
      similarity: 0.5,
      analysis: "No se pudo realizar la comparación automática",
      recommendation: "Revisa manualmente las referencias",
      model: "fallback"
    };
  }
}

// Generate marketing image with FLUX
async function generateMarketingImage(hf: HfInference, prompt: string, style: string = "promotional"): Promise<string> {
  const stylePrompts = {
    promotional: "Professional tattoo studio marketing, clean composition, dramatic lighting",
    aesthetic: "Moody aesthetic, dark tones, artistic shadows, Instagram-worthy",
    vibrant: "Vibrant colors, high energy, attention-grabbing, TikTok style",
    minimalist: "Minimalist design, negative space, elegant, luxury feel"
  };

  const enhancedPrompt = `${stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.promotional}: ${prompt}. High quality, social media ready`;

  try {
    console.log("[AI-Marketing] Generating image with FLUX...");
    const image = await hf.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: enhancedPrompt,
    });

    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("[AI-Marketing] Image generation failed:", error);
    throw new Error("Image generation failed");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;
    
    const body: MarketingRequest = await req.json();
    console.log(`[AI-Marketing] Action: ${body.action}`);

    let result: any;

    switch (body.action) {
      case "generate_copy":
        if (!hf) throw new Error("HuggingFace not configured");
        result = {
          copy: await generateMarketingCopy(hf, body.prompt || "", body.language || "es", body.platform || "instagram"),
          model: "gpt-5-mini/mistral",
        };
        break;

      case "generate_strategy":
        result = {
          ...await generateCampaignStrategy(body.prompt || ""),
          model: "gemini-flash",
        };
        break;

      case "generate_email":
        result = {
          ...await generateEmail(body.prompt || "", body.language || "es"),
          model: "gpt-5-mini",
        };
        break;

      case "generate_caption":
        result = {
          ...await generateCaptions(body.prompt || "", body.platform || "tiktok"),
          model: "gpt-5-mini",
        };
        break;

      case "analyze_competitor":
        result = {
          ...await analyzeCompetitor(body.prompt || ""),
          model: "gemini-flash",
        };
        break;

      case "optimize_hashtags":
        result = {
          ...await optimizeHashtags(body.prompt || "", body.platform || "instagram"),
          model: "gpt-5-mini",
        };
        break;

      case "generate_hooks":
        result = {
          ...await generateHooks(body.prompt || "", body.variants || 5),
          model: "gpt-5-mini",
        };
        break;

      case "ab_test_copy":
        result = {
          ...await abTestCopy(body.prompt || "", body.variants || 3),
          model: "gemini-flash",
        };
        break;

      case "compare_designs":
        if (!hf) throw new Error("HuggingFace not configured for image comparison");
        if (!body.imageUrl1 || !body.imageUrl2) {
          throw new Error("Two image URLs required");
        }
        result = await compareDesigns(hf, body.imageUrl1, body.imageUrl2);
        break;

      case "generate_image":
        if (!hf) throw new Error("HuggingFace not configured for image generation");
        result = {
          image: await generateMarketingImage(hf, body.prompt || "", body.style || "promotional"),
          model: "flux-schnell",
        };
        break;

      case "quick_generate":
        result = await quickGenerateContent(
          body.content_type || "post",
          body.content_about || "recent_work",
          body.custom_prompt,
          body.language || "es"
        );
        break;

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

    console.log(`[AI-Marketing] Success: ${body.action}`);
    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[AI-Marketing] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
