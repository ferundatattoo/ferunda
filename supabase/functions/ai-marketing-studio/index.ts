import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI fallback endpoint
const LOVABLE_AI_URL = "https://lovable.dev/api/chat/completions";

interface MarketingRequest {
  action: "generate_copy" | "generate_strategy" | "generate_email" | "compare_designs" | "generate_image";
  prompt?: string;
  language?: string;
  imageUrl1?: string;
  imageUrl2?: string;
  style?: string;
}

// Cosine similarity for CLIP embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Fallback to Lovable AI
async function lovableAIFallback(prompt: string, model: string = "openai/gpt-5-mini"): Promise<string> {
  console.log(`[AI-Marketing] Falling back to Lovable AI with model: ${model}`);
  
  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lovable AI failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate marketing copy with Mistral
async function generateMarketingCopy(hf: HfInference, prompt: string, language: string = "es"): Promise<string> {
  const fullPrompt = `[INST] Generate viral social media marketing copy in ${language === "es" ? "Spanish" : "English"} for a tattoo studio. Be creative, use emojis, include hashtags and a call to action.

Request: ${prompt}

Generate the post now: [/INST]`;

  try {
    console.log("[AI-Marketing] Trying Mistral for copy generation...");
    const result = await hf.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.8,
        top_p: 0.9,
      },
    });
    console.log("[AI-Marketing] Mistral success");
    return result.generated_text.replace(fullPrompt, "").trim();
  } catch (error) {
    console.error("[AI-Marketing] Mistral failed, trying fallback:", error);
    return await lovableAIFallback(
      `Generate viral social media marketing copy in ${language === "es" ? "Spanish" : "English"} for a tattoo studio: ${prompt}. Use emojis, hashtags, and a call to action.`,
      "openai/gpt-5-mini"
    );
  }
}

// Generate campaign strategy with DeepSeek
async function generateCampaignStrategy(hf: HfInference, brief: string): Promise<string> {
  const prompt = `Create a comprehensive TikTok/Instagram marketing campaign strategy for a tattoo studio.

Brief: ${brief}

Include:
1. 5 content ideas with hooks
2. Best posting times
3. Hashtag strategy
4. Call to action for each post
5. Viral tips specific to tattoo content

Strategy:`;

  try {
    console.log("[AI-Marketing] Trying DeepSeek for strategy...");
    const result = await hf.textGeneration({
      model: "deepseek-ai/deepseek-llm-7b-chat",
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
      },
    });
    console.log("[AI-Marketing] DeepSeek success");
    return result.generated_text.replace(prompt, "").trim();
  } catch (error) {
    console.error("[AI-Marketing] DeepSeek failed, trying Qwen fallback:", error);
    
    try {
      const result = await hf.textGeneration({
        model: "Qwen/Qwen2-7B-Instruct",
        inputs: prompt,
        parameters: { max_new_tokens: 500 },
      });
      return result.generated_text.replace(prompt, "").trim();
    } catch (qwenError) {
      console.error("[AI-Marketing] Qwen failed, using Lovable AI:", qwenError);
      return await lovableAIFallback(prompt, "google/gemini-2.5-flash");
    }
  }
}

// Generate personalized email with Qwen
async function generateEmail(hf: HfInference, prompt: string, language: string = "es"): Promise<string> {
  const fullPrompt = `Write a personalized marketing email for a tattoo studio client in ${language === "es" ? "Spanish" : "English"}.

Context: ${prompt}

The email should be warm, professional, and include a clear call to action. Format it properly with subject line, greeting, body, and signature.

Email:`;

  try {
    console.log("[AI-Marketing] Trying Qwen for email...");
    const result = await hf.textGeneration({
      model: "Qwen/Qwen2-7B-Instruct",
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 300,
        temperature: 0.7,
      },
    });
    console.log("[AI-Marketing] Qwen success");
    return result.generated_text.replace(fullPrompt, "").trim();
  } catch (error) {
    console.error("[AI-Marketing] Qwen failed, using Lovable AI:", error);
    return await lovableAIFallback(fullPrompt, "openai/gpt-5-mini");
  }
}

// Compare designs using CLIP embeddings
async function compareDesigns(hf: HfInference, imageUrl1: string, imageUrl2: string): Promise<{ similarity: number; analysis: string }> {
  try {
    console.log("[AI-Marketing] Comparing designs with CLIP...");
    
    // Get embeddings using CLIP with URLs directly
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

    const similarity = cosineSimilarity(
      embedding1 as number[],
      embedding2 as number[]
    );

    console.log(`[AI-Marketing] CLIP similarity: ${similarity}`);

    let analysis = "";
    if (similarity > 0.85) {
      analysis = "Los diseños son muy similares - excelente match con el estilo del artista";
    } else if (similarity > 0.7) {
      analysis = "Los diseños tienen elementos compatibles - buen potencial de adaptación";
    } else if (similarity > 0.5) {
      analysis = "Los diseños tienen algunas diferencias - requiere ajustes creativos";
    } else {
      analysis = "Los diseños son bastante diferentes - considera revisar las referencias";
    }

    return { similarity, analysis };
  } catch (error) {
    console.error("[AI-Marketing] CLIP comparison failed:", error);
    return {
      similarity: 0.5,
      analysis: "No se pudo realizar la comparación automática - revisa manualmente",
    };
  }
}

// Generate marketing image with FLUX
async function generateMarketingImage(hf: HfInference, prompt: string, style: string = "promotional"): Promise<string> {
  const enhancedPrompt = `Professional tattoo studio marketing image, ${style} style: ${prompt}. High quality, Instagram-ready, dramatic lighting, artistic composition`;

  try {
    console.log("[AI-Marketing] Generating image with FLUX...");
    const image = await hf.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: enhancedPrompt,
    });

    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log("[AI-Marketing] Image generated successfully");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("[AI-Marketing] FLUX image generation failed:", error);
    throw new Error("Image generation failed - try again later");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_TOKEN) {
      throw new Error("HUGGING_FACE_ACCESS_TOKEN not configured");
    }

    const hf = new HfInference(HF_TOKEN);
    const body: MarketingRequest = await req.json();

    console.log(`[AI-Marketing] Action: ${body.action}`);

    let result: any;

    switch (body.action) {
      case "generate_copy":
        result = {
          copy: await generateMarketingCopy(hf, body.prompt || "", body.language || "es"),
          model: "mistral",
        };
        break;

      case "generate_strategy":
        result = {
          strategy: await generateCampaignStrategy(hf, body.prompt || ""),
          model: "deepseek",
        };
        break;

      case "generate_email":
        result = {
          email: await generateEmail(hf, body.prompt || "", body.language || "es"),
          model: "qwen",
        };
        break;

      case "compare_designs":
        if (!body.imageUrl1 || !body.imageUrl2) {
          throw new Error("Two image URLs required for comparison");
        }
        result = await compareDesigns(hf, body.imageUrl1, body.imageUrl2);
        result.model = "clip";
        break;

      case "generate_image":
        result = {
          image: await generateMarketingImage(hf, body.prompt || "", body.style || "promotional"),
          model: "flux",
        };
        break;

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }

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
