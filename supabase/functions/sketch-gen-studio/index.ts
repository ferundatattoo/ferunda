import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

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
  highQuality?: boolean; // Use FLUX.1-dev for higher quality
}

// QNN-inspired threshold optimization for edge detection
function qnnOptimizeThreshold(complexity: number, skinTone: string = "medium"): number {
  const skinMultipliers: Record<string, number> = {
    light: 0.85,
    medium: 1.0,
    dark: 1.15,
    morena: 1.1,
  };
  const multiplier = skinMultipliers[skinTone] || 1.0;
  // Quantum-inspired sinusoidal optimization
  const baseThreshold = 0.75;
  const quantumPhase = Math.sin(complexity * Math.PI) * 0.15;
  return Math.min(0.95, Math.max(0.6, (baseThreshold + quantumPhase) * multiplier));
}

// Cosine similarity between two embeddings
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

// Style tag extraction from analysis
function extractStyleTags(embedding: number[]): string[] {
  const tags: string[] = [];
  // Simplified style detection based on embedding patterns
  const avgValue = embedding.reduce((a, b) => a + b, 0) / embedding.length;
  if (avgValue > 0.02) tags.push("detailed");
  if (avgValue < -0.02) tags.push("minimal");
  if (embedding[0] > 0.1) tags.push("geometric");
  if (embedding[50] > 0.1) tags.push("organic");
  if (embedding[100] > 0.1) tags.push("fine-line");
  if (embedding[200] > 0.1) tags.push("bold");
  return tags.length > 0 ? tags : ["custom"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!HF_TOKEN) {
      throw new Error("HUGGING_FACE_ACCESS_TOKEN not configured");
    }

    const hf = new HfInference(HF_TOKEN);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const request: SketchRequest = await req.json();

    console.log(`[sketch-gen-studio] Action: ${request.action}`);

    switch (request.action) {
      // ============================================
      // ANALYZE PORTFOLIO - Vectorize with CLIP
      // ============================================
      case "analyze_portfolio": {
        if (!request.imageUrls || !request.artistId || !request.workspaceId) {
          throw new Error("imageUrls, artistId, and workspaceId required");
        }

        const results = [];
        for (const imageUrl of request.imageUrls) {
          try {
            console.log(`[analyze_portfolio] Processing: ${imageUrl}`);
            
            // Get CLIP embedding
            const embedding = await hf.featureExtraction({
              model: "openai/clip-vit-base-patch32",
              inputs: imageUrl,
            });

            const embeddingArray = Array.isArray(embedding) ? embedding.flat() : [];
            const styleTags = extractStyleTags(embeddingArray as number[]);

            // Store in database
            const { data, error } = await supabase
              .from("artist_portfolio_embeddings")
              .upsert({
                workspace_id: request.workspaceId,
                artist_id: request.artistId,
                image_url: imageUrl,
                embedding: embeddingArray,
                style_tags: styleTags,
                analyzed_at: new Date().toISOString(),
              }, { onConflict: "image_url" })
              .select()
              .single();

            if (error) {
              console.error(`[analyze_portfolio] DB error:`, error);
            }

            results.push({
              imageUrl,
              styleTags,
              embeddingLength: embeddingArray.length,
              stored: !error,
            });
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[analyze_portfolio] Error for ${imageUrl}:`, err);
            results.push({ imageUrl, error: errorMessage });
          }
        }

        return new Response(
          JSON.stringify({ success: true, results, totalAnalyzed: results.filter(r => !r.error).length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============================================
      // EXTRACT TATTOO - SAM segmentation + QNN threshold
      // ============================================
      case "extract_tattoo": {
        if (!request.imageUrl) {
          throw new Error("imageUrl required");
        }

        console.log(`[extract_tattoo] Processing with SAM`);

        // Use SAM for segmentation
        const segmentationResult = await hf.imageSegmentation({
          model: "facebook/sam-vit-base",
          data: await fetch(request.imageUrl).then(r => r.blob()),
        });

        // Analyze complexity for QNN threshold
        const complexity = segmentationResult.length / 10;
        const optThreshold = qnnOptimizeThreshold(complexity, request.skinTone);

        // Filter segments likely to be tattoos (high contrast areas)
        const tattooSegments = segmentationResult.filter((seg: any) => {
          const score = seg.score || 0;
          return score > optThreshold;
        });

        return new Response(
          JSON.stringify({
            success: true,
            totalSegments: segmentationResult.length,
            tattooSegments: tattooSegments.length,
            qnnThreshold: optThreshold,
            complexity,
            segments: tattooSegments.slice(0, 5).map((s: any) => ({
              label: s.label,
              score: s.score,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============================================
      // GENERATE SKETCH - FLUX image generation
      // Supports FLUX.1-dev (high quality) or FLUX.1-schnell (fast)
      // ============================================
      case "generate_sketch": {
        if (!request.prompt) {
          throw new Error("prompt required");
        }

        const sketchPrompt = `tattoo design sketch, clean linework, black and white contour drawing, professional tattoo stencil style: ${request.prompt}`;
        
        // Choose model based on quality setting
        const useHighQuality = request.highQuality === true;
        const model = useHighQuality 
          ? "black-forest-labs/FLUX.1-dev"      // Higher quality, 50 steps
          : "black-forest-labs/FLUX.1-schnell"; // Fast, 4 steps
        
        const inferenceSteps = useHighQuality ? 50 : 4;
        
        console.log(`[generate_sketch] Generating with ${model} (${inferenceSteps} steps)`);

        const image = await hf.textToImage({
          model,
          inputs: sketchPrompt,
          parameters: {
            num_inference_steps: inferenceSteps,
          },
        });

        // Convert to base64
        const arrayBuffer = await image.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const sketchUrl = `data:image/png;base64,${base64}`;

        // Store sketch approval record if workspaceId provided
        let sketchId = null;
        if (request.workspaceId) {
          const { data, error } = await supabase
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

          if (!error && data) {
            sketchId = data.id;
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            sketchUrl, 
            sketchId, 
            prompt: sketchPrompt,
            model,
            quality: useHighQuality ? "high" : "fast"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============================================
      // COMPARE SIMILARITY - CLIP embeddings comparison
      // ============================================
      case "compare_similarity": {
        if (!request.imageUrl || !request.artistId) {
          throw new Error("imageUrl and artistId required");
        }

        console.log(`[compare_similarity] Comparing with portfolio`);

        // Get embedding for new image
        const newEmbedding = await hf.featureExtraction({
          model: "openai/clip-vit-base-patch32",
          inputs: request.imageUrl,
        });
        const newEmbeddingArray = Array.isArray(newEmbedding) ? newEmbedding.flat() as number[] : [];

        // Fetch artist portfolio embeddings
        const { data: portfolioEmbeddings, error } = await supabase
          .from("artist_portfolio_embeddings")
          .select("image_url, embedding, style_tags")
          .eq("artist_id", request.artistId)
          .not("embedding", "is", null);

        if (error) {
          throw new Error(`Failed to fetch portfolio: ${error.message}`);
        }

        if (!portfolioEmbeddings || portfolioEmbeddings.length === 0) {
          return new Response(
            JSON.stringify({ success: true, similarity: 0, message: "No portfolio embeddings found", viable: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate similarity with each portfolio piece
        const similarities = portfolioEmbeddings.map((pe: any) => {
          const embArray = pe.embedding as number[];
          return {
            imageUrl: pe.image_url,
            similarity: cosineSimilarity(newEmbeddingArray, embArray),
            styleTags: pe.style_tags,
          };
        });

        // Sort by similarity and get best matches
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topMatches = similarities.slice(0, 3);
        const avgSimilarity = similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length;
        const maxSimilarity = topMatches[0]?.similarity || 0;

        // Causal threshold: >80% = viable
        const viable = maxSimilarity >= 0.80;

        return new Response(
          JSON.stringify({
            success: true,
            similarity: maxSimilarity,
            averageSimilarity: avgSimilarity,
            viable,
            threshold: 0.80,
            topMatches,
            portfolioSize: portfolioEmbeddings.length,
            message: viable ? "Excellent match with artist style!" : "Consider style adjustments for better match",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============================================
      // GENERATE VARIATIONS - Multiple design options
      // ============================================
      case "generate_variations": {
        if (!request.prompt) {
          throw new Error("prompt required");
        }

        console.log(`[generate_variations] Generating 3 variations`);

        const variations = [];
        const styleVariants = ["minimalist fine-line", "bold traditional", "geometric detailed"];

        for (const style of styleVariants) {
          const variantPrompt = `${style} tattoo design: ${request.prompt}`;
          
          try {
            const image = await hf.textToImage({
              model: "black-forest-labs/FLUX.1-schnell",
              inputs: variantPrompt,
              parameters: { num_inference_steps: 4 },
            });

            const arrayBuffer = await image.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            variations.push({
              style,
              imageUrl: `data:image/png;base64,${base64}`,
            });
          } catch (err) {
            console.error(`[generate_variations] Error for ${style}:`, err);
          }
        }

        return new Response(
          JSON.stringify({ success: true, variations, count: variations.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============================================
      // QUICK SKETCH - Fast contour generation
      // ============================================
      case "quick_sketch": {
        if (!request.prompt) {
          throw new Error("prompt required");
        }

        const quickPrompt = `simple black line sketch, minimal detail, clean tattoo outline: ${request.prompt}`;

        console.log(`[quick_sketch] Fast generation`);

        const image = await hf.textToImage({
          model: "black-forest-labs/FLUX.1-schnell",
          inputs: quickPrompt,
          parameters: { num_inference_steps: 2 }, // Faster
        });

        const arrayBuffer = await image.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        return new Response(
          JSON.stringify({
            success: true,
            quickSketchUrl: `data:image/png;base64,${base64}`,
            message: "Quick sketch for fast approval",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============================================
      // APPROVE SKETCH - Record approval/rejection
      // ============================================
      case "approve_sketch": {
        if (!request.sketchId) {
          throw new Error("sketchId required");
        }

        console.log(`[approve_sketch] Recording approval: ${request.approved}`);

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

        if (error) {
          throw new Error(`Failed to update sketch: ${error.message}`);
        }

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

      // ============================================
      // REFINE SKETCH - Iterate based on feedback
      // ============================================
      case "refine_sketch": {
        if (!request.sketchId || !request.feedback) {
          throw new Error("sketchId and feedback required");
        }

        console.log(`[refine_sketch] Refining based on feedback`);

        // Get original sketch
        const { data: originalSketch, error } = await supabase
          .from("sketch_approvals")
          .select("*")
          .eq("id", request.sketchId)
          .single();

        if (error || !originalSketch) {
          throw new Error("Original sketch not found");
        }

        // Generate refined version
        const refinedPrompt = `${originalSketch.prompt_used}, incorporating feedback: ${request.feedback}`;
        
        const image = await hf.textToImage({
          model: "black-forest-labs/FLUX.1-schnell",
          inputs: `tattoo design sketch: ${refinedPrompt}`,
          parameters: { num_inference_steps: 4 },
        });

        const arrayBuffer = await image.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const refinedUrl = `data:image/png;base64,${base64}`;

        // Create new sketch approval record
        const { data: newSketch } = await supabase
          .from("sketch_approvals")
          .insert({
            workspace_id: originalSketch.workspace_id,
            sketch_url: refinedUrl,
            reference_url: originalSketch.reference_url,
            prompt_used: refinedPrompt,
            body_part: originalSketch.body_part,
            iteration_number: (originalSketch.iteration_number || 1) + 1,
            parent_sketch_id: request.sketchId,
            conversation_id: originalSketch.conversation_id,
            booking_id: originalSketch.booking_id,
          })
          .select()
          .single();

        // Record refinement feedback
        await supabase.from("sketch_learning_feedback").insert({
          sketch_id: request.sketchId,
          feedback_type: "refined",
          client_sentiment: 0,
        });

        return new Response(
          JSON.stringify({
            success: true,
            refinedSketchUrl: refinedUrl,
            newSketchId: newSketch?.id,
            iteration: (originalSketch.iteration_number || 1) + 1,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${request.action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[sketch-gen-studio] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
