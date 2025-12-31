import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealingAnalysisRequest {
  photoUrl: string;
  dayNumber: number;
  clientNotes?: string;
  clientProfileId?: string;
  sessionId?: string;
}

interface HealingAnalysisResult {
  healthScore: number;
  healingStage: "excellent" | "normal" | "concerning" | "critical";
  concerns: string[];
  recommendations: string;
  confidence: number;
  requiresAttention: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!role) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: HealingAnalysisRequest = await req.json();
    const { photoUrl, dayNumber, clientNotes, clientProfileId, sessionId } = body;

    if (!photoUrl || typeof dayNumber !== "number") {
      return new Response(
        JSON.stringify({ error: "photoUrl and dayNumber required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing healing photo for day ${dayNumber}...`);

    // Use Lovable AI to analyze the healing photo
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const analysisPrompt = `You are an expert tattoo aftercare specialist analyzing a healing progress photo.

Day: ${dayNumber} since tattoo session
${clientNotes ? `Client notes: "${clientNotes}"` : "No client notes provided"}

Analyze this tattoo healing photo and provide:
1. Health Score (0-100): Based on normal healing progression for day ${dayNumber}
2. Healing Stage: One of "excellent", "normal", "concerning", or "critical"
3. Concerns: List any potential issues you observe (redness, swelling, scabbing issues, infection signs, etc.)
4. Recommendations: Specific aftercare advice based on current state
5. Confidence: How confident you are in your assessment (0.0-1.0)
6. Requires Attention: true if artist should review urgently

Expected healing timeline:
- Days 1-3: Redness, slight swelling, oozing is normal
- Days 4-7: Peeling begins, itching is normal, no open wounds
- Days 8-14: Peeling continues, color may look dull
- Days 15-30: Final healing, color should return

Respond in JSON format:
{
  "healthScore": number,
  "healingStage": "excellent" | "normal" | "concerning" | "critical",
  "concerns": ["string array"],
  "recommendations": "string",
  "confidence": number,
  "requiresAttention": boolean
}`;

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro-preview-06-05",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              { type: "image_url", image_url: { url: photoUrl } }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI analysis failed:", errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", aiContent);

    // Parse the JSON response
    let analysis: HealingAnalysisResult;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response, using defaults:", parseError);
      // Fallback analysis based on day number
      analysis = {
        healthScore: dayNumber <= 3 ? 75 : dayNumber <= 14 ? 80 : 90,
        healingStage: "normal",
        concerns: [],
        recommendations: "Continue following standard aftercare instructions. Keep the area clean and moisturized.",
        confidence: 0.5,
        requiresAttention: false,
      };
    }

    // Validate and normalize values
    analysis.healthScore = Math.max(0, Math.min(100, Math.round(analysis.healthScore)));
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));
    if (!["excellent", "normal", "concerning", "critical"].includes(analysis.healingStage)) {
      analysis.healingStage = "normal";
    }

    // Save to database
    const { data: healingEntry, error: insertError } = await supabase
      .from("healing_progress")
      .insert({
        session_id: sessionId || null,
        client_profile_id: clientProfileId || null,
        day_number: dayNumber,
        photo_url: photoUrl,
        client_notes: clientNotes || null,
        ai_health_score: analysis.healthScore,
        ai_healing_stage: analysis.healingStage,
        ai_concerns: analysis.concerns,
        ai_recommendations: analysis.recommendations,
        ai_confidence: analysis.confidence,
        requires_attention: analysis.requiresAttention,
        alert_sent_at: analysis.requiresAttention ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to save healing entry:", insertError);
      throw insertError;
    }

    console.log("Healing analysis saved:", healingEntry.id);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        entryId: healingEntry.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in analyze-healing-photo:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
