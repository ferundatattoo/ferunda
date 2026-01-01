import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface DesignBrief {
  placement_zone: string | null;
  size_category: string | null;
  size_cm: number | null;
  style_tags: string[];
  color_mode: string | null;
  accent_color: string | null;
  concept_summary: string | null;
  is_sleeve: boolean;
  sleeve_type: string | null;
  sleeve_theme: string | null;
  elements_json: { hero: string[]; secondary: string[]; fillers: string[] };
  references_count: number;
  placement_photo_present: boolean;
  existing_tattoos_present: boolean;
  timeline_preference: string | null;
  budget_range: string | null;
}

interface IntentFlags {
  preview_request: boolean;
  doubt: boolean;
  urgency: boolean;
  comparison: boolean;
}

interface ActionCard {
  type: 'button' | 'wizard' | 'chooser';
  label: string;
  action_key: string;
  enabled: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

// Supabase client
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Check if mock mode is enabled
async function isMockMode(supabase: ReturnType<typeof getSupabaseClient>, workspaceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('workspace_id', workspaceId)
    .eq('key', 'DESIGN_COMPILER_MOCK_MODE')
    .single();
  
  return data?.enabled ?? false;
}

// Get feature flag
async function getFeatureFlag(supabase: ReturnType<typeof getSupabaseClient>, workspaceId: string, key: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('workspace_id', workspaceId)
    .eq('key', key)
    .single();
  
  return data?.enabled ?? false;
}

// Get offer policy
async function getOfferPolicy(supabase: ReturnType<typeof getSupabaseClient>, workspaceId: string) {
  const { data } = await supabase
    .from('concierge_offer_policy')
    .select('policy_json')
    .eq('workspace_id', workspaceId)
    .single();
  
  return data?.policy_json ?? {
    min_messages_before_preview_offer: 5,
    preview_offer_cooldown_minutes: 30,
    max_preview_offers_per_session: 3,
    sleeve_requires_min_references: 8,
    single_requires_min_references: 3,
    require_placement_photo_for_ar_live: true,
    single_readiness_threshold: 0.75,
    sleeve_readiness_threshold: 0.85,
    preview_request_threshold: 0.55,
    sleeve_preview_request_threshold: 0.70
  };
}

// Detect intent from message
function detectIntent(message: string): IntentFlags {
  const lower = message.toLowerCase();
  
  return {
    preview_request: /quiero ver|want to see|how would|cómo queda|preview|visualiz|try.?on|probar|before.*book|antes.*reserv|antes.*agendar/.test(lower),
    doubt: /no estoy seguro|not sure|duda|doubt|unsure|maybe|quizás|tal vez|pensando|thinking|consider/.test(lower),
    urgency: /urgente|urgent|asap|pronto|soon|esta semana|this week|rápido|quick|cuanto antes/.test(lower),
    comparison: /comparar|compare|vs|versus|diferencia|difference|cual es mejor|which is better|opciones|options/.test(lower)
  };
}

// Calculate readiness score
function calculateReadiness(brief: DesignBrief): number {
  let score = 0;
  
  if (brief.is_sleeve) {
    // Sleeve scoring (stricter requirements)
    if (brief.sleeve_type) score += 0.10;
    if (brief.sleeve_theme) score += 0.10;
    if (brief.placement_zone) score += 0.05;
    if (brief.placement_photo_present) score += 0.15;
    if (brief.elements_json.hero.length >= 1) score += 0.10;
    if (brief.elements_json.secondary.length >= 1) score += 0.10;
    if (brief.elements_json.fillers.length >= 1) score += 0.10;
    score += Math.min(brief.references_count * 0.0375, 0.30); // Max 0.30 for 8+ refs
  } else {
    // Single piece scoring
    if (brief.placement_zone) score += 0.20;
    if (brief.size_category || brief.size_cm) score += 0.15;
    if (brief.style_tags.length >= 1) score += 0.15;
    if (brief.concept_summary) score += 0.20;
    score += Math.min(brief.references_count * 0.10, 0.30); // Max 0.30 for 3+ refs
  }
  
  return Math.min(score, 1.0);
}

// Check if sketch can be offered
function canOfferSketch(
  session: { stage: string; readiness_score: number; intent_flags_json: IntentFlags; sketch_offer_cooldown_until: string | null; max_offers_reached: boolean; design_brief_json: DesignBrief },
  policy: Record<string, number | boolean>
): { canOffer: boolean; reason: string; missing: string[] } {
  const brief = session.design_brief_json;
  const isSleeve = brief.is_sleeve;
  const missing: string[] = [];
  
  // Check cooldown
  if (session.sketch_offer_cooldown_until && new Date(session.sketch_offer_cooldown_until) > new Date()) {
    return { canOffer: false, reason: 'Cooldown activo', missing: [] };
  }
  
  // Check max offers
  if (session.max_offers_reached) {
    return { canOffer: false, reason: 'Máximo de ofertas alcanzado', missing: [] };
  }
  
  // Determine threshold
  let threshold: number;
  const advancedStages = ['design_alignment', 'preview_ready', 'scheduling', 'deposit', 'confirmed'];
  
  if (advancedStages.includes(session.stage)) {
    threshold = isSleeve 
      ? (policy.sleeve_readiness_threshold as number) 
      : (policy.single_readiness_threshold as number);
  } else if (session.intent_flags_json.preview_request || session.intent_flags_json.doubt) {
    threshold = isSleeve 
      ? (policy.sleeve_preview_request_threshold as number) 
      : (policy.preview_request_threshold as number);
  } else {
    return { canOffer: false, reason: 'La conversación aún no está lista para preview', missing: [] };
  }
  
  // Check readiness
  if (session.readiness_score < threshold) {
    // Calculate missing items
    if (isSleeve) {
      if (!brief.sleeve_type) missing.push('tipo de manga');
      const minRefs = policy.sleeve_requires_min_references as number;
      if (brief.references_count < minRefs) {
        missing.push(`${minRefs - brief.references_count} referencias más`);
      }
      if (!brief.placement_photo_present) missing.push('foto del área');
      if (brief.elements_json.hero.length === 0) missing.push('elemento principal');
    } else {
      const minRefs = policy.single_requires_min_references as number;
      if (brief.references_count < minRefs) {
        missing.push(`${minRefs - brief.references_count} referencias más`);
      }
      if (!brief.placement_zone) missing.push('ubicación');
      if (!brief.concept_summary) missing.push('descripción del concepto');
    }
    
    return { 
      canOffer: false, 
      reason: `Readiness ${(session.readiness_score * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%`, 
      missing 
    };
  }
  
  return { canOffer: true, reason: 'Listo para preview', missing: [] };
}

// Generate action cards based on session state
async function generateActionCards(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string
): Promise<ActionCard[]> {
  const actions: ActionCard[] = [];
  
  const { data: session } = await supabase
    .from('concierge_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (!session) return actions;
  
  const policy = await getOfferPolicy(supabase, session.workspace_id);
  const checkResult = canOfferSketch(session, policy);
  const brief = session.design_brief_json as DesignBrief;
  
  // Generate Sketch button
  actions.push({
    type: 'button',
    label: brief.is_sleeve ? 'Generate Sleeve Concept' : 'Generate Sketch Preview',
    action_key: 'generate_sketch',
    enabled: checkResult.canOffer,
    reason: checkResult.canOffer 
      ? 'Ready for high-quality preview' 
      : checkResult.missing.length > 0 
        ? `Falta: ${checkResult.missing.join(', ')}`
        : checkResult.reason
  });
  
  // AR Try-on button (requires placement photo)
  const arEnabled = checkResult.canOffer && brief.placement_photo_present;
  actions.push({
    type: 'button',
    label: 'AR Try-On',
    action_key: 'ar_tryon',
    enabled: arEnabled,
    reason: arEnabled 
      ? 'Visualiza el diseño en tu cuerpo' 
      : !brief.placement_photo_present 
        ? 'Sube una foto del área para AR' 
        : checkResult.reason
  });
  
  // Add reference wizard if needed
  const minRefs = brief.is_sleeve ? (policy.sleeve_requires_min_references as number) : (policy.single_requires_min_references as number);
  if (brief.references_count < minRefs) {
    actions.push({
      type: 'wizard',
      label: 'Add References',
      action_key: 'add_references',
      enabled: true,
      reason: `${minRefs - brief.references_count} referencias más para un preview de calidad`,
      metadata: { needed: minRefs - brief.references_count }
    });
  }
  
  return actions;
}

// Process uploaded image
async function processVisionAsset(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  imageUrl: string,
  assetType: string,
  mockMode: boolean
): Promise<{ assetId: string; extraction?: Record<string, unknown> }> {
  // Create vision asset record
  const { data: asset, error } = await supabase
    .from('vision_assets')
    .insert({
      session_id: sessionId,
      asset_type: assetType,
      storage_url: imageUrl,
      metadata_json: {}
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Quality check (mock or real)
  const qualityResult = mockMode 
    ? { score: 0.85, issues: [] }
    : await runVisionQualityCheck(imageUrl);
  
  await supabase
    .from('vision_assets')
    .update({ 
      quality_score: qualityResult.score,
      quality_issues: qualityResult.issues
    })
    .eq('id', asset.id);
  
  // If it's a reference image with tattoo-on-body, extract it
  if (assetType === 'reference_image') {
    const extraction = mockMode
      ? {
          body_part: 'forearm',
          quality_score: 0.82,
          tattoo_cutout_png_url: 'https://placeholder.co/400x400?text=Cutout',
          tattoo_mask_url: 'https://placeholder.co/400x400?text=Mask',
          tattoo_unwarped_png_url: 'https://placeholder.co/400x400?text=Unwarped'
        }
      : await runTattooExtraction(asset.id, imageUrl);
    
    await supabase
      .from('vision_extractions')
      .insert({
        asset_id: asset.id,
        session_id: sessionId,
        status: 'done',
        ...extraction
      });
    
    return { assetId: asset.id, extraction };
  }
  
  return { assetId: asset.id };
}

// Stub: Vision quality check
async function runVisionQualityCheck(imageUrl: string) {
  // Would call SAM2_ENDPOINT or similar
  console.log(`[Vision] Quality check for ${imageUrl}`);
  return { score: 0.8, issues: [] };
}

// Stub: Tattoo extraction
async function runTattooExtraction(assetId: string, imageUrl: string) {
  // Would call SAM2 + body parsing + unwarp
  console.log(`[Vision] Extracting tattoo from ${imageUrl}`);
  return {
    body_part: 'forearm',
    quality_score: 0.75,
    tattoo_cutout_png_url: null,
    tattoo_mask_url: null,
    tattoo_unwarped_png_url: null
  };
}

// Generate concept with ensemble
async function generateConcept(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  mockMode: boolean
): Promise<{ jobId: string; variants: Array<{ id: string; image_url: string; scores: Record<string, number> }> }> {
  const { data: session } = await supabase
    .from('concierge_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (!session) throw new Error('Session not found');
  
  // Create ensemble run
  const { data: run } = await supabase
    .from('ensemble_runs')
    .insert({
      session_id: sessionId,
      status: 'running',
      strategy_json: { providers: ['lovable_ai', 'openai', 'gemini'] }
    })
    .select()
    .single();
  
  // Create job
  const { data: job } = await supabase
    .from('concierge_jobs')
    .insert({
      session_id: sessionId,
      job_type: 'concept',
      status: 'running',
      inputs_json: { brief: session.design_brief_json }
    })
    .select()
    .single();
  
  // Generate variants (mock or real)
  const variants = mockMode
    ? await generateMockVariants(supabase, run.id, sessionId, 6)
    : await generateRealVariants(supabase, run.id, sessionId, session.design_brief_json);
  
  // Update job
  await supabase
    .from('concierge_jobs')
    .update({ 
      status: 'done',
      outputs_json: { variants: variants.map(v => v.id) }
    })
    .eq('id', job.id);
  
  // Update ensemble run
  await supabase
    .from('ensemble_runs')
    .update({ status: 'done' })
    .eq('id', run.id);
  
  return { jobId: job.id, variants };
}

async function generateMockVariants(
  supabase: ReturnType<typeof getSupabaseClient>,
  runId: string,
  sessionId: string,
  count: number
) {
  const variants = [];
  
  for (let i = 0; i < count; i++) {
    const scores = {
      style_alignment_score: 0.7 + Math.random() * 0.3,
      clarity_score: 0.75 + Math.random() * 0.25,
      uniqueness_score: 0.8 + Math.random() * 0.2,
      ar_fitness_score: 0.7 + Math.random() * 0.3
    };
    
    const { data } = await supabase
      .from('concept_variants')
      .insert({
        job_id: runId,
        session_id: sessionId,
        idx: i,
        image_url: `https://placeholder.co/800x800?text=Concept+${i + 1}`,
        scores_json: scores
      })
      .select()
      .single();
    
    // Create ensemble candidate
    await supabase
      .from('ensemble_candidates')
      .insert({
        run_id: runId,
        provider: 'mock',
        model: 'mock-v1',
        image_url: data.image_url,
        scores_json: scores,
        verdict: Object.values(scores).every(s => s > 0.7) ? 'pass' : 'fail',
        rank: i + 1
      });
    
    variants.push({ id: data.id, image_url: data.image_url, scores });
  }
  
  return variants;
}

async function generateRealVariants(
  supabase: ReturnType<typeof getSupabaseClient>,
  runId: string,
  sessionId: string,
  brief: DesignBrief
) {
  console.log('[Concept] Generating real variants with Lovable AI for brief:', brief);
  
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log('[Concept] No LOVABLE_API_KEY, falling back to mock');
    return generateMockVariants(supabase, runId, sessionId, 6);
  }

  const variants = [];
  const styleVariations = [
    { style: 'fineline', desc: 'minimalist fine line' },
    { style: 'bold', desc: 'bold traditional' },
    { style: 'geometric', desc: 'geometric precision' },
    { style: 'organic', desc: 'organic flowing' },
    { style: 'blackwork', desc: 'blackwork solid' },
    { style: 'dotwork', desc: 'dotwork stippling' },
  ];

  for (let i = 0; i < 6; i++) {
    try {
      const variation = styleVariations[i];
      const prompt = `Create a professional tattoo design sketch:
Style: ${variation.desc}
Concept: ${brief.concept_summary || 'artistic tattoo design'}
Elements: ${brief.elements_json?.hero?.join(', ') || 'custom design'}
Placement: ${brief.placement_zone || 'arm'}
Size: ${brief.size_category || 'medium'}

Requirements: Clean black linework, suitable for stencil transfer, high contrast`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            { role: "system", content: "You are a professional tattoo sketch artist." },
            { role: "user", content: prompt }
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        console.error(`[Concept] AI error for variant ${i}:`, response.status);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Extract image URL or base64
      let imageUrl = `https://placeholder.co/800x800?text=Variant+${i + 1}`;
      const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (base64Match) {
        imageUrl = base64Match[0];
      } else {
        const urlMatch = content.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp)/i);
        if (urlMatch) imageUrl = urlMatch[0];
      }

      const scores = {
        style_alignment_score: 0.8 + Math.random() * 0.2,
        clarity_score: 0.85 + Math.random() * 0.15,
        uniqueness_score: 0.75 + Math.random() * 0.25,
        ar_fitness_score: 0.8 + Math.random() * 0.2
      };

      const { data: variant } = await supabase
        .from('concept_variants')
        .insert({
          job_id: runId,
          session_id: sessionId,
          idx: i,
          image_url: imageUrl,
          scores_json: scores
        })
        .select()
        .single();

      await supabase.from('ensemble_candidates').insert({
        run_id: runId,
        provider: 'lovable_ai',
        model: 'gemini-2.5-flash-image',
        image_url: imageUrl,
        scores_json: scores,
        verdict: Object.values(scores).every(s => s > 0.7) ? 'pass' : 'fail',
        rank: i + 1
      });

      if (variant) {
        variants.push({ id: variant.id, image_url: imageUrl, scores });
      }
    } catch (err) {
      console.error(`[Concept] Error generating variant ${i}:`, err);
    }
  }

  // Fallback to mock if no variants generated
  if (variants.length === 0) {
    return generateMockVariants(supabase, runId, sessionId, 6);
  }

  return variants;
}

// Finalize sketch
async function finalizeSketch(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  variantId: string,
  mockMode: boolean
): Promise<{ sketchId: string; outputs: Record<string, string | null> }> {
  const { data: variant } = await supabase
    .from('concept_variants')
    .select('*')
    .eq('id', variantId)
    .single();
  
  if (!variant) throw new Error('Variant not found');
  
  // Create finalization job
  const { data: job } = await supabase
    .from('concierge_jobs')
    .insert({
      session_id: sessionId,
      job_type: 'sketch',
      status: 'running',
      inputs_json: { variant_id: variantId }
    })
    .select()
    .single();
  
  // Generate outputs
  const outputs = mockMode
    ? {
        lineart_png_url: `https://placeholder.co/1200x1200?text=Lineart`,
        overlay_png_url: `https://placeholder.co/1200x1200?text=Overlay`,
        svg_url: `https://placeholder.co/1200x1200?text=SVG`
      }
    : await generateSketchOutputs(variant.image_url);
  
  // Create final sketch record
  const { data: sketch } = await supabase
    .from('final_sketches')
    .insert({
      session_id: sessionId,
      chosen_variant_id: variantId,
      ...outputs,
      metadata_json: {
        placement_zone: null,
        recommended_size_cm: null,
        rotation_degrees: 0,
        anchor_points_json: [],
        opacity_default: 0.85
      }
    })
    .select()
    .single();
  
  // Update job
  await supabase
    .from('concierge_jobs')
    .update({ 
      status: 'done',
      outputs_json: { sketch_id: sketch.id, ...outputs }
    })
    .eq('id', job.id);
  
  // Mark variant as chosen
  await supabase
    .from('concept_variants')
    .update({ chosen: true })
    .eq('id', variantId);
  
  return { sketchId: sketch.id, outputs };
}

async function generateSketchOutputs(imageUrl: string) {
  console.log('[Sketch] Generating outputs for:', imageUrl);
  
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { lineart_png_url: null, overlay_png_url: null, svg_url: null };
  }

  try {
    // Generate lineart version
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Convert this tattoo design to clean black lineart suitable for stencil. Output only the processed image." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (base64Match) {
        return {
          lineart_png_url: base64Match[0],
          overlay_png_url: base64Match[0],
          svg_url: null
        };
      }
    }
  } catch (err) {
    console.error('[Sketch] Error generating outputs:', err);
  }

  return { lineart_png_url: imageUrl, overlay_png_url: imageUrl, svg_url: null };
}

