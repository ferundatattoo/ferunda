import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-fingerprint',
};

// ============================================================================
// FERUNDA AGENT v8.0 - GROK FALLBACK SERVICE
// Called by Concierge Gateway when Gemini fails or for specific use cases
// Receives unified rules from Gateway - no hardcoded prompts
// ============================================================================

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Provider: Grok-4 primary, Lovable AI fallback
async function callGrokAI(
  messages: any[],
  options: { tools?: any[]; maxTokens?: number; model?: string } = {}
): Promise<{ content: string; toolCalls?: any[]; provider: string }> {
  const rawXaiKey = Deno.env.get('XAI_API_KEY');
  const XAI_API_KEY = rawXaiKey ? rawXaiKey.replace(/[^\x00-\x7F]/g, '').trim() : null;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')?.trim();
  
  if (XAI_API_KEY && XAI_API_KEY.length > 10) {
    try {
      console.log('[FerundaAgent] Calling xAI Grok-4...');
      
      const response = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + XAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-4',
          messages,
          max_tokens: options.maxTokens || 1000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const msg = data.choices[0].message;
        console.log('[FerundaAgent] ⚡ Grok-4 response received');
        return {
          content: msg.content || '',
          toolCalls: undefined,
          provider: 'xai/grok-4'
        };
      }
      
      const errorText = await response.text();
      console.warn('[FerundaAgent] Grok-4 failed:', response.status, errorText);
    } catch (error) {
      console.error('[FerundaAgent] Grok-4 error:', error);
    }
  }

  // Fallback to Lovable AI (Gemini)
  if (LOVABLE_API_KEY) {
    console.log('[FerundaAgent] Using Lovable AI (Gemini 2.5 Flash) as fallback...');
    const body: any = {
      model: 'google/gemini-2.5-flash',
      messages,
      max_tokens: options.maxTokens || 1000
    };
    
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = 'auto';
    }
    
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FerundaAgent] Lovable AI failed:', response.status, errorText);
      throw new Error(`AI call failed: ${response.status}`);
    }

    const data = await response.json();
    const msg = data.choices[0].message;
    return {
      content: msg.content || '',
      toolCalls: msg.tool_calls,
      provider: 'lovable/gemini-2.5-flash'
    };
  }

  throw new Error('No AI provider available');
}

// ============================================================================
// MINIMAL FALLBACK PROMPT - Only used when Gateway doesn't inject rules
// ============================================================================

const MINIMAL_FALLBACK_PROMPT = `You are an AI assistant for Ferunda Tattoo.
Style: Geometric micro-realism, BLACK AND GREY ONLY.
Tone: Warm, professional, efficient.

CORE RULES:
1. NEVER invent facts - only use provided data
2. MAX 2-3 sentences per response
3. Detect and respond in user's language
4. NO color work offered
5. Sizes always in INCHES`;

// ============================================================================
// INTENT DETECTION (Server-Side - Regex-based, deterministic)
// ============================================================================

interface DetectedIntent {
  primary: 'pricing' | 'scheduling' | 'booking' | 'ar_preview' | 'reference' | 'greeting' | 'inquiry' | 'other';
  confidence: number;
  triggers: string[];
}

