import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface OrchestratorResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface UploadAnalysis {
  visionStack: {
    quality: { score: number; issues: string[] };
    bodyPart: { detected: string; confidence: number };
    existingTattoo: { present: boolean; extractedUrl?: string };
  };
  styleDna: {
    tokens: string[];
    matchScore: number;
    similarPortfolio: Array<{ id: string; url: string; score: number }>;
  };
  feasibility: {
    score: number;
    factors: Array<{ name: string; impact: string; score: number }>;
    risks: string[];
    recommendation: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function callEdgeFunction(
  functionName: string, 
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error(`[Orchestrator] ${functionName} failed:`, response.status);
      return { error: `Function ${functionName} failed`, status: response.status };
    }
    
    return await response.json();
  } catch (err) {
    console.error(`[Orchestrator] Error calling ${functionName}:`, err);
    return { error: String(err) };
  }
}

async function trackConversion(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  eventName: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await callEdgeFunction('conversion-engine', {
      action: 'track_event',
      session_id: sessionId,
      event_name: eventName,
      event_value: 1,
      metadata
    });
  } catch (err) {
    console.error('[Orchestrator] Failed to track conversion:', err);
  }
}

// ============================================================================
// CORE ORCHESTRATION FUNCTIONS
// ============================================================================

/**
 * Analyze an uploaded image through all subsystems
 */
async function analyzeUpload(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  imageUrl: string,
  workspaceId: string,
  artistId?: string
): Promise<UploadAnalysis> {
  console.log(`[Orchestrator] Analyzing upload for session ${sessionId}`);
  
  // Call all subsystems in parallel
  const [visionResult, styleResult, feasibilityResult] = await Promise.all([
    // Vision Stack - quality + body part detection
    callEdgeFunction('vision-stack', {
      action: 'analyze_full',
      imageUrl,
      sessionId
    }),
    
    // Style DNA - match with artist portfolio
    callEdgeFunction('style-dna', {
      action: 'check_originality',
      conceptImageUrl: imageUrl,
      referenceImageUrls: [],
      workspaceId,
      artistId
    }),
    
    // Feasibility Lab - analyze design viability
    callEdgeFunction('feasibility-lab', {
      action: 'analyze_full',
      params: {
        imageUrl,
        targetBodyPart: 'auto',
        skinType: 'normal'
      }
    })
  ]);
  
  // Track conversion event
  await trackConversion(supabase, sessionId, 'image_analyzed', { imageUrl });
  
  return {
    visionStack: {
      quality: visionResult.quality as { score: number; issues: string[] } || { score: 0.8, issues: [] },
      bodyPart: visionResult.bodyPart as { detected: string; confidence: number } || { detected: 'forearm', confidence: 0.7 },
      existingTattoo: visionResult.extraction as { present: boolean; extractedUrl?: string } || { present: false }
    },
    styleDna: {
      tokens: styleResult.styleTokens as string[] || [],
      matchScore: styleResult.matchScore as number || 0.75,
      similarPortfolio: styleResult.similarPieces as Array<{ id: string; url: string; score: number }> || []
    },
    feasibility: {
      score: feasibilityResult.overall_score as number || 0.85,
      factors: feasibilityResult.factors as Array<{ name: string; impact: string; score: number }> || [],
      risks: feasibilityResult.risks as string[] || [],
      recommendation: feasibilityResult.recommendation as string || 'Proceed with design'
    }
  };
}

/**
 * Start a CoDesign session with A/B variants
 */
async function startCoDesign(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  brief: Record<string, unknown>,
  workspaceId: string
): Promise<{ sessionId: string; variants: Array<{ id: string; imageUrl: string; scores: Record<string, number> }> }> {
  console.log(`[Orchestrator] Starting CoDesign for session ${sessionId}`);
  
  // Initialize CoDesign session
  const codesignResult = await callEdgeFunction('codesign-engine', {
    action: 'init_session',
    sessionId,
    brief,
    workspaceId
  });
  
  // Generate initial variants
  const variantsResult = await callEdgeFunction('codesign-engine', {
    action: 'generate_variants',
    sessionId,
    count: 6
  });
  
  // Track conversion
  await trackConversion(supabase, sessionId, 'codesign_started', { variantCount: 6 });
  
  return {
    sessionId: codesignResult.sessionId as string || sessionId,
    variants: variantsResult.variants as Array<{ id: string; imageUrl: string; scores: Record<string, number> }> || []
  };
}

