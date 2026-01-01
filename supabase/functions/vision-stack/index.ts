import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Check mock mode
async function isMockMode(supabase: ReturnType<typeof getSupabaseClient>, workspaceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('workspace_id', workspaceId)
    .eq('key', 'DESIGN_COMPILER_MOCK_MODE')
    .maybeSingle();
  return data?.enabled ?? false;
}

// Quality check result
interface QualityCheckResult {
  score: number;
  issues: string[];
  recommendations: string[];
}

// Mock quality check
function mockQualityCheck(): QualityCheckResult {
  const score = 0.7 + Math.random() * 0.25;
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  if (score < 0.8) {
    issues.push('lighting_suboptimal');
    recommendations.push('Try taking the photo in natural daylight');
  }
  if (score < 0.75) {
    issues.push('blur_detected');
    recommendations.push('Hold the camera steady or use a tripod');
  }
  
  return { score, issues, recommendations };
}

// Real quality check using external endpoint
async function realQualityCheck(imageUrl: string): Promise<QualityCheckResult> {
  const endpoint = Deno.env.get('QUALITY_CHECK_ENDPOINT');
  
  if (!endpoint) {
    console.log('[Vision] No QUALITY_CHECK_ENDPOINT, using mock');
    return mockQualityCheck();
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    
    if (!response.ok) throw new Error('Quality check failed');
    return await response.json();
  } catch (err) {
    console.error('[Vision] Quality check error:', err);
    return mockQualityCheck();
  }
}

// Body part detection
interface BodyPartResult {
  body_part: string;
  confidence: number;
  landmarks: { x: number; y: number; name: string }[];
}

function mockBodyPartDetect(): BodyPartResult {
  const parts = ['forearm', 'upper_arm', 'shoulder', 'back', 'chest', 'thigh', 'calf'];
  return {
    body_part: parts[Math.floor(Math.random() * parts.length)],
    confidence: 0.85 + Math.random() * 0.1,
    landmarks: [
      { x: 0.3, y: 0.2, name: 'joint_start' },
      { x: 0.7, y: 0.8, name: 'joint_end' },
    ],
  };
}

async function realBodyPartDetect(imageUrl: string): Promise<BodyPartResult> {
  const endpoint = Deno.env.get('BODY_PARSING_ENDPOINT');
  
  if (!endpoint) {
    console.log('[Vision] No BODY_PARSING_ENDPOINT, using mock');
    return mockBodyPartDetect();
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    
    if (!response.ok) throw new Error('Body part detection failed');
    return await response.json();
  } catch (err) {
    console.error('[Vision] Body part detect error:', err);
    return mockBodyPartDetect();
  }
}

// Tattoo extraction (SAM2)
interface TattooExtractionResult {
  cutout_png_url: string;
  mask_url: string;
  quality_score: number;
}

function mockTattooExtract(): TattooExtractionResult {
  return {
    cutout_png_url: 'https://placeholder.pics/svg/512/DEDEDE/555555/Cutout',
    mask_url: 'https://placeholder.pics/svg/512/000000/FFFFFF/Mask',
    quality_score: 0.88,
  };
}

async function realTattooExtract(imageUrl: string): Promise<TattooExtractionResult> {
  const endpoint = Deno.env.get('SAM2_ENDPOINT');
  
  if (!endpoint) {
    console.log('[Vision] No SAM2_ENDPOINT, using mock');
    return mockTattooExtract();
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, task: 'tattoo_segment' }),
    });
    
    if (!response.ok) throw new Error('Tattoo extraction failed');
    return await response.json();
  } catch (err) {
    console.error('[Vision] Tattoo extract error:', err);
    return mockTattooExtract();
  }
}

// Unwarp tattoo
interface UnwarpResult {
  unwarped_png_url: string;
  transform_matrix: number[][];
}

function mockUnwarp(): UnwarpResult {
  return {
    unwarped_png_url: 'https://placeholder.pics/svg/512/DEDEDE/555555/Unwarped',
    transform_matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  };
}

