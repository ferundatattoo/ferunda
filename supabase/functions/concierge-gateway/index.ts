// =============================================================================
// CONCIERGE GATEWAY - Unified Entry Point
// Centralizes rules, routes to specialists, validates responses
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-fingerprint",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// =============================================================================
// TYPES
// =============================================================================

interface UnifiedRule {
  id: string;
  rule_category: string;
  rule_key: string;
  rule_value: Record<string, unknown>;
  rule_text: string | null;
  priority: number;
}

interface GatewayRequest {
  messages: { role: string; content: string }[];
  referenceImages?: string[];
  conversationId?: string;
  mode?: string;
  fingerprint?: string;
}

interface DetectedIntent {
  category: 'booking' | 'info' | 'design' | 'pricing' | 'availability' | 'referral' | 'support' | 'greeting' | 'unknown';
  confidence: number;
  needsTools: boolean;
  detectedEntities: {
    wantsColor?: boolean;
    mentionsGuestSpot?: boolean;
    mentionsPricing?: boolean;
    mentionsArtist?: boolean;
    isQuestion?: boolean;
  };
}

// =============================================================================
// RULE LOADER
// =============================================================================

async function loadUnifiedRules(supabase: any): Promise<UnifiedRule[]> {
  const { data, error } = await supabase
    .from('concierge_unified_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('[Gateway] Failed to load rules:', error);
    return [];
  }

  console.log(`[Gateway] Loaded ${data?.length || 0} unified rules`);
  return data || [];
}

// =============================================================================
// VOICE PROFILE & FACTS LOADER
// =============================================================================

async function loadVoiceProfile(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('voice_profile')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!data) return '';

  return `
VOICE PROFILE:
- Tone: ${data.tone_descriptors?.join(', ') || 'friendly, professional'}
- Sentence length: ${data.sentence_length_preference || 'short'}
- Emoji usage: ${data.emoji_usage || 'minimal'}
- Formality: ${data.formality_level || 'casual'}
- Forbidden phrases: ${data.forbidden_phrases?.join(', ') || 'none'}
`;
}

async function loadArtistFacts(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('artist_public_facts')
    .select('*')
    .eq('is_verified', true)
    .eq('is_public', true);

  if (!data || data.length === 0) return '';

  const facts = data.map((f: any) => `- ${f.fact_category}: ${f.fact_key} = ${f.fact_value}`).join('\n');
  return `
VERIFIED ARTIST FACTS (use ONLY these):
${facts}
`;
}

async function loadKnowledgeBase(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('concierge_knowledge')
    .select('topic, content')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!data || data.length === 0) return '';

  const kb = data.map((k: any) => `[${k.topic}]: ${k.content}`).join('\n');
  return `
KNOWLEDGE BASE:
${kb}
`;
}

