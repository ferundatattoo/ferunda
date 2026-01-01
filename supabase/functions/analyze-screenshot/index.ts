import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedData {
  knowledge_entries: Array<{
    category: string;
    title: string;
    content: string;
  }>;
  training_pairs: Array<{
    category: string;
    question: string;
    ideal_response: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (using service role for DB operations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { imageBase64, imageUrl, workspaceId } = await req.json();
    
    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[analyze-screenshot] Processing image for workspace:", workspaceId);

    console.log("Analyzing screenshot for Luna training data...");

    // Build the image content for the AI
    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    // AI Providers with fallback: Google AI → Lovable AI
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const LOVABLE_API_KEY_LOCAL = Deno.env.get("LOVABLE_API_KEY");
    
    const systemPrompt = `You are an expert at analyzing Instagram DM and email screenshots to extract training data for Luna, a tattoo booking assistant.

Your job is to:
1. Identify the conversation context (booking inquiry, pricing question, scheduling, etc.)
2. Extract factual information that Luna should know (prices, processes, locations, policies, etc.)
3. Identify good Q&A pairs that show how Fernando (the tattoo artist) responds to clients

Fernando's key characteristics:
- Professional but warm and friendly
- Direct and concise
- Uses "you're" correctly, casual but not sloppy
- Passionate about his art
- Patient with nervous clients
- Clear about his booking process

Return your analysis as valid JSON matching this exact structure:
{
  "knowledge_entries": [
    {
      "category": "pricing|booking|aftercare|style|availability|general|faq",
      "title": "Short descriptive title",
      "content": "The actual knowledge/fact to store"
    }
  ],
  "training_pairs": [
    {
      "category": "pricing|booking|aftercare|style|availability|general|faq",
      "question": "Example customer question or inquiry type",
      "ideal_response": "How Fernando would respond (in his voice/style)"
    }
  ]
}

Guidelines:
- Only extract genuinely useful information, not generic chit-chat
- Keep Fernando's authentic voice in responses
- Focus on patterns that can help Luna handle similar situations
- If the screenshot doesn't contain useful training data, return empty arrays
- Categories: pricing, booking, aftercare, style, availability, general, faq`;

    const providers = [
      { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: GOOGLE_AI_API_KEY, model: "gemini-1.5-pro", name: "Google AI" },
      { url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: LOVABLE_API_KEY_LOCAL, model: "google/gemini-2.5-flash", name: "Lovable AI" }
    ];

    let aiResponse: Response | null = null;
    for (const provider of providers) {
      if (!provider.key) continue;
      
      console.log(`[ANALYZE-SCREENSHOT] Trying ${provider.name}...`);
      
      const attemptResponse = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this screenshot and extract training data for Luna:" },
                imageContent
              ]
            }
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (attemptResponse.ok) {
        console.log(`[ANALYZE-SCREENSHOT] ${provider.name} succeeded`);
        aiResponse = attemptResponse;
        break;
      }
      
      const errorText = await attemptResponse.text();
      console.error(`[ANALYZE-SCREENSHOT] ${provider.name} failed (${attemptResponse.status}):`, errorText);
    }

    if (!aiResponse) {
      throw new Error("All AI providers failed");
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("No response from AI");
    }

    console.log("AI response:", responseContent);

    // Parse the JSON from the response (handle markdown code blocks if present)
    let extractedData: ExtractedData;
    try {
      // Remove markdown code blocks if present
      let jsonStr = responseContent;
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      throw new Error("Failed to parse AI analysis");
    }

    // Validate structure
    if (!extractedData.knowledge_entries) extractedData.knowledge_entries = [];
    if (!extractedData.training_pairs) extractedData.training_pairs = [];

    console.log(`Extracted ${extractedData.knowledge_entries.length} knowledge entries and ${extractedData.training_pairs.length} training pairs`);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error analyzing screenshot:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to analyze screenshot" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
