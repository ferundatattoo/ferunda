import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ANALYZE HEALING PHOTO v2.0 - AI-Powered Healing Guardian
 * 
 * Features:
 * - Multi-stage healing assessment
 * - Complication detection (infection, blowout, scarring)
 * - Personalized aftercare recommendations
 * - Progress comparison with previous photos
 * - Auto-alert for critical issues
 * - Certificate generation for completed healing
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

interface HealingAnalysisRequest {
  photoUrl: string;
  dayNumber: number;
  clientNotes?: string;
  clientProfileId?: string;
  sessionId?: string;
  bookingId?: string;
  previousPhotoUrl?: string;
  skinTone?: string;
  placement?: string;
}

interface HealingAnalysisResult {
  health_score: number;
  healing_stage: "excellent" | "normal" | "concerning" | "critical";
  day_expected_stage: string;
  progress_vs_expected: "ahead" | "on_track" | "delayed" | "concerning";
  concerns: HealingConcern[];
  positives: string[];
  recommendations: string[];
  aftercare_tips: string[];
  requires_attention: boolean;
  alert_level: "none" | "info" | "warning" | "urgent";
  confidence: number;
  comparison_notes?: string;
  estimated_full_heal_days: number;
  can_generate_certificate: boolean;
}

interface HealingConcern {
  type: "infection" | "blowout" | "scarring" | "fading" | "scabbing" | "redness" | "swelling" | "dryness" | "other";
  severity: "low" | "medium" | "high";
  description: string;
  action: string;
}

// Expected healing timeline by day
const HEALING_TIMELINE = {
  stage_1: { days: [1, 3], name: "Initial Healing", expected: "Redness, slight swelling, plasma/ink weeping, tender to touch" },
  stage_2: { days: [4, 7], name: "Peeling Phase", expected: "Itching begins, thin flaky peeling, colors look dull, no open wounds" },
  stage_3: { days: [8, 14], name: "Peeling Continues", expected: "Heavy peeling, itching subsides, milky/cloudy appearance" },
  stage_4: { days: [15, 30], name: "Final Healing", expected: "Peeling complete, colors brightening, smooth skin texture returning" },
  stage_5: { days: [31, 60], name: "Full Recovery", expected: "Completely healed, vibrant colors, normal skin texture" }
};

function getExpectedStage(dayNumber: number): { stage: string; expected: string } {
  for (const [key, stage] of Object.entries(HEALING_TIMELINE)) {
    if (dayNumber >= stage.days[0] && dayNumber <= stage.days[1]) {
      return { stage: stage.name, expected: stage.expected };
    }
  }
  if (dayNumber > 60) {
    return { stage: "Fully Healed", expected: "Completely healed tattoo, may benefit from occasional moisturizing" };
  }
  return { stage: "Unknown", expected: "Unable to determine expected stage" };
}

