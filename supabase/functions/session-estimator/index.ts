import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== MULTIPLIER CONSTANTS ==========
const COMPLEXITY_MULTIPLIERS = {
  simple: 1.0,
  moderate: 1.5,
  detailed: 2.0,
  intricate: 2.5,
  hyper_detailed: 3.0
};

const STYLE_BASE_SPEEDS = {
  geometric: 25,
  micro_realism: 12,
  fine_line: 30,
  traditional: 20,
  neo_traditional: 18,
  blackwork: 22,
  watercolor: 15,
  trash_polka: 16,
  dotwork: 10,
  default: 20
};

const LOCATION_CURVATURE = {
  flat_areas: { forearm_outer: 1.0, thigh_front: 1.0, back_center: 1.0, chest_flat: 1.0 },
  moderate_curve: { shoulder: 1.2, calf: 1.2, upper_arm: 1.15, hip: 1.25 },
  high_curve: { elbow: 1.5, knee: 1.5, ankle: 1.4, wrist: 1.3, ribs: 1.4, spine: 1.35 },
  extreme: { fingers: 1.8, toes: 1.8, neck: 1.6, sternum: 1.5 }
};

const SKIN_ADJUSTMENTS = {
  fitzpatrick_1_2: 1.0,
  fitzpatrick_3_4: 1.15,
  fitzpatrick_5_6: 1.3,
  young: 1.0,
  mature: 1.2,
  aged: 1.35,
  keloid_prone: 1.5,
  sensitive: 1.25
};

const COLOR_MULTIPLIERS = {
  black_grey: 1.0,
  single_color: 1.15,
  limited_palette: 1.3,
  full_color: 1.6,
  color_realism: 2.0
};

const PAIN_TOLERANCE_ADJUSTMENT = {
  high: 0.9,
  normal: 1.0,
  low: 1.15,
  very_low: 1.3
};

// ========== HELPER FUNCTIONS ==========

function getCurvatureMultiplier(placement: string): number {
  const normalized = placement.toLowerCase().replace(/[_\s-]/g, '_');
  
  for (const [category, locations] of Object.entries(LOCATION_CURVATURE)) {
    for (const [loc, mult] of Object.entries(locations)) {
      if (normalized.includes(loc) || loc.includes(normalized)) {
        return mult as number;
      }
    }
  }
  return 1.1; // Default moderate
}

function getStyleSpeed(style: string, artistConfig: any): number {
  const normalized = style.toLowerCase().replace(/[_\s-]/g, '_');
  
  // Check artist custom config first
  if (artistConfig) {
    if (normalized.includes('geometric') && artistConfig.geometric_speed_cm2_hour) {
      return artistConfig.geometric_speed_cm2_hour;
    }
    if (normalized.includes('micro') && artistConfig.micro_realism_speed_cm2_hour) {
      return artistConfig.micro_realism_speed_cm2_hour;
    }
    if (normalized.includes('fine') && artistConfig.fine_line_speed_cm2_hour) {
      return artistConfig.fine_line_speed_cm2_hour;
    }
    if (normalized.includes('color') && artistConfig.color_speed_cm2_hour) {
      return artistConfig.color_speed_cm2_hour;
    }
    if (artistConfig.default_speed_cm2_hour) {
      return artistConfig.default_speed_cm2_hour;
    }
  }
  
  // Fall back to base speeds
  for (const [styleKey, speed] of Object.entries(STYLE_BASE_SPEEDS)) {
    if (normalized.includes(styleKey)) {
      return speed;
    }
  }
  return STYLE_BASE_SPEEDS.default;
}

function getComplexityMultiplier(complexity: string | number): number {
  if (typeof complexity === 'number') {
    if (complexity <= 1) return 1.0;
    if (complexity <= 2) return 1.5;
    if (complexity <= 3) return 2.0;
    if (complexity <= 4) return 2.5;
    return 3.0;
  }
  return COMPLEXITY_MULTIPLIERS[complexity as keyof typeof COMPLEXITY_MULTIPLIERS] || 1.5;
}