async function loadTrainingExamples(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('concierge_training')
    .select('user_message, ideal_response, context_tags')
    .eq('is_active', true)
    .order('usage_count', { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return '';

  const examples = data.map((t: any) => 
    `Q: "${t.user_message}"\nA: "${t.ideal_response}"`
  ).join('\n\n');

  return `
TRAINING EXAMPLES (match this tone & style):
${examples}
`;
}

// =============================================================================
// INTENT DETECTION
// =============================================================================

function detectIntent(messages: { role: string; content: string }[]): DetectedIntent {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content?.toLowerCase() || '';
  
  const patterns = {
    booking: /\b(book|booking|reserv|cita|agendar|schedule|appointment|appoint)\b/i,
    pricing: /\b(price|pricing|cost|cuánto|cuanto|how much|rate|hourly|deposit|depósito)\b/i,
    availability: /\b(available|availability|when|cuándo|cuando|dates?|slots?|open|free)\b/i,
    guestSpot: /\b(guest.?spot|travel|viaj|ciudad|city|cities|country|país|pais|location|visit)\b/i,
    artist: /\b(who|quién|quien|artist|artista|ferunda|bio|about|experience|style)\b/i,
    color: /\b(color|colou?r|full.?color|vibrant|colorido|colorful)\b/i,
    referral: /\b(refer|recommend|another|otro|someone.?else|other.?artist)\b/i,
    support: /\b(help|ayuda|problem|issue|frustrated|human|person|real.?person)\b/i,
    greeting: /^(hi|hello|hola|hey|buenos|good\s+(morning|afternoon|evening)|qué tal|que tal)/i,
  };

  // Detect category
  let category: DetectedIntent['category'] = 'unknown';
  let confidence = 0.5;
  let needsTools = false;

  if (patterns.greeting.test(lastUserMsg) && lastUserMsg.length < 50) {
    category = 'greeting';
    confidence = 0.9;
    needsTools = false;
  } else if (patterns.booking.test(lastUserMsg)) {
    category = 'booking';
    confidence = 0.85;
    needsTools = true;
  } else if (patterns.pricing.test(lastUserMsg)) {
    category = 'pricing';
    confidence = 0.85;
    needsTools = true;
  } else if (patterns.availability.test(lastUserMsg) || patterns.guestSpot.test(lastUserMsg)) {
    category = 'availability';
    confidence = 0.85;
    needsTools = true;
  } else if (patterns.referral.test(lastUserMsg)) {
    category = 'referral';
    confidence = 0.8;
    needsTools = true;
  } else if (patterns.support.test(lastUserMsg)) {
    category = 'support';
    confidence = 0.8;
    needsTools = true;
  } else if (patterns.artist.test(lastUserMsg)) {
    category = 'info';
    confidence = 0.75;
    needsTools = true;
  } else if (lastUserMsg.includes('?')) {
    category = 'info';
    confidence = 0.6;
    needsTools = false;
  }

  // Detect entities
  const detectedEntities = {
    wantsColor: patterns.color.test(lastUserMsg),
    mentionsGuestSpot: patterns.guestSpot.test(lastUserMsg),
    mentionsPricing: patterns.pricing.test(lastUserMsg),
    mentionsArtist: patterns.artist.test(lastUserMsg),
    isQuestion: lastUserMsg.includes('?'),
  };

  // If any critical entity detected, likely needs tools
  if (detectedEntities.mentionsGuestSpot || detectedEntities.mentionsPricing || detectedEntities.mentionsArtist) {
    needsTools = true;
  }

  console.log(`[Gateway] Intent: ${category} (confidence: ${confidence}, needsTools: ${needsTools})`);
  
  return { category, confidence, needsTools, detectedEntities };
}

// =============================================================================
// BUILD UNIFIED PROMPT FROM RULES
// =============================================================================

function buildUnifiedPrompt(
  rules: UnifiedRule[],
  voiceProfile: string,
  artistFacts: string,
  knowledgeBase: string,
  trainingExamples: string
): string {
  // Group rules by category
  const rulesByCategory: Record<string, UnifiedRule[]> = {};
  for (const rule of rules) {
    if (!rulesByCategory[rule.rule_category]) {
      rulesByCategory[rule.rule_category] = [];
    }
    rulesByCategory[rule.rule_category].push(rule);
  }

  // Build rule sections
  let rulesPrompt = `
═══════════════════════════════════════════════════════════════
🚨 NON-NEGOTIABLE RULES (from unified rules database)
═══════════════════════════════════════════════════════════════
`;

  // Tool gating rules (highest priority)
  if (rulesByCategory['tool_gating']) {
    rulesPrompt += '\n📋 TOOL GATING:\n';
    for (const rule of rulesByCategory['tool_gating']) {
      if (rule.rule_text) rulesPrompt += `• ${rule.rule_text}\n`;
    }
  }

  // Style rules
  if (rulesByCategory['style_rules'] || rulesByCategory['style']) {
    rulesPrompt += '\n🎨 STYLE RULES:\n';
    for (const rule of [...(rulesByCategory['style_rules'] || []), ...(rulesByCategory['style'] || [])]) {
      if (rule.rule_text) rulesPrompt += `• ${rule.rule_text}\n`;
    }
  }

  // Color rules
  if (rulesByCategory['color']) {
    rulesPrompt += '\n🖤 COLOR POLICY:\n';
    for (const rule of rulesByCategory['color']) {
      if (rule.rule_text) {
        rulesPrompt += `• ${rule.rule_text}\n`;
      } else if (rule.rule_key === 'color_policy') {
        const val = rule.rule_value as any;
        rulesPrompt += `• Artist works in: ${val.type || 'black_grey_only'}. Exception: ${val.exception || 'none'}\n`;
      }
    }
  }

  // Conversation rules
  if (rulesByCategory['conversation_rules'] || rulesByCategory['behavior']) {
    rulesPrompt += '\n💬 CONVERSATION RULES:\n';
    for (const rule of [...(rulesByCategory['conversation_rules'] || []), ...(rulesByCategory['behavior'] || [])]) {
      if (rule.rule_text) rulesPrompt += `• ${rule.rule_text}\n`;
    }
  }

  // Business rules
  if (rulesByCategory['business_rules'] || rulesByCategory['booking']) {
    rulesPrompt += '\n💼 BUSINESS RULES:\n';
    for (const rule of [...(rulesByCategory['business_rules'] || []), ...(rulesByCategory['booking'] || [])]) {
      if (rule.rule_text) rulesPrompt += `• ${rule.rule_text}\n`;
    }
  }

  // Pricing rules
  if (rulesByCategory['pricing']) {
    rulesPrompt += '\n💰 PRICING RULES:\n';
    for (const rule of rulesByCategory['pricing']) {
      if (rule.rule_text) {
        rulesPrompt += `• ${rule.rule_text}\n`;
      } else if (rule.rule_key === 'is_public') {
        const isPublic = Boolean((rule.rule_value as Record<string, unknown>)?.value ?? false);
        rulesPrompt += `• Pricing disclosure: ${isPublic ? 'allowed' : 'NOT allowed - use safe messaging'}\n`;
      }
    }
  }

  // Identity rules
  if (rulesByCategory['identity']) {
    rulesPrompt += '\n👤 IDENTITY:\n';
    for (const rule of rulesByCategory['identity']) {
      if (rule.rule_text) {
        rulesPrompt += `• ${rule.rule_text}\n`;
      } else {
        const val = rule.rule_value;
        rulesPrompt += `• ${rule.rule_key}: ${typeof val === 'object' ? JSON.stringify(val) : val}\n`;
      }
    }
  }

  // Language rules
  if (rulesByCategory['language']) {
    rulesPrompt += '\n🌍 LANGUAGE:\n';
    for (const rule of rulesByCategory['language']) {
      if (rule.rule_text) rulesPrompt += `• ${rule.rule_text}\n`;
    }
  }

  // Combine all sections
  return `You are the Studio Concierge, an AI assistant representing the tattoo artist.

${rulesPrompt}

${voiceProfile}

${artistFacts}

${knowledgeBase}

${trainingExamples}

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════════════
- Keep responses 2-4 sentences max
- Sound like a friendly, knowledgeable person texting - not formal AI
- Ask ONE question at a time
- NEVER invent facts - if unsure, say so
- Match the tone of the training examples above
`;
}

// =============================================================================
// RESPONSE VALIDATION
// =============================================================================

interface ValidationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
}

function validateResponse(response: string, rules: UnifiedRule[], intent: DetectedIntent): ValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check color policy violation
  const colorRule = rules.find(r => r.rule_key === 'color_policy' || r.rule_key === 'allows_color');
  if (colorRule) {
    const allowsColor = (colorRule.rule_value as Record<string, unknown>)?.allows_color === true || 
                        (colorRule.rule_value as Record<string, unknown>)?.type !== 'black_grey_only';
    
    if (!allowsColor && /puedo hacer(te)?.*colou?r|sí.*(hago|trabajo).*colou?r/i.test(response)) {
      violations.push('color_policy: Claimed to do color work when artist is black & grey only');
    }
  }

  // Check pricing disclosure
  const pricingRule = rules.find(r => r.rule_key === 'is_public');
  if (pricingRule) {
    const isPricingPublic = Boolean((pricingRule.rule_value as Record<string, unknown>)?.value ?? false);
    if (!isPricingPublic && /\$\d+|\d+\s*(dollars?|dólares?|usd)/i.test(response)) {
      violations.push('pricing_disclosure: Disclosed specific pricing when not allowed');
    }
  }

  // Check for incomplete sentences (cut off mid-thought)
  if (/[a-zA-Z]\s*\.\.\.\s*$|&\s*$|\sin\s*$|\sand\s*$/i.test(response)) {
    warnings.push('incomplete_sentence: Response appears to be cut off');
  }

  // Check for abbreviations that should be avoided
  if (/\bB\s*&\s*G\b|B\+G/i.test(response)) {
    warnings.push('abbreviation: Used "B&G" instead of "black and grey"');
  }

  // Check response length
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 6) {
    warnings.push('length: Response is too long (more than 6 sentences)');
  }

  console.log(`[Gateway] Validation: ${violations.length} violations, ${warnings.length} warnings`);

  return {
    isValid: violations.length === 0,
    violations,
    warnings
  };
}