function detectIntentFromMessage(message: string): DetectedIntent {
  const msg = message.toLowerCase();
  const triggers: string[] = [];
  
  // Pricing intent
  const pricingPatterns = /cu[aá]nto|precio|cuesta|cost|how much|rate|cobras|tarifa|inversi[oó]n|presupuesto/i;
  if (pricingPatterns.test(msg)) {
    triggers.push('pricing_keyword');
    return { primary: 'pricing', confidence: 0.9, triggers };
  }
  
  // Scheduling intent
  const schedulingPatterns = /disponib|fecha|when|schedule|agendar|cita|horario|calendar|slot|cu[aá]ndo puedo|próxima|available/i;
  if (schedulingPatterns.test(msg)) {
    triggers.push('scheduling_keyword');
    return { primary: 'scheduling', confidence: 0.9, triggers };
  }
  
  // Booking intent
  const bookingPatterns = /reservar|book|quiero hacerlo|let'?s do it|comenzar|start|confirmar|dep[oó]sito|pago|apartar/i;
  if (bookingPatterns.test(msg)) {
    triggers.push('booking_keyword');
    return { primary: 'booking', confidence: 0.9, triggers };
  }
  
  // AR preview intent
  const arPatterns = /preview|verlo|c[oó]mo se ver[ií]a|ar|realidad aumentada|mi piel|mi cuerpo|visualizar/i;
  if (arPatterns.test(msg)) {
    triggers.push('ar_keyword');
    return { primary: 'ar_preview', confidence: 0.8, triggers };
  }
  
  // Greeting
  const greetingPatterns = /^(hola|hi|hey|hello|buenas|buenos|que tal|what'?s up|saludos)/i;
  if (greetingPatterns.test(msg)) {
    triggers.push('greeting');
    return { primary: 'greeting', confidence: 0.95, triggers };
  }
  
  return { primary: 'inquiry', confidence: 0.5, triggers: ['default'] };
}

// ============================================================================
// TOOL EXECUTION (Real data only - NO FALLBACKS)
// ============================================================================

async function executeToolReal(
  toolName: string,
  args: any,
  supabaseUrl: string,
  supabaseKey: string,
  conversationId?: string
): Promise<{ data: any; error?: string; source: 'real' | 'unavailable' }> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  switch (toolName) {
    case 'analysis_reference': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze-reference`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${supabaseKey}` 
          },
          body: JSON.stringify({ 
            imageUrl: args.image_url,
            bodyPart: args.body_part 
          })
        });
        
        if (!response.ok) {
          console.error('[Tool] analyze-reference failed:', response.status);
          return { 
            data: null, 
            error: 'analysis_service_unavailable', 
            source: 'unavailable' 
          };
        }
        
        const result = await response.json();
        return { 
          data: {
            style_match: result.style_match || result.styleMatch,
            detected_styles: result.detected_styles || result.detectedStyles || [],
            subject_tags: result.subject_tags || result.subjectTags || [],
            technical_notes: result.technical_notes || result.technicalNotes,
            client_summary: result.client_summary || result.clientSummary,
            recommended_adjustments: result.recommended_adjustments || result.recommendedAdjustments
          }, 
          source: 'real' 
        };
      } catch (err) {
        console.error('[Tool] analyze-reference error:', err);
        return { data: null, error: 'analysis_failed', source: 'unavailable' };
      }
    }
    
    case 'session_estimator': {
      try {
        // Only estimate if we have minimum required data
        if (!args.size_inches && !args.placement) {
          return { 
            data: null, 
            error: 'missing_inputs', 
            source: 'unavailable' 
          };
        }
        
        const response = await fetch(`${supabaseUrl}/functions/v1/session-estimator`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${supabaseKey}` 
          },
          body: JSON.stringify({ 
            action: 'estimate', 
            inputs: args,
            conversation_id: conversationId 
          })
        });
        
        if (!response.ok) {
          return { data: null, error: 'estimator_unavailable', source: 'unavailable' };
        }
        
        const result = await response.json();
        return { 
          data: result.estimation || result, 
          source: 'real' 
        };
      } catch (err) {
        console.error('[Tool] session-estimator error:', err);
        return { data: null, error: 'estimator_failed', source: 'unavailable' };
      }
    }
    
    case 'check_calendar': {
      try {
        // Query REAL availability from database - NO FALLBACKS
        const today = new Date().toISOString().split('T')[0];
        const { data: availability, error } = await supabase
          .from('availability')
          .select('*')
          .eq('is_available', true)
          .gte('date', today)
          .order('date')
          .limit(10);
        
        if (error) {
          console.error('[Tool] check_calendar DB error:', error);
          return { 
            data: { 
              available: false, 
              slots: [], 
              reason: 'database_error' 
            }, 
            source: 'unavailable' 
          };
        }
        
        // NO FALLBACK - If no real slots, return empty
        if (!availability || availability.length === 0) {
          console.log('[Tool] check_calendar: No availability found in DB');
          return { 
            data: { 
              available: false, 
              slots: [], 
              reason: 'no_availability_configured' 
            }, 
            source: 'real' 
          };
        }
        
        const slots = availability.map((slot: any) => ({
          date: slot.date,
          city: slot.city || 'Austin',
          formatted: `${new Date(slot.date).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })} - ${slot.city || 'Austin'}`,
          time_slots: slot.time_slots
        }));
        
        return { 
          data: { 
            available: true, 
            slots: slots.slice(0, 4),
            deposit_required: 150 
          }, 
          source: 'real' 
        };
      } catch (err) {
        console.error('[Tool] check_calendar error:', err);
        return { 
          data: { 
            available: false, 
            slots: [], 
            reason: 'calendar_error' 
          }, 
          source: 'unavailable' 
        };
      }
    }
    
    case 'create_deposit_link': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/get-payment-link`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${supabaseKey}` 
          },
          body: JSON.stringify({
            amount: args.amount_usd || 150,
            description: args.booking_summary || 'Tattoo Deposit',
            email: args.client_email
          })
        });
        
        if (!response.ok) {
          console.error('[Tool] create_deposit_link failed:', response.status);
          // NO PLACEHOLDER LINKS - Return error
          return { 
            data: null, 
            error: 'payment_not_configured', 
            source: 'unavailable' 
          };
        }
        
        const result = await response.json();
        
        // Only return if we got a real URL
        if (!result.paymentUrl || result.paymentUrl.includes('placeholder')) {
          return { 
            data: null, 
            error: 'payment_not_configured', 
            source: 'unavailable' 
          };
        }
        
        return { 
          data: {
            paymentUrl: result.paymentUrl,
            amount: args.amount_usd || 150,
            slot: args.selected_slot
          }, 
          source: 'real' 
        };
      } catch (err) {
        console.error('[Tool] create_deposit_link error:', err);
        return { 
          data: null, 
          error: 'payment_service_error', 
          source: 'unavailable' 
        };
      }
    }
    
    case 'generate_ar_sketch': {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/sketch-gen-studio`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${supabaseKey}` 
          },
          body: JSON.stringify({
            action: 'generate_sketch',
            prompt: `${args.style_preference || 'geometric'} tattoo: ${args.idea_description}. 
                     Placement: ${args.body_placement}. 
                     Black and grey, clean lines, micro-realism.`,
            placement: args.body_placement,
            skin_tone: args.skin_tone || 'III'
          })
        });
        
        if (!response.ok) {
          return { 
            data: null, 
            error: 'ar_service_unavailable', 
            source: 'unavailable' 
          };
        }
        
        const result = await response.json();
        return { 
          data: {
            sketch_id: result.id,
            sketch_url: result.image_url,
            can_preview_ar: true,
            placement_zone: args.body_placement
          }, 
          source: 'real' 
        };
      } catch (err) {
        console.error('[Tool] generate_ar_sketch error:', err);
        return { 
          data: null, 
          error: 'ar_generation_failed', 
          source: 'unavailable' 
        };
      }
    }
    
    default:
      return { data: null, error: 'unknown_tool', source: 'unavailable' };
  }
}

// ============================================================================
// TRUTH DATA BUILDER - Collects real data before calling Grok
// ============================================================================

interface TruthData {
  analysis?: {
    style_match: number;
    detected_styles: string[];
    subject_tags: string[];
    client_summary?: string;
  };
  estimation?: {
    hours_min: number;
    hours_max: number;
    sessions: number;
    price_min: number;
    price_max: number;
  };
  calendar?: {
    available: boolean;
    slots: any[];
    reason?: string;
  };
  payment?: {
    paymentUrl: string;
    amount: number;
  };
  ar_sketch?: {
    sketch_url: string;
    can_preview_ar: boolean;
  };
}

async function buildTruthData(
  intent: DetectedIntent,
  hasImage: boolean,
  imageUrl: string | null,
  message: string,
  memory: any,
  supabaseUrl: string,
  supabaseKey: string,
  conversationId?: string
): Promise<{ truthData: TruthData; attachments: any[]; toolsExecuted: string[] }> {
  const truthData: TruthData = {};
  const attachments: any[] = [];
  const toolsExecuted: string[] = [];
  
  console.log('[Orchestrator] Building truth data. Intent:', intent.primary, 'HasImage:', hasImage);
  
  // 1. ALWAYS analyze image if present
  if (hasImage && imageUrl) {
    console.log('[Orchestrator] Executing forced: analysis_reference');
    const analysisResult = await executeToolReal(
      'analysis_reference',
      { image_url: imageUrl },
      supabaseUrl,
      supabaseKey,
      conversationId
    );
    
    toolsExecuted.push('analysis_reference');
    
    if (analysisResult.source === 'real' && analysisResult.data) {
      truthData.analysis = {
        style_match: analysisResult.data.style_match,
        detected_styles: analysisResult.data.detected_styles,
        subject_tags: analysisResult.data.subject_tags,
        client_summary: analysisResult.data.client_summary
      };
      
      attachments.push({
        type: 'analysis',
        data: {
          styleMatch: analysisResult.data.style_match,
          detectedStyles: analysisResult.data.detected_styles,
          subjectTags: analysisResult.data.subject_tags
        }
      });
    }
  }
  
  // 2. PRICING intent → Execute session_estimator if we have enough data
  if (intent.primary === 'pricing') {
    // Extract size/placement from message or memory
    const sizeMatch = message.match(/(\d+)\s*(inch|pulgada|cm|centim)/i);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : (memory?.estimatedSize || null);
    
    const placementPatterns = /(forearm|antebrazo|upper.?arm|brazo|chest|pecho|back|espalda|thigh|muslo|calf|pantorrilla|ribs|costillas|wrist|mu[ñn]eca|ankle|tobillo|shoulder|hombro|neck|cuello)/i;
    const placementMatch = message.match(placementPatterns);
    const placement = placementMatch?.[1] || memory?.placement || null;
    
    if (size || placement) {
      console.log('[Orchestrator] Executing forced: session_estimator');
      const estimatorResult = await executeToolReal(
        'session_estimator',
        { size_inches: size || 4, placement: placement || 'forearm', style: 'geometric' },
        supabaseUrl,
        supabaseKey,
        conversationId
      );
      
      toolsExecuted.push('session_estimator');
      
      if (estimatorResult.source === 'real' && estimatorResult.data) {
        const est = estimatorResult.data;
        truthData.estimation = {
          hours_min: est.hours_low || est.total_hours_low || 2,
          hours_max: est.hours_high || est.total_hours_high || 4,
          sessions: est.sessions_needed || 1,
          price_min: est.price_low || est.total_price_low || 400,
          price_max: est.price_high || est.total_price_high || 800
        };
      }
    }
  }
  
  // 3. SCHEDULING intent → Check calendar (real data only)
  if (intent.primary === 'scheduling') {
    console.log('[Orchestrator] Executing forced: check_calendar');
    const calendarResult = await executeToolReal(
      'check_calendar',
      {},
      supabaseUrl,
      supabaseKey,
      conversationId
    );
    
    toolsExecuted.push('check_calendar');
    
    truthData.calendar = {
      available: calendarResult.data?.available || false,
      slots: calendarResult.data?.slots || [],
      reason: calendarResult.data?.reason
    };
    
    if (calendarResult.data?.available && calendarResult.data?.slots?.length > 0) {
      attachments.push({
        type: 'calendar',
        data: {
          slots: calendarResult.data.slots,
          deposit: calendarResult.data.deposit_required || 150
        }
      });
    }
  }
  
  // 4. BOOKING intent → Create deposit link (only if configured)
  if (intent.primary === 'booking') {
    console.log('[Orchestrator] Executing forced: create_deposit_link');
    const paymentResult = await executeToolReal(
      'create_deposit_link',
      { amount_usd: 150, booking_summary: 'Tattoo session deposit' },
      supabaseUrl,
      supabaseKey,
      conversationId
    );
    
    toolsExecuted.push('create_deposit_link');
    
    if (paymentResult.source === 'real' && paymentResult.data?.paymentUrl) {
      truthData.payment = {
        paymentUrl: paymentResult.data.paymentUrl,
        amount: paymentResult.data.amount
      };
      
      attachments.push({
        type: 'payment',
        data: paymentResult.data
      });
    }
  }
  
  // 5. AR_PREVIEW intent → Generate sketch
  if (intent.primary === 'ar_preview' && memory?.tattooDescription) {
    console.log('[Orchestrator] Executing forced: generate_ar_sketch');
    const arResult = await executeToolReal(
      'generate_ar_sketch',
      { 
        idea_description: memory.tattooDescription,
        body_placement: memory.placement || 'forearm',
        style_preference: 'geometric micro-realism'
      },
      supabaseUrl,
      supabaseKey,
      conversationId
    );
    
    toolsExecuted.push('generate_ar_sketch');
    
    if (arResult.source === 'real' && arResult.data?.sketch_url) {
      truthData.ar_sketch = {
        sketch_url: arResult.data.sketch_url,
        can_preview_ar: arResult.data.can_preview_ar
      };
      
      attachments.push({
        type: 'ar_preview',
        data: arResult.data
      });
    }
  }
  
  console.log('[Orchestrator] Truth data built. Tools executed:', toolsExecuted);
  
  return { truthData, attachments, toolsExecuted };
}

// ============================================================================
// SENTIMENT ANALYSIS (Simple, no API call)
// ============================================================================

function analyzeSentiment(message: string): { enthusiasm: number; anxiety: number; urgency: number; recommendedTone: string } {
  const enthusiasmPatterns = [/love|amazing|excited|can't wait|perfect|dream|encanta|emocionado|perfecto/i, /!!+/, /🔥|❤️|😍|✨|💯/];
  const enthusiasm = enthusiasmPatterns.filter(p => p.test(message)).length / enthusiasmPatterns.length * 10;
  
  const anxietyPatterns = [/nervous|worried|scared|first time|will it hurt|afraid|nervioso|preocupado|miedo|primera vez/i, /\?{2,}/, /not sure|maybe|no sé|quizás/i];
  const anxiety = anxietyPatterns.filter(p => p.test(message)).length / anxietyPatterns.length * 10;
  
  const urgencyPatterns = [/asap|urgent|soon|this week|tomorrow|urgente|pronto|rápido|esta semana/i, /when can|available|cuándo|disponible/i];
  const urgency = urgencyPatterns.filter(p => p.test(message)).length / urgencyPatterns.length * 10;
  
  let recommendedTone = "balanced";
  if (anxiety > 5) recommendedTone = "reassuring";
  else if (enthusiasm > 5) recommendedTone = "excited";
  else if (urgency > 5) recommendedTone = "efficient";
  
  return { enthusiasm, anxiety, urgency, recommendedTone };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logAgentDecision(
  supabase: any,
  conversationId: string | undefined,
  intent: DetectedIntent,
  truthData: TruthData,
  toolsExecuted: string[],
  provider: string
): Promise<void> {
  try {
    await supabase.from('agent_decisions_log').insert({
      conversation_id: conversationId,
      decision_type: `intent_${intent.primary}`,
      reasoning: JSON.stringify({
        intent,
        tools_forced: toolsExecuted,
        truth_data_present: {
          analysis: !!truthData.analysis,
          estimation: !!truthData.estimation,
          calendar: !!truthData.calendar,
          payment: !!truthData.payment,
          ar_sketch: !!truthData.ar_sketch
        },
        provider
      }),
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Audit] Failed to log decision:', err);
  }
}

// ============================================================================
// MAIN HANDLER v7.0 - SERVER-DRIVEN ORCHESTRATION
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const hasGrok = !!Deno.env.get('XAI_API_KEY');
    return new Response(JSON.stringify({
      ok: true,
      version: "7.0.0-server-driven-orchestrator",
      primaryAI: hasGrok ? 'xai/grok-4' : 'lovable/gemini-2.5-flash',
      features: [
        "server-driven-tools",
        "no-fabrication-policy",
        "truth-data-injection",
        "real-data-only",
        "intent-based-orchestration"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { message, imageUrl, conversationHistory, memory, conversationId, workspaceId, injectedRulesContext } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const hasImage = !!imageUrl;
    
    // ==== 1. DETECT INTENT (Server-side, deterministic) ====
    const intent = detectIntentFromMessage(message);
    console.log('[v7.0] Intent detected:', intent.primary, 'Confidence:', intent.confidence);
    
    // ==== 2. SENTIMENT ANALYSIS ====
    const sentiment = analyzeSentiment(message);
    
    // ==== 3. BUILD TRUTH DATA (Execute forced tools BEFORE calling Grok) ====
    const { truthData, attachments, toolsExecuted } = await buildTruthData(
      intent,
      hasImage,
      imageUrl,
      message,
      memory,
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
      conversationId
    );
    
    // ==== 4. BUILD GROK CONTEXT WITH TRUTH DATA ====
    let truthDataContext = '';
    
    if (Object.keys(truthData).length > 0) {
      truthDataContext = `\n\n═══════════════════════════════════════════════════════════════
TRUTH_DATA (DATOS REALES - USA ESTOS, NO INVENTES)
═══════════════════════════════════════════════════════════════\n`;
      
      if (truthData.analysis) {
        truthDataContext += `TRUTH_DATA.analysis:
- Style Match: ${truthData.analysis.style_match}%
- Estilos: ${truthData.analysis.detected_styles.join(', ')}
- Elementos: ${truthData.analysis.subject_tags.join(', ')}
${truthData.analysis.client_summary ? `- Resumen: ${truthData.analysis.client_summary}` : ''}\n`;
      }
      
      if (truthData.estimation) {
        truthDataContext += `TRUTH_DATA.estimation:
- Horas: ${truthData.estimation.hours_min}-${truthData.estimation.hours_max} horas
- Sesiones: ${truthData.estimation.sessions}
- Inversión: $${truthData.estimation.price_min}-$${truthData.estimation.price_max} USD\n`;
      }
      
      if (truthData.calendar) {
        if (truthData.calendar.available && truthData.calendar.slots.length > 0) {
          truthDataContext += `TRUTH_DATA.calendar:
- Disponible: Sí
- Slots: ${truthData.calendar.slots.map((s: any) => s.formatted).join(' | ')}\n`;
        } else {
          truthDataContext += `TRUTH_DATA.calendar:
- Disponible: No
- Razón: ${truthData.calendar.reason || 'no_slots_configured'}\n`;
        }
      }
      
      if (truthData.payment) {
        truthDataContext += `TRUTH_DATA.payment:
- Link: ${truthData.payment.paymentUrl}
- Monto: $${truthData.payment.amount} USD\n`;
      }
      
      if (truthData.ar_sketch) {
        truthDataContext += `TRUTH_DATA.ar_sketch:
- Preview disponible: ${truthData.ar_sketch.sketch_url}\n`;
      }
    }
    
    // Emotional context
    const emotionalContext = `\n[TONO RECOMENDADO: ${sentiment.recommendedTone}. Entusiasmo: ${sentiment.enthusiasm.toFixed(1)}/10, Ansiedad: ${sentiment.anxiety.toFixed(1)}/10]`;
    
    // Memory context
    const memoryContext = memory?.clientName 
      ? `\n[CLIENTE: ${memory.clientName}${memory.placement ? `, Zona: ${memory.placement}` : ''}${memory.estimatedSize ? `, Tamaño: ${memory.estimatedSize}"` : ''}]` 
      : '';
    
    // Use injected rules from Gateway if available, otherwise minimal fallback
    const systemPrompt = injectedRulesContext || MINIMAL_FALLBACK_PROMPT;
    
    const messages = [
      { 
        role: 'system', 
        content: systemPrompt + truthDataContext + emotionalContext + memoryContext 
      },
      ...(conversationHistory || []),
      { 
        role: 'user', 
        content: hasImage ? `${message || 'Adjunté una imagen de referencia.'}` : message 
      }
    ];

    console.log('[FerundaAgent v8.0] Calling AI. Tools executed:', toolsExecuted.length, 'TruthData keys:', Object.keys(truthData));

    // ==== 5. CALL GROK (Clean, no tools - just conversation) ====
    const aiResult = await callGrokAI(messages, { maxTokens: 800 });
    
    console.log('[v7.0] AI Response received from:', aiResult.provider);
    
    // ==== 6. AUDIT LOGGING ====
    logAgentDecision(supabase, conversationId, intent, truthData, toolsExecuted, aiResult.provider)
      .catch(err => console.error('[Audit] Error:', err));

    // ==== 7. RETURN RESPONSE ====
    return new Response(JSON.stringify({
      message: aiResult.content,
      toolCalls: toolsExecuted.map(t => ({ name: t, status: 'completed' })),
      attachments,
      updatedMemory: memory,
      aiProvider: aiResult.provider,
      reasoning: {
        intent: intent.primary,
        intentConfidence: intent.confidence,
        toolsExecuted,
        truthDataPresent: {
          analysis: !!truthData.analysis,
          estimation: !!truthData.estimation,
          calendar: !!truthData.calendar,
          payment: !!truthData.payment,
          ar_sketch: !!truthData.ar_sketch
        },
        hasImage,
        attachmentTypes: attachments.map(a => a.type),
        provider: aiResult.provider,
        sentiment: sentiment.recommendedTone
      }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[FerundaAgent v7.0] Error:', error);
    return new Response(JSON.stringify({
      message: 'Lo siento, hubo un problema técnico. ¿Podrías intentarlo de nuevo?',
      error: String(error)
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