/**
 * Prepare design for AR preview with Body Atlas
 */
async function prepareAR(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  designUrl: string,
  placementPhoto?: string,
  targetBodyPart?: string
): Promise<{ packId: string; arUrl: string; anchors: Array<{ x: number; y: number }> }> {
  console.log(`[Orchestrator] Preparing AR for session ${sessionId}`);
  
  // Get body region mapping from Body Atlas
  const bodyAtlasResult = await callEdgeFunction('body-atlas', {
    action: 'get_body_regions',
    imageUrl: placementPhoto,
    targetRegion: targetBodyPart
  });
  
  // Build AR pack
  const arResult = await callEdgeFunction('ar-tattoo-engine', {
    action: 'prepare_asset',
    imageUrl: designUrl,
    placements: [targetBodyPart || 'forearm'],
    bodyMapping: bodyAtlasResult.regions
  });
  
  // Track conversion
  await trackConversion(supabase, sessionId, 'ar_prepared', { bodyPart: targetBodyPart });
  
  return {
    packId: arResult.packId as string || '',
    arUrl: arResult.arUrl as string || designUrl,
    anchors: arResult.anchors as Array<{ x: number; y: number }> || [{ x: 0.5, y: 0.5 }]
  };
}

/**
 * Initialize a sleeve project
 */
async function startSleeveProject(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  sleeveType: 'half' | 'full',
  theme: string,
  elements: { hero: string[]; secondary: string[]; fillers: string[] }
): Promise<{ projectId: string; segments: Array<{ id: string; zone: string; status: string }> }> {
  console.log(`[Orchestrator] Starting sleeve project for session ${sessionId}`);
  
  // Initialize sleeve via Sleeve Compiler
  const sleeveResult = await callEdgeFunction('sleeve-compiler', {
    action: 'init_project',
    sessionId,
    sleeveType,
    theme,
    elements
  });
  
  // Track conversion
  await trackConversion(supabase, sessionId, 'sleeve_project_started', { sleeveType, theme });
  
  return {
    projectId: sleeveResult.projectId as string || '',
    segments: sleeveResult.segments as Array<{ id: string; zone: string; status: string }> || []
  };
}

/**
 * Get conversion prediction for session
 */
async function getConversionPrediction(
  sessionId: string
): Promise<{ probability: number; confidence: number; nudge: string; factors: Array<{ name: string; impact: number }> }> {
  const [predictionResult, nudgeResult] = await Promise.all([
    callEdgeFunction('conversion-engine', {
      action: 'predict_conversion',
      session_id: sessionId
    }),
    callEdgeFunction('conversion-engine', {
      action: 'get_nudge',
      session_id: sessionId
    })
  ]);
  
  return {
    probability: predictionResult.probability as number || 0.5,
    confidence: predictionResult.confidence as number || 0.7,
    nudge: nudgeResult.nudge?.message as string || '',
    factors: predictionResult.factors as Array<{ name: string; impact: number }> || []
  };
}

/**
 * Finalize design through Sketch Finalizer
 */