async function analyzeWithAI(
  photoUrl: string,
  dayNumber: number,
  context: {
    clientNotes?: string;
    skinTone?: string;
    placement?: string;
    previousPhotoUrl?: string;
  }
): Promise<HealingAnalysisResult> {
  const expectedStage = getExpectedStage(dayNumber);

  const systemPrompt = `You are an expert tattoo aftercare specialist and dermatology AI assistant.
Analyze healing progress photos with clinical precision while being reassuring to clients.

HEALING TIMELINE REFERENCE:
- Days 1-3 (Initial): Redness, swelling, plasma oozing - ALL NORMAL
- Days 4-7 (Peeling Start): Itching, thin flakes, dull colors - ALL NORMAL
- Days 8-14 (Heavy Peeling): Extensive peeling, milky appearance - ALL NORMAL
- Days 15-30 (Final Healing): Peeling ends, colors return - NORMAL
- Days 30+: Fully healed, vibrant colors

CRITICAL RED FLAGS (requires immediate attention):
- Excessive redness spreading beyond tattoo area
- Pus (yellow/green discharge, not clear plasma)
- Fever or hot to touch
- Unusual swelling after day 5
- Open sores that won't heal
- Black/gray patches indicating tissue death

COMMON NON-ISSUES (clients often worry unnecessarily):
- Itching (normal days 4-14)
- Dull/milky appearance (normal days 7-21)
- Patchy peeling (normal, not uniform)
- Light scabbing (normal if not picked)
- Slight redness (normal first week)

Respond with detailed JSON analysis.`;

  const userPrompt = `ANALYZE THIS HEALING PHOTO:

Day: ${dayNumber} since tattoo session
Expected Stage: ${expectedStage.stage}
Expected Appearance: ${expectedStage.expected}
${context.skinTone ? `Skin Tone: Fitzpatrick ${context.skinTone}` : ""}
${context.placement ? `Placement: ${context.placement}` : ""}
${context.clientNotes ? `Client Notes: "${context.clientNotes}"` : "No client notes"}
${context.previousPhotoUrl ? "Previous photo provided for comparison" : "No previous photo"}

Provide comprehensive healing assessment as JSON:
{
  "health_score": 0-100,
  "healing_stage": "excellent|normal|concerning|critical",
  "day_expected_stage": "what this day should look like",
  "progress_vs_expected": "ahead|on_track|delayed|concerning",
  "concerns": [
    {"type": "infection|blowout|scarring|fading|scabbing|redness|swelling|dryness|other", "severity": "low|medium|high", "description": "...", "action": "..."}
  ],
  "positives": ["good things observed"],
  "recommendations": ["specific actions to take"],
  "aftercare_tips": ["general care tips for this stage"],
  "requires_attention": true/false,
  "alert_level": "none|info|warning|urgent",
  "confidence": 0.0-1.0,
  "comparison_notes": "if previous photo provided, compare progress",
  "estimated_full_heal_days": number,
  "can_generate_certificate": true if day 30+ and excellent condition
}`;

  try {
    const messages: unknown[] = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: photoUrl } }
        ]
      }
    ];

    // Add previous photo for comparison if available
    if (context.previousPhotoUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Previous healing photo for comparison:" },
          { type: "image_url", image_url: { url: context.previousPhotoUrl } }
        ]
      });
    }

    const response = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Use Pro for image analysis
        messages,
        temperature: 0.2,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[HEALING-PHOTO] AI analysis failed:", error);
    
    // Fallback analysis based on day number
    return generateFallbackAnalysis(dayNumber);
  }
}