async function realUnwarp(cutoutUrl: string, maskUrl: string): Promise<UnwarpResult> {
  const endpoint = Deno.env.get('UNWARP_ENDPOINT');
  
  if (!endpoint) {
    console.log('[Vision] No UNWARP_ENDPOINT, using mock');
    return mockUnwarp();
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cutout_url: cutoutUrl, mask_url: maskUrl }),
    });
    
    if (!response.ok) throw new Error('Unwarp failed');
    return await response.json();
  } catch (err) {
    console.error('[Vision] Unwarp error:', err);
    return mockUnwarp();
  }
}

// 3D reconstruction
interface Reconstruct3DResult {
  status: string;
  gsplat_url?: string;
  mesh_url?: string;
  poses?: { frame: number; matrix: number[][] }[];
}

function mock3DReconstruct(): Reconstruct3DResult {
  return {
    status: 'completed',
    gsplat_url: 'https://placeholder.pics/svg/512/333333/FFFFFF/3D_Model',
    poses: [
      { frame: 0, matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] },
    ],
  };
}

async function real3DReconstruct(videoUrl: string): Promise<Reconstruct3DResult> {
  const endpoint = Deno.env.get('GSPLAT_ENDPOINT');
  
  if (!endpoint) {
    console.log('[Vision] No GSPLAT_ENDPOINT, using mock');
    return mock3DReconstruct();
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl }),
    });
    
    if (!response.ok) throw new Error('3D reconstruction failed');
    return await response.json();
  } catch (err) {
    console.error('[Vision] 3D reconstruct error:', err);
    return mock3DReconstruct();
  }
}

