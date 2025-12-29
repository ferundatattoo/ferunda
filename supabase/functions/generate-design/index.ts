import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Prefer Lovable AI (always available), fallback to Replicate
    const useLovable = !!LOVABLE_API_KEY;
    
    if (!REPLICATE_API_KEY && !LOVABLE_API_KEY) {
      console.error("[DESIGN] No API keys configured");
      return new Response(
        JSON.stringify({ error: "Image generation not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { prompt, booking_id, client_profile_id, style, placement, action } = body;

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // If action is to check status of a prediction
    if (action === "check_status" && body.predictionId) {
      console.log("[DESIGN] Checking prediction status:", body.predictionId);
      const replicate = new Replicate({ auth: REPLICATE_API_KEY });
      const prediction = await replicate.predictions.get(body.predictionId);
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate prompt
    if (!prompt || prompt.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Please provide a design prompt (at least 3 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enhance the prompt for tattoo design
    const enhancedPrompt = `Professional tattoo design: ${prompt}. ${style ? `Style: ${style}.` : ""} ${placement ? `Placement: ${placement}.` : ""} High contrast, clean lines, black and grey or vibrant colors, suitable for skin, detailed artwork, tattoo flash sheet style, white background.`;

    console.log("[DESIGN] Generating with prompt:", enhancedPrompt);

    let imageUrl: string;
    let generationId: string;

    if (useLovable) {
      // Use Lovable AI with Gemini image generation
      console.log("[DESIGN] Using Lovable AI for generation");
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: enhancedPrompt
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[DESIGN] Lovable AI error:", errText);
        throw new Error("Failed to generate with Lovable AI");
      }

      const data = await response.json();
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      generationId = crypto.randomUUID();
      
      if (!imageUrl) {
        throw new Error("No image returned from Lovable AI");
      }
    } else {
      // Use Replicate
      console.log("[DESIGN] Using Replicate for generation");
      const replicate = new Replicate({ auth: REPLICATE_API_KEY });

      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: enhancedPrompt,
            go_fast: true,
            megapixels: "1",
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 90,
            num_inference_steps: 4
          }
        }
      );

      console.log("[DESIGN] Replicate output:", output);
      
      // Output is an array of URLs
      imageUrl = Array.isArray(output) ? output[0] : output;
      generationId = crypto.randomUUID();
    }

    // Save to ai_design_suggestions table
    const suggestionData: any = {
      user_prompt: prompt,
      ai_description: enhancedPrompt,
      generated_image_url: imageUrl,
      style_preferences: style ? [style] : null,
      suggested_placement: placement || null,
      iteration_number: 1,
    };

    if (booking_id) {
      suggestionData.booking_id = booking_id;
    }

    const { data: savedSuggestion, error: saveError } = await supabase
      .from("ai_design_suggestions")
      .insert(suggestionData)
      .select()
      .single();

    if (saveError) {
      console.error("[DESIGN] Error saving suggestion:", saveError);
      // Continue anyway - the image was generated successfully
    }

    console.log("[DESIGN] Image generated successfully:", imageUrl);

    return new Response(
      JSON.stringify({
        success: true,
        image_url: imageUrl,
        suggestion_id: savedSuggestion?.id || generationId,
        prompt: prompt,
        enhanced_prompt: enhancedPrompt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[DESIGN] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate design",
        details: "Please try again or contact support."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});