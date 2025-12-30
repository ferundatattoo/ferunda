import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================
// STUDIO CONCIERGE - AI VIRTUAL ASSISTANT v3.0
// Policy Engine + Pre-Gate + Structured Intent
// =============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token, x-device-fingerprint",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Concierge Modes
type ConciergeMode = 'explore' | 'qualify' | 'commit' | 'prepare' | 'aftercare' | 'rebook';

interface PreGateResponses {
  wantsColor?: boolean;
  isCoverUp?: boolean;
  isTouchUp?: boolean;
  isRework?: boolean;
  isRepeatDesign?: boolean;
  is18Plus?: boolean;
}

interface ConversationContext {
  mode: ConciergeMode;
  conversation_id?: string;
  tattoo_brief_id?: string;
  booking_id?: string;
  client_name?: string;
  client_email?: string;
  artist_id?: string;
  current_step?: string;
  collected_fields?: Record<string, unknown>;
  pre_gate_passed?: boolean;
  pre_gate_responses?: PreGateResponses;
  policy_decision?: 'ALLOW' | 'REVIEW' | 'BLOCK';
  structured_intent_id?: string;
}

interface FlowStep {
  step_key: string;
  step_name: string;
  step_order: number;
  default_question: string;
  collects_field: string | null;
  is_required: boolean;
  skip_if_known: boolean;
  follow_up_on_unclear: boolean;
  max_follow_ups: number;
  valid_responses: string[] | null;
  depends_on: string[] | null;
}

interface Artist {
  id: string;
  display_name: string;
  specialty_styles: string[];
  bio: string | null;
  is_owner: boolean;
}

interface PricingModel {
  id: string;
  pricing_type: string;
  rate_amount: number;
  rate_currency: string;
  deposit_type: string;
  deposit_amount: number | null;
  deposit_percentage: number | null;
  minimum_amount: number | null;
  applies_to_styles: string[];
  artist_id: string | null;
  city_id: string | null;
}

interface MessageTemplate {
  template_key: string;
  message_content: string;
  allow_ai_variation: boolean;
  trigger_event: string | null;
  trigger_mode: string | null;
}

