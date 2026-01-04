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
  documentContext?: {
    fileName: string;
    extractedText: string;
    mimeType?: string;
    wordCount?: number;
  };
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
// LANGUAGE DETECTION - VIVO SUPREMO
// =============================================================================

type DetectedLanguage = 'es' | 'en';

// Spanish-specific patterns
const SPANISH_STRONG_PATTERNS = [
  /[áéíóúüñ¿¡]/i,
  /\b(hola|buenos?\s*días?|buenas?\s*tardes?|buenas?\s*noches?|saludos|oye|oiga)\b/i,
  /\b(quiero|necesito|me\s+gustar[ií]a|quisiera|podr[íi]a|tengo|estoy|soy|voy)\b/i,
  /\b(tatuaje|diseño|cita|reserva|precio|cuánto|cuándo|dónde|cómo|qué|por\s*favor|gracias)\b/i,
  /\b(también|además|entonces|porque|aunque|pero|ahora|después|antes)\b/i,
];

const ENGLISH_STRONG_PATTERNS = [
  /\b(hello|hey|hi\b|good\s*(morning|afternoon|evening))\b/i,
  /\b(i\s+want|i\s+need|i('d|\s+would)\s+like|can\s+i|could\s+i|i\s+have|i\s+am)\b/i,
  /\b(tattoo|design|appointment|booking|price|when|where|how\s*much|please|thanks?|thank\s*you)\b/i,
];

function detectLanguageFromMessages(messages: { role: string; content: string }[]): DetectedLanguage {
  // Get the last user message
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  if (!lastUserMsg || lastUserMsg.trim().length < 2) return 'en';
  
  const normalizedText = lastUserMsg.toLowerCase().trim();
  
  // Immediate Spanish detection
  if (/[áéíóúüñ¿¡]/.test(normalizedText)) {
    console.log('[Gateway Lang] 🇪🇸 Spanish chars detected');
    return 'es';
  }
  
  // Check strong Spanish patterns
  for (const pattern of SPANISH_STRONG_PATTERNS) {
    if (pattern.test(normalizedText)) {
      console.log('[Gateway Lang] 🇪🇸 Spanish pattern matched');
      return 'es';
    }
  }
  
  // Check English patterns
  for (const pattern of ENGLISH_STRONG_PATTERNS) {
    if (pattern.test(normalizedText)) {
      console.log('[Gateway Lang] 🇺🇸 English pattern matched');
      return 'en';
    }
  }
  
  // Default to English
  return 'en';
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
  trainingExamples: string,
  documentContext?: GatewayRequest['documentContext'],
  detectedLanguage?: DetectedLanguage
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

  // Document context (if user shared a PDF/DOCX)
  let documentSection = '';
  if (documentContext?.extractedText) {
    documentSection = `
═══════════════════════════════════════════════════════════════
📄 USER SHARED A DOCUMENT: "${documentContext.fileName}"
═══════════════════════════════════════════════════════════════
EXTRACTED CONTENT (${documentContext.wordCount || 'unknown'} words):
"""
${documentContext.extractedText}
"""
Use this content to answer their questions about the document.
`;
  }

  // Language instruction - CRITICAL for response language
  const languageInstruction = detectedLanguage === 'es'
    ? `
═══════════════════════════════════════════════════════════════
🌍 IDIOMA: ESPAÑOL (OBLIGATORIO)
═══════════════════════════════════════════════════════════════
El usuario ha escrito en ESPAÑOL. DEBES responder SIEMPRE en español.
- Usa español refinado, elegante, profesional
- NO mezcles idiomas, todo debe ser en español
- Si el usuario cambia a inglés, cambia tú también
`
    : `
═══════════════════════════════════════════════════════════════
🌍 LANGUAGE: ENGLISH (REQUIRED)
═══════════════════════════════════════════════════════════════
The user has written in ENGLISH. You MUST respond in English.
- Use refined, elegant, professional English
- Do NOT mix languages, everything must be in English
- If the user switches to Spanish, you switch too
`;

  // Combine all sections
  return `You are ETHEREAL — the exclusive liaison to Ferunda's artistry.

${languageInstruction}

═══════════════════════════════════════════════════════════════
🎭 YOUR PERSONA: ETHEREAL
═══════════════════════════════════════════════════════════════
- Voice: luxurious, sober, professional, artistic
- Tone: refined gallery curator, never casual or chatty
- Style: concise, elegant, intentional — every word matters
- You speak as a trusted art advisor, not a chatbot

ABSOLUTE PROHIBITIONS:
- NEVER say "AI", "assistant", "bot", "virtual", "gateway", "concierge"
- NEVER offer the artist's bio/facts unless explicitly asked "who is Ferunda?" or similar
- NEVER self-promote or give unsolicited information
- NEVER use filler phrases like "Great question!" or "I'd be happy to help!"

FOCUS ON THE TATTOO:
- Your sole purpose: understand their vision and guide them toward a session
- When they share an image: describe what you SEE and ask how it relates to their tattoo idea
- When they say "you tell me" after sharing an image: ask 1-2 specific questions about style/placement/size
- One concrete question per turn, never multiple
- If unclear, ask for clarification elegantly

${rulesPrompt}

${voiceProfile}

${artistFacts}

${knowledgeBase}

${trainingExamples}

${documentSection}

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════════════
- Maximum 2-4 sentences
- Elegant, measured prose — no exclamation marks unless truly warranted
- One question per message
- When describing images: be observant, specific, artistic
- Match the refined tone: you're representing a world-class tattoo artist
- ALWAYS respond in the same language as the user (${detectedLanguage === 'es' ? 'ESPAÑOL' : 'ENGLISH'})
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
// GROK AI INTEGRATION (Primary)
// =============================================================================

async function routeToGrok(
  request: GatewayRequest,
  unifiedPrompt: string
): Promise<Response | null> {
  const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
  if (!XAI_API_KEY) {
    console.log("[Gateway] XAI_API_KEY not configured, skipping Grok");
    return null;
  }

  try {
    // Build messages with system prompt
    const grokMessages = [
      { role: "system", content: unifiedPrompt },
      ...request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    ];

    console.log(`[Gateway] Calling Grok with ${grokMessages.length} messages`);

    const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4",
        messages: grokMessages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!grokResponse.ok) {
      console.error(`[Gateway] Grok API error: ${grokResponse.status}`);
      return null;
    }

    console.log("[Gateway] Grok streaming response started");
    return grokResponse;

  } catch (error) {
    console.error("[Gateway] Grok call failed:", error);
    return null;
  }
}

// Transform Grok SSE format to match studio-concierge format
function transformGrokStream(grokBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = grokBody.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                // Pass through in same format (studio-concierge compatible)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error) {
        console.error("[Gateway] Stream transform error:", error);
      } finally {
        controller.close();
      }
    },
  });
}

// =============================================================================
// ROUTE TO STUDIO CONCIERGE (Fallback)
// =============================================================================

async function routeToStudioConcierge(
  request: GatewayRequest,
  rules: UnifiedRule[],
  unifiedPrompt: string
): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  console.log(`[Gateway] Routing to studio-concierge (fallback) with ${rules.length} rules`);

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
      injectedRulesContext: unifiedPrompt,
    }),
  });

  return response;
}

// =============================================================================
// CONVERSATION INSIGHTS EXTRACTION
// =============================================================================

interface ConversationInsight {
  tattoo_idea?: string;
  preferred_style?: string[];
  body_placement?: string;
  size_estimate?: string;
  color_preference?: string;
  budget_range?: string;
  timeline_preference?: string;
  special_requests?: string;
  concerns?: string[];
  conversation_summary?: string;
  intent_detected?: string;
  lead_quality_score?: number;
}

function extractInsightsFromMessages(messages: { role: string; content: string }[]): ConversationInsight {
  const allUserMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  const insights: ConversationInsight = {};

  // Extract tattoo idea (general description)
  const ideaPatterns = [
    /quiero\s+(?:un|una|hacerme)?\s*(?:tatuaje\s+)?(?:de\s+)?(.{10,100}?)(?:\.|,|$)/i,
    /i\s+want\s+(?:a\s+)?(?:tattoo\s+)?(?:of\s+)?(.{10,100}?)(?:\.|,|$)/i,
    /(?:tatuaje|tattoo)\s+(?:de\s+)?(.{10,100}?)(?:\.|,|$)/i,
  ];
  for (const pattern of ideaPatterns) {
    const match = allUserMessages.match(pattern);
    if (match) {
      insights.tattoo_idea = match[1].trim();
      break;
    }
  }

  // Extract style preferences
  const styles: string[] = [];
  const styleKeywords = {
    'realismo': 'realism', 'realistic': 'realism', 'realista': 'realism',
    'tradicional': 'traditional', 'traditional': 'traditional', 'old school': 'traditional',
    'fineline': 'fineline', 'fine line': 'fineline', 'linea fina': 'fineline',
    'blackwork': 'blackwork', 'negro sólido': 'blackwork',
    'geometr': 'geometric', 'geométrico': 'geometric',
    'minimalista': 'minimalist', 'minimalist': 'minimalist', 'minimal': 'minimalist',
    'dotwork': 'dotwork', 'puntillismo': 'dotwork',
    'acuarela': 'watercolor', 'watercolor': 'watercolor',
    'japonés': 'japanese', 'japanese': 'japanese', 'irezumi': 'japanese',
    'tribal': 'tribal',
    'neotradicional': 'neo-traditional', 'neo-traditional': 'neo-traditional',
    'lettering': 'lettering', 'script': 'lettering', 'letra': 'lettering',
  };
  for (const [keyword, style] of Object.entries(styleKeywords)) {
    if (allUserMessages.includes(keyword) && !styles.includes(style)) {
      styles.push(style);
    }
  }
  if (styles.length > 0) insights.preferred_style = styles;

  // Extract body placement
  const placements = [
    'brazo', 'arm', 'forearm', 'antebrazo', 'muñeca', 'wrist',
    'pierna', 'leg', 'muslo', 'thigh', 'pantorrilla', 'calf',
    'espalda', 'back', 'hombro', 'shoulder', 'pecho', 'chest',
    'costilla', 'rib', 'costado', 'side', 'cuello', 'neck',
    'mano', 'hand', 'dedo', 'finger', 'tobillo', 'ankle',
    'manga', 'sleeve', 'full back', 'espalda completa'
  ];
  for (const place of placements) {
    if (allUserMessages.includes(place)) {
      insights.body_placement = place;
      break;
    }
  }

  // Extract size
  const sizePatterns = [
    /(\d+)\s*(cm|centímetros?|centimeters?|pulgadas?|inches?|in)/i,
    /(pequeño|pequeña|small|chico|chica)/i,
    /(mediano|medium|medio)/i,
    /(grande|large|big)/i,
  ];
  for (const pattern of sizePatterns) {
    const match = allUserMessages.match(pattern);
    if (match) {
      insights.size_estimate = match[0];
      break;
    }
  }

  // Color preference
  if (/color|colou?rful|colorido|vibrant/i.test(allUserMessages)) {
    insights.color_preference = 'color';
  } else if (/negro|black|grey|gris|b&g|black.?and.?grey/i.test(allUserMessages)) {
    insights.color_preference = 'black_grey';
  }

  // Timeline
  if (/urgente|pronto|soon|asap|esta semana|this week/i.test(allUserMessages)) {
    insights.timeline_preference = 'urgent';
  } else if (/cuando puedas|no hay prisa|no rush|flexible/i.test(allUserMessages)) {
    insights.timeline_preference = 'flexible';
  } else if (/(\d+)\s*(mes|month|semana|week)/i.test(allUserMessages)) {
    const match = allUserMessages.match(/(\d+)\s*(mes|month|semana|week)/i);
    if (match) insights.timeline_preference = match[0];
  }

  // Concerns
  const concerns: string[] = [];
  if (/dolor|pain|duele|hurt/i.test(allUserMessages)) concerns.push('pain');
  if (/precio|cost|budget|caro|expensive/i.test(allUserMessages)) concerns.push('budget');
  if (/cuid|heal|aftercare|cicatri/i.test(allUserMessages)) concerns.push('healing');
  if (/trabajo|work|ocultar|hide|visible/i.test(allUserMessages)) concerns.push('visibility');
  if (/primera vez|first time|nunca|never/i.test(allUserMessages)) concerns.push('first_timer');
  if (concerns.length > 0) insights.concerns = concerns;

  // Calculate lead quality score (0-100)
  let score = 30; // Base score for engaging
  if (insights.tattoo_idea) score += 20;
  if (insights.preferred_style && insights.preferred_style.length > 0) score += 15;
  if (insights.body_placement) score += 10;
  if (insights.size_estimate) score += 10;
  if (insights.timeline_preference && insights.timeline_preference !== 'flexible') score += 15;
  if (/book|reservar|cita|appointment/i.test(allUserMessages)) score += 20;
  insights.lead_quality_score = Math.min(100, score);

  return insights;
}

async function saveConversationInsights(
  supabase: any,
  sessionId: string | undefined,
  insights: ConversationInsight,
  intent: DetectedIntent
): Promise<void> {
  if (!sessionId) return;

  try {
    // Check if insights already exist for this session
    const { data: existing } = await supabase
      .from('conversation_insights')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    const insightData = {
      session_id: sessionId,
      tattoo_idea: insights.tattoo_idea,
      preferred_style: insights.preferred_style,
      body_placement: insights.body_placement,
      size_estimate: insights.size_estimate,
      color_preference: insights.color_preference,
      budget_range: insights.budget_range,
      timeline_preference: insights.timeline_preference,
      special_requests: insights.special_requests,
      concerns: insights.concerns,
      intent_detected: intent.category,
      lead_quality_score: insights.lead_quality_score,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing
      await supabase
        .from('conversation_insights')
        .update(insightData)
        .eq('id', existing.id);
      console.log(`[Gateway] Updated insights for session ${sessionId}`);
    } else {
      // Insert new
      await supabase
        .from('conversation_insights')
        .insert(insightData);
      console.log(`[Gateway] Created insights for session ${sessionId}`);
    }
  } catch (error) {
    console.error('[Gateway] Failed to save insights:', error);
  }
}

async function saveDocumentToClient(
  supabase: any,
  sessionId: string | undefined,
  documentContext: GatewayRequest['documentContext']
): Promise<void> {
  if (!sessionId || !documentContext) return;

  try {
    // Get session to find client email
    const { data: session } = await supabase
      .from('concierge_sessions')
      .select('id, client_email, workspace_id')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session?.client_email) {
      console.log('[Gateway] No client email in session, skipping document save');
      return;
    }

    // Find or create client profile
    let clientProfileId: string | null = null;
    const { data: existingProfile } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('email', session.client_email)
      .maybeSingle();

    if (existingProfile) {
      clientProfileId = existingProfile.id;
    } else {
      // Create minimal profile for lead
      const { data: newProfile } = await supabase
        .from('client_profiles')
        .insert({
          email: session.client_email,
          email_hash: session.client_email, // Will be hashed by trigger if exists
          source: 'concierge_chat',
        })
        .select('id')
        .single();
      clientProfileId = newProfile?.id;
    }

    if (!clientProfileId) {
      console.log('[Gateway] Could not get/create client profile');
      return;
    }

    // Save document reference (note: file_url would come from upload, this saves the parsed content)
    const { error } = await supabase
      .from('client_documents')
      .insert({
        client_profile_id: clientProfileId,
        session_id: sessionId,
        document_type: 'reference',
        file_name: documentContext.fileName,
        mime_type: documentContext.mimeType,
        extracted_text: documentContext.extractedText?.slice(0, 50000), // Limit size
        file_url: '', // No URL yet - document was only parsed
        description: `Uploaded during chat session`,
        uploaded_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Gateway] Failed to save document:', error);
    } else {
      console.log(`[Gateway] Saved document "${documentContext.fileName}" for client ${clientProfileId}`);
    }
  } catch (error) {
    console.error('[Gateway] Document save error:', error);
  }
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
    // Parse request body first
    const body = await req.json();
    
    // =========================================================================
    // FAST PATH: Health check / warm-up (NO DB calls, NO routing)
    // =========================================================================
    if (body.healthCheck === true || body.warmUp === true) {
      console.log(`[Gateway] Health check/warm-up request`);
      return new Response(
        JSON.stringify({
          ok: true,
          service: "concierge-gateway",
          warmed: true,
          latency: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // =========================================================================
    // FULL PATH: Regular chat request
    // =========================================================================
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { messages, referenceImages, conversationId, mode, documentContext } = body as GatewayRequest;
    const fingerprint = req.headers.get("x-device-fingerprint") || "unknown";

    console.log(`[Gateway] Request: ${messages?.length || 0} messages, mode=${mode}, fingerprint=${fingerprint.slice(0, 8)}..., hasDocument=${!!documentContext}`);

    // Load all context in parallel
    const [rules, voiceProfile, artistFacts, knowledgeBase, trainingExamples] = await Promise.all([
      loadUnifiedRules(supabase),
      loadVoiceProfile(supabase),
      loadArtistFacts(supabase),
      loadKnowledgeBase(supabase),
      loadTrainingExamples(supabase),
    ]);

    // Detect intent (for logging and future routing)
    const intent = detectIntent(messages);
    
    // 🔥 VIVO: Detect language from user messages
    const detectedLanguage = detectLanguageFromMessages(messages);
    console.log(`[Gateway] Language detected: ${detectedLanguage === 'es' ? 'ESPAÑOL 🇪🇸' : 'ENGLISH 🇺🇸'}`);

    // Build unified prompt with all rules, voice, training, knowledge, document context AND language
    const systemPrompt = buildUnifiedPrompt(rules, voiceProfile, artistFacts, knowledgeBase, trainingExamples, documentContext, detectedLanguage);

    // =========================================================================
    // EXTRACT & SAVE INSIGHTS (async, non-blocking)
    // =========================================================================
    const insights = extractInsightsFromMessages(messages);
    
    // Save insights if lead seems qualified (score >= 50 or booking intent)
    if (insights.lead_quality_score && insights.lead_quality_score >= 50 || intent.category === 'booking') {
      // Fire-and-forget: don't block the response
      Promise.all([
        saveConversationInsights(supabase, conversationId, insights, intent),
        documentContext ? saveDocumentToClient(supabase, conversationId, documentContext) : Promise.resolve(),
      ]).catch(err => console.error('[Gateway] Background save error:', err));
      
      console.log(`[Gateway] Qualified lead detected (score=${insights.lead_quality_score}, intent=${intent.category})`);
    }

    // =========================================================================
    // GROK FIRST: Try Grok API, fallback to studio-concierge
    // =========================================================================
    let finalResponse: Response;
    let usedGrok = false;

    // Only use Grok for simple chat (no images/documents that need tools)
    const hasComplexAttachments = (referenceImages && referenceImages.length > 0) || documentContext;
    
    if (!hasComplexAttachments) {
      const grokResponse = await routeToGrok(
        { messages, referenceImages, conversationId, mode, fingerprint, documentContext },
        systemPrompt
      );

      if (grokResponse && grokResponse.body) {
        console.log(`[Gateway] Using Grok response (intent=${intent.category})`);
        usedGrok = true;
        
        // Transform Grok stream to match studio-concierge format
        const transformedStream = transformGrokStream(grokResponse.body);
        
        finalResponse = new Response(transformedStream, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Gateway-Latency": `${Date.now() - startTime}ms`,
            "X-Gateway-Intent": intent.category,
            "X-Gateway-Provider": "grok",
            "X-Gateway-RulesLoaded": String(rules.length),
            "X-Gateway-Language": detectedLanguage,
          },
        });
      } else {
        // Fallback to studio-concierge
        console.log(`[Gateway] Grok unavailable, falling back to studio-concierge`);
        finalResponse = await routeToStudioConcierge(
          { messages, referenceImages, conversationId, mode, fingerprint, documentContext },
          rules,
          systemPrompt
        );
      }
    } else {
      // Complex requests go directly to studio-concierge (has tools for images/docs)
      console.log(`[Gateway] Complex request, routing to studio-concierge (intent=${intent.category})`);
      finalResponse = await routeToStudioConcierge(
        { messages, referenceImages, conversationId, mode, fingerprint, documentContext },
        rules,
        systemPrompt
      );
    }

    // Pass through the response with gateway headers
    const responseHeaders = new Headers(finalResponse.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    responseHeaders.set("X-Gateway-Latency", `${Date.now() - startTime}ms`);
    responseHeaders.set("X-Gateway-Intent", intent.category);
    responseHeaders.set("X-Gateway-RulesLoaded", String(rules.length));
    responseHeaders.set("X-Gateway-Language", detectedLanguage);
    if (!usedGrok) {
      responseHeaders.set("X-Gateway-Provider", "studio-concierge");
    }

    console.log(`[Gateway] Completed in ${Date.now() - startTime}ms (provider=${usedGrok ? 'grok' : 'studio-concierge'})`);

    return new Response(finalResponse.body, {
      status: finalResponse.status,
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
