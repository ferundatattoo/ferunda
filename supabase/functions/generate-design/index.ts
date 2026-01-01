import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI Gateway for image generation
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("[DESIGN] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Image generation not configured. Please add LOVABLE_API_KEY." }),
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

    // Validate prompt
    if (!prompt || prompt.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Please provide a design prompt (at least 3 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enhance the prompt for tattoo design
    const enhancedPrompt = `Create a professional tattoo design: ${prompt}. ${style ? `Style: ${style}.` : ""} ${placement ? `Placement: ${placement}.` : ""} High contrast, clean lines, detailed artwork, suitable for tattooing on skin.`;

    console.log("[DESIGN] Generating with prompt:", enhancedPrompt.slice(0, 100));

    let imageUrl: string | null = null;
    let generationId: string = crypto.randomUUID();

    // Use Lovable AI with Gemini image generation model
    console.log("[DESIGN] Using Lovable AI (google/gemini-2.5-flash-image-preview)...");
    
    try {
      const response = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ 
            role: "user", 
            content: `Generate a high-quality tattoo design image: ${enhancedPrompt}. Clean black linework on white background, suitable for stencil transfer.` 
          }],
          modalities: ["image", "text"]
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[DESIGN] Lovable AI response received");
        
        // Parse the response - check images array first (correct format)
        const images = data.choices?.[0]?.message?.images;
        if (images && images.length > 0) {
          const firstImage = images[0];
          if (firstImage?.image_url?.url) {
            imageUrl = firstImage.image_url.url;
            console.log("[DESIGN] Got image from images array");
          }
        }
        
        // Fallback: check content directly
        if (!imageUrl) {
          const content = data.choices?.[0]?.message?.content;
          if (content && typeof content === "string" && (content.startsWith("http") || content.startsWith("data:image"))) {
            imageUrl = content;
            console.log("[DESIGN] Got direct image URL/data from content");
          }
        }
        
        if (imageUrl) {
          console.log("[DESIGN] Lovable AI image generation succeeded");
          generationId = crypto.randomUUID();
        } else {
          console.error("[DESIGN] No image found in response:", JSON.stringify(data).slice(0, 500));
        }
      } else {
        const errorText = await response.text();
        console.error("[DESIGN] Lovable AI failed:", response.status, errorText.slice(0, 200));
      }
    } catch (e) {
      console.error("[DESIGN] Lovable AI error:", e);
    }

    // If Lovable AI failed, return helpful error
    if (!imageUrl) {
      console.error("[DESIGN] Image generation failed - no providers succeeded");
      return new Response(
        JSON.stringify({ 
          error: "Image generation temporarily unavailable. Please try again in a moment.",
          suggestion: "You can describe your idea in more detail and we'll help visualize it."
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    }

    console.log("[DESIGN] Image generated successfully");

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
        details: "Please try again or describe your idea in the chat."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
