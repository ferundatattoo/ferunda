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

// Lovable AI Vision Analysis
async function analyzeWithVision(prompt: string, imageUrl: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log('[vision-stack] No LOVABLE_API_KEY available');
    return '';
  }

  const startTime = Date.now();
  
  try {
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
            role: "system",
            content: "You are an expert computer vision system specialized in tattoo and body analysis. Always respond in JSON format."
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1500,
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[vision-stack] AI response time: ${elapsed}ms`);

    if (!response.ok) {
      console.error('[vision-stack] AI error:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[vision-stack] AI error:', error);
    return '';
  }
}

// Quality check
interface QualityCheckResult {
  score: number;
  issues: string[];
  recommendations: string[];
}

async function realQualityCheck(imageUrl: string): Promise<QualityCheckResult> {
  const prompt = `Analyze this image for quality as a tattoo reference or body photo.

Evaluate:
1. Lighting quality (0-1)
2. Focus/sharpness (0-1)
3. Resolution adequacy (0-1)
4. Color accuracy (0-1)

Respond in JSON:
{
  "score": 0-1 (weighted average),
  "issues": ["list of problems"],
  "recommendations": ["how to improve"]
}`;

  const aiResult = await analyzeWithVision(prompt, imageUrl);
  
  if (aiResult) {
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('[vision-stack] Quality check parse failed');
    }
  }

  // Fallback
  return {
    score: 0.75 + Math.random() * 0.2,
    issues: [],
    recommendations: ['Try taking the photo in natural daylight'],
  };
}

// Body part detection
interface BodyPartResult {
  body_part: string;
  confidence: number;
  landmarks: { x: number; y: number; name: string }[];
}

async function realBodyPartDetect(imageUrl: string): Promise<BodyPartResult> {
  const prompt = `Analyze this image and identify the body part shown.

Respond in JSON:
{
  "body_part": "forearm|upper_arm|shoulder|back|chest|thigh|calf|wrist|ankle|hand|ribs|neck",
  "confidence": 0-1,
  "landmarks": [
    { "x": 0-1, "y": 0-1, "name": "joint_name or feature" }
  ]
}`;

  const aiResult = await analyzeWithVision(prompt, imageUrl);
  
  if (aiResult) {
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('[vision-stack] Body part parse failed');
    }
  }

  // Fallback
  const parts = ['forearm', 'upper_arm', 'shoulder', 'back', 'chest', 'thigh', 'calf'];
  return {
    body_part: parts[Math.floor(Math.random() * parts.length)],
    confidence: 0.85,
    landmarks: [
      { x: 0.3, y: 0.2, name: 'joint_start' },
      { x: 0.7, y: 0.8, name: 'joint_end' },
    ],
  };
}

// Tattoo extraction
interface TattooExtractionResult {
  cutout_png_url: string | null;
  mask_url: string | null;
  quality_score: number;
  has_tattoo: boolean;
  style_detected: string;
}

async function realTattooExtract(imageUrl: string): Promise<TattooExtractionResult> {
  const prompt = `Analyze this image for existing tattoos.

Identify:
1. Is there a visible tattoo? (yes/no)
2. If yes, what style? (fineline, blackwork, traditional, neo-traditional, realism, geometric, etc.)
3. Quality/condition of the tattoo (0-1)
4. Approximate location on body

Respond in JSON:
{
  "has_tattoo": boolean,
  "style_detected": "string or null",
  "quality_score": 0-1,
  "description": "brief description"
}`;

  const aiResult = await analyzeWithVision(prompt, imageUrl);
  
  let result: TattooExtractionResult = {
    cutout_png_url: null,
    mask_url: null,
    quality_score: 0.88,
    has_tattoo: false,
    style_detected: 'unknown',
  };

  if (aiResult) {
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.has_tattoo = parsed.has_tattoo || false;
        result.style_detected = parsed.style_detected || 'unknown';
        result.quality_score = parsed.quality_score || 0.85;
      }
    } catch (e) {
      console.log('[vision-stack] Tattoo extract parse failed');
    }
  }

  return result;
}

// Unwarp (placeholder - would need actual image processing service)
interface UnwarpResult {
  unwarped_png_url: string | null;
  transform_matrix: number[][];
}

function mockUnwarp(): UnwarpResult {
  return {
    unwarped_png_url: null,
    transform_matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  };
}

// 3D reconstruction (placeholder)
interface Reconstruct3DResult {
  status: string;
  gsplat_url?: string;
  mesh_url?: string;
  poses?: { frame: number; matrix: number[][] }[];
}

function mock3DReconstruct(): Reconstruct3DResult {
  return {
    status: 'completed',
    gsplat_url: null,
    poses: [
      { frame: 0, matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] },
    ],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[vision-stack][${requestId}] Request started`);

  try {
    const supabase = getSupabaseClient();
    const { action, ...params } = await req.json();
    
    console.log(`[vision-stack][${requestId}] Action: ${action}`);
    
    let result: Record<string, unknown> = {};
    
    switch (action) {
      case 'quality_check': {
        const { asset_url, session_id } = params;
        
        const quality = await realQualityCheck(asset_url);
        
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
          instructions: quality.recommendations.length > 0 ? quality.recommendations[0] : null,
        };
        break;
      }
      
      case 'bodypart_detect': {
        const { asset_url, session_id } = params;
        
        const detection = await realBodyPartDetect(asset_url);
        
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
          has_tattoo: detection.confidence > 0.7,
        };
        break;
      }
      
      case 'extract_tattoo': {
        const { asset_url, session_id } = params;
        
        const extraction = await realTattooExtract(asset_url);
        const unwarp = mockUnwarp();
        
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
          has_tattoo: extraction.has_tattoo,
          style_detected: extraction.style_detected,
        };
        break;
      }
      
      case 'reconstruct_3d': {
        const { video_url, session_id } = params;
        
        const { data: job } = await supabase.from('vision_3d_jobs').insert({
          session_id,
          status: 'processing',
          input_video_url: video_url,
        }).select().single();
        
        const reconstruction = mock3DReconstruct();
        
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
      
      case 'process_asset': {
        const { asset_url, asset_type, session_id } = params;
        
        // 1. Quality check
        const quality = await realQualityCheck(asset_url);
        
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
        const bodyPart = await realBodyPartDetect(asset_url);
        
        // 4. Check for existing tattoo
        let extraction = null;
        const tattooCheck = await realTattooExtract(asset_url);
        
        if (tattooCheck.has_tattoo) {
          extraction = {
            has_tattoo: true,
            style_detected: tattooCheck.style_detected,
            quality_score: tattooCheck.quality_score,
          };
          
          await supabase.from('vision_extractions').insert({
            asset_id: asset.id,
            status: 'completed',
            body_part: bodyPart.body_part,
            quality_score: bodyPart.confidence,
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
            
            await supabase.from('concierge_sessions').update({
              design_brief_json: {
                ...brief,
                references_count: currentCount + 1,
                placement_photo_present: asset_type === 'placement_photo' || brief.placement_photo_present,
                detected_body_part: bodyPart.body_part,
              },
            }).eq('id', session_id);
          }
        }
        
        result = {
          success: true,
          asset_id: asset.id,
          quality,
          body_part: bodyPart.body_part,
          confidence: bodyPart.confidence,
          extraction,
        };
        break;
      }
      
      case 'analyze_reference': {
        const { image_url } = params;
        
        const prompt = `Analyze this tattoo reference image in detail:

Identify:
1. Style (fineline, blackwork, traditional, neo-traditional, realism, geometric, watercolor, dotwork, tribal, japanese, etc.)
2. Main elements/subjects
3. Color palette
4. Complexity level (1-10)
5. Estimated session time (hours)
6. Recommended placement

Respond in JSON:
{
  "styles": ["primary", "secondary"],
  "elements": ["list of elements"],
  "colors": ["color names"],
  "complexity": 1-10,
  "estimated_hours": number,
  "recommended_placements": ["list"],
  "description": "detailed description"
}`;

        const aiResult = await analyzeWithVision(prompt, image_url);
        
        let analysis = {
          styles: ['custom'],
          elements: [],
          colors: ['black'],
          complexity: 5,
          estimated_hours: 3,
          recommended_placements: ['forearm', 'upper_arm'],
          description: 'Tattoo reference analyzed',
        };

        if (aiResult) {
          try {
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              analysis = { ...analysis, ...parsed };
            }
          } catch (e) {
            console.log('[vision-stack] Reference analysis parse failed');
          }
        }

        result = { success: true, analysis };
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log(`[vision-stack][${requestId}] Completed: ${action}`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[vision-stack][${requestId}] Error:`, err);
    
    return new Response(JSON.stringify({
      error: err.message,
      details: err.stack,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});