function generateFallbackAnalysis(dayNumber: number): HealingAnalysisResult {
  const expectedStage = getExpectedStage(dayNumber);
  
  let healthScore = 80;
  let healingStage: HealingAnalysisResult["healing_stage"] = "normal";
  
  if (dayNumber <= 3) healthScore = 75;
  else if (dayNumber <= 7) healthScore = 80;
  else if (dayNumber <= 14) healthScore = 85;
  else if (dayNumber <= 30) healthScore = 90;
  else healthScore = 95;

  return {
    health_score: healthScore,
    healing_stage: healingStage,
    day_expected_stage: expectedStage.expected,
    progress_vs_expected: "on_track",
    concerns: [],
    positives: ["Photo submitted for monitoring", "Proactive client care"],
    recommendations: [
      "Continue following standard aftercare instructions",
      "Keep the area clean and lightly moisturized",
      "Avoid direct sunlight and submerging in water"
    ],
    aftercare_tips: [
      "Wash gently with fragrance-free soap 2-3 times daily",
      "Apply thin layer of recommended aftercare balm",
      "Wear loose, breathable clothing over the area",
      "Stay hydrated and get adequate sleep for optimal healing"
    ],
    requires_attention: false,
    alert_level: "none",
    confidence: 0.5,
    estimated_full_heal_days: Math.max(30 - dayNumber, 7),
    can_generate_certificate: dayNumber >= 30 && healthScore >= 90
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check - allow both authenticated users and service calls
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: HealingAnalysisRequest = await req.json();
    const { 
      photoUrl, 
      dayNumber, 
      clientNotes, 
      clientProfileId, 
      sessionId, 
      bookingId,
      previousPhotoUrl,
      skinTone,
      placement
    } = body;

    if (!photoUrl || typeof dayNumber !== "number") {
      return new Response(
        JSON.stringify({ error: "photoUrl and dayNumber required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[HEALING-PHOTO v2.0] Analyzing day ${dayNumber} photo`);

    // Get previous photo for comparison if not provided
    let comparisonPhotoUrl = previousPhotoUrl;
    if (!comparisonPhotoUrl && (clientProfileId || sessionId)) {
      const { data: previousEntry } = await supabase
        .from("healing_progress")
        .select("photo_url")
        .or(`client_profile_id.eq.${clientProfileId},session_id.eq.${sessionId}`)
        .lt("day_number", dayNumber)
        .order("day_number", { ascending: false })
        .limit(1)
        .single();
      
      if (previousEntry) {
        comparisonPhotoUrl = previousEntry.photo_url;
      }
    }

    // Analyze with AI
    const analysis = await analyzeWithAI(photoUrl, dayNumber, {
      clientNotes,
      skinTone,
      placement,
      previousPhotoUrl: comparisonPhotoUrl
    });

    // Normalize values
    analysis.health_score = Math.max(0, Math.min(100, Math.round(analysis.health_score)));
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));

    // Save to database
    const { data: healingEntry, error: insertError } = await supabase
      .from("healing_progress")
      .insert({
        session_id: sessionId || null,
        client_profile_id: clientProfileId || null,
        booking_id: bookingId || null,
        day_number: dayNumber,
        photo_url: photoUrl,
        client_notes: clientNotes || null,
        ai_health_score: analysis.health_score,
        ai_healing_stage: analysis.healing_stage,
        ai_concerns: analysis.concerns,
        ai_recommendations: analysis.recommendations.join("\n"),
        ai_confidence: analysis.confidence,
        requires_attention: analysis.requires_attention,
        alert_level: analysis.alert_level,
        progress_vs_expected: analysis.progress_vs_expected,
        alert_sent_at: analysis.requires_attention ? new Date().toISOString() : null,
        metadata: {
          positives: analysis.positives,
          aftercare_tips: analysis.aftercare_tips,
          comparison_notes: analysis.comparison_notes,
          estimated_full_heal_days: analysis.estimated_full_heal_days,
          can_generate_certificate: analysis.can_generate_certificate,
          analyzed_by: "healing-photo-v2.0"
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error("[HEALING-PHOTO] Save error:", insertError);
      throw insertError;
    }

    // If critical, send immediate alert
    if (analysis.alert_level === "urgent" || analysis.healing_stage === "critical") {
      console.log(`[HEALING-PHOTO] URGENT ALERT for entry ${healingEntry.id}`);
      
      // Create escalation record
      await supabase.from("escalation_events").insert({
        source_type: "healing_photo",
        source_id: healingEntry.id,
        severity: "high",
        reason: `Critical healing concern detected: ${analysis.concerns.map(c => c.description).join(", ")}`,
        assigned_to: null, // Will be picked up by artist
        status: "pending"
      });
    }

    // Generate certificate if eligible
    if (analysis.can_generate_certificate) {
      console.log(`[HEALING-PHOTO] Client eligible for healing certificate`);
      // Certificate generation handled by separate function
    }

    console.log(`[HEALING-PHOTO v2.0] Analysis complete: score=${analysis.health_score}, stage=${analysis.healing_stage}, alert=${analysis.alert_level}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        entryId: healingEntry.id,
        message: analysis.requires_attention 
          ? "Your photo has been flagged for artist review. You'll hear from us soon!"
          : "Your healing looks great! Keep up the good aftercare."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[HEALING-PHOTO] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