// Tool definitions - enhanced with policy engine + structured intent + Facts Vault
const conciergeTools = [
  // ===== NEW PHASE 1 TOOLS: Facts Vault + Guest Spots =====
  {
    type: "function",
    function: {
      name: "get_artist_public_facts",
      description: "REQUIRED: Get verified public facts about the artist. MUST call this before speaking about artist bio, styles, base location, booking model, or any artist details. Only speak facts marked as verified.",
      parameters: {
        type: "object",
        properties: {
          artist_id: { type: "string", description: "Artist ID (optional, defaults to primary artist)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_guest_spots",
      description: "REQUIRED: Check for announced guest spot events. MUST call this before speaking about guest spots, availability in specific cities/countries, or travel dates. If empty, offer notify-only or fast-track waitlist.",
      parameters: {
        type: "object",
        properties: {
          artist_id: { type: "string", description: "Artist ID" },
          country: { type: "string", description: "Filter by country (e.g., 'Mexico', 'United States')" },
          city: { type: "string", description: "Filter by city (e.g., 'Los Angeles', 'Austin')" },
          include_rumored: { type: "boolean", description: "Include unannounced/rumored events (default false)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "subscribe_guest_spot_alerts",
      description: "Subscribe a client to receive notifications when guest spot dates are announced for a specific location. Use after user says they want to be notified.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Client email address" },
          artist_id: { type: "string", description: "Artist ID" },
          country: { type: "string", description: "Country to watch (e.g., 'Mexico')" },
          city: { type: "string", description: "City to watch (optional, null = all cities in country)" },
          subscription_type: {
            type: "string",
            enum: ["notify_only", "fast_track"],
            description: "notify_only = just email when dates open. fast_track = also collect placement/size for pre-approval"
          },
          placement: { type: "string", description: "For fast_track: body placement" },
          size: { type: "string", description: "For fast_track: estimated size" },
          client_name: { type: "string", description: "Client name" }
        },
        required: ["email", "country", "subscription_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_referral_request",
      description: "Create a referral/handoff request when the client asks to be referred to another artist (e.g., color realism, cover-up specialist) or asks you to 'search external'. Use this INSTEAD of claiming you can browse the web. Collect email + preferred city, then call this tool.",
      parameters: {
        type: "object",
        properties: {
          client_email: { type: "string", description: "Client email address" },
          client_name: { type: "string", description: "Client name (optional)" },
          preferred_city: { type: "string", description: "Preferred city for the referral (optional)" },
          request_type: { type: "string", description: "Type of request (default external_referral)" },
          request_summary: { type: "string", description: "Short summary of what they want (style, subject, constraints)" }
        },
        required: ["client_email", "request_summary"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_voice_profile",
      description: "Get the artist's voice profile for consistent tone and messaging rules.",
      parameters: {
        type: "object",
        properties: {
          artist_id: { type: "string", description: "Artist ID" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_conversation_state",
      description: "Update the conversation state tracking. Call after learning journey goal, location preference, or confirming facts.",
      parameters: {
        type: "object",
        properties: {
          journey_goal: { 
            type: "string", 
            enum: ["idea_exploration", "booking_now", "guest_spot_search", "notify_only", "fast_track_waitlist"],
            description: "What the client is trying to accomplish"
          },
          location_preference: { type: "string", description: "Preferred city/country for the session" },
          has_asked_about_guest_spots: { type: "boolean" },
          facts_confirmed: {
            type: "object",
            properties: {
              pricing: { type: "string", enum: ["unknown", "confirmed"] },
              guest_spots: { type: "string", enum: ["unknown", "confirmed"] },
              base_location: { type: "string", enum: ["unknown", "confirmed"] }
            }
          },
          collected_field: {
            type: "object",
            properties: {
              field_name: { type: "string" },
              field_value: { type: "string" }
            }
          }
        },
        required: []
      }
    }
  },
  // ===== EXISTING TOOLS =====
  {
    type: "function",
    function: {
      name: "update_tattoo_brief",
      description: "Update the client's tattoo brief with new information. Call this whenever you learn something new. The Live Brief Card updates in real-time.",
      parameters: {
        type: "object",
        properties: {
          style: { type: "string", description: "Tattoo style" },
          style_confidence: { type: "number", description: "Confidence 0.0-1.0" },
          subject: { type: "string", description: "What the tattoo depicts" },
          mood_keywords: { type: "array", items: { type: "string" } },
          placement: { type: "string", description: "Body location" },
          size_estimate_inches_min: { type: "number" },
          size_estimate_inches_max: { type: "number" },
          color_type: { type: "string", enum: ["black_grey", "color", "mixed", "undecided"] },
          session_estimate_hours_min: { type: "number" },
          session_estimate_hours_max: { type: "number" },
          constraints: { 
            type: "object",
            properties: {
              is_coverup: { type: "boolean" },
              has_scarring: { type: "boolean" },
              budget_min: { type: "number" },
              budget_max: { type: "number" },
              deadline: { type: "string" },
              first_tattoo: { type: "boolean" }
            }
          },
          missing_info: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["draft", "ready", "approved"] }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "extract_structured_intent",
      description: "Extract structured intent from the conversation. Call this when you have enough info to assess style, work type, size, placement, and complexity. This triggers the policy engine evaluation.",
      parameters: {
        type: "object",
        properties: {
          styles_detected: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tag: { type: "string", description: "Style tag like micro_realism, black_and_grey_realism, etc." },
                confidence: { type: "number", minimum: 0, maximum: 1 }
              }
            }
          },
          work_type: {
            type: "object",
            properties: {
              value: { type: "string", enum: ["new_original", "cover_up", "touch_up_own_work", "touch_up_other_artist", "rework", "repeat_design", "flash", "consult_only", "unknown"] },
              confidence: { type: "number" }
            }
          },
          inferred: {
            type: "object",
            properties: {
              includes_color: { type: "boolean" },
              placement: { type: "string" },
              size_inches_estimate: { type: "number" },
              subject_tags: { type: "array", items: { type: "string" } }
            }
          },
          complexity: {
            type: "object",
            properties: {
              score: { type: "number", minimum: 0, maximum: 100 },
              label: { type: "string", enum: ["small", "medium", "large", "multi_session", "unknown"] }
            }
          },
          estimated_hours: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" }
            }
          },
          risk_flags: {
            type: "array",
            items: { type: "string" },
            description: "Flags like low_confidence, contradiction_detected, tiny_size_for_detail, possible_coverup_hidden, etc."
          },
          notes: { type: "string", description: "Internal summary for the rules engine" }
        },
        required: ["styles_detected", "work_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "advance_conversation_step",
      description: "Move to the next step in the conversation flow after collecting the current field. Call this after successfully gathering information for a step.",
      parameters: {
        type: "object",
        properties: {
          current_step: { type: "string", description: "The step just completed" },
          collected_value: { type: "string", description: "The value collected from the client" },
          needs_clarification: { type: "boolean", description: "If the answer was unclear" }
        },
        required: ["current_step"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_artist_info",
      description: "Get information about available artists, their styles, and specialties.",
      parameters: {
        type: "object",
        properties: {
          style_filter: { type: "string", description: "Filter by style specialty" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pricing_info",
      description: "Get detailed pricing information including hourly rates, day sessions, piece quotes, and deposits.",
      parameters: {
        type: "object",
        properties: {
          artist_id: { type: "string", description: "Specific artist" },
          city: { type: "string", description: "Location filter" },
          style: { type: "string", description: "Style for price matching" },
          estimated_hours: { type: "number", description: "Estimated session length" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_fit_score",
      description: "Assess how well the project fits with an artist's style and capabilities.",
      parameters: {
        type: "object",
        properties: {
          style: { type: "string" },
          subject: { type: "string" },
          size: { type: "string" },
          artist_id: { type: "string" }
        },
        required: ["style"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_best_times",
      description: "Get optimal scheduling options based on artist availability and preferences.",
      parameters: {
        type: "object",
        properties: {
          session_hours: { type: "number" },
          preferred_city: { type: "string" },
          preferred_dates: { type: "array", items: { type: "string" } },
          artist_id: { type: "string" },
          flexibility: { type: "string", enum: ["any", "weekends_only", "weekdays_only"] }
        },
        required: ["session_hours"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "hold_slot",
      description: "Reserve a time slot for 15 minutes while the client completes payment.",
      parameters: {
        type: "object",
        properties: {
          availability_id: { type: "string" },
          date: { type: "string" },
          city_id: { type: "string" },
          artist_id: { type: "string" }
        },
        required: ["availability_id", "date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check available dates for artists and locations.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          artist_id: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a new booking with collected information.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          tattoo_description: { type: "string" },
          placement: { type: "string" },
          size: { type: "string" },
          preferred_date: { type: "string" },
          requested_city: { type: "string" },
          artist_id: { type: "string" }
        },
        required: ["name", "email", "tattoo_description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_mode",
      description: "Transition to a different concierge mode.",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["explore", "qualify", "commit", "prepare", "aftercare", "rebook"] },
          reason: { type: "string" }
        },
        required: ["mode"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_template_message",
      description: "Send a pre-defined message template, optionally with AI variation.",
      parameters: {
        type: "object",
        properties: {
          template_key: { type: "string", description: "The template to use" },
          variables: { type: "object", description: "Variables to substitute" },
          use_variation: { type: "boolean", description: "Allow AI to vary the message" }
        },
        required: ["template_key"]
      }
    }
  }
];

// Fetch conversation flow configuration
async function fetchFlowConfig(supabase: any, mode: ConciergeMode): Promise<FlowStep[]> {
  const { data } = await supabase
    .from("concierge_flow_config")
    .select("*")
    .eq("concierge_mode", mode)
    .eq("is_active", true)
    .order("step_order", { ascending: true });
  
  return data || [];
}

// Fetch artists with capabilities
async function fetchArtists(supabase: any): Promise<Artist[]> {
  const { data } = await supabase
    .from("studio_artists")
    .select("*, artist_capabilities(*)")
    .eq("is_active", true)
    .order("is_primary", { ascending: false });
  
  return data || [];
}

// Fetch artist capabilities for filtering
async function fetchArtistCapabilities(supabase: any, artistId?: string): Promise<any> {
  let query = supabase.from("artist_capabilities").select("*");
  if (artistId) query = query.eq("artist_id", artistId);
  const { data } = await query;
  return data?.[0] || null;
}

// Fetch rejection templates
async function fetchRejectionTemplates(supabase: any): Promise<any[]> {
  const { data } = await supabase
    .from("concierge_rejection_templates")
    .select("*")
    .eq("is_active", true);
  return data || [];
}

// Build artist capabilities summary for prompt
function buildCapabilitiesSummary(artists: any[]): string {
  if (!artists || artists.length === 0) return "";
  
  let summary = `

═══════════════════════════════════════════════════════════════
🎨 ARTIST CAPABILITIES - USE THIS TO FILTER CLIENTS
═══════════════════════════════════════════════════════════════

CRITICAL: You MUST check if a client's request matches what the artist accepts.
If it doesn't match, politely explain and offer alternatives.

`;

  artists.forEach((artist: any) => {
    const caps = artist.artist_capabilities;
    if (!caps) return;
    
    summary += `\n【${artist.display_name || artist.name}】\n`;
    
    if (caps.signature_styles?.length) {
      summary += `✓ SIGNATURE STYLES: ${caps.signature_styles.join(", ")}\n`;
    }
    if (caps.accepted_styles?.length) {
      summary += `✓ ACCEPTS: ${caps.accepted_styles.join(", ")}\n`;
    }
    if (caps.rejected_styles?.length) {
      summary += `✗ DOES NOT DO: ${caps.rejected_styles.join(", ")}\n`;
    }
    
    // Work type restrictions
    const restrictions = [];
    if (!caps.accepts_coverups) restrictions.push("NO cover-ups");
    if (!caps.accepts_color_work) restrictions.push("NO color work (black & grey ONLY)");
    if (!caps.accepts_reworks) restrictions.push("NO fixing other artists' work");
    if (!caps.will_repeat_designs) restrictions.push("NO repeated designs");
    if (restrictions.length) {
      summary += `⚠️ RESTRICTIONS: ${restrictions.join(", ")}\n`;
    }
    
    if (caps.rejected_placements?.length) {
      summary += `⛔ WON'T TATTOO: ${caps.rejected_placements.join(", ")}\n`;
    }
    
    summary += `📅 SESSION TYPE: ${caps.session_type}, max ${caps.max_clients_per_day} client(s)/day\n`;
  });

  summary += `
IMPORTANT RULES:
- If client asks for COLOR work and artist only does BLACK & GREY → politely redirect
- If client asks for COVER-UP and artist doesn't do them → offer referral or new piece
- If client asks for style NOT in accepted list → explain specialty and offer alternatives
- Always be warm and helpful, never make client feel rejected
`;

  return summary;
}

// Fetch pricing models
async function fetchPricingModels(supabase: any, artistId?: string): Promise<PricingModel[]> {
  let query = supabase
    .from("artist_pricing_models")
    .select("*")
    .eq("is_active", true);
  
  if (artistId) {
    query = query.or(`artist_id.eq.${artistId},artist_id.is.null`);
  }
  
  const { data } = await query.order("is_default", { ascending: false });
  return data || [];
}

// Fetch message templates
async function fetchMessageTemplates(supabase: any, mode?: ConciergeMode): Promise<MessageTemplate[]> {
  let query = supabase
    .from("concierge_message_templates")
    .select("*")
    .eq("is_active", true);
  
  if (mode) {
    query = query.or(`trigger_mode.eq.${mode},trigger_mode.is.null`);
  }
  
  const { data } = await query;
  return data || [];
}

// Fetch knowledge base - structured with clear sections
async function fetchConciergeKnowledge(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("concierge_knowledge")
    .select("title, content, category")
    .eq("is_active", true)
    .order("priority", { ascending: false });
  
  if (!data || data.length === 0) return "";
  
  // Group by category
  const byCategory: Record<string, any[]> = {};
  data.forEach((entry: any) => {
    const cat = entry.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(entry);
  });
  
  let formatted = `

═══════════════════════════════════════════════════════════════
📚 STUDIO KNOWLEDGE - Use this information in your responses
═══════════════════════════════════════════════════════════════
`;

  Object.entries(byCategory).forEach(([category, entries]) => {
    formatted += `\n【${category.toUpperCase()}】\n`;
    entries.forEach((entry: any) => {
      formatted += `• ${entry.title}: ${entry.content}\n`;
    });
  });
  
  return formatted;
}

// Fetch training pairs - structured for few-shot learning
async function fetchConciergeTraining(supabase: any): Promise<{ pairs: any[]; formatted: string }> {
  const { data } = await supabase
    .from("concierge_training_pairs")
    .select("question, ideal_response, category")
    .eq("is_active", true)
    .order("use_count", { ascending: false })
    .limit(30); // Fetch more for better matching
  
  if (!data || data.length === 0) return { pairs: [], formatted: "" };
  
  // Group by category for better context
  const byCategory: Record<string, any[]> = {};
  data.forEach((pair: any) => {
    const cat = pair.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(pair);
  });
  
  let formatted = `

═══════════════════════════════════════════════════════════════
🎯 CRITICAL: HOW TO RESPOND - LEARN FROM THESE EXAMPLES
═══════════════════════════════════════════════════════════════

You MUST study and mimic the TONE, LENGTH, and STYLE of these example responses.
These are the EXACT way you should talk to clients. Copy the personality.

RULES:
• If a question matches one of these examples, use that EXACT response (customize details only)
• Match the conversational, friendly tone
• Keep responses SHORT like these examples (2-4 sentences max)
• Use natural language, not corporate speak
• Include specific details from knowledge base
• End with ONE clear question or next step

`;

  Object.entries(byCategory).forEach(([category, pairs]) => {
    formatted += `\n--- ${category.toUpperCase()} EXAMPLES ---\n`;
    pairs.forEach((pair: any, idx: number) => {
      formatted += `
Example ${idx + 1}:
CLIENT: "${pair.question}"
YOU: "${pair.ideal_response}"
`;
    });
  });
  
  return { pairs: data, formatted };
}

// Find most relevant training example for a user message
function findBestTrainingMatch(userMessage: string, trainingPairs: any[]): any | null {
  if (!trainingPairs || trainingPairs.length === 0) return null;
  
  const userLower = userMessage.toLowerCase();
  const userWords = userLower.split(/\s+/).filter(w => w.length > 2);
  
  let bestMatch: any = null;
  let bestScore = 0;
  
  for (const pair of trainingPairs) {
    const questionLower = pair.question.toLowerCase();
    const questionWords = questionLower.split(/\s+/).filter((w: string) => w.length > 2);
    
    // Calculate overlap score
    let matchedWords = 0;
    for (const word of userWords) {
      if (questionLower.includes(word)) matchedWords++;
    }
    for (const word of questionWords) {
      if (userLower.includes(word)) matchedWords++;
    }
    
    // Bonus for key phrase matches
    const keyPhrases = ['how much', 'cost', 'price', 'book', 'appointment', 'heal', 'aftercare', 
                        'where', 'location', 'studio', 'available', 'when', 'deposit', 'payment',
                        'design', 'style', 'hurt', 'pain', 'first tattoo'];
    for (const phrase of keyPhrases) {
      if (userLower.includes(phrase) && questionLower.includes(phrase)) {
        matchedWords += 5; // Bonus for key phrase match
      }
    }
    
    const score = matchedWords / (userWords.length + questionWords.length);
    
    if (score > bestScore && matchedWords >= 2) {
      bestScore = score;
      bestMatch = pair;
    }
  }
  
  return bestScore > 0.15 ? bestMatch : null;
}

// Fetch settings
async function fetchConciergeSettings(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("concierge_settings")
    .select("setting_key, setting_value");
  
  if (!data) return {};
  
  const settings: Record<string, string> = {};
  data.forEach((s: any) => { settings[s.setting_key] = s.setting_value; });
  return settings;
}

// Determine current flow step
function determineCurrentStep(
  flowSteps: FlowStep[], 
  collectedFields: Record<string, unknown>
): FlowStep | null {
  for (const step of flowSteps) {
    // Check dependencies
    if (step.depends_on && step.depends_on.length > 0) {
      const depsMet = step.depends_on.every(dep => collectedFields[dep] !== undefined);
      if (!depsMet) continue;
    }
    
    // Skip if already collected and skip_if_known is true
    if (step.skip_if_known && step.collects_field && collectedFields[step.collects_field] !== undefined) {
      continue;
    }
    
    // This is the next step to ask
    return step;
  }
  
  return null; // All steps completed
}

// Build pricing summary for prompt
function buildPricingSummary(pricingModels: PricingModel[], artists: Artist[]): string {
  if (pricingModels.length === 0) return "";
  
  let summary = "\n\n--- PRICING INFORMATION ---\n";
  
  // Group by pricing type
  const byType: Record<string, PricingModel[]> = {};
  pricingModels.forEach(pm => {
    if (!byType[pm.pricing_type]) byType[pm.pricing_type] = [];
    byType[pm.pricing_type].push(pm);
  });
  
  Object.entries(byType).forEach(([type, models]) => {
    summary += `\n${type.toUpperCase()} PRICING:\n`;
    models.forEach(pm => {
      const artist = pm.artist_id ? artists.find(a => a.id === pm.artist_id) : null;
      const artistName = artist ? artist.display_name : "Studio Default";
      
      if (type === "hourly") {
        summary += `- ${artistName}: $${pm.rate_amount}/hour`;
      } else if (type === "day_session") {
        summary += `- ${artistName}: $${pm.rate_amount}/day session`;
      } else if (type === "by_piece") {
        summary += `- ${artistName}: Starting at $${pm.minimum_amount || pm.rate_amount}`;
      }
      
      // Add deposit info
      if (pm.deposit_type === "fixed" && pm.deposit_amount) {
        summary += ` (Deposit: $${pm.deposit_amount})`;
      } else if (pm.deposit_type === "percentage" && pm.deposit_percentage) {
        summary += ` (Deposit: ${pm.deposit_percentage}%)`;
      }
      
      if (pm.applies_to_styles && pm.applies_to_styles.length > 0) {
        summary += ` [${pm.applies_to_styles.join(", ")}]`;
      }
      
      summary += "\n";
    });
  });
  
  return summary;
}

// Build artists summary for prompt
function buildArtistsSummary(artists: Artist[]): string {
  if (artists.length === 0) return "";
  
  if (artists.length === 1) {
    const artist = artists[0];
    return `\n\n--- ARTIST: ${artist.display_name} ---\nSpecialties: ${artist.specialty_styles.join(", ")}\n${artist.bio || ""}`;
  }
  
  let summary = "\n\n--- STUDIO ARTISTS ---\n";
  artists.forEach(artist => {
    const ownerBadge = artist.is_owner ? " (Owner)" : "";
    summary += `\n${artist.display_name}${ownerBadge}\n`;
    summary += `  Specialties: ${artist.specialty_styles.join(", ")}\n`;
    if (artist.bio) summary += `  Bio: ${artist.bio}\n`;
  });
  
  return summary;
}

// Build flow instructions for prompt
function buildFlowInstructions(currentStep: FlowStep | null, flowSteps: FlowStep[]): string {
  if (!currentStep) {
    return "\n\n--- CONVERSATION FLOW ---\nAll information has been collected! Proceed to the next appropriate action.";
  }
  
  let instructions = "\n\n--- CONVERSATION FLOW ---\n";
  instructions += `CURRENT STEP: ${currentStep.step_name}\n`;
  instructions += `QUESTION TO ASK: "${currentStep.default_question}"\n`;
  
  if (currentStep.collects_field) {
    instructions += `COLLECTING: ${currentStep.collects_field}\n`;
  }
  
  if (currentStep.valid_responses && currentStep.valid_responses.length > 0) {
    instructions += `VALID OPTIONS: ${currentStep.valid_responses.join(", ")}\n`;
  }
  
  if (currentStep.follow_up_on_unclear) {
    instructions += `If the answer is unclear, ask for clarification (max ${currentStep.max_follow_ups} follow-ups).\n`;
  }
  
  instructions += "\nIMPORTANT: Ask ONE question at a time. Wait for the client's response before moving on.";
  instructions += "\nAfter collecting the answer, use 'advance_conversation_step' to record and move forward.";
  
  // Show remaining steps
  const remainingSteps = flowSteps.filter(s => s.step_order > currentStep.step_order);
  if (remainingSteps.length > 0) {
    instructions += `\n\nUpcoming steps: ${remainingSteps.map(s => s.step_name).join(" → ")}`;
  }
  
  return instructions;
}

// Build available templates for prompt
function buildTemplatesReference(templates: MessageTemplate[], mode: ConciergeMode): string {
  const relevantTemplates = templates.filter(t => 
    !t.trigger_mode || t.trigger_mode === mode
  );
  
  if (relevantTemplates.length === 0) return "";
  
  let ref = "\n\n--- MESSAGE TEMPLATES ---\n";
  ref += "Use 'send_template_message' with these keys when appropriate:\n";
  
  relevantTemplates.forEach(t => {
    const variationNote = t.allow_ai_variation ? " (can vary)" : " (use exact)";
    ref += `- ${t.template_key}${variationNote}: ${t.message_content.substring(0, 80)}...\n`;
  });
  
  return ref;
}

// Mode-specific base prompts
const MODE_PROMPTS: Record<ConciergeMode, string> = {
  explore: `You are the Studio Concierge in EXPLORE mode. Help clients discover what they truly want.

APPROACH:
- Be warm, curious, and encouraging
- Ask open-ended questions about meaning, inspiration, feelings
- Help articulate vague ideas into clearer concepts
- No pressure - just genuine exploration

Follow the conversation flow steps. Ask ONE question at a time.`,

  qualify: `You are the Studio Concierge in QUALIFY mode. Gather practical details for a complete tattoo plan.

APPROACH:
- Be efficient but not rushed
- Ask ONE focused question at a time (follow the flow)
- Build the Live Tattoo Brief using update_tattoo_brief
- Celebrate progress

After each answer, use advance_conversation_step to move forward.`,

  commit: `You are the Studio Concierge in COMMIT mode. Guide the client through booking.

APPROACH:
- Be clear and reassuring about the process
- Explain pricing and deposits clearly based on the pricing models
- Make scheduling feel effortless
- Match to the best-fit artist if multiple are available`,

  prepare: `You are the Studio Concierge in PREPARE mode. Ensure the client is ready for their session.

APPROACH:
- Be helpful and proactive
- Provide placement-specific advice
- Build excitement while managing expectations`,

  aftercare: `You are the Studio Concierge in AFTERCARE mode. Support healing and build relationships.

APPROACH:
- Be caring and reassuring
- Normalize common healing experiences
- Know when to escalate to the artist`,

  rebook: `You are the Studio Concierge in REBOOK mode. Nurture the relationship and encourage future work.

APPROACH:
- Be appreciative and forward-looking
- Suggest relevant next steps
- Make rebooking feel natural`
};

// Build complete system prompt
async function buildSystemPrompt(
  context: ConversationContext, 
  supabase: any,
  lastUserMessage?: string
): Promise<string> {
  // Fetch all customization data in parallel
  const [knowledge, trainingData, settings, flowSteps, artists, pricingModels, templates] = await Promise.all([
    fetchConciergeKnowledge(supabase),
    fetchConciergeTraining(supabase),
    fetchConciergeSettings(supabase),
    fetchFlowConfig(supabase, context.mode),
    fetchArtists(supabase),
    fetchPricingModels(supabase, context.artist_id),
    fetchMessageTemplates(supabase, context.mode)
  ]);
  
  // Find best training match for this specific message
  const bestMatch = lastUserMessage ? findBestTrainingMatch(lastUserMessage, trainingData.pairs) : null;
  
  // Determine current step in the flow
  const currentStep = determineCurrentStep(flowSteps, context.collected_fields || {});
  
  // Build base prompt
  const studioName = settings.studio_name || "Ferunda Studio";
  const personaName = settings.persona_name || "Studio Concierge";
  const greetingStyle = settings.greeting_style || "warm, friendly, and conversational like texting a friend";
  const responseLength = settings.response_length || "short and punchy (2-4 sentences max)";
  
  let systemPrompt = `You are ${personaName} for ${studioName}.

═══════════════════════════════════════════════════════════════
🚨 NON-NEGOTIABLE BEHAVIOR RULES (TOOL-GATING)
═══════════════════════════════════════════════════════════════

1) NEVER INVENT FACTS about the artist (locations, guest spots, pricing, deposits, press, bio details). ONLY use values returned by tools or stored in the Facts Vault.

2) REQUIRED TOOL CALLS - If the user asks about ANY of these, you MUST call the appropriate tool BEFORE speaking:
   • Guest spots / availability in cities → call get_guest_spots
   • Artist info / bio / who is the artist → call get_artist_public_facts
   • Pricing / cost / how much / deposits → call get_pricing_info (only speak if is_public=true)
   • Dates / availability / book → call check_availability

3) REFERRALS / "SEARCH EXTERNAL":
   • You CANNOT browse the web, search live listings, or look up other artists online.
   • If client asks you to "search for artists", "find someone who does X", or "refer me to another artist":
     a) First explain that you can't search the web but you CAN pass their request to the studio team for a personalized referral.
     b) Ask for their email (required) and preferred city (optional).
     c) Then call create_referral_request with a short summary.
     d) After the tool succeeds, confirm: "Got it! I've submitted your request. The team will reach out to [email] with recommendations for [what they wanted]."
   • NEVER pretend to search or browse. NEVER say "let me look that up online".

4) If a tool returns empty/unknown for guest spots or pricing, say so plainly:
   - "I don't see any announced dates for [location] right now."
   - "Pricing is confirmed after we review your idea."
   Then offer: Notify-only OR Fast-track waitlist.

5) Do NOT discuss deposits or take payment intent unless there is a CONFIRMED available date/slot shown to the user.

6) When user asks "who?" → identify the artist IMMEDIATELY and answer FIRST, then ask clarification if needed.

7) Ask at most ONE question per message unless the user explicitly requests a checklist.

8) Keep tone premium: short sentences, no hype claims, no typos, no slang.

═══════════════════════════════════════════════════════════════
📋 NATURAL CONVERSATION FLOW - HANDLE THESE IN CHAT
═══════════════════════════════════════════════════════════════

1) AGE VERIFICATION:
   • Before finalizing ANY booking/deposit, ask: "Just to confirm - you're 18 or older, right?"
   • If they say no, politely explain that tattoo services are only for 18+.
   • DO NOT ask this at the start - only when ready to book.

2) REFERENCE IMAGES:
   • Clients often send photos of OTHER artists' tattoos as inspiration - this is NORMAL and WELCOME.
   • Ask: "Got any reference images? Could be photos, art, or tattoos you like the style of."
   • NEVER reject or block based on reference images of other tattoos.
   • Use them to understand the client's vision and discuss how to create something unique for them.

3) STYLE PREFERENCES:
   • Discover naturally through conversation: "What style are you drawn to?"
   • If they want something the artist doesn't do (e.g., color when artist does only B&G), 
     explain gracefully and offer alternatives or referral.

4) COVER-UPS, TOUCH-UPS, REWORKS:
   • If these come up in conversation, ask for photos and details.
   • Explain honestly if it's something the artist handles or not.

═══════════════════════════════════════════════════════════════
⚡ RESPONSE STYLE: LEARN FROM THE TRAINING EXAMPLES BELOW
═══════════════════════════════════════════════════════════════

Your ENTIRE personality and response style MUST match the training examples.
If a client asks something similar to a training example, use that EXACT response style.
DO NOT make up information - only use facts from the Knowledge Base.

RESPONSE RULES:
1. MAX 2-4 sentences per message (like the examples)
2. Sound like a real person texting, not a formal AI
3. ${greetingStyle}
4. ONE question at a time - never overwhelm
5. Use the exact facts/prices from Knowledge Base
6. If you don't know something, CALL A TOOL first!

--- CURRENT MODE: ${context.mode.toUpperCase()} ---
${MODE_PROMPTS[context.mode]}`;

  // IF WE FOUND A MATCHING TRAINING EXAMPLE, INJECT IT PROMINENTLY
  if (bestMatch) {
    systemPrompt += `

═══════════════════════════════════════════════════════════════
🎯🎯🎯 EXACT MATCH FOUND - USE THIS RESPONSE AS YOUR TEMPLATE 🎯🎯🎯
═══════════════════════════════════════════════════════════════

The client's question closely matches this training example:
QUESTION: "${bestMatch.question}"
YOUR IDEAL RESPONSE: "${bestMatch.ideal_response}"

INSTRUCTION: Use this response almost EXACTLY. You may personalize small details
(like adding their name if known) but keep the same tone, length, and structure.
This is the BEST response we have trained for this type of question.

═══════════════════════════════════════════════════════════════
`;
  }

  // TRAINING EXAMPLES (all of them for reference)
  systemPrompt += trainingData.formatted;
  
  // Then knowledge base for facts
  systemPrompt += knowledge;
  
  // Add artists info with capabilities
  systemPrompt += buildArtistsSummary(artists);
  systemPrompt += buildCapabilitiesSummary(artists);
  
  // Add flow instructions
  systemPrompt += buildFlowInstructions(currentStep, flowSteps);
  
  // Add template reference
  systemPrompt += buildTemplatesReference(templates, context.mode);
  
  // Add context info
  systemPrompt += `

═══════════════════════════════════════════════════════════════
📋 CURRENT CONVERSATION CONTEXT
═══════════════════════════════════════════════════════════════`;

  if (context.client_name) {
    systemPrompt += `\nClient name: ${context.client_name}`;
  }
  if (context.tattoo_brief_id) {
    systemPrompt += `\nActive tattoo brief: Yes (update it as you learn more!)`;
  }
  if (context.collected_fields && Object.keys(context.collected_fields).length > 0) {
    systemPrompt += `\nAlready collected: ${JSON.stringify(context.collected_fields)}`;
  }
  
  systemPrompt += `

FINAL REMINDER: Your response should sound EXACTLY like the training examples.
Short, friendly, specific. Like a knowledgeable friend texting back. Not a wall of text!`;
  
  return systemPrompt;
}

// Tool execution
async function executeTool(
  toolName: string, 
  args: Record<string, unknown>, 
  context: ConversationContext,
  supabase: any
): Promise<{ result: unknown; contextUpdates?: Partial<ConversationContext> }> {
  
  switch (toolName) {
    case "create_referral_request": {
      const client_email = (args.client_email as string | undefined)?.trim();
      const client_name = (args.client_name as string | undefined)?.trim() || null;
      const preferred_city = (args.preferred_city as string | undefined)?.trim() || null;
      const request_type = (args.request_type as string | undefined)?.trim() || "external_referral";
      const request_summary = (args.request_summary as string | undefined)?.trim();

      if (!client_email || !request_summary) {
        return {
          result: {
            success: false,
            error: "Missing required fields: client_email and request_summary",
          },
        };
      }

      const { data, error } = await supabase
        .from("concierge_referral_requests")
        .insert({
          conversation_id: context.conversation_id || null,
          client_name,
          client_email,
          preferred_city,
          request_type,
          request_summary,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[Concierge] Failed to create referral request:", error);
        return { result: { success: false, error: error.message } };
      }

      // Update context with captured client details for subsequent messages
      const contextUpdates: Partial<ConversationContext> = {
        client_email,
        ...(client_name ? { client_name } : {}),
        ...(preferred_city ? { collected_fields: { ...(context.collected_fields || {}), preferred_city } } : {}),
      };

      return {
        result: {
          success: true,
          referral_request_id: data?.id,
          message: "Referral request created",
        },
        contextUpdates,
      };
    }

    case "extract_structured_intent": {
      // Store structured intent
      const intentData = {
        conversation_id: context.booking_id ? null : undefined,
        tattoo_brief_id: context.tattoo_brief_id,
        declared: context.pre_gate_responses || {},
        inferred: args.inferred || {},
        styles_detected: args.styles_detected || [],
        work_type: args.work_type || { value: 'unknown', confidence: 0 },
        complexity: args.complexity || { score: 50, label: 'unknown' },
        estimated_hours: args.estimated_hours || { min: 1, max: 4 },
        risk_flags: (args.risk_flags as string[] || []).map((flag: string) => ({ flag, severity: 'info' })),
        notes: args.notes as string || '',
        overall_confidence: 0.7
      };

      const { data: intent, error: intentError } = await supabase
        .from("structured_intents")
        .insert(intentData)
        .select()
        .single();

      if (intentError) {
        console.error("[Concierge] Failed to store structured intent:", intentError);
      }

      // Call the policy engine
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
      
      try {
        const policyResponse = await fetch(`${SUPABASE_URL}/functions/v1/evaluate-policy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            structuredIntent: {
              declared: context.pre_gate_responses || {},
              inferred: {
                includesColor: { value: (args.inferred as any)?.includes_color || false, confidence: 0.8 },
                placement: (args.inferred as any)?.placement,
                sizeInchesEstimate: (args.inferred as any)?.size_inches_estimate,
                subjectTags: (args.inferred as any)?.subject_tags || []
              },
              stylesDetected: {
                tags: (args.styles_detected as any[] || []).map((s: any) => s.tag),
                items: args.styles_detected || []
              },
              workType: args.work_type,
              riskFlags: {
                flags: args.risk_flags || [],
                items: (args.risk_flags as string[] || []).map((flag: string) => ({ flag, severity: 'info' }))
              }
            },
            preGateResponses: context.pre_gate_responses,
            conversationId: null,
            tattoo_brief_id: context.tattoo_brief_id
          })
        });

        if (policyResponse.ok) {
          const policyResult = await policyResponse.json();
          console.log("[Concierge] Policy evaluation result:", policyResult.finalDecision);

          return {
            result: {
              success: true,
              intentId: intent?.id,
              policyDecision: policyResult.finalDecision,
              reasons: policyResult.finalReasons,
              nextActions: policyResult.nextActions,
              message: policyResult.finalDecision === 'BLOCK' 
                ? policyResult.finalReasons[0]?.message || "This request doesn't match what we offer."
                : policyResult.finalDecision === 'REVIEW'
                ? "Let me check on a few things before we proceed."
                : "Looks like a great fit! Let's continue."
            },
            contextUpdates: {
              structured_intent_id: intent?.id,
              policy_decision: policyResult.finalDecision
            }
          };
        }
      } catch (policyError) {
        console.error("[Concierge] Policy engine error:", policyError);
      }

      return {
        result: {
          success: true,
          intentId: intent?.id,
          policyDecision: 'ALLOW',
          message: "Intent captured, proceeding with conversation."
        },
        contextUpdates: {
          structured_intent_id: intent?.id,
          policy_decision: 'ALLOW'
        }
      };
    }

    case "update_tattoo_brief": {
      let briefId = context.tattoo_brief_id;
      
      if (briefId) {
        const { error } = await supabase
          .from("tattoo_briefs")
          .update({ ...args, updated_at: new Date().toISOString() })
          .eq("id", briefId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tattoo_briefs")
          .insert({ ...args, booking_id: context.booking_id || null, status: "draft" })
          .select()
          .single();
        if (error) throw error;
        briefId = data?.id;
      }
      
      const { data: brief } = await supabase
        .from("tattoo_briefs")
        .select("*")
        .eq("id", briefId)
        .single();
      
      return { 
        result: { success: true, brief, message: "Tattoo brief updated!" },
        contextUpdates: { tattoo_brief_id: briefId }
      };
    }
    
    case "advance_conversation_step": {
      const currentStep = args.current_step as string;
      const collectedValue = args.collected_value as string;
      const needsClarification = args.needs_clarification as boolean;
      
      if (needsClarification) {
        return { 
          result: { 
            success: true, 
            action: "clarify",
            message: "Ask a follow-up question for clarification."
          }
        };
      }
      
      // Update collected fields
      const newCollectedFields = {
        ...(context.collected_fields || {}),
        [currentStep]: collectedValue
      };
      
      return { 
        result: { 
          success: true, 
          action: "next",
          completed_step: currentStep,
          collected_value: collectedValue
        },
        contextUpdates: { 
          current_step: currentStep,
          collected_fields: newCollectedFields
        }
      };
    }
    
    case "get_artist_info": {
      const styleFilter = args.style_filter as string;
      
      let query = supabase
        .from("studio_artists")
        .select("*")
        .eq("is_active", true);
      
      const { data: artists } = await query;
      
      let filtered = artists || [];
      if (styleFilter) {
        filtered = filtered.filter((a: any) => 
          a.specialty_styles.some((s: string) => 
            s.toLowerCase().includes(styleFilter.toLowerCase())
          )
        );
      }
      
      return { 
        result: { 
          artists: filtered.map((a: any) => ({
            id: a.id,
            name: a.display_name,
            specialties: a.specialty_styles,
            bio: a.bio,
            isOwner: a.is_owner
          })),
          count: filtered.length
        }
      };
    }
    
    case "get_pricing_info": {
      const artistId = args.artist_id as string;
      const city = args.city as string;
      const style = args.style as string;
      const estimatedHours = args.estimated_hours as number;
      
      let query = supabase
        .from("artist_pricing_models")
        .select("*, studio_artists(display_name), city_configurations(city_name)")
        .eq("is_active", true);
      
      if (artistId) {
        query = query.or(`artist_id.eq.${artistId},artist_id.is.null`);
      }
      
      const { data: models } = await query;
      
      // Filter by style if provided
      let filtered = models || [];
      if (style) {
        filtered = filtered.filter((pm: any) => 
          !pm.applies_to_styles || 
          pm.applies_to_styles.length === 0 ||
          pm.applies_to_styles.some((s: string) => s.toLowerCase().includes(style.toLowerCase()))
        );
      }
      
      // Calculate estimates if hours provided
      const estimates = filtered.map((pm: any) => {
        let estimate: any = {
          type: pm.pricing_type,
          rate: pm.rate_amount,
          currency: pm.rate_currency,
          artist: pm.studio_artists?.display_name || "Studio Rate",
          city: pm.city_configurations?.city_name || "Any"
        };
        
        if (estimatedHours) {
          if (pm.pricing_type === "hourly") {
            estimate.totalEstimate = pm.rate_amount * estimatedHours;
          } else if (pm.pricing_type === "day_session") {
            estimate.totalEstimate = pm.rate_amount * Math.ceil(estimatedHours / 6);
          }
        }
        
        // Deposit
        if (pm.deposit_type === "fixed") {
          estimate.deposit = pm.deposit_amount;
        } else if (pm.deposit_type === "percentage" && estimate.totalEstimate) {
          estimate.deposit = (pm.deposit_percentage / 100) * estimate.totalEstimate;
        }
        
        if (pm.minimum_amount) {
          estimate.minimum = pm.minimum_amount;
        }
        
        return estimate;
      });
      
      return { result: { pricing: estimates } };
    }
    
    case "calculate_fit_score": {
      const style = (args.style as string || "").toLowerCase();
      const artistId = args.artist_id as string;
      
      // Get artist specialties
      let artistStyles: string[] = [];
      if (artistId) {
        const { data: artist } = await supabase
          .from("studio_artists")
          .select("specialty_styles")
          .eq("id", artistId)
          .single();
        artistStyles = artist?.specialty_styles || [];
      } else {
        const { data: artists } = await supabase
          .from("studio_artists")
          .select("specialty_styles")
          .eq("is_active", true);
        artistStyles = artists?.flatMap((a: any) => a.specialty_styles) || [];
      }
      
      const hasMatch = artistStyles.some(s => 
        s.toLowerCase().includes(style) || style.includes(s.toLowerCase())
      );
      
      let score = hasMatch ? 90 : 60;
      let fitLevel = hasMatch ? "excellent" : "moderate";
      let recommendation = "proceed";
      let reasoning = hasMatch 
        ? "This style is right in our wheelhouse. We'd love to work on this!"
        : "This could work, but let's discuss the details to make sure it's a great fit.";
      
      // Save to database
      if (context.tattoo_brief_id) {
        await supabase
          .from("client_fit_scores")
          .insert({
            tattoo_brief_id: context.tattoo_brief_id,
            booking_id: context.booking_id,
            score,
            fit_level: fitLevel,
            reasoning,
            recommendation,
            style_match_details: { analyzed_style: style, artist_styles: artistStyles }
          });
      }
      
      return { result: { score, fitLevel, recommendation, reasoning } };
    }
    
    case "suggest_best_times": {
      const sessionHours = args.session_hours as number || 3;
      const preferredCity = args.preferred_city as string;
      const artistId = args.artist_id as string;
      
      let query = supabase
        .from("availability")
        .select("*, city_configurations(*)")
        .eq("is_available", true)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(20);
      
      if (artistId) {
        query = query.eq("artist_id", artistId);
      }
      
      const { data: availability } = await query;
      
      if (!availability || availability.length === 0) {
        return { 
          result: { 
            slots: [], 
            message: "No available slots found. Would you like to join the waitlist?" 
          } 
        };
      }
      
      let filtered = availability;
      if (preferredCity) {
        filtered = filtered.filter((a: any) => 
          a.city?.toLowerCase().includes(preferredCity.toLowerCase())
        );
      }
      
      const topSlots = filtered.slice(0, 3).map((slot: any, i: number) => ({
        id: slot.id,
        date: slot.date,
        city: slot.city,
        cityId: slot.city_id,
        artistId: slot.artist_id,
        label: i === 0 ? "🟢 Best option" : i === 1 ? "⚡ Earliest" : "🌿 Alternative",
        sessionRate: slot.city_configurations?.session_rate || 2500,
        depositAmount: slot.city_configurations?.deposit_amount || 500
      }));
      
      return { result: { slots: topSlots } };
    }
    
    case "hold_slot": {
      const availabilityId = args.availability_id as string;
      const date = args.date as string;
      const cityId = args.city_id as string;
      const artistId = args.artist_id as string;
      
      const { data: existingHold } = await supabase
        .from("slot_holds")
        .select("*")
        .eq("availability_id", availabilityId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .single();
      
      if (existingHold) {
        return { 
          result: { 
            success: false, 
            message: "This slot is currently being held. Try another option?" 
          } 
        };
      }
      
      const { data: hold, error } = await supabase
        .from("slot_holds")
        .insert({
          availability_id: availabilityId,
          booking_id: context.booking_id,
          held_date: date,
          city_id: cityId,
          artist_id: artistId,
          status: "active"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { 
        result: { 
          success: true, 
          holdId: hold.id,
          expiresAt: hold.expires_at,
          message: "Slot held for 15 minutes! Complete your deposit to confirm." 
        },
        contextUpdates: { artist_id: artistId }
      };
    }
    
    case "check_availability": {
      const city = args.city as string;
      const artistId = args.artist_id as string;
      const startDate = args.start_date as string || new Date().toISOString().split("T")[0];
      
      let query = supabase
        .from("availability")
        .select("*, city_configurations(*), studio_artists(display_name)")
        .eq("is_available", true)
        .gte("date", startDate)
        .order("date", { ascending: true })
        .limit(10);
      
      if (city) {
        query = query.ilike("city", `%${city}%`);
      }
      if (artistId) {
        query = query.eq("artist_id", artistId);
      }
      
      const { data: slots } = await query;
      
      return { 
        result: { 
          available: slots?.length || 0,
          nextAvailable: slots?.[0]?.date,
          slots: slots?.slice(0, 5).map((s: any) => ({
            date: s.date,
            city: s.city,
            id: s.id,
            artist: s.studio_artists?.display_name
          }))
        } 
      };
    }
    
    case "create_booking": {
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          name: args.name as string,
          email: args.email as string,
          phone: args.phone as string || null,
          tattoo_description: args.tattoo_description as string,
          placement: args.placement as string || null,
          size: args.size as string || null,
          preferred_date: args.preferred_date as string || null,
          requested_city: args.requested_city as string || null,
          artist_id: args.artist_id as string || context.artist_id || null,
          source: "studio_concierge",
          pipeline_stage: "new_inquiry",
          tattoo_brief_id: context.tattoo_brief_id || null,
          concierge_mode: "qualify"
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (context.tattoo_brief_id) {
        await supabase
          .from("tattoo_briefs")
          .update({ booking_id: booking.id })
          .eq("id", context.tattoo_brief_id);
      }
      
      return { 
        result: { success: true, bookingId: booking.id },
        contextUpdates: { booking_id: booking.id }
      };
    }
    
    case "set_mode": {
      const newMode = args.mode as ConciergeMode;
      
      return { 
        result: { success: true, newMode, message: `Transitioning to ${newMode} mode.` },
        contextUpdates: { mode: newMode, current_step: undefined, collected_fields: {} }
      };
    }
    
    case "send_template_message": {
      const templateKey = args.template_key as string;
      const variables = args.variables as Record<string, string> || {};
      const useVariation = args.use_variation as boolean;
      
      const { data: template } = await supabase
        .from("concierge_message_templates")
        .select("*")
        .eq("template_key", templateKey)
        .eq("is_active", true)
        .single();
      
      if (!template) {
        return { result: { error: `Template '${templateKey}' not found` } };
      }
      
      // Substitute variables
      let message = template.message_content;
      Object.entries(variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      
      // Update use count
      await supabase
        .from("concierge_message_templates")
        .update({ 
          use_count: (template.use_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq("id", template.id);
      
      return { 
        result: { 
          message,
          allowVariation: template.allow_ai_variation && useVariation,
          templateUsed: templateKey
        }
      };
    }

    // ===== PHASE 1 TOOLS: Facts Vault + Guest Spots =====
    
    case "get_artist_public_facts": {
      const artistId = args.artist_id as string;
      
      // Get the artist ID - default to primary/owner artist
      let targetArtistId = artistId;
      if (!targetArtistId) {
        const { data: primaryArtist } = await supabase
          .from("studio_artists")
          .select("id")
          .eq("is_owner", true)
          .eq("is_active", true)
          .single();
        targetArtistId = primaryArtist?.id;
      }
      
      if (!targetArtistId) {
        return { result: { error: "No artist found", facts: null } };
      }
      
      const { data: facts, error } = await supabase
        .from("artist_public_facts")
        .select("*")
        .eq("artist_id", targetArtistId)
        .single();
      
      if (error || !facts) {
        // Fallback to basic artist info
        const { data: artist } = await supabase
          .from("studio_artists")
          .select("*")
          .eq("id", targetArtistId)
          .single();
        
        return {
          result: {
            artistId: targetArtistId,
            displayName: artist?.display_name || "Artist",
            specialties: artist?.specialty_styles || [],
            bio: artist?.bio,
            note: "Full facts vault not configured - using basic artist info"
          }
        };
      }
      
      // Only return verified facts
      const verifiedFacts = {
        artistId: facts.artist_id,
        displayName: facts.display_name,
        legalName: facts.legal_name,
        publicHandle: facts.public_handle,
        languages: facts.languages,
        brandPositioning: facts.brand_positioning,
        specialties: facts.specialties,
        notOfferedStyles: facts.not_offered_styles,
        notOfferedWorkTypes: facts.not_offered_work_types,
        bookingModel: facts.booking_model,
        baseLocation: facts.base_location,
        bookableCities: facts.bookable_cities,
        locationNotes: facts.location_notes,
        publicLinks: facts.public_links
      };
      
      return { result: verifiedFacts };
    }
    
    case "get_guest_spots": {
      const artistId = args.artist_id as string;
      const country = args.country as string;
      const city = args.city as string;
      const includeRumored = args.include_rumored as boolean || false;
      
      // Get artist ID if not provided
      let targetArtistId = artistId;
      if (!targetArtistId) {
        const { data: primaryArtist } = await supabase
          .from("studio_artists")
          .select("id")
          .eq("is_owner", true)
          .eq("is_active", true)
          .single();
        targetArtistId = primaryArtist?.id;
      }
      
      let query = supabase
        .from("guest_spot_events")
        .select("*")
        .order("date_range_start", { ascending: true });
      
      if (targetArtistId) {
        query = query.eq("artist_id", targetArtistId);
      }
      
      if (country) {
        query = query.ilike("country", `%${country}%`);
      }
      
      if (city) {
        query = query.ilike("city", `%${city}%`);
      }
      
      // Filter by status - exclude rumored unless requested
      if (!includeRumored) {
        query = query.neq("status", "rumored");
      }
      
      // Only future events
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("date_range_end", today);
      
      const { data: events, error } = await query;
      
      if (error) {
        console.error("[Concierge] Error fetching guest spots:", error);
        return { result: { events: [], error: error.message } };
      }
      
      const formattedEvents = (events || []).map((e: any) => ({
        id: e.id,
        city: e.city,
        country: e.country,
        dateRangeStart: e.date_range_start,
        dateRangeEnd: e.date_range_end,
        status: e.status,
        bookingStatus: e.booking_status,
        slotsRemaining: e.slots_remaining,
        maxSlots: e.max_slots
      }));
      
      const hasAnnounced = formattedEvents.length > 0;
      const locationQueried = country || city || "any location";
      
      return { 
        result: { 
          events: formattedEvents,
          hasAnnouncedDates: hasAnnounced,
          locationQueried,
          message: hasAnnounced 
            ? `Found ${formattedEvents.length} announced event(s) for ${locationQueried}`
            : `No announced dates for ${locationQueried}. Offer notify-only or fast-track waitlist.`
        }
      };
    }
    
    case "subscribe_guest_spot_alerts": {
      const email = args.email as string;
      const artistId = args.artist_id as string;
      const country = args.country as string;
      const city = args.city as string || null;
      const subscriptionType = args.subscription_type as string;
      const placement = args.placement as string;
      const size = args.size as string;
      const clientName = args.client_name as string;
      
      if (!email || !country || !subscriptionType) {
        return { result: { error: "Missing required fields: email, country, subscription_type" } };
      }
      
      // Get artist ID if not provided
      let targetArtistId = artistId;
      if (!targetArtistId) {
        const { data: primaryArtist } = await supabase
          .from("studio_artists")
          .select("id")
          .eq("is_owner", true)
          .eq("is_active", true)
          .single();
        targetArtistId = primaryArtist?.id;
      }
      
      // Check for existing subscription
      const { data: existing } = await supabase
        .from("guest_spot_subscriptions")
        .select("id, status")
        .eq("email", email)
        .eq("artist_id", targetArtistId)
        .eq("country", country)
        .maybeSingle();
      
      if (existing && existing.status === "active") {
        return { 
          result: { 
            success: true, 
            alreadySubscribed: true,
            message: `You're already subscribed for ${country} updates!` 
          }
        };
      }
      
      // Build pre-gate responses for fast-track
      const preGateResponses = subscriptionType === "fast_track" ? {
        placement,
        size,
        collected_at: new Date().toISOString()
      } : null;
      
      // Create subscription
      const { data: subscription, error } = await supabase
        .from("guest_spot_subscriptions")
        .insert({
          email,
          artist_id: targetArtistId,
          country,
          city,
          subscription_type: subscriptionType,
          client_name: clientName,
          pre_gate_responses: preGateResponses,
          tattoo_brief_id: context.tattoo_brief_id,
          status: "pending_confirmation"
        })
        .select()
        .single();
      
      if (error) {
        console.error("[Concierge] Error creating subscription:", error);
        return { result: { error: error.message, success: false } };
      }
      
      // TODO: Trigger confirmation email via edge function
      // For now, auto-confirm
      await supabase
        .from("guest_spot_subscriptions")
        .update({ 
          status: "active",
          confirmed_at: new Date().toISOString()
        })
        .eq("id", subscription.id);
      
      const typeLabel = subscriptionType === "fast_track" 
        ? "fast-track waitlist (you'll be pre-approved when dates open)"
        : "notification list";
      
      return { 
        result: { 
          success: true,
          subscriptionId: subscription.id,
          message: `You're now on the ${typeLabel} for ${city || country} dates! We'll email ${email} when dates are announced.`
        }
      };
    }
    
    case "get_voice_profile": {
      const artistId = args.artist_id as string;
      
      // Get artist ID if not provided
      let targetArtistId = artistId;
      if (!targetArtistId) {
        const { data: primaryArtist } = await supabase
          .from("studio_artists")
          .select("id")
          .eq("is_owner", true)
          .eq("is_active", true)
          .single();
        targetArtistId = primaryArtist?.id;
      }
      
      const { data: profile, error } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("artist_id", targetArtistId)
        .eq("is_active", true)
        .single();
      
      if (error || !profile) {
        // Return default voice profile
        return {
          result: {
            tone: ["premium", "warm", "direct"],
            doRules: [
              "Answer the user's question first, then ask one follow-up",
              "Use short sentences, no hype claims",
              "Offer two paths: Notify-only or Fast-track when no dates available"
            ],
            dontRules: [
              "Do not invent facts about locations, pricing, or guest spots",
              "Do not discuss deposits unless a confirmed date is shown",
              "Do not ask multiple questions in one message"
            ],
            signaturePhrases: {},
            note: "Using default voice profile - custom profile not configured"
          }
        };
      }
      
      return {
        result: {
          tone: profile.tone,
          doRules: profile.do_rules,
          dontRules: profile.dont_rules,
          signaturePhrases: profile.signature_phrases
        }
      };
    }
    
    case "update_conversation_state": {
      const journeyGoal = args.journey_goal as string;
      const locationPreference = args.location_preference as string;
      const hasAskedAboutGuestSpots = args.has_asked_about_guest_spots as boolean;
      const factsConfirmed = args.facts_confirmed as Record<string, string>;
      const collectedField = args.collected_field as { field_name: string; field_value: string };
      
      // Build updates
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      if (journeyGoal) updates.journey_goal = journeyGoal;
      if (locationPreference) updates.location_preference = locationPreference;
      if (hasAskedAboutGuestSpots !== undefined) updates.has_asked_about_guest_spots = hasAskedAboutGuestSpots;
      if (factsConfirmed) updates.facts_confidence = factsConfirmed;
      
      // Update collected fields if provided
      if (collectedField && collectedField.field_name) {
        const currentCollected = context.collected_fields || {};
        updates.collected_fields = {
          ...currentCollected,
          [collectedField.field_name]: collectedField.field_value
        };
      }
      
      // We need a conversation ID to update
      // For now, return the state updates that should be tracked
      const contextUpdates: Partial<ConversationContext> = {};
      if (journeyGoal) (contextUpdates as any).journey_goal = journeyGoal;
      if (locationPreference) (contextUpdates as any).location_preference = locationPreference;
      if (collectedField) {
        contextUpdates.collected_fields = {
          ...context.collected_fields,
          [collectedField.field_name]: collectedField.field_value
        };
      }
      
      return {
        result: {
          success: true,
          stateUpdated: Object.keys(updates).filter(k => k !== 'updated_at'),
          message: "Conversation state updated"
        },
        contextUpdates
      };
    }
    
    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      version: "2.0.0-concierge",
      time: new Date().toISOString(),
      features: ["multi-artist", "flexible-pricing", "flow-based", "one-question-at-a-time"]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    const { messages, context: inputContext, conversationId } = body;
    
    // Initialize or restore context
    let context: ConversationContext = {
      ...(inputContext || {
        mode: "explore",
        collected_fields: {},
      }),
      conversation_id: conversationId || (inputContext?.conversation_id as string | undefined),
    };

    // Restore from conversation if available
    if (conversationId) {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (conv) {
        context = {
          mode: (conv.concierge_mode as ConciergeMode) || "explore",
          conversation_id: conversationId,
          tattoo_brief_id: conv.tattoo_brief_id,
          client_name: conv.client_name,
          client_email: conv.client_email,
          collected_fields: context.collected_fields || {},
        };
      }
    }
    
    // Get the last user message for context matching
    const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    
    // Build the enhanced system prompt with training match
    const systemPrompt = await buildSystemPrompt(context, supabase, lastUserMsg);
    
    console.log(`[Concierge v2.2] Mode: ${context.mode}, Step: ${context.current_step || 'initial'}, Messages: ${messages.length}`);
    console.log(`[Concierge] System prompt length: ${systemPrompt.length} chars`);
    console.log(`[Concierge] Last user message: "${lastUserMsg.substring(0, 100)}..."`);
    
    // Call AI with tools - using temperature for more natural responses
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools: conciergeTools,
        tool_choice: "auto",
        max_completion_tokens: 2000 // Enough for reasoning + response
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Concierge] AI Error:", errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }
    
    const aiData = await response.json();
    const choice = aiData.choices?.[0];
    
    if (!choice) {
      throw new Error("No response from AI");
    }
    
    // Handle tool calls
    const toolCalls = choice.message?.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`[Concierge] Executing tool: ${toolName}`);
        
        try {
          const { result, contextUpdates } = await executeTool(toolName, toolArgs, context, supabase);
          
          if (contextUpdates) {
            context = { ...context, ...contextUpdates };
          }
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify(result)
          });
        } catch (toolError: unknown) {
          const errMsg = toolError instanceof Error ? toolError.message : "Unknown error";
          console.error(`[Concierge] Tool error (${toolName}):`, toolError);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({ error: errMsg })
          });
        }
      }
      
      console.log(`[Concierge] Tool results collected: ${toolResults.length}`);
      
      // Follow-up call with tool results
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults
          ],
          max_completion_tokens: 2000,
          stream: true
        })
      });

      console.log(`[Concierge] Follow-up response status: ${followUpResponse.status}`);
      
      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("[Concierge] Follow-up error:", errorText);
        throw new Error(`Follow-up request failed: ${followUpResponse.status} - ${errorText}`);
      }
      
      // Update conversation context
      if (conversationId) {
        await supabase
          .from("chat_conversations")
          .update({
            concierge_mode: context.mode,
            tattoo_brief_id: context.tattoo_brief_id,
            client_name: context.client_name,
            client_email: context.client_email
          })
          .eq("id", conversationId);
      }
      
      console.log("[Concierge] Returning streaming response");
      
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      headers.set("Connection", "keep-alive");
      headers.set("X-Concierge-Context", JSON.stringify(context));
      
      return new Response(followUpResponse.body, { headers });
    }
    
    // No tool calls - stream direct response
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        max_completion_tokens: 2000,
        stream: true
      })
    });
    
    if (!streamResponse.ok) {
      throw new Error(`Stream request failed: ${streamResponse.status}`);
    }
    
    // Update conversation context
    if (conversationId) {
      await supabase
        .from("chat_conversations")
        .update({
          concierge_mode: context.mode,
          tattoo_brief_id: context.tattoo_brief_id,
          client_name: context.client_name,
          client_email: context.client_email
        })
        .eq("id", conversationId);
    }
    
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("X-Concierge-Context", JSON.stringify(context));
    
    return new Response(streamResponse.body, { headers });
    
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Concierge] Error:", error);
    
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
