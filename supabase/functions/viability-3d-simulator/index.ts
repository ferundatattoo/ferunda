import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RiskZone {
  zone: string;
  risk: number;
  reason: string;
}

interface RequestBody {
  reference_image_url: string;
  design_image_url?: string;
  body_part: string;
  skin_tone: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference_image_url, design_image_url, body_part, skin_tone } = await req.json() as RequestBody;

    console.log("3D Viability Simulation request:", { body_part, skin_tone });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get pose landmarks from sister function
    const poseResult = await callPoseDetection(reference_image_url);
    console.log("Pose detection result:", poseResult);

    // Step 2: Calculate risk zones based on body part
    const riskZones = calculateRiskZones(body_part, skin_tone);

    // Step 3: Generate movement distortion analysis with AI
    const movementAnalysis = await analyzeMovementDistortion(
      LOVABLE_API_KEY,
      body_part,
      skin_tone,
      poseResult.detected_zone
    );

    // Step 4: Generate aging simulation description
    const agingAnalysis = await analyzeAgingSimulation(
      LOVABLE_API_KEY,
      body_part,
      skin_tone
    );

    // Step 5: Calculate overall movement distortion risk
    const movementDistortionRisk = calculateMovementDistortionRisk(body_part, riskZones);

    // Step 6: Try to generate aging image with Replicate (if available)
    let agedImageUrl = "";
    if (REPLICATE_API_KEY && design_image_url) {
      try {
        agedImageUrl = await generateAgingImage(REPLICATE_API_KEY, design_image_url);
      } catch (err) {
        console.log("Aging image generation skipped:", err);
      }
    }

    const response = {
      landmarks: poseResult.landmarks || [],
      detected_zone: poseResult.detected_zone || body_part,
      confidence: poseResult.confidence || 0.7,
      
      risk_zones: riskZones,
      movement_distortion_risk: movementDistortionRisk,
      movement_analysis: movementAnalysis,
      
      distortion_frames: [],
      aging_frames: [],
      heatmap_url: "",
      video_url: "",
      
      fading_description: agingAnalysis.description,
      aged_image_url: agedImageUrl,
      
      recommendations: generateRecommendations(movementDistortionRisk, skin_tone, body_part),
    };

    console.log("Simulation complete:", { 
      detected_zone: response.detected_zone,
      movement_risk: response.movement_distortion_risk,
      zones_count: response.risk_zones.length
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("3D Simulator error:", err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : "Simulation failed",
        landmarks: [],
        risk_zones: [],
        movement_distortion_risk: 5
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Call pose detection function
async function callPoseDetection(imageUrl: string): Promise<{
  landmarks: any[];
  detected_zone: string;
  confidence: number;
}> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const response = await fetch(`${supabaseUrl}/functions/v1/viability-pose-detection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!response.ok) {
      console.error("Pose detection failed:", response.status);
      return { landmarks: [], detected_zone: "unknown", confidence: 0.5 };
    }

    return await response.json();
  } catch (err) {
    console.error("Pose detection error:", err);
    return { landmarks: [], detected_zone: "unknown", confidence: 0.5 };
  }
}

// Calculate risk zones based on body part
function calculateRiskZones(bodyPart: string, skinTone: string): RiskZone[] {
  const baseFadingModifier = ["I", "II"].includes(skinTone) ? 1.2 : 1.0;
  
  const riskProfiles: Record<string, RiskZone[]> = {
    forearm: [
      { zone: "inner_elbow", risk: Math.min(10, Math.round(7 * baseFadingModifier)), reason: "Alta movilidad articular, flexión constante" },
      { zone: "wrist_crease", risk: Math.min(10, Math.round(6 * baseFadingModifier)), reason: "Fricción con ropa/accesorios" },
      { zone: "outer_forearm", risk: Math.min(10, Math.round(3 * baseFadingModifier)), reason: "Zona estable, buena longevidad" },
    ],
    upper_arm: [
      { zone: "armpit", risk: 9, reason: "Máxima fricción y sudoración" },
      { zone: "bicep", risk: Math.min(10, Math.round(4 * baseFadingModifier)), reason: "Deformación con contracción muscular" },
      { zone: "tricep", risk: Math.min(10, Math.round(3 * baseFadingModifier)), reason: "Zona relativamente estable" },
    ],
    chest: [
      { zone: "sternum", risk: Math.min(10, Math.round(3 * baseFadingModifier)), reason: "Zona muy estable" },
      { zone: "pectoral", risk: Math.min(10, Math.round(5 * baseFadingModifier)), reason: "Distorsión con movimiento de brazos" },
    ],
    ribs: [
      { zone: "side_ribs", risk: 8, reason: "Alta curvatura, dolor durante aplicación" },
      { zone: "front_ribs", risk: 7, reason: "Movimiento respiratorio constante" },
    ],
    back: [
      { zone: "upper_back", risk: Math.min(10, Math.round(3 * baseFadingModifier)), reason: "Excelente zona para tatuajes grandes" },
      { zone: "lower_back", risk: Math.min(10, Math.round(4 * baseFadingModifier)), reason: "Ligera distorsión con movimiento" },
      { zone: "spine", risk: 6, reason: "Hueso superficial, dolor moderado" },
    ],
    thigh: [
      { zone: "inner_thigh", risk: 8, reason: "Fricción constante al caminar" },
      { zone: "front_thigh", risk: Math.min(10, Math.round(3 * baseFadingModifier)), reason: "Zona muy estable" },
      { zone: "outer_thigh", risk: Math.min(10, Math.round(2 * baseFadingModifier)), reason: "Ideal para tatuajes grandes" },
    ],
    calf: [
      { zone: "behind_knee", risk: 9, reason: "Flexión constante, fading rápido" },
      { zone: "mid_calf", risk: Math.min(10, Math.round(3 * baseFadingModifier)), reason: "Buena longevidad" },
    ],
    ankle: [
      { zone: "inner_ankle", risk: 7, reason: "Roce con calzado" },
      { zone: "outer_ankle", risk: 5, reason: "Exposición solar frecuente" },
    ],
    hand: [
      { zone: "fingers", risk: 10, reason: "Regeneración celular muy rápida, fading garantizado" },
      { zone: "back_of_hand", risk: 9, reason: "Piel muy fina, exposición solar constante" },
      { zone: "palm", risk: 10, reason: "No recomendado - fading extremo" },
    ],
    neck: [
      { zone: "front_neck", risk: 7, reason: "Movimiento constante, piel delicada" },
      { zone: "side_neck", risk: 6, reason: "Exposición solar" },
    ],
    foot: [
      { zone: "top_foot", risk: 8, reason: "Roce con calzado constante" },
      { zone: "sole", risk: 10, reason: "No viable - regeneración extrema" },
    ],
  };

  // Find matching profile
  const normalizedPart = Object.keys(riskProfiles).find(key => 
    bodyPart.toLowerCase().includes(key)
  ) || "forearm";

  return riskProfiles[normalizedPart] || riskProfiles.forearm;
}

// Analyze movement distortion with AI
async function analyzeMovementDistortion(
  apiKey: string,
  bodyPart: string,
  skinTone: string,
  detectedZone: string
): Promise<{ analysis: string; risk_score: number }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Eres un experto en anatomía y tatuajes. Analiza brevemente el riesgo de distorsión por movimiento para una zona corporal específica. Responde en JSON con formato: {\"analysis\": \"texto corto\", \"risk_score\": 1-10}"
          },
          {
            role: "user",
            content: `Zona del cuerpo: ${bodyPart} (detectada: ${detectedZone}). Tipo de piel Fitzpatrick: ${skinTone}. Analiza el riesgo de distorsión del tatuaje con el movimiento natural del cuerpo.`
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("AI analysis failed:", response.status);
      return { analysis: "Análisis no disponible", risk_score: 5 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch {
      return { analysis: content.substring(0, 200), risk_score: 5 };
    }
  } catch (err) {
    console.error("Movement analysis error:", err);
    return { analysis: "Error en análisis", risk_score: 5 };
  }
}

// Analyze aging simulation
async function analyzeAgingSimulation(
  apiKey: string,
  bodyPart: string,
  skinTone: string
): Promise<{ description: string; years_visible: number }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Eres experto en envejecimiento de tatuajes. Describe brevemente cómo envejecerá un tatuaje en una zona específica. Responde en JSON: {\"description\": \"texto\", \"years_visible\": número}"
          },
          {
            role: "user",
            content: `Zona: ${bodyPart}. Piel Fitzpatrick tipo ${skinTone}. ¿Cómo envejecerá el tatuaje en 5-10 años?`
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      return { description: "Simulación de envejecimiento pendiente", years_visible: 15 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      return JSON.parse(content);
    } catch {
      return { description: content.substring(0, 200), years_visible: 15 };
    }
  } catch (err) {
    console.error("Aging analysis error:", err);
    return { description: "Error en simulación", years_visible: 15 };
  }
}

// Generate aging image with Replicate
async function generateAgingImage(apiKey: string, imageUrl: string): Promise<string> {
  // Placeholder for Replicate integration
  // In production, you would call a tattoo aging model
  console.log("Aging image generation would use Replicate API");
  return "";
}

// Calculate overall movement distortion risk
function calculateMovementDistortionRisk(bodyPart: string, riskZones: RiskZone[]): number {
  // High-risk body parts
  const highRiskParts = ["hand", "finger", "foot", "palm", "behind_knee", "armpit", "inner_thigh"];
  const mediumRiskParts = ["wrist", "ankle", "elbow", "neck", "ribs"];
  
  const partLower = bodyPart.toLowerCase();
  
  let baseRisk = 5;
  if (highRiskParts.some(p => partLower.includes(p))) {
    baseRisk = 8;
  } else if (mediumRiskParts.some(p => partLower.includes(p))) {
    baseRisk = 6;
  }

  // Average with zone risks
  const zoneAvg = riskZones.reduce((sum, z) => sum + z.risk, 0) / (riskZones.length || 1);
  
  return Math.round((baseRisk + zoneAvg) / 2);
}

// Generate recommendations based on analysis
function generateRecommendations(
  movementRisk: number,
  skinTone: string,
  bodyPart: string
): string[] {
  const recommendations: string[] = [];

  if (movementRisk > 7) {
    recommendations.push("⚠️ Alto riesgo de distorsión. Considera zona alternativa o diseño más bold.");
  }

  if (movementRisk > 5) {
    recommendations.push("Opta por líneas más gruesas para mejor durabilidad.");
  }

  if (["I", "II"].includes(skinTone)) {
    recommendations.push("Piel clara: Recomendamos black & grey saturado para reducir fading.");
    recommendations.push("Usa protector solar SPF50+ diariamente después de curar.");
  }

  if (bodyPart.toLowerCase().includes("hand") || bodyPart.toLowerCase().includes("finger")) {
    recommendations.push("Tatuajes en manos/dedos requieren retoques cada 1-2 años.");
  }

  if (recommendations.length === 0) {
    recommendations.push("✓ Zona favorable para tatuaje con buena longevidad esperada.");
  }

  return recommendations;
}
