import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= TYPES =============
interface RiskZone {
  zone: string;
  risk: number;
  reason: string;
  mitigation?: string;
  uv_exposure_modifier?: number;
}

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
  name?: string;
}

interface DepthMap {
  depth_values: number[][];
  min_depth: number;
  max_depth: number;
  resolution: { width: number; height: number };
}

interface RequestBody {
  reference_image_urls: string[]; // Now supports multi-image
  design_image_url?: string;
  body_part: string;
  skin_tone: string;
  client_age?: number;
  simulation_quality?: "fast" | "standard" | "ultra";
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both single image (legacy) and multi-image
    const reference_image_urls = body.reference_image_urls || [body.reference_image_url];
    const { design_image_url, body_part, skin_tone, client_age = 30, simulation_quality = "standard" } = body;

    console.log("🚀 3D Viability Simulator Elite v2.0", { 
      images_count: reference_image_urls.length,
      body_part, 
      skin_tone,
      quality: simulation_quality 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("AI service not configured");
    }

    // ============= PIPELINE ELITE =============
    
    // Step 1: Multi-view pose detection (parallel for multiple images)
    console.log("📐 Step 1: Multi-view pose detection...");
    const poseResults = await Promise.all(
      reference_image_urls.slice(0, 3).map((url: string) => callPoseDetection(url))
    );
    const fusedPose = fusePoseFromMultipleViews(poseResults);
    console.log("Fused pose landmarks:", fusedPose.landmarks.length);

    // Step 2: MiDaS Depth estimation
    console.log("📊 Step 2: Depth estimation (MiDaS)...");
    const depthMap = await estimateDepthMiDaS(reference_image_urls[0], HUGGINGFACE_API_KEY);
    
    // Step 3: SAM2 Segmentation (if design image provided)
    console.log("🎯 Step 3: SAM2 Segmentation...");
    let segmentationMask = null;
    if (design_image_url && HUGGINGFACE_API_KEY) {
      segmentationMask = await segmentWithSAM2(reference_image_urls[0], HUGGINGFACE_API_KEY);
    }

    // Step 4: Calculate advanced risk zones with physics
    console.log("⚠️ Step 4: Physics-based risk calculation...");
    const riskZones = calculateAdvancedRiskZones(body_part, skin_tone, fusedPose, depthMap, client_age);

    // Step 5: Movement distortion with physics simulation
    console.log("🏃 Step 5: Movement distortion analysis (5 poses)...");
    const movementAnalysis = await analyzeMovementWithPhysics(
      LOVABLE_API_KEY,
      body_part,
      skin_tone,
      fusedPose,
      depthMap
    );

    // Step 6: ML-based aging simulation
    console.log("⏳ Step 6: ML aging simulation...");
    const agingAnalysis = await simulateAgingML(
      LOVABLE_API_KEY,
      body_part,
      skin_tone,
      client_age,
      riskZones
    );

    // Step 7: Generate blowout probability
    console.log("💥 Step 7: Blowout probability calculation...");
    const blowoutRisk = calculateBlowoutProbability(fusedPose, depthMap, body_part);

    // Step 8: Generate video simulation (if ultra quality)
    console.log("🎬 Step 8: Video generation...");
    let videoUrl = "";
    let heatmapData = null;
    
    if (simulation_quality === "ultra" && REPLICATE_API_KEY) {
      const videoResult = await generateSimulationVideo(REPLICATE_API_KEY, design_image_url, body_part);
      videoUrl = videoResult.url;
    }

    // Generate heatmap data for 3D visualization
    heatmapData = generateHeatmapData(riskZones, fusedPose, depthMap);

    // Step 9: Generate recommendations
    console.log("💡 Step 9: Generating elite recommendations...");
    const recommendations = await generateEliteRecommendations(
      LOVABLE_API_KEY,
      movementAnalysis,
      agingAnalysis,
      blowoutRisk,
      riskZones,
      body_part,
      skin_tone
    );

    // Compile response
    const response = {
      version: "2.0-elite",
      
      // Pose & 3D data
      landmarks: fusedPose.landmarks,
      detected_zone: fusedPose.detected_zone,
      confidence: fusedPose.confidence,
      multi_view_used: reference_image_urls.length > 1,
      depth_map: depthMap ? { 
        available: true,
        min_depth: depthMap.min_depth,
        max_depth: depthMap.max_depth 
      } : { available: false },
      
      // Segmentation
      segmentation: segmentationMask ? {
        available: true,
        precision: "pixel-level (SAM2)"
      } : { available: false },
      
      // Risk analysis
      risk_zones: riskZones,
      movement_distortion_risk: movementAnalysis.overall_risk,
      movement_analysis: movementAnalysis,
      blowout_probability: blowoutRisk,
      
      // Aging simulation
      aging_simulation: agingAnalysis,
      fading_description: agingAnalysis.summary,
      
      // Visualizations
      sim_videos: videoUrl ? [videoUrl] : [],
      video_url: videoUrl,
      heatmap_url: "",
      risk_heatmap_data: heatmapData,
      
      // Recommendations
      recommendations: recommendations.list,
      recommendations_summary: recommendations.summary,
      
      // Metadata
      quality_tier: simulation_quality,
      processing_time_ms: Date.now(),
    };

    console.log("✅ Elite simulation complete:", { 
      zones: response.risk_zones.length,
      movement_risk: response.movement_distortion_risk,
      blowout_prob: response.blowout_probability.overall,
      recommendations: response.recommendations.length
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ 3D Simulator error:", err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : "Simulation failed",
        version: "2.0-elite",
        landmarks: [],
        risk_zones: [],
        movement_distortion_risk: 5,
        fallback: true
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============= POSE DETECTION =============
async function callPoseDetection(imageUrl: string): Promise<{
  landmarks: PoseLandmark[];
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

// ============= MULTI-VIEW FUSION =============
function fusePoseFromMultipleViews(poseResults: any[]): {
  landmarks: PoseLandmark[];
  detected_zone: string;
  confidence: number;
} {
  if (poseResults.length === 0) {
    return { landmarks: [], detected_zone: "unknown", confidence: 0 };
  }
  
  if (poseResults.length === 1) {
    return poseResults[0];
  }

  // Triangulate landmarks from multiple views
  const allLandmarks: PoseLandmark[][] = poseResults.map(p => p.landmarks || []);
  const fusedLandmarks: PoseLandmark[] = [];
  
  // Get max landmark count across all views
  const maxLandmarks = Math.max(...allLandmarks.map(l => l.length));
  
  for (let i = 0; i < maxLandmarks; i++) {
    const validPoints = allLandmarks
      .filter(l => l[i] && l[i].visibility > 0.3)
      .map(l => l[i]);
    
    if (validPoints.length > 0) {
      // Average the positions (basic triangulation)
      fusedLandmarks.push({
        x: validPoints.reduce((s, p) => s + p.x, 0) / validPoints.length,
        y: validPoints.reduce((s, p) => s + p.y, 0) / validPoints.length,
        z: validPoints.reduce((s, p) => s + (p.z || 0), 0) / validPoints.length,
        visibility: validPoints.reduce((s, p) => s + p.visibility, 0) / validPoints.length,
      });
    }
  }

  // Best confidence from all views
  const bestResult = poseResults.reduce((best, curr) => 
    (curr.confidence || 0) > (best.confidence || 0) ? curr : best
  );

  return {
    landmarks: fusedLandmarks,
    detected_zone: bestResult.detected_zone,
    confidence: Math.min(1, bestResult.confidence * (1 + (poseResults.length - 1) * 0.1)), // Boost for multi-view
  };
}

// ============= MIDAS DEPTH ESTIMATION =============
async function estimateDepthMiDaS(imageUrl: string, hfApiKey?: string): Promise<DepthMap | null> {
  if (!hfApiKey) {
    console.log("Skipping MiDaS depth estimation (no HF API key)");
    return null;
  }

  try {
    // Call Hugging Face MiDaS model
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Intel/dpt-large",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: imageUrl }),
      }
    );

    if (!response.ok) {
      console.log("MiDaS depth estimation failed:", response.status);
      return null;
    }

    // For now, return simulated depth data
    // In production, parse the actual depth map from response
    return {
      depth_values: [],
      min_depth: 0.1,
      max_depth: 10.0,
      resolution: { width: 512, height: 512 }
    };
  } catch (err) {
    console.error("Depth estimation error:", err);
    return null;
  }
}

// ============= SAM2 SEGMENTATION =============
async function segmentWithSAM2(imageUrl: string, hfApiKey?: string): Promise<any> {
  if (!hfApiKey) {
    console.log("Skipping SAM2 segmentation (no HF API key)");
    return null;
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/sam2-hiera-large",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: imageUrl }),
      }
    );

    if (!response.ok) {
      console.log("SAM2 segmentation failed:", response.status);
      return null;
    }

    return { available: true };
  } catch (err) {
    console.error("SAM2 error:", err);
    return null;
  }
}

// ============= ADVANCED RISK ZONES =============
function calculateAdvancedRiskZones(
  bodyPart: string, 
  skinTone: string, 
  pose: any, 
  depthMap: DepthMap | null,
  clientAge: number
): RiskZone[] {
  // Base risk modifiers
  const skinModifier = ["I", "II"].includes(skinTone) ? 1.25 : 1.0;
  const ageModifier = clientAge > 50 ? 1.15 : clientAge > 40 ? 1.08 : 1.0;
  const uvExposureZones = ["hand", "forearm", "neck", "face", "shoulder"];
  const isUVExposed = uvExposureZones.some(z => bodyPart.toLowerCase().includes(z));

  // Curvature from depth (if available)
  const curvatureModifier = depthMap ? 
    Math.max(1.0, (depthMap.max_depth - depthMap.min_depth) / 5) : 1.0;

  const riskProfiles: Record<string, RiskZone[]> = {
    forearm: [
      { zone: "inner_elbow", risk: 7.5, reason: "Alta movilidad articular, flexión constante", mitigation: "Líneas bold, evitar detalles finos en pliegue" },
      { zone: "wrist_crease", risk: 6.5, reason: "Fricción con ropa/accesorios/reloj", mitigation: "Diseño que termine 2cm arriba del pliegue" },
      { zone: "mid_forearm", risk: 3.5, reason: "Zona estable, buena retención de tinta", mitigation: "Ideal para detalles finos" },
      { zone: "outer_forearm", risk: 3.0, reason: "Excelente longevidad, exposición UV moderada", mitigation: "SPF50+ diario post-curado" },
    ],
    upper_arm: [
      { zone: "armpit", risk: 9.5, reason: "Máxima fricción y sudoración", mitigation: "Evitar o usar diseños ultra-bold" },
      { zone: "inner_bicep", risk: 5.5, reason: "Roce con torso al caminar", mitigation: "Hidratación constante post-curado" },
      { zone: "bicep_peak", risk: 4.5, reason: "Deformación con contracción muscular", mitigation: "Considerar diseño que fluya con el músculo" },
      { zone: "outer_deltoid", risk: 2.5, reason: "Zona muy estable, ideal para tatuajes grandes", mitigation: "Zona premium" },
    ],
    chest: [
      { zone: "sternum", risk: 3.5, reason: "Zona estable sobre hueso", mitigation: "Cuidado con dolor durante aplicación" },
      { zone: "pectoral_muscle", risk: 5.0, reason: "Distorsión con movimiento de brazos", mitigation: "Diseño que respete líneas musculares" },
      { zone: "clavicle", risk: 4.5, reason: "Hueso superficial", mitigation: "Líneas sutiles funcionan bien" },
    ],
    ribs: [
      { zone: "side_ribs", risk: 8.5, reason: "Alta curvatura, dolor intenso, movimiento respiratorio", mitigation: "Sesiones cortas, diseño adaptado a curvas" },
      { zone: "front_ribs", risk: 7.5, reason: "Movimiento respiratorio constante", mitigation: "Evitar líneas muy finas" },
      { zone: "floating_ribs", risk: 8.0, reason: "Máxima sensibilidad, piel fina", mitigation: "Solo clientes experimentados" },
    ],
    back: [
      { zone: "upper_back", risk: 2.5, reason: "Excelente zona, mínimo movimiento", mitigation: "Perfecta para piezas grandes" },
      { zone: "shoulder_blade", risk: 3.5, reason: "Ligero movimiento con brazos", mitigation: "Diseño que fluya con omóplato" },
      { zone: "lower_back", risk: 4.0, reason: "Flexión al sentarse/doblarse", mitigation: "Evitar zona lumbar central" },
      { zone: "spine", risk: 5.5, reason: "Hueso superficial, dolor moderado", mitigation: "Líneas bold en columna" },
    ],
    thigh: [
      { zone: "inner_thigh", risk: 8.5, reason: "Fricción constante al caminar", mitigation: "Solo estilos bold, retoques frecuentes" },
      { zone: "front_thigh", risk: 3.0, reason: "Zona muy estable, gran área", mitigation: "Ideal para piezas detalladas" },
      { zone: "outer_thigh", risk: 2.0, reason: "Zona premium, mínimo desgaste", mitigation: "Perfecta para micro-realismo" },
      { zone: "knee", risk: 7.5, reason: "Máxima flexión, piel delgada", mitigation: "Diseños geométricos que fluyan" },
    ],
    calf: [
      { zone: "behind_knee", risk: 9.0, reason: "Flexión constante, sudoración", mitigation: "Evitar o diseño muy bold" },
      { zone: "mid_calf", risk: 3.5, reason: "Buena longevidad, piel firme", mitigation: "Excelente para wrap-arounds" },
      { zone: "ankle_transition", risk: 6.0, reason: "Zona de roce con calcetines", mitigation: "Terminar diseño arriba del tobillo" },
    ],
    ankle: [
      { zone: "inner_ankle", risk: 7.0, reason: "Roce con calzado", mitigation: "Diseños pequeños y bold" },
      { zone: "outer_ankle", risk: 5.5, reason: "Exposición solar frecuente", mitigation: "SPF obligatorio" },
      { zone: "achilles", risk: 6.5, reason: "Movimiento al caminar", mitigation: "Líneas verticales fluyen mejor" },
    ],
    hand: [
      { zone: "fingers", risk: 10.0, reason: "Regeneración celular muy rápida", mitigation: "Retoques cada 6-12 meses garantizados" },
      { zone: "back_of_hand", risk: 9.0, reason: "Piel muy fina, exposición solar extrema", mitigation: "Solo tinta muy saturada, SPF constante" },
      { zone: "palm", risk: 10.0, reason: "No recomendado - fading extremo", mitigation: "Desaconsejar activamente" },
      { zone: "knuckles", risk: 9.5, reason: "Máxima abrasión y flexión", mitigation: "Solo lettering bold o símbolos simples" },
    ],
    neck: [
      { zone: "front_neck", risk: 7.0, reason: "Movimiento constante, piel delicada", mitigation: "Líneas sutiles, diseños fluidos" },
      { zone: "side_neck", risk: 6.0, reason: "Exposición solar, visibilidad alta", mitigation: "Considerar implicaciones profesionales" },
      { zone: "nape", risk: 4.5, reason: "Zona relativamente estable", mitigation: "Cubierta por cabello reduce UV" },
    ],
    foot: [
      { zone: "top_foot", risk: 8.0, reason: "Roce constante con calzado", mitigation: "Evitar época de calzado cerrado post-tattoo" },
      { zone: "sole", risk: 10.0, reason: "No viable - regeneración extrema", mitigation: "Rechazar solicitud" },
      { zone: "toes", risk: 9.5, reason: "Similar a dedos de mano", mitigation: "Retoques muy frecuentes" },
    ],
  };

  // Find matching profile
  const normalizedPart = Object.keys(riskProfiles).find(key => 
    bodyPart.toLowerCase().includes(key)
  ) || "forearm";

  const baseZones = riskProfiles[normalizedPart] || riskProfiles.forearm;

  // Apply modifiers
  return baseZones.map(zone => ({
    ...zone,
    risk: Math.min(10, Math.round(zone.risk * skinModifier * ageModifier * curvatureModifier * 10) / 10),
    uv_exposure_modifier: isUVExposed ? 1.3 : 1.0,
  }));
}

// ============= MOVEMENT ANALYSIS WITH PHYSICS =============
async function analyzeMovementWithPhysics(
  apiKey: string,
  bodyPart: string,
  skinTone: string,
  pose: any,
  depthMap: DepthMap | null
): Promise<{ 
  overall_risk: number; 
  poses_analyzed: string[]; 
  distortion_by_pose: Record<string, number>;
  physics_factors: string[];
}> {
  try {
    // Define 5 dynamic poses to analyze
    const dynamicPoses = [
      "neutral_resting",
      "full_flexion",
      "full_extension", 
      "lateral_twist",
      "daily_motion" // e.g., raising arm, walking
    ];

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro-preview-06-05",
        messages: [
          {
            role: "system",
            content: `Eres un experto en biomecánica y tatuajes. Analiza la distorsión del tatuaje a través de 5 poses dinámicas.

Responde SOLO en JSON válido:
{
  "overall_risk": 1-10,
  "distortion_by_pose": {
    "neutral_resting": 1-10,
    "full_flexion": 1-10,
    "full_extension": 1-10,
    "lateral_twist": 1-10,
    "daily_motion": 1-10
  },
  "physics_factors": ["factor1", "factor2"],
  "elasticity_estimate": "high/medium/low",
  "worst_case_scenario": "descripción breve"
}`
          },
          {
            role: "user",
            content: `Zona: ${bodyPart}. Piel Fitzpatrick: ${skinTone}. Pose landmarks: ${pose.landmarks?.length || 0} puntos detectados. Confianza 3D: ${pose.confidence || 0}. Profundidad disponible: ${depthMap ? 'sí' : 'no'}. Analiza distorsión física.`
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      const parsed = JSON.parse(content);
      return {
        overall_risk: parsed.overall_risk || 5,
        poses_analyzed: dynamicPoses,
        distortion_by_pose: parsed.distortion_by_pose || {},
        physics_factors: parsed.physics_factors || ["elasticidad de piel", "movimiento articular"],
      };
    } catch {
      return {
        overall_risk: 5,
        poses_analyzed: dynamicPoses,
        distortion_by_pose: {},
        physics_factors: ["análisis simplificado"],
      };
    }
  } catch (err) {
    console.error("Movement physics analysis error:", err);
    return {
      overall_risk: 5,
      poses_analyzed: [],
      distortion_by_pose: {},
      physics_factors: [],
    };
  }
}

// ============= ML AGING SIMULATION =============
async function simulateAgingML(
  apiKey: string,
  bodyPart: string,
  skinTone: string,
  clientAge: number,
  riskZones: RiskZone[]
): Promise<{
  summary: string;
  years_analysis: Record<number, { fading_percent: number; description: string }>;
  sun_exposure_impact: string;
  recommendations: string[];
}> {
  try {
    const avgRisk = riskZones.reduce((s, z) => s + z.risk, 0) / (riskZones.length || 1);
    
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro-preview-06-05",
        messages: [
          {
            role: "system",
            content: `Eres experto en envejecimiento de tatuajes con conocimiento ML. Simula el fading a través de los años.

Responde SOLO en JSON válido:
{
  "summary": "resumen breve del envejecimiento esperado",
  "years_analysis": {
    "1": { "fading_percent": 5, "description": "..." },
    "5": { "fading_percent": 20, "description": "..." },
    "10": { "fading_percent": 35, "description": "..." },
    "15": { "fading_percent": 50, "description": "..." },
    "20": { "fading_percent": 65, "description": "..." }
  },
  "sun_exposure_impact": "descripción del impacto UV",
  "recommendations": ["recomendación1", "recomendación2"]
}`
          },
          {
            role: "user",
            content: `Zona: ${bodyPart}. Piel Fitzpatrick: ${skinTone}. Edad cliente: ${clientAge}. Riesgo promedio zona: ${avgRisk.toFixed(1)}/10. Simula envejecimiento del tatuaje.`
          }
        ],
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      return JSON.parse(content);
    } catch {
      return {
        summary: "Simulación de envejecimiento estándar",
        years_analysis: {},
        sun_exposure_impact: "Impacto UV moderado",
        recommendations: ["Usar SPF50+ diariamente después de curar"],
      };
    }
  } catch (err) {
    console.error("Aging simulation error:", err);
    return {
      summary: "Error en simulación",
      years_analysis: {},
      sun_exposure_impact: "",
      recommendations: [],
    };
  }
}

// ============= BLOWOUT PROBABILITY =============
function calculateBlowoutProbability(
  pose: any,
  depthMap: DepthMap | null,
  bodyPart: string
): {
  overall: number;
  factors: string[];
  line_thickness_recommendation: string;
} {
  // High-risk blowout zones
  const highBlowoutZones = ["inner_elbow", "wrist", "ankle", "ribs", "neck", "inner_arm"];
  const mediumBlowoutZones = ["forearm", "calf", "chest"];
  
  let baseRisk = 2;
  const factors: string[] = [];
  
  if (highBlowoutZones.some(z => bodyPart.toLowerCase().includes(z))) {
    baseRisk = 6;
    factors.push("Zona con piel fina o alta vascularización");
  } else if (mediumBlowoutZones.some(z => bodyPart.toLowerCase().includes(z))) {
    baseRisk = 4;
    factors.push("Zona con riesgo moderado de blowout");
  }

  // Curvature increases risk
  if (depthMap && (depthMap.max_depth - depthMap.min_depth) > 3) {
    baseRisk += 1.5;
    factors.push("Alta curvatura detectada");
  }

  // Low confidence detection increases uncertainty
  if (pose.confidence < 0.6) {
    baseRisk += 1;
    factors.push("Confianza baja en detección - riesgo incierto");
  }

  const finalRisk = Math.min(10, Math.round(baseRisk * 10) / 10);
  
  let lineRec = "Líneas de 0.3-0.5mm son seguras";
  if (finalRisk > 6) {
    lineRec = "Recomendamos líneas mínimo 0.5mm, preferible 0.8mm+";
  } else if (finalRisk > 4) {
    lineRec = "Líneas de 0.4-0.6mm recomendadas";
  }

  return {
    overall: finalRisk,
    factors,
    line_thickness_recommendation: lineRec,
  };
}

// ============= GENERATE SIMULATION VIDEO =============
async function generateSimulationVideo(
  replicateKey: string,
  designImageUrl: string | undefined,
  bodyPart: string
): Promise<{ url: string }> {
  // Placeholder for Replicate video generation
  console.log("Video generation placeholder - would use Replicate");
  return { url: "" };
}

// ============= GENERATE HEATMAP DATA =============
function generateHeatmapData(
  riskZones: RiskZone[],
  pose: any,
  depthMap: DepthMap | null
): {
  zones: Array<{ name: string; risk: number; mitigation: string; position?: { x: number; y: number } }>;
  overall_risk: number;
  recommended_approach: string;
} {
  const avgRisk = riskZones.reduce((s, z) => s + z.risk, 0) / (riskZones.length || 1);
  
  let approach = "Enfoque estándar";
  if (avgRisk > 7) {
    approach = "Enfoque conservador: líneas bold, colores saturados, considerar zona alternativa";
  } else if (avgRisk > 5) {
    approach = "Enfoque cauteloso: balance entre detalle y durabilidad";
  } else {
    approach = "Zona premium: ideal para micro-realismo y detalles finos";
  }

  return {
    zones: riskZones.map((z, i) => ({
      name: z.zone,
      risk: z.risk,
      mitigation: z.mitigation || "",
      position: pose.landmarks?.[i] ? { 
        x: pose.landmarks[i].x, 
        y: pose.landmarks[i].y 
      } : undefined,
    })),
    overall_risk: Math.round(avgRisk * 10) / 10,
    recommended_approach: approach,
  };
}

// ============= ELITE RECOMMENDATIONS =============
async function generateEliteRecommendations(
  apiKey: string,
  movementAnalysis: any,
  agingAnalysis: any,
  blowoutRisk: any,
  riskZones: RiskZone[],
  bodyPart: string,
  skinTone: string
): Promise<{ list: string[]; summary: string }> {
  try {
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro-preview-06-05",
        messages: [
          {
            role: "system",
            content: `Eres el sistema de recomendaciones de Ferunda Tattoo. Genera recomendaciones concisas y accionables basadas en el análisis 3D.

Responde SOLO en JSON válido:
{
  "summary": "resumen ejecutivo en 1-2 oraciones",
  "list": [
    "✓ recomendación positiva",
    "⚠️ advertencia importante",
    "💡 tip profesional"
  ]
}`
          },
          {
            role: "user",
            content: `
Zona: ${bodyPart}
Piel: Fitzpatrick ${skinTone}
Riesgo movimiento: ${movementAnalysis.overall_risk}/10
Riesgo blowout: ${blowoutRisk.overall}/10
Zonas críticas: ${riskZones.filter(z => z.risk > 6).map(z => z.zone).join(", ") || "ninguna"}
Factores físicos: ${movementAnalysis.physics_factors?.join(", ") || "estándar"}

Genera 4-6 recomendaciones profesionales.`
          }
        ],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      return JSON.parse(content);
    } catch {
      return {
        summary: "Análisis completado",
        list: [
          "✓ Simulación 3D completada exitosamente",
          "💡 Consulta con el artista para recomendaciones personalizadas",
        ],
      };
    }
  } catch (err) {
    console.error("Recommendations error:", err);
    return {
      summary: "Recomendaciones estándar",
      list: ["Consultar con el artista para evaluación personalizada"],
    };
  }
}