async function finalizeDesign(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  variantId: string,
  workspaceId: string
): Promise<{ sketchId: string; lineartUrl: string; overlayUrl: string }> {
  console.log(`[Orchestrator] Finalizing design for session ${sessionId}`);
  
  // Call Sketch Finalizer
  const sketchResult = await callEdgeFunction('sketch-finalizer', {
    action: 'finalize',
    sessionId,
    variantId,
    workspaceId
  });
  
  // Track conversion
  await trackConversion(supabase, sessionId, 'design_finalized', { variantId });
  
  return {
    sketchId: sketchResult.sketchId as string || '',
    lineartUrl: sketchResult.lineartUrl as string || '',
    overlayUrl: sketchResult.overlayUrl as string || ''
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = getSupabaseClient();
    const { action, ...params } = await req.json();
    
    console.log(`[DesignOrchestrator] Action: ${action}`, Object.keys(params));
    
    let result: OrchestratorResult = { success: false };
    
    switch (action) {
      case 'analyze_upload': {
        const { session_id, image_url, workspace_id, artist_id } = params;
        
        if (!session_id || !image_url || !workspace_id) {
          throw new Error('Missing required params: session_id, image_url, workspace_id');
        }
        
        const analysis = await analyzeUpload(supabase, session_id, image_url, workspace_id, artist_id);
        
        // Store analysis in session
        await supabase
          .from('concierge_sessions')
          .update({ 
            last_analysis_json: analysis,
            updated_at: new Date().toISOString()
          })
          .eq('id', session_id);
        
        result = { success: true, data: { analysis } };
        break;
      }
      
      case 'start_codesign': {
        const { session_id, brief, workspace_id } = params;
        
        if (!session_id || !brief || !workspace_id) {
          throw new Error('Missing required params');
        }
        
        const codesign = await startCoDesign(supabase, session_id, brief, workspace_id);
        result = { success: true, data: codesign };
        break;
      }
      
      case 'prepare_ar': {
        const { session_id, design_url, placement_photo, target_body_part } = params;
        
        if (!session_id || !design_url) {
          throw new Error('Missing required params: session_id, design_url');
        }
        
        const ar = await prepareAR(supabase, session_id, design_url, placement_photo, target_body_part);
        result = { success: true, data: ar };
        break;
      }
      
      case 'start_sleeve_project': {
        const { session_id, sleeve_type, theme, elements } = params;
        
        if (!session_id || !sleeve_type || !theme) {
          throw new Error('Missing required params');
        }
        
        const sleeve = await startSleeveProject(
          supabase, 
          session_id, 
          sleeve_type, 
          theme, 
          elements || { hero: [], secondary: [], fillers: [] }
        );
        result = { success: true, data: sleeve };
        break;
      }
      
      case 'get_conversion_prediction': {
        const { session_id } = params;
        
        if (!session_id) {
          throw new Error('Missing session_id');
        }
        
        const prediction = await getConversionPrediction(session_id);
        result = { success: true, data: prediction };
        break;
      }
      
      case 'finalize_design': {
        const { session_id, variant_id, workspace_id } = params;
        
        if (!session_id || !variant_id || !workspace_id) {
          throw new Error('Missing required params');
        }
        
        const finalized = await finalizeDesign(supabase, session_id, variant_id, workspace_id);
        result = { success: true, data: finalized };
        break;
      }
      
      case 'track_interaction': {
        const { session_id, event_name, metadata } = params;
        
        if (!session_id || !event_name) {
          throw new Error('Missing session_id or event_name');
        }
        
        await trackConversion(supabase, session_id, event_name, metadata || {});
        result = { success: true };
        break;
      }
      
      case 'full_pipeline': {
        // Complete pipeline: analyze → codesign → finalize → AR
        const { session_id, image_url, workspace_id, artist_id, brief } = params;
        
        if (!session_id || !image_url || !workspace_id) {
          throw new Error('Missing required params for full pipeline');
        }
        
        // Step 1: Analyze upload
        const analysis = await analyzeUpload(supabase, session_id, image_url, workspace_id, artist_id);
        
        // Step 2: Start CoDesign if brief provided
        let codesign = null;
        if (brief) {
          codesign = await startCoDesign(supabase, session_id, brief, workspace_id);
        }
        
        // Step 3: Get conversion prediction
        const prediction = await getConversionPrediction(session_id);
        
        result = { 
          success: true, 
          data: { 
            analysis, 
            codesign,
            prediction,
            nextStep: codesign ? 'select_variant' : 'provide_brief'
          } 
        };
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
    console.error('[DesignOrchestrator] Error:', err);
    
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