// Build AR pack
async function buildARPack(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  sketchId: string,
  mockMode: boolean
): Promise<{ packId: string; assets: Record<string, unknown> }> {
  const { data: sketch } = await supabase
    .from('final_sketches')
    .select('*')
    .eq('id', sketchId)
    .single();
  
  if (!sketch) throw new Error('Sketch not found');
  
  // Create job
  const { data: job } = await supabase
    .from('concierge_jobs')
    .insert({
      session_id: sessionId,
      job_type: 'ar_pack',
      status: 'running',
      inputs_json: { sketch_id: sketchId }
    })
    .select()
    .single();
  
  // Build assets
  const assets = mockMode
    ? {
        overlay_url: sketch.overlay_png_url || 'https://placeholder.co/800x800?text=AR+Overlay',
        anchors: [{ x: 0.5, y: 0.5, type: 'center' }],
        shader_params: { opacity: 0.85, blend_mode: 'multiply' }
      }
    : await buildRealARPack(sketch);
  
  // Create AR pack record
  const { data: pack } = await supabase
    .from('ar_packs')
    .insert({
      session_id: sessionId,
      final_sketch_id: sketchId,
      status: 'done',
      assets_json: assets
    })
    .select()
    .single();
  
  // Update job
  await supabase
    .from('concierge_jobs')
    .update({ 
      status: 'done',
      outputs_json: { pack_id: pack.id, assets }
    })
    .eq('id', job.id);
  
  return { packId: pack.id, assets };
}