// =============================================================================
// AI CALL (Simple for greetings, route to studio-concierge for complex)
// =============================================================================

async function callAISimple(systemPrompt: string, messages: { role: string; content: string }[]): Promise<ReadableStream> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const response = await fetch("https://ai.lovable.dev/api/v2/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI call failed: ${response.status}`);
  }

  return response.body!;
}

async function routeToStudioConcierge(
  request: GatewayRequest,
  rules: UnifiedRule[]
): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Call studio-concierge with injected rules context
  const response = await fetch(`${supabaseUrl}/functions/v1/studio-concierge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
      "x-device-fingerprint": request.fingerprint || "unknown",
    },
    body: JSON.stringify({
      messages: request.messages,
      referenceImages: request.referenceImages,
      conversationId: request.conversationId,
      mode: request.mode || "explore",
      // Pass rules summary to studio-concierge (it will use its own tool logic)
      injectedRulesContext: {
        rulesLoaded: rules.length,
        categories: [...new Set(rules.map(r => r.rule_category))],
      },
    }),
  });

  return response;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request
    const body: GatewayRequest = await req.json();
    const { messages, referenceImages, conversationId, mode } = body;
    const fingerprint = req.headers.get("x-device-fingerprint") || "unknown";

    console.log(`[Gateway] Request: ${messages.length} messages, mode=${mode}, fingerprint=${fingerprint.slice(0, 8)}...`);

    // Load all context in parallel
    const [rules, voiceProfile, artistFacts, knowledgeBase, trainingExamples] = await Promise.all([
      loadUnifiedRules(supabase),
      loadVoiceProfile(supabase),
      loadArtistFacts(supabase),
      loadKnowledgeBase(supabase),
      loadTrainingExamples(supabase),
    ]);

    // Detect intent
    const intent = detectIntent(messages);

    // Decision: Simple greeting or complex request?
    if (intent.category === 'greeting' && !intent.needsTools && !referenceImages?.length) {
      // Handle simple greeting directly with AI
      console.log('[Gateway] Handling greeting directly');
      
      const systemPrompt = buildUnifiedPrompt(rules, voiceProfile, artistFacts, knowledgeBase, trainingExamples);
      const stream = await callAISimple(systemPrompt, messages);

      // Create SSE stream for frontend
      const encoder = new TextEncoder();
      const transformedStream = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                  } catch {
                    // Skip malformed JSON
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        }
      });

      console.log(`[Gateway] Greeting handled in ${Date.now() - startTime}ms`);

      return new Response(transformedStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Complex request: Route to studio-concierge (which has all the tools)
    console.log('[Gateway] Routing to studio-concierge for tools');
    
    const conciergeResponse = await routeToStudioConcierge(
      { messages, referenceImages, conversationId, mode, fingerprint },
      rules
    );

    // Pass through the response with gateway headers
    const responseHeaders = new Headers(conciergeResponse.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    responseHeaders.set("X-Gateway-Latency", `${Date.now() - startTime}ms`);
    responseHeaders.set("X-Gateway-Intent", intent.category);

    console.log(`[Gateway] Routed in ${Date.now() - startTime}ms, intent=${intent.category}`);

    return new Response(conciergeResponse.body, {
      status: conciergeResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("[Gateway] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Gateway error",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
