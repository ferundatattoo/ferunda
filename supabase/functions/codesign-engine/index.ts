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

async function isMockMode(supabase: ReturnType<typeof getSupabaseClient>, workspaceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('workspace_id', workspaceId)
    .eq('key', 'DESIGN_COMPILER_MOCK_MODE')
    .maybeSingle();
  return data?.enabled ?? false;
}

// Generate mock variant image URL
function mockVariantImage(idx: number): string {
  const colors = ['FFD700', 'C0C0C0', 'CD7F32', '4169E1', '228B22', 'DC143C'];
  return `https://placeholder.pics/svg/512/${colors[idx % colors.length]}/FFFFFF/Variant_${idx + 1}`;
}

// Generate mock variants
function generateMockVariants(count: number, params: Record<string, number>): Array<{
  idx: number;
  image_url: string;
  params_json: Record<string, number>;
  scores_json: Record<string, number>;
}> {
  return Array.from({ length: count }, (_, i) => ({
    idx: i,
    image_url: mockVariantImage(i),
    params_json: {
      ...params,
      // Add slight variation
      line_weight: Math.min(100, Math.max(0, (params.line_weight || 50) + (Math.random() - 0.5) * 20)),
      contrast: Math.min(100, Math.max(0, (params.contrast || 50) + (Math.random() - 0.5) * 20)),
    },
    scores_json: {
      style_alignment_score: 0.7 + Math.random() * 0.25,
      clarity_score: 0.75 + Math.random() * 0.2,
      uniqueness_score: 0.8 + Math.random() * 0.15,
    },
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const { action, ...params } = await req.json();
    
    console.log('[CoDesign] Action:', action);
    
    let result: Record<string, unknown> = {};
    
    switch (action) {
      // Create or get codesign session
      case 'init_session': {
        const { session_id } = params;
        
        // Check if exists
        const { data: existing } = await supabase
          .from('codesign_sessions')
          .select('*')
          .eq('session_id', session_id)
          .maybeSingle();
        
        if (existing) {
          result = { session: existing, is_new: false };
        } else {
          const defaultParams = {
            line_weight: 50,
            contrast: 50,
            realism_vs_stylized: 50,
            ornament_density: 50,
            negative_space: 50,
            symmetry: 50,
            motion_flow: 50,
          };
          
          const { data: created } = await supabase.from('codesign_sessions').insert({
            session_id,
            status: 'active',
            current_vector_json: defaultParams,
          }).select().single();
          
          result = { session: created, is_new: true };
        }
        break;
      }
      
      // Update style parameters
      case 'update_params': {
        const { codesign_id, params: styleParams } = params;
        
        await supabase.from('codesign_sessions')
          .update({ current_vector_json: styleParams })
          .eq('id', codesign_id);
        
        // Log event
        await supabase.from('codesign_events').insert({
          codesign_session_id: codesign_id,
          event_type: 'params_update',
          payload_json: styleParams,
        });
        
        result = { success: true };
        break;
      }
      
      // Generate variants
      case 'generate_variants': {
        const { session_id, codesign_id, params: styleParams, workspace_id } = params;
        
        const mockMode = workspace_id ? await isMockMode(supabase, workspace_id) : true;
        
        // Get concierge session for brief
        const { data: conciergeSession } = await supabase
          .from('concierge_sessions')
          .select('design_brief_json, artist_id, workspace_id')
          .eq('id', session_id)
          .maybeSingle();
        
        // Generate variants
        const variants = mockMode
          ? generateMockVariants(6, styleParams)
          : generateMockVariants(6, styleParams); // TODO: Real generation
        
        // Save variants
        for (const variant of variants) {
          await supabase.from('codesign_variants').insert({
            codesign_session_id: codesign_id,
            idx: variant.idx,
            image_url: variant.image_url,
            params_json: variant.params_json,
            scores_json: variant.scores_json,
          });
        }
        
        // Log event
        await supabase.from('codesign_events').insert({
          codesign_session_id: codesign_id,
          event_type: 'variants_generated',
          payload_json: { count: variants.length },
        });
        
        result = { variants, count: variants.length };
        break;
      }
      
      // Record A/B choice
      case 'ab_choice': {
        const { codesign_id, chosen_id, rejected_id } = params;
        
        // Get both variants
        const { data: chosen } = await supabase
          .from('codesign_variants')
          .select('params_json')
          .eq('id', chosen_id)
          .single();
        
        // Update preference model
        const { data: session } = await supabase
          .from('codesign_sessions')
          .select('current_vector_json')
          .eq('id', codesign_id)
          .single();
        
        if (chosen && session) {
          const currentParams = session.current_vector_json as Record<string, number>;
          const chosenParams = chosen.params_json as Record<string, number>;
          
          // Move toward chosen params
          const newParams: Record<string, number> = {};
          for (const key of Object.keys(currentParams)) {
            newParams[key] = Math.round((currentParams[key] + (chosenParams[key] || currentParams[key])) / 2);
          }
          
          await supabase.from('codesign_sessions')
            .update({ current_vector_json: newParams })
            .eq('id', codesign_id);
          
          // Update preference state
          await supabase.from('preference_model_state').upsert({
            session_id: codesign_id,
            state_json: {
              choices: [{ chosen: chosen_id, rejected: rejected_id, timestamp: new Date().toISOString() }],
              converged_params: newParams,
            },
          }, { onConflict: 'session_id' });
        }
        
        // Log event
        await supabase.from('codesign_events').insert({
          codesign_session_id: codesign_id,
          event_type: 'ab_choice',
          payload_json: { chosen_id, rejected_id },
        });
        
        // Mark chosen variant
        await supabase.from('codesign_variants')
          .update({ chosen: true })
          .eq('id', chosen_id);
        
        result = { success: true };
        break;
      }
      
      // Lock direction (finalize)
      case 'lock_direction': {
        const { codesign_id, variant_id, session_id } = params;
        
        // Get the chosen variant
        const { data: variant } = await supabase
          .from('codesign_variants')
          .select('*')
          .eq('id', variant_id)
          .single();
        
        if (!variant) throw new Error('Variant not found');
        
        // Update codesign session
        await supabase.from('codesign_sessions')
          .update({
            status: 'locked',
            current_vector_json: variant.params_json,
            locked_axes: variant.params_json, // All axes locked
          })
          .eq('id', codesign_id);
        
        // Log event
        await supabase.from('codesign_events').insert({
          codesign_session_id: codesign_id,
          event_type: 'direction_locked',
          payload_json: { variant_id, params: variant.params_json },
        });
        
        result = {
          success: true,
          locked_params: variant.params_json,
          message: 'Direction locked! Ready for final sketch generation.',
        };
        break;
      }
      
      // Get codesign history
      case 'get_history': {
        const { codesign_id } = params;
        
        const { data: events } = await supabase
          .from('codesign_events')
          .select('*')
          .eq('codesign_session_id', codesign_id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        const { data: variants } = await supabase
          .from('codesign_variants')
          .select('*')
          .eq('codesign_session_id', codesign_id)
          .order('created_at', { ascending: false });
        
        result = { events: events || [], variants: variants || [] };
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
    console.error('[CoDesign] Error:', err);
    
    return new Response(JSON.stringify({
      error: err.message,
      details: err.stack,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