async function buildRealARPack(sketch: Record<string, unknown>) {
  console.log('[AR] Building pack for sketch:', sketch);
  return {
    overlay_url: null,
    anchors: [],
    shader_params: {}
  };
}

// Log action
async function logAction(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  actionKey: string,
  payload: Record<string, unknown>
) {
  await supabase
    .from('concierge_actions_log')
    .insert({
      session_id: sessionId,
      action_key: actionKey,
      payload_json: payload
    });
}

// Log AI usage
async function logAIUsage(
  supabase: ReturnType<typeof getSupabaseClient>,
  workspaceId: string,
  sessionId: string,
  taskType: string,
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  latencyMs: number,
  success: boolean,
  error?: string
) {
  await supabase
    .from('ai_runs')
    .insert({
      workspace_id: workspaceId,
      session_id: sessionId,
      task_type: taskType,
      provider,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency_ms: latencyMs,
      cost_estimate: (tokensIn * 0.00001 + tokensOut * 0.00003), // Rough estimate
      success,
      error
    });
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = getSupabaseClient();
    const { action, ...params } = await req.json();
    
    console.log(`[DesignCompiler] Action: ${action}`, params);
    
    let result: Record<string, unknown> = {};
    
    switch (action) {
      // Session management
      case 'create_session': {
        const { workspace_id, conversation_id, artist_id } = params;
        
        const { data, error } = await supabase
          .from('concierge_sessions')
          .insert({
            workspace_id,
            conversation_id,
            artist_id,
            stage: 'discovery'
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Initialize offer policy if not exists
        await supabase
          .from('concierge_offer_policy')
          .upsert({ workspace_id }, { onConflict: 'workspace_id' });
        
        result = { session: data };
        break;
      }
      
      case 'get_session': {
        const { session_id } = params;
        
        const { data, error } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', session_id)
          .single();
        
        if (error) throw error;
        
        result = { session: data };
        break;
      }
      
      case 'update_brief': {
        const { session_id, updates } = params;
        
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('design_brief_json')
          .eq('id', session_id)
          .single();
        
        const newBrief = { ...session?.design_brief_json, ...updates };
        const readiness = calculateReadiness(newBrief);
        
        const { data, error } = await supabase
          .from('concierge_sessions')
          .update({ 
            design_brief_json: newBrief,
            readiness_score: readiness
          })
          .eq('id', session_id)
          .select()
          .single();
        
        if (error) throw error;
        
        result = { session: data, readiness };
        break;
      }
      
      case 'process_message': {
        const { session_id, message, attachments } = params;
        
        // Get session
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', session_id)
          .single();
        
        if (!session) throw new Error('Session not found');
        
        const mockMode = await isMockMode(supabase, session.workspace_id);
        
        // Detect intent
        const intent = detectIntent(message);
        const currentIntent = session.intent_flags_json as IntentFlags;
        const mergedIntent = {
          preview_request: currentIntent.preview_request || intent.preview_request,
          doubt: currentIntent.doubt || intent.doubt,
          urgency: currentIntent.urgency || intent.urgency,
          comparison: currentIntent.comparison || intent.comparison
        };
        
        // Process attachments if any
        let newRefsCount = (session.design_brief_json as DesignBrief).references_count;
        let placementPhotoPresent = (session.design_brief_json as DesignBrief).placement_photo_present;
        
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            await processVisionAsset(supabase, session_id, att.url, att.type, mockMode);
            if (att.type === 'reference_image') newRefsCount++;
            if (att.type === 'placement_photo') placementPhotoPresent = true;
          }
        }
        
        // Update brief with new counts
        const updatedBrief = {
          ...(session.design_brief_json as DesignBrief),
          references_count: newRefsCount,
          placement_photo_present: placementPhotoPresent
        };
        
        // Save message
        await supabase
          .from('concierge_messages')
          .insert({
            session_id,
            role: 'user',
            content: message,
            attachments_json: attachments || [],
            intent_detected: intent
          });
        
        // Update session
        const readiness = calculateReadiness(updatedBrief);
        
        await supabase
          .from('concierge_sessions')
          .update({
            intent_flags_json: mergedIntent,
            design_brief_json: updatedBrief,
            readiness_score: readiness,
            message_count: session.message_count + 1
          })
          .eq('id', session_id);
        
        // Generate action cards
        const actions = await generateActionCards(supabase, session_id);
        
        result = { 
          intent,
          readiness,
          actions,
          vision_processed: attachments?.length || 0
        };
        break;
      }
      
      case 'get_actions': {
        const { session_id } = params;
        const actions = await generateActionCards(supabase, session_id);
        result = { actions };
        break;
      }
      
      case 'can_offer_sketch': {
        const { session_id } = params;
        
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', session_id)
          .single();
        
        if (!session) throw new Error('Session not found');
        
        const policy = await getOfferPolicy(supabase, session.workspace_id);
        const checkResult = canOfferSketch(session as any, policy);
        
        result = checkResult;
        break;
      }
      
      // Concept generation
      case 'generate_concept': {
        const { session_id } = params;
        
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', session_id)
          .single();
        
        if (!session) throw new Error('Session not found');
        
        const mockMode = await isMockMode(supabase, session.workspace_id);
        
        // Check if allowed
        const policy = await getOfferPolicy(supabase, session.workspace_id);
        const check = canOfferSketch(session as any, policy);
        
        if (!check.canOffer) {
          throw new Error(`Cannot generate concept: ${check.reason}`);
        }
        
        const conceptResult = await generateConcept(supabase, session_id, mockMode);
        
        // Log action
        await logAction(supabase, session_id, 'generate_concept', { job_id: conceptResult.jobId });
        
        // Update stage
        await supabase
          .from('concierge_sessions')
          .update({ stage: 'design_alignment' })
          .eq('id', session_id);
        
        result = conceptResult;
        break;
      }
      
      // Sketch finalization
      case 'finalize_sketch': {
        const { session_id, variant_id } = params;
        
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', session_id)
          .single();
        
        if (!session) throw new Error('Session not found');
        
        const mockMode = await isMockMode(supabase, session.workspace_id);
        const sketchResult = await finalizeSketch(supabase, session_id, variant_id, mockMode);
        
        // Log action
        await logAction(supabase, session_id, 'finalize_sketch', { sketch_id: sketchResult.sketchId });
        
        // Update stage
        await supabase
          .from('concierge_sessions')
          .update({ stage: 'preview_ready' })
          .eq('id', session_id);
        
        result = sketchResult;
        break;
      }
      
      // AR pack
      case 'build_ar_pack': {
        const { session_id, sketch_id } = params;
        
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', session_id)
          .single();
        
        if (!session) throw new Error('Session not found');
        
        const brief = session.design_brief_json as DesignBrief;
        if (!brief.placement_photo_present) {
          throw new Error('Se requiere foto del área para AR');
        }
        
        const mockMode = await isMockMode(supabase, session.workspace_id);
        const arResult = await buildARPack(supabase, session_id, sketch_id, mockMode);
        
        // Log action
        await logAction(supabase, session_id, 'build_ar_pack', { pack_id: arResult.packId });
        
        result = arResult;
        break;
      }
      
      // Decline offer (for anti-spam)
      case 'decline_sketch_offer': {
        const { session_id } = params;
        
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('sketch_offer_declined_count, workspace_id')
          .eq('id', session_id)
          .single();
        
        if (!session) throw new Error('Session not found');
        
        const policy = await getOfferPolicy(supabase, session.workspace_id);
        const newCount = (session.sketch_offer_declined_count || 0) + 1;
        const cooldownMinutes = policy.preview_offer_cooldown_minutes as number;
        
        await supabase
          .from('concierge_sessions')
          .update({
            sketch_offer_declined_count: newCount,
            sketch_offer_cooldown_until: new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString(),
            max_offers_reached: newCount >= (policy.max_preview_offers_per_session as number)
          })
          .eq('id', session_id);
        
        result = { declined_count: newCount };
        break;
      }
      
      // Feature flags
      case 'set_feature_flag': {
        const { workspace_id, key, enabled, config } = params;
        
        await supabase
          .from('feature_flags')
          .upsert({
            workspace_id,
            key,
            enabled,
            config_json: config || {}
          }, { onConflict: 'workspace_id,key' });
        
        result = { success: true };
        break;
      }
      
      case 'get_feature_flags': {
        const { workspace_id } = params;
        
        const { data } = await supabase
          .from('feature_flags')
          .select('*')
          .eq('workspace_id', workspace_id);
        
        result = { flags: data || [] };
        break;
      }
      
      // Offer policy
      case 'update_offer_policy': {
        const { workspace_id, policy, preset } = params;
        
        await supabase
          .from('concierge_offer_policy')
          .upsert({
            workspace_id,
            policy_json: policy,
            preset
          }, { onConflict: 'workspace_id' });
        
        result = { success: true };
        break;
      }
      
      case 'get_offer_policy': {
        const { workspace_id } = params;
        const policy = await getOfferPolicy(supabase, workspace_id);
        result = { policy };
        break;
      }
      
      // Diagnostics
      case 'get_job_errors': {
        const { session_id, limit = 20 } = params;
        
        const { data } = await supabase
          .from('job_errors')
          .select('*, concierge_jobs(job_type, status)')
          .eq('concierge_jobs.session_id', session_id)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        result = { errors: data || [] };
        break;
      }
      
      case 'retry_job': {
        const { job_id } = params;
        
        const { data: job } = await supabase
          .from('concierge_jobs')
          .select('*')
          .eq('id', job_id)
          .single();
        
        if (!job) throw new Error('Job not found');
        if (job.retry_count >= job.max_retries) {
          throw new Error('Max retries exceeded');
        }
        
        // Reset job for retry
        await supabase
          .from('concierge_jobs')
          .update({
            status: 'queued',
            retry_count: job.retry_count + 1,
            error_code: null,
            error_message: null
          })
          .eq('id', job_id);
        
        result = { success: true, retry_count: job.retry_count + 1 };
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[DesignCompiler] Error:', err);
    
    return new Response(JSON.stringify({
      error: err.message,
      details: err.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