function getSkinAdjustment(skinTone?: string, clientAge?: string, skinConditions?: string[]): number {
  let adjustment = 1.0;
  
  if (skinTone) {
    const tone = skinTone.toLowerCase();
    if (tone.includes('5') || tone.includes('6') || tone.includes('dark')) {
      adjustment *= 1.3;
    } else if (tone.includes('3') || tone.includes('4') || tone.includes('medium')) {
      adjustment *= 1.15;
    }
  }
  
  if (clientAge) {
    const age = clientAge.toLowerCase();
    if (age.includes('50') || age.includes('60') || age.includes('mature') || age.includes('aged')) {
      adjustment *= 1.25;
    } else if (age.includes('40') || age.includes('adult')) {
      adjustment *= 1.1;
    }
  }
  
  if (skinConditions) {
    if (skinConditions.some(c => c.toLowerCase().includes('keloid'))) {
      adjustment *= 1.5;
    }
    if (skinConditions.some(c => c.toLowerCase().includes('sensitive'))) {
      adjustment *= 1.2;
    }
  }
  
  return adjustment;
}

function getColorMultiplier(colorType: string): number {
  const normalized = colorType.toLowerCase().replace(/[_\s-]/g, '_');
  
  if (normalized.includes('realism') && normalized.includes('color')) return 2.0;
  if (normalized.includes('full') || normalized.includes('vibrant')) return 1.6;
  if (normalized.includes('limited') || normalized.includes('palette')) return 1.3;
  if (normalized.includes('single') || normalized.includes('accent')) return 1.15;
  if (normalized.includes('black') || normalized.includes('grey') || normalized.includes('gray')) return 1.0;
  
  return 1.0;
}

function inchesToCm2(sizeInches: number): number {
  // Assuming square-ish design, convert diameter to area
  const sizeCm = sizeInches * 2.54;
  return Math.PI * Math.pow(sizeCm / 2, 2);
}

// ========== ML ADJUSTMENT FUNCTION ==========

async function getMLAdjustment(
  supabase: any,
  artistId: string,
  style: string,
  placement: string,
  sizeCm2: number
): Promise<{ adjustment: number; dataPoints: number; avgAccuracy: number }> {
  try {
    // Query historical data for similar tattoos
    const { data: pastSessions, error } = await supabase
      .from('past_sessions')
      .select('*')
      .eq('artist_id', artistId)
      .not('estimation_accuracy', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error || !pastSessions || pastSessions.length < 5) {
      return { adjustment: 1.0, dataPoints: 0, avgAccuracy: 0 };
    }
    
    // Filter similar tattoos
    const similar = pastSessions.filter((s: any) => {
      const styleMatch = s.design_style?.toLowerCase().includes(style.toLowerCase().split(' ')[0]);
      const placementMatch = s.placement?.toLowerCase().includes(placement.toLowerCase().split('_')[0]);
      const sizeMatch = Math.abs((s.design_size_cm2 || 0) - sizeCm2) < sizeCm2 * 0.5;
      return styleMatch || placementMatch || sizeMatch;
    });
    
    if (similar.length < 3) {
      return { adjustment: 1.0, dataPoints: similar.length, avgAccuracy: 0 };
    }
    
    // Calculate average estimation accuracy and derive adjustment
    const accuracies = similar
      .filter((s: any) => s.estimation_accuracy)
      .map((s: any) => s.estimation_accuracy);
    
    const avgAccuracy = accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length;
    
    // If we typically underestimate, increase; if overestimate, decrease
    const avgEstimated = similar.reduce((sum: number, s: any) => 
      sum + ((s.estimated_hours_min + s.estimated_hours_max) / 2 || 0), 0) / similar.length;
    const avgActual = similar.reduce((sum: number, s: any) => 
      sum + (s.actual_hours || 0), 0) / similar.length;
    
    let adjustment = 1.0;
    if (avgEstimated > 0 && avgActual > 0) {
      adjustment = avgActual / avgEstimated;
      // Clamp adjustment to reasonable range
      adjustment = Math.max(0.7, Math.min(1.5, adjustment));
    }
    
    return { adjustment, dataPoints: similar.length, avgAccuracy };
  } catch (e) {
    console.error('ML adjustment error:', e);
    return { adjustment: 1.0, dataPoints: 0, avgAccuracy: 0 };
  }
}