// Detect if image contains tattoo on body
function detectTattooOnBody(analysisResult: BodyPartResult): boolean {
  return analysisResult.confidence > 0.7 && analysisResult.landmarks.length >= 2;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const { action, ...params } = await req.json();
    
    console.log('[Vision] Action:', action);
    
    let result: Record<string, unknown> = {};
    
    switch (action) {
      // Quality check
      case 'quality_check': {
        const { asset_url, session_id, workspace_id } = params;
        
        const mockMode = workspace_id ? await isMockMode(supabase, workspace_id) : false;
        const quality = mockMode ? mockQualityCheck() : await realQualityCheck(asset_url);
        
        // Save to vision_assets if session provided
        if (session_id) {
          await supabase.from('vision_assets').insert({
            session_id,
            asset_type: 'reference_image',
            storage_url: asset_url,
            metadata_json: { quality_check: quality },
          });
        }
        
        result = {
          quality,
          passed: quality.score >= 0.6,
          instructions: quality.recommendations.length > 0
            ? quality.recommendations[0]
            : null,
        };
        break;
      }
      
      // Body part detection
      case 'bodypart_detect': {
        const { asset_url, session_id, workspace_id } = params;
        
        const mockMode = workspace_id ? await isMockMode(supabase, workspace_id) : false;
        const detection = mockMode ? mockBodyPartDetect() : await realBodyPartDetect(asset_url);
        
        // Save extraction record if session provided
        if (session_id) {
          const { data: asset } = await supabase
            .from('vision_assets')
            .select('id')
            .eq('session_id', session_id)
            .eq('storage_url', asset_url)
            .maybeSingle();
          
          if (asset) {
            await supabase.from('vision_extractions').insert({
              asset_id: asset.id,
              status: 'completed',
              body_part: detection.body_part,
              quality_score: detection.confidence,
            });
          }
        }
        
        result = {
          body_part: detection.body_part,
          confidence: detection.confidence,
          landmarks: detection.landmarks,
          has_tattoo: detectTattooOnBody(detection),
        };
        break;
      }
      
      // Full tattoo extraction pipeline
      case 'extract_tattoo': {
        const { asset_url, session_id, workspace_id } = params;
        
        const mockMode = workspace_id ? await isMockMode(supabase, workspace_id) : false;
        
        // Step 1: Extract tattoo
        const extraction = mockMode ? mockTattooExtract() : await realTattooExtract(asset_url);
        
        // Step 2: Unwarp
        const unwarp = mockMode
          ? mockUnwarp()
          : await realUnwarp(extraction.cutout_png_url, extraction.mask_url);
        
        // Save to vision_extractions
        if (session_id) {
          const { data: asset } = await supabase
            .from('vision_assets')
            .select('id')
            .eq('session_id', session_id)
            .eq('storage_url', asset_url)
            .maybeSingle();
          
          if (asset) {
            await supabase.from('vision_extractions').update({
              tattoo_cutout_png_url: extraction.cutout_png_url,
              tattoo_mask_url: extraction.mask_url,
              tattoo_unwarped_png_url: unwarp.unwarped_png_url,
              status: 'completed',
            }).eq('asset_id', asset.id);
          }
        }
        
        result = {
          cutout_url: extraction.cutout_png_url,
          mask_url: extraction.mask_url,
          unwarped_url: unwarp.unwarped_png_url,
          quality_score: extraction.quality_score,
        };
        break;
      }
      
      // 3D reconstruction from video
      case 'reconstruct_3d': {
        const { video_url, session_id, workspace_id } = params;
        
        const mockMode = workspace_id ? await isMockMode(supabase, workspace_id) : false;
        
        // Create job
        const { data: job } = await supabase.from('vision_3d_jobs').insert({
          session_id,
          status: 'processing',
          input_video_url: video_url,
        }).select().single();
        
        // Process (in real implementation this would be async)
        const reconstruction = mockMode ? mock3DReconstruct() : await real3DReconstruct(video_url);
        
        // Update job
        await supabase.from('vision_3d_jobs').update({
          status: reconstruction.status,
          outputs_json: reconstruction,
        }).eq('id', job.id);
        
        result = {
          job_id: job.id,
          status: reconstruction.status,
          outputs: reconstruction,
        };
        break;
      }
      
      // Process uploaded asset (full pipeline)
      case 'process_asset': {
        const { asset_url, asset_type, session_id, workspace_id } = params;
        
        const mockMode = workspace_id ? await isMockMode(supabase, workspace_id) : false;
        
        // 1. Quality check
        const quality = mockMode ? mockQualityCheck() : await realQualityCheck(asset_url);
        
        if (quality.score < 0.5) {
          result = {
            success: false,
            quality,
            message: 'La calidad de la imagen es muy baja. ' + (quality.recommendations[0] || 'Intenta con mejor iluminación.'),
          };
          break;
        }
        
        // 2. Save asset
        const { data: asset } = await supabase.from('vision_assets').insert({
          session_id,
          asset_type: asset_type || 'reference_image',
          storage_url: asset_url,
          metadata_json: { quality_check: quality },
        }).select().single();
        
        // 3. Body part detection
        const bodyPart = mockMode ? mockBodyPartDetect() : await realBodyPartDetect(asset_url);
        
        // 4. Check if tattoo on body - if so, extract
        let extraction = null;
        if (detectTattooOnBody(bodyPart)) {
          const tattooExtract = mockMode ? mockTattooExtract() : await realTattooExtract(asset_url);
          const unwarp = mockMode ? mockUnwarp() : await realUnwarp(tattooExtract.cutout_png_url, tattooExtract.mask_url);
          
          extraction = {
            cutout_url: tattooExtract.cutout_png_url,
            mask_url: tattooExtract.mask_url,
            unwarped_url: unwarp.unwarped_png_url,
          };
          
          // Save extraction
          await supabase.from('vision_extractions').insert({
            asset_id: asset.id,
            status: 'completed',
            body_part: bodyPart.body_part,
            quality_score: bodyPart.confidence,
            tattoo_cutout_png_url: extraction.cutout_url,
            tattoo_mask_url: extraction.mask_url,
            tattoo_unwarped_png_url: extraction.unwarped_url,
          });
        }
        
        // 5. Update session brief
        if (session_id) {
          const { data: session } = await supabase
            .from('concierge_sessions')
            .select('design_brief_json')
            .eq('id', session_id)
            .single();
          
          if (session) {
            const brief = session.design_brief_json as Record<string, unknown> || {};
            const currentCount = (brief.references_count as number) || 0;
            
            const updates: Record<string, unknown> = {
              design_brief_json: {
                ...brief,
                references_count: currentCount + 1,
                placement_photo_present: asset_type === 'placement_photo' || brief.placement_photo_present,
              },
            };
            
            await supabase.from('concierge_sessions').update(updates).eq('id', session_id);
          }
        }
        
        result = {
          success: true,
          asset_id: asset.id,
          quality,
          body_part: bodyPart.body_part,
          has_tattoo: detectTattooOnBody(bodyPart),
          extraction,
        };
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Vision] Error:', err);
    
    return new Response(JSON.stringify({
      error: err.message,
      details: err.stack,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
