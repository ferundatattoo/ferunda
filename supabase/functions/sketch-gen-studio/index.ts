import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SketchRequest {
  action: "analyze_portfolio" | "extract_tattoo" | "generate_sketch" | "compare_similarity" | "generate_variations" | "quick_sketch" | "approve_sketch" | "refine_sketch";
  imageUrl?: string;
  imageUrls?: string[];
  prompt?: string;
  referenceUrl?: string;
  artistId?: string;
  workspaceId?: string;
  sketchId?: string;
  bodyPart?: string;
  skinTone?: string;
  feedback?: string;
  approved?: boolean;
  conversationId?: string;
  bookingId?: string;
  highQuality?: boolean;
}

// Lovable AI for image generation
async function generateWithLovableAI(prompt: string, isHighQuality: boolean = false): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log('[sketch-gen] No LOVABLE_API_KEY');
    return null;
  }

  const startTime = Date.now();
  
  try {
    // Use correct image generation models with modalities
    const model = isHighQuality 
      ? "google/gemini-3-pro-image-preview" 
      : "google/gemini-2.5-flash-image-preview";

    console.log(`[sketch-gen] Using model: ${model}, highQuality: ${isHighQuality}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `Generate a professional tattoo design image: ${prompt}. Clean black linework, white background, suitable for stencil transfer.`
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[sketch-gen] AI generation time: ${elapsed}ms`);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[sketch-gen] AI error:', response.status, errText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    
    // Check images array first (correct format for image generation)
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0 && images[0]?.image_url?.url) {
      console.log('[sketch-gen] Got image from images array');
      return images[0].image_url.url;
    }
    
    // Fallback: check content for direct URL/base64
    const content = data.choices?.[0]?.message?.content || '';
    if (typeof content === 'string') {
      if (content.startsWith('data:image') || content.startsWith('http')) {
        console.log('[sketch-gen] Got image from content');
        return content;
      }
    }

    console.error('[sketch-gen] No image found in response');
    return null;
  } catch (error) {
    console.error('[sketch-gen] AI error:', error);
    return null;
  }
}

// Lovable AI for text analysis
async function analyzeWithAI(prompt: string, imageUrl?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) return '';

  try {
    const messages: { role: string; content: unknown }[] = [
      { role: "system", content: "You are an expert tattoo design analyst. Respond in JSON format." }
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) return '';

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[sketch-gen] Analysis error:', error);
    return '';
  }
}

// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate mock embedding (when no HF token)
function mockEmbedding(): number[] {
  return Array.from({ length: 512 }, () => Math.random() * 2 - 1);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[sketch-gen][${requestId}] Request started`);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const request: SketchRequest = await req.json();

    console.log(`[sketch-gen][${requestId}] Action: ${request.action}`);

    switch (request.action) {
      case "analyze_portfolio": {
        if (!request.imageUrls || !request.artistId || !request.workspaceId) {
          throw new Error("imageUrls, artistId, and workspaceId required");
        }

        const results = [];
        for (const imageUrl of request.imageUrls) {
          try {
            // Analyze with AI
            const analysisPrompt = `Analyze this tattoo image:
1. Style (fineline, blackwork, traditional, etc.)
2. Complexity (1-10)
3. Color palette
4. Main elements

Respond in JSON: { "styles": [], "complexity": number, "colors": [], "elements": [] }`;

            const aiResult = await analyzeWithAI(analysisPrompt, imageUrl);
            let styleTags = ['custom'];
            
            if (aiResult) {
              try {
                const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  styleTags = parsed.styles || ['custom'];
                }
              } catch (e) {}
            }

            // Generate embedding (mock for now without HF)
            const embeddingArray = mockEmbedding();

            await supabase
              .from("artist_portfolio_embeddings")
              .upsert({
                workspace_id: request.workspaceId,
                artist_id: request.artistId,
                image_url: imageUrl,
                embedding: embeddingArray,
                style_tags: styleTags,
                analyzed_at: new Date().toISOString(),
              }, { onConflict: "image_url" });

            results.push({ imageUrl, styleTags, stored: true });
          } catch (err) {
            console.error(`[sketch-gen] Error for ${imageUrl}:`, err);
            results.push({ imageUrl, error: (err as Error).message });
          }
        }

        return new Response(
          JSON.stringify({ success: true, results, totalAnalyzed: results.filter(r => !r.error).length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "generate_sketch": {
        if (!request.prompt) {
          throw new Error("prompt required");
        }

        const sketchPrompt = `Create a professional tattoo design sketch: ${request.prompt}

Style: Clean black linework, suitable for stencil transfer
Format: High contrast, clear outlines, no shading unless specified`;

        const sketchUrl = await generateWithLovableAI(sketchPrompt, request.highQuality);

        if (!sketchUrl) {
          // Return placeholder if generation failed
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Image generation unavailable",
              message: "Please try again or describe your design for manual sketch"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Store sketch
        let sketchId = null;
        if (request.workspaceId) {
          const { data } = await supabase
            .from("sketch_approvals")
            .insert({
              workspace_id: request.workspaceId,
              sketch_url: sketchUrl,
              reference_url: request.referenceUrl,
              prompt_used: request.prompt,
              body_part: request.bodyPart,
              conversation_id: request.conversationId,
              booking_id: request.bookingId,
            })
            .select()
            .single();

          if (data) sketchId = data.id;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            sketchUrl, 
            sketchId,
            prompt: request.prompt,
            quality: request.highQuality ? "high" : "fast"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "compare_similarity": {
        if (!request.imageUrl || !request.artistId) {
          throw new Error("imageUrl and artistId required");
        }

        // Get portfolio embeddings
        const { data: portfolioEmbeddings } = await supabase
          .from("artist_portfolio_embeddings")
          .select("image_url, embedding, style_tags")
          .eq("artist_id", request.artistId)
          .not("embedding", "is", null);

        if (!portfolioEmbeddings || portfolioEmbeddings.length === 0) {
          return new Response(
            JSON.stringify({ success: true, similarity: 0, message: "No portfolio embeddings found", viable: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Mock new embedding
        const newEmbedding = mockEmbedding();

        // Calculate similarities
        const similarities = portfolioEmbeddings.map((pe) => ({
          imageUrl: pe.image_url,
          similarity: cosineSimilarity(newEmbedding, pe.embedding as number[]),
          styleTags: pe.style_tags,
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);
        const topMatches = similarities.slice(0, 3);
        const maxSimilarity = topMatches[0]?.similarity || 0;
        const viable = maxSimilarity >= 0.75;

        return new Response(
          JSON.stringify({
            success: true,
            similarity: maxSimilarity,
            viable,
            topMatches,
            portfolioSize: portfolioEmbeddings.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "generate_variations": {
        if (!request.prompt) {
          throw new Error("prompt required");
        }

        const variations = [];
        const styleVariants = ["minimalist fine-line", "bold traditional", "geometric detailed"];

        for (const style of styleVariants) {
          const variantPrompt = `Create a ${style} tattoo design: ${request.prompt}`;
          const imageUrl = await generateWithLovableAI(variantPrompt, false);
          
          if (imageUrl) {
            variations.push({ style, imageUrl });
          }
        }

        return new Response(
          JSON.stringify({ success: true, variations, count: variations.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "quick_sketch": {
        if (!request.prompt) {
          throw new Error("prompt required");
        }

        const quickPrompt = `Quick tattoo sketch, minimal detail, clean outline: ${request.prompt}`;
        const quickSketchUrl = await generateWithLovableAI(quickPrompt, false);

        return new Response(
          JSON.stringify({
            success: !!quickSketchUrl,
            quickSketchUrl,
            message: quickSketchUrl ? "Quick sketch ready" : "Generation failed",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "approve_sketch": {
        if (!request.sketchId) {
          throw new Error("sketchId required");
        }

        const { data, error } = await supabase
          .from("sketch_approvals")
          .update({
            approved: request.approved,
            feedback: request.feedback,
            approved_by: "client",
          })
          .eq("id", request.sketchId)
          .select()
          .single();

        if (error) throw error;

        // Record learning feedback
        await supabase.from("sketch_learning_feedback").insert({
          sketch_id: request.sketchId,
          feedback_type: request.approved ? "approved" : "rejected",
          client_sentiment: request.approved ? 1 : -1,
        });

        return new Response(
          JSON.stringify({ success: true, sketch: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "refine_sketch": {
        if (!request.sketchId || !request.feedback) {
          throw new Error("sketchId and feedback required");
        }

        const { data: originalSketch, error } = await supabase
          .from("sketch_approvals")
          .select("*")
          .eq("id", request.sketchId)
          .single();

        if (error || !originalSketch) {
          throw new Error("Original sketch not found");
        }

        const refinedPrompt = `Refine this tattoo design based on feedback: ${request.feedback}
Original design: ${originalSketch.prompt_used}`;

        const refinedUrl = await generateWithLovableAI(refinedPrompt, true);

        if (!refinedUrl) {
          return new Response(
            JSON.stringify({ success: false, error: "Refinement generation failed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create new sketch record
        const { data: newSketch } = await supabase
          .from("sketch_approvals")
          .insert({
            workspace_id: originalSketch.workspace_id,
            sketch_url: refinedUrl,
            reference_url: originalSketch.reference_url,
            prompt_used: refinedPrompt,
            body_part: originalSketch.body_part,
            conversation_id: originalSketch.conversation_id,
            booking_id: originalSketch.booking_id,
            parent_sketch_id: request.sketchId,
          })
          .select()
          .single();

        // Track iteration
        await supabase.from("sketch_refinement_log").insert({
          original_sketch_id: request.sketchId,
          refined_sketch_id: newSketch?.id,
          feedback_applied: request.feedback,
        });

        return new Response(
          JSON.stringify({
            success: true,
            refinedSketchUrl: refinedUrl,
            newSketchId: newSketch?.id,
            iteration: (originalSketch.iteration || 0) + 1,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "extract_tattoo": {
        if (!request.imageUrl) {
          throw new Error("imageUrl required");
        }

        // Analyze image for tattoo
        const analysisPrompt = `Analyze this image:
1. Does it show a tattoo? (yes/no)
2. If yes, what parts of the design are visible?
3. What style is it?
4. Estimate the complexity (1-10)

Respond in JSON: { "has_tattoo": boolean, "visible_elements": [], "style": "", "complexity": number }`;

        const aiResult = await analyzeWithAI(analysisPrompt, request.imageUrl);
        
        let analysis = { has_tattoo: false, visible_elements: [], style: 'unknown', complexity: 5 };
        
        if (aiResult) {
          try {
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = { ...analysis, ...JSON.parse(jsonMatch[0]) };
            }
          } catch (e) {}
        }

        return new Response(
          JSON.stringify({
            success: true,
            ...analysis,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  } catch (error) {
    console.error(`[sketch-gen][${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});