// ========== AI REFINEMENT ==========

async function getAIRefinement(
  inputs: any,
  baseEstimate: any,
  apiKey: string
): Promise<{ refinedHours?: number; insights: string[]; confidence_boost: number }> {
  try {
    const prompt = `You are an expert tattoo session estimator. Analyze this estimation and provide refinements.

INPUT DATA:
- Design: ${inputs.design_description || 'Not specified'}
- Style: ${inputs.design_style}
- Size: ${inputs.size_cm2} cm² (${inputs.size_inches || 'unknown'} inches)
- Placement: ${inputs.placement}
- Complexity: ${inputs.complexity}
- Color: ${inputs.color_type}
- Client skin tone: ${inputs.skin_tone || 'unknown'}
- Client pain tolerance: ${inputs.pain_tolerance || 'normal'}
- Movement risk from simulator: ${inputs.movement_distortion_risk || 'unknown'}
- Curvature score: ${inputs.curvature_score || 'unknown'}

BASE ESTIMATION:
- Hours range: ${baseEstimate.total_hours_min}-${baseEstimate.total_hours_max}
- Sessions: ${baseEstimate.sessions_estimate}
- Formula confidence: ${baseEstimate.formula_confidence}%

Provide a JSON response with:
1. "refined_hours_adjustment": number (-2 to +2, how many hours to add/subtract)
2. "insights": array of 2-3 specific observations
3. "confidence_boost": number (0-10, how much to boost confidence based on clarity of inputs)
4. "risk_factors": array of any additional risks identified
5. "recommendations": 1-2 specific recommendations

Be precise and practical. Consider healing, detail density, and session fatigue.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ferunda.tattoo'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error('AI refinement failed');
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);
    
    return {
      refinedHours: content.refined_hours_adjustment || 0,
      insights: content.insights || [],
      confidence_boost: content.confidence_boost || 0
    };
  } catch (e) {
    console.error('AI refinement error:', e);
    return { insights: [], confidence_boost: 0 };
  }
}

// ========== MAIN ESTIMATION FUNCTION ==========

interface EstimationInput {
  // Design factors
  size_inches?: number;
  size_cm2?: number;
  design_style: string;
  complexity: string | number;
  color_type: string;
  design_description?: string;
  reference_image_analysis?: any;
  
  // Location factors
  placement: string;
  curvature_score?: number;
  movement_distortion_risk?: number;
  blowout_risk?: number;
  
  // Client factors
  skin_tone?: string;
  client_age?: string;
  pain_tolerance?: string;
  is_first_tattoo?: boolean;
  skin_conditions?: string[];
  
  // Context
  artist_id?: string;
  conversation_id?: string;
  is_coverup?: boolean;
  is_rework?: boolean;
}

async function estimateSession(
  supabase: any,
  inputs: EstimationInput,
  artistConfig: any,
  apiKey?: string
): Promise<any> {
  const reasoningSteps: string[] = [];
  const breakdowns: any[] = [];
  
  // Step 1: Calculate size in cm²
  let sizeCm2 = inputs.size_cm2 || 0;
  if (!sizeCm2 && inputs.size_inches) {
    sizeCm2 = inchesToCm2(inputs.size_inches);
  }
  if (!sizeCm2) sizeCm2 = 50; // Default ~3 inch diameter
  
  reasoningSteps.push(`Paso 1: Tamaño = ${sizeCm2.toFixed(1)} cm²`);
  
  // Step 2: Get base speed for style
  const baseSpeed = getStyleSpeed(inputs.design_style, artistConfig);
  reasoningSteps.push(`Paso 2: Velocidad base para ${inputs.design_style} = ${baseSpeed} cm²/hora`);
  
  // Step 3: Calculate complexity multiplier
  const complexityMult = getComplexityMultiplier(inputs.complexity);
  reasoningSteps.push(`Paso 3: Multiplicador complejidad (${inputs.complexity}) = ${complexityMult}x`);
  breakdowns.push({ factor: 'Complejidad', multiplier: complexityMult });
  
  // Step 4: Location/curvature adjustment
  let curvatureMult = inputs.curvature_score ? (1 + (inputs.curvature_score - 1) * 0.2) : getCurvatureMultiplier(inputs.placement);
  reasoningSteps.push(`Paso 4: Curvatura ${inputs.placement} = ${curvatureMult.toFixed(2)}x`);
  breakdowns.push({ factor: 'Ubicación/Curvatura', multiplier: curvatureMult });
  
  // Step 5: Movement distortion risk (from simulator)
  let movementAdjust = 1.0;
  if (inputs.movement_distortion_risk && inputs.movement_distortion_risk > 5) {
    movementAdjust = 1 + ((inputs.movement_distortion_risk - 5) * 0.05);
    reasoningSteps.push(`Paso 5: Riesgo movimiento (${inputs.movement_distortion_risk}/10) = +${((movementAdjust - 1) * 100).toFixed(0)}%`);
    breakdowns.push({ factor: 'Riesgo distorsión', multiplier: movementAdjust, added_hours: ((movementAdjust - 1) * sizeCm2 / baseSpeed).toFixed(1) });
  } else {
    reasoningSteps.push(`Paso 5: Riesgo movimiento = normal`);
  }
  
  // Step 6: Skin adjustment
  const skinAdjust = getSkinAdjustment(inputs.skin_tone, inputs.client_age, inputs.skin_conditions);
  reasoningSteps.push(`Paso 6: Ajuste piel = ${skinAdjust.toFixed(2)}x`);
  if (skinAdjust > 1) {
    breakdowns.push({ factor: 'Tipo de piel', multiplier: skinAdjust });
  }
  
  // Step 7: Color adjustment
  const colorMult = getColorMultiplier(inputs.color_type);
  reasoningSteps.push(`Paso 7: Color (${inputs.color_type}) = ${colorMult}x`);
  breakdowns.push({ factor: 'Color', multiplier: colorMult });
  
  // Step 8: Pain tolerance adjustment
  const painMult = PAIN_TOLERANCE_ADJUSTMENT[inputs.pain_tolerance as keyof typeof PAIN_TOLERANCE_ADJUSTMENT] || 1.0;
  if (painMult !== 1.0) {
    reasoningSteps.push(`Paso 8: Tolerancia dolor (${inputs.pain_tolerance}) = ${painMult}x`);
    breakdowns.push({ factor: 'Tolerancia dolor', multiplier: painMult });
  }
  
  // Step 9: Special work types
  let specialMult = 1.0;
  if (inputs.is_coverup) {
    specialMult *= artistConfig?.coverup_multiplier || 1.6;
    breakdowns.push({ factor: 'Coverup', multiplier: artistConfig?.coverup_multiplier || 1.6 });
  }
  if (inputs.is_rework) {
    specialMult *= artistConfig?.rework_multiplier || 1.3;
    breakdowns.push({ factor: 'Rework', multiplier: artistConfig?.rework_multiplier || 1.3 });
  }
  
  // Calculate base hours
  const totalMultiplier = complexityMult * curvatureMult * movementAdjust * skinAdjust * colorMult * painMult * specialMult;
  const baseHours = (sizeCm2 * totalMultiplier) / baseSpeed;
  
  // Add 10% buffer for breaks/setup
  const bufferedHours = baseHours * 1.1;
  
  reasoningSteps.push(`Cálculo: (${sizeCm2.toFixed(1)} cm² × ${totalMultiplier.toFixed(2)}) / ${baseSpeed} cm²/h = ${baseHours.toFixed(1)}h + 10% buffer = ${bufferedHours.toFixed(1)}h`);
  
  // Step 10: ML adjustment
  let mlAdjustment = { adjustment: 1.0, dataPoints: 0, avgAccuracy: 0 };
  if (inputs.artist_id && artistConfig?.ml_learning_enabled) {
    mlAdjustment = await getMLAdjustment(supabase, inputs.artist_id, inputs.design_style, inputs.placement, sizeCm2);
    if (mlAdjustment.dataPoints >= 5) {
      reasoningSteps.push(`Paso 10: ML ajuste basado en ${mlAdjustment.dataPoints} trabajos similares = ${mlAdjustment.adjustment.toFixed(2)}x (precisión histórica: ${mlAdjustment.avgAccuracy.toFixed(0)}%)`);
    }
  }
  
  const adjustedHours = bufferedHours * mlAdjustment.adjustment;
  
  // Calculate hour ranges
  const hoursMin = Math.max(1, adjustedHours * 0.85);
  const hoursMax = adjustedHours * 1.15;
  
  // Calculate sessions
  const maxSessionHours = artistConfig?.max_session_hours || 5;
  const preferredSessionHours = artistConfig?.preferred_session_hours || 4;
  const sessionsMin = Math.ceil(hoursMin / maxSessionHours);
  const sessionsMax = Math.ceil(hoursMax / preferredSessionHours);
  
  // Calculate confidence
  let confidence = 75;
  if (mlAdjustment.dataPoints >= 10) confidence += 10;
  if (mlAdjustment.dataPoints >= 20) confidence += 5;
  if (inputs.reference_image_analysis) confidence += 5;
  if (inputs.curvature_score) confidence += 3;
  confidence = Math.min(98, confidence);
  
  // Revenue forecast
  const hourlyRate = artistConfig?.hourly_rate || 200;
  const revenueMin = hoursMin * hourlyRate;
  const revenueMax = hoursMax * hourlyRate;
  const depositPercentage = artistConfig?.deposit_percentage || 30;
  
  // Generate session breakdown
  const sessionBreakdown: any[] = [];
  const avgSessionHours = (hoursMin + hoursMax) / 2 / ((sessionsMin + sessionsMax) / 2);
  
  if (sessionsMin >= 1) {
    sessionBreakdown.push({ session: 1, description: 'Outline + base', hours: `${Math.min(avgSessionHours, 4).toFixed(1)}h` });
  }
  if (sessionsMin >= 2) {
    sessionBreakdown.push({ session: 2, description: 'Shading + detalle', hours: `${Math.min(avgSessionHours, 4).toFixed(1)}h` });
  }
  if (sessionsMin >= 3) {
    sessionBreakdown.push({ session: 3, description: 'Finishing + toques', hours: `${Math.min(avgSessionHours, 4).toFixed(1)}h` });
  }
  for (let i = 4; i <= sessionsMax; i++) {
    sessionBreakdown.push({ session: i, description: 'Sesión adicional', hours: `${Math.min(avgSessionHours, 4).toFixed(1)}h` });
  }
  
  // Recommendations
  const recommendations: string[] = [];
  if (sessionsMax > 3) {
    recommendations.push('Divide en sesiones más cortas para mejor healing');
  }
  if (inputs.skin_tone?.includes('5') || inputs.skin_tone?.includes('6')) {
    recommendations.push('Considera sesiones más cortas para pieles oscuras');
  }
  if (inputs.pain_tolerance === 'low' || inputs.pain_tolerance === 'very_low') {
    recommendations.push('Programa breaks frecuentes para máximo comfort');
  }
  if (sessionsMin >= (artistConfig?.upsell_threshold_sessions || 3)) {
    recommendations.push(`Upsell: Ofrece aftercare package para proyecto multi-sesión (+${Math.round(revenueMin * 0.15)} EUR)`);
  }
  
  // Risk factors
  const riskFactors: any[] = [];
  if (inputs.movement_distortion_risk && inputs.movement_distortion_risk > 7) {
    riskFactors.push({ name: 'Alto riesgo distorsión', impact: '+15% tiempo, requiere precisión extra' });
  }
  if (inputs.blowout_risk && inputs.blowout_risk > 0.6) {
    riskFactors.push({ name: 'Riesgo blowout elevado', impact: 'Técnica conservadora requerida' });
  }
  if (skinAdjust > 1.3) {
    riskFactors.push({ name: 'Piel requiere cuidado especial', impact: 'Sesiones más cortas recomendadas' });
  }
  
  // AI refinement (if API key available)
  let aiInsights: string[] = [];
  if (apiKey) {
    const aiResult = await getAIRefinement(
      { ...inputs, size_cm2: sizeCm2 },
      { total_hours_min: hoursMin, total_hours_max: hoursMax, sessions_estimate: `${sessionsMin}-${sessionsMax}`, formula_confidence: confidence },
      apiKey
    );
    aiInsights = aiResult.insights;
    confidence = Math.min(98, confidence + aiResult.confidence_boost);
  }
  
  return {
    // Core estimation
    total_hours_range: `${hoursMin.toFixed(1)}-${hoursMax.toFixed(1)}`,
    total_hours_min: parseFloat(hoursMin.toFixed(1)),
    total_hours_max: parseFloat(hoursMax.toFixed(1)),
    sessions_estimate: sessionsMin === sessionsMax ? `${sessionsMin}` : `${sessionsMin}-${sessionsMax}`,
    sessions_min: sessionsMin,
    sessions_max: sessionsMax,
    session_length: `${preferredSessionHours}h cada una`,
    
    // Breakdowns
    breakdowns,
    session_breakdown: sessionBreakdown,
    reasoning_steps: reasoningSteps,
    
    // Confidence
    confidence: Math.round(confidence),
    ml_data_points: mlAdjustment.dataPoints,
    ml_historical_accuracy: mlAdjustment.avgAccuracy ? `${mlAdjustment.avgAccuracy.toFixed(0)}%` : null,
    
    // Revenue
    revenue_forecast: {
      estimated_range: `${revenueMin.toFixed(0)}-${revenueMax.toFixed(0)} EUR`,
      min: revenueMin,
      max: revenueMax,
      deposit_amount: `${(revenueMin * depositPercentage / 100).toFixed(0)} EUR`,
      hourly_rate: hourlyRate
    },
    
    // Insights
    recommendations,
    risk_factors: riskFactors,
    ai_insights: aiInsights,
    
    // Metadata
    calculation_version: '2.0',
    calculated_at: new Date().toISOString()
  };
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body = await req.json();
    const { action, inputs, artist_id, conversation_id, booking_id } = body;
    
    console.log('Session Estimator called:', { action, artist_id, inputs: JSON.stringify(inputs).slice(0, 200) });
    
    // Fetch artist config
    let artistConfig = null;
    if (artist_id) {
      const { data } = await supabase
        .from('artist_session_config')
        .select('*')
        .eq('artist_id', artist_id)
        .single();
      artistConfig = data;
    }
    
    if (action === 'estimate') {
      const estimation = await estimateSession(supabase, inputs, artistConfig, apiKey);
      
      // Log estimation for audit
      const auditHash = btoa(JSON.stringify({ inputs, estimation, timestamp: Date.now() })).slice(0, 64);
      
      await supabase
        .from('session_estimation_logs')
        .insert({
          conversation_id,
          booking_id,
          artist_id,
          input_data: inputs,
          estimation_result: estimation,
          confidence_score: estimation.confidence,
          reasoning_steps: estimation.reasoning_steps,
          revenue_forecast: estimation.revenue_forecast,
          ml_adjustments: {
            data_points: estimation.ml_data_points,
            historical_accuracy: estimation.ml_historical_accuracy
          },
          audit_hash: auditHash
        });
      
      return new Response(JSON.stringify({
        success: true,
        estimation,
        audit_hash: auditHash
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'record_actual') {
      // Record actual session data for ML learning
      const { past_session_data } = body;
      
      const { error } = await supabase
        .from('past_sessions')
        .insert({
          artist_id,
          booking_id,
          ...past_session_data
        });
      
      if (error) throw error;
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Session data recorded for ML learning'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'get_config') {
      return new Response(JSON.stringify({
        success: true,
        config: artistConfig || {
          default_speed_cm2_hour: 20,
          max_session_hours: 5,
          preferred_session_hours: 4,
          hourly_rate: 200
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'update_config') {
      const { config } = body;
      
      if (artistConfig) {
        await supabase
          .from('artist_session_config')
          .update(config)
          .eq('artist_id', artist_id);
      } else {
        await supabase
          .from('artist_session_config')
          .insert({ artist_id, ...config });
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Config updated'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid action',
      valid_actions: ['estimate', 'record_actual', 'get_config', 'update_config']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Session Estimator error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
