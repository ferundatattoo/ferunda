import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI Gateway
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { imageBase64, imageUrl, workspaceId } = await req.json();
    
    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[analyze-screenshot] Processing image for workspace:", workspaceId);

    const systemPrompt = `You are an expert at analyzing Instagram DM and email screenshots to extract training data for ETHEREAL, a tattoo booking AI assistant.

Your job is to:
1. Identify the conversation context (booking inquiry, pricing question, scheduling, etc.)
2. Extract factual information that ETHEREAL should know (prices, processes, locations, policies, etc.)
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
- Focus on patterns that can help ETHEREAL handle similar situations
- If the screenshot doesn't contain useful training data, return empty arrays`;

    // Build the image content for the AI
    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    console.log("[analyze-screenshot] Calling Lovable AI...");
    
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this screenshot and extract training data for ETHEREAL:" },
              imageContent
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-screenshot] Lovable AI error:", response.status, errorText.slice(0, 200));
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const responseContent = aiData.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("No response from AI");
    }

    console.log("[analyze-screenshot] AI response received, parsing...");

    // Parse the JSON from the response
    let extractedData: ExtractedData;
    try {
      let jsonStr = responseContent;
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("[analyze-screenshot] Failed to parse AI response:", parseError);
      throw new Error("Failed to parse AI analysis");
    }

    if (!extractedData.knowledge_entries) extractedData.knowledge_entries = [];
    if (!extractedData.training_pairs) extractedData.training_pairs = [];

    console.log(`[analyze-screenshot] Extracted ${extractedData.knowledge_entries.length} knowledge entries and ${extractedData.training_pairs.length} training pairs`);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[analyze-screenshot] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to analyze screenshot" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
