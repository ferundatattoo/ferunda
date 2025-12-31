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

// ============================================================================
// ENHANCED CACHING SYSTEM
// ============================================================================

class IntelligentCache {
  private cache = new Map<string, { data: any; expiry: number; hits: number }>();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry.data;
  }
  
  set(key: string, data: any, ttlMs: number = 300000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
      hits: 0
    });
    
    // Auto-cleanup when cache gets too large
    if (this.cache.size > 500) {
      this.cleanup();
    }
  }
  
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    });
    
    // If still too large, remove least-used entries
    if (this.cache.size > 400) {
      const sorted = entries
        .filter(([_, entry]) => entry.expiry >= now)
        .sort((a, b) => a[1].hits - b[1].hits);
      
      const toRemove = sorted.slice(0, Math.floor(this.cache.size * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }
  
  getStats() {
    const now = Date.now();
    const valid = Array.from(this.cache.values()).filter(e => e.expiry >= now);
    
    return {
      totalEntries: this.cache.size,
      validEntries: valid.length,
      totalHits: valid.reduce((sum, e) => sum + e.hits, 0)
    };
  }
}

const globalCache = new IntelligentCache();

// ============================================================================
// CONVERSATION ANALYZER
// ============================================================================

interface ClientAnalytics {
  messageCount?: number;
  avgSentiment?: number;
  avgUrgency?: number;
  topIntents?: Record<string, number>;
}

class ConversationAnalyzer {
  static analyzeUserBehavior(
    messages: { role: string; content: string }[],
    clientAnalytics?: ClientAnalytics
  ): {
    engagementScore: number;
    buyingSignals: string[];
    objections: string[];
    urgencyLevel: number;
    recommendedAction: string;
  } {
    const userMessages = messages.filter(m => m.role === "user");
    
    // Detect buying signals
    const buyingSignalPatterns = [
      /when can (i|we) (book|schedule)/i,
      /how much (does it|will it) cost/i,
      /available (dates?|times?)/i,
      /(ready to|want to) (book|proceed|schedule)/i,
      /what'?s (the )?next step/i
    ];
    
    const buyingSignals = userMessages
      .filter(msg => buyingSignalPatterns.some(pattern => pattern.test(msg.content)))
      .map(msg => msg.content.substring(0, 50));
    
    // Detect objections
    const objectionPatterns = [
      /too expensive/i,
      /can'?t afford/i,
      /not sure/i,
      /need to think/i,
      /talk to (my )?(partner|spouse|wife|husband)/i,
      /worried about/i,
      /concerned about/i
    ];
    
    const objections = userMessages
      .filter(msg => objectionPatterns.some(pattern => pattern.test(msg.content)))
      .map(msg => msg.content.substring(0, 50));
    
    // Calculate engagement score
    const avgMessageLength = userMessages.length > 0
      ? userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length
      : 0;
    
    const engagementScore = Math.min(
      (userMessages.length * 0.2) + 
      (avgMessageLength / 100) +
      (buyingSignals.length * 0.3) -
      (objections.length * 0.2),
      1
    );
    
    // Use client-provided urgency or calculate
    const urgencyLevel = clientAnalytics?.avgUrgency || 0;
    
    // Recommend action
    let recommendedAction = "continue_conversation";
    
    if (buyingSignals.length >= 2 && objections.length === 0) {
      recommendedAction = "present_booking_options";
    } else if (objections.length > 0) {
      recommendedAction = "address_objections";
    } else if (urgencyLevel > 0.7) {
      recommendedAction = "fast_track_booking";
    } else if (engagementScore < 0.3 && userMessages.length > 3) {
      recommendedAction = "re_engage_user";
    }
    
    return {
      engagementScore,
      buyingSignals,
      objections,
      urgencyLevel,
      recommendedAction
    };
  }
}

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  private requests = new Map<string, number[]>();
  
  isAllowed(identifier: string, maxRequests: number = 60, windowMs: number = 60000): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];
    
    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => ts > now - windowMs);
    
    if (validTimestamps.length >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);
    
    return { 
      allowed: true, 
      remaining: maxRequests - validTimestamps.length 
    };
  }
}

const rateLimiter = new RateLimiter();

// Tool definitions - enhanced with policy engine + pre-gate + structured intent + Facts Vault
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
      name: "escalate_to_human",
      description: "Escalate the conversation to a human team member when the client is frustrated, explicitly asks to speak with a person, or the AI cannot help further. Collects their email and creates a support ticket for follow-up.",
      parameters: {
        type: "object",
        properties: {
          client_email: { type: "string", description: "Client email for follow-up" },
          client_name: { type: "string", description: "Client name (optional)" },
          reason: { 
            type: "string", 
            enum: ["frustrated", "complex_request", "prefers_human", "technical_issue", "other"],
            description: "Reason for escalation"
          },
          conversation_summary: { type: "string", description: "Brief summary of what was discussed and what the client needs" },
          reference_images_count: { type: "number", description: "Number of reference images shared" },
          urgency: { 
            type: "string", 
            enum: ["low", "medium", "high"],
            description: "Urgency level based on client tone"
          }
        },
        required: ["client_email", "reason", "conversation_summary"]
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
  },
  // ===== AR PREVIEW SALES TOOL =====
  {
    type: "function",
    function: {
      name: "offer_ar_preview",
      description: "SALES TOOL: When client has shared a reference image, offer them the AR preview to see how the tattoo would look on their body. This significantly increases conversion rates. Call this after analyzing a reference image and detecting client interest.",
      parameters: {
        type: "object",
        properties: {
          reference_image_url: { 
            type: "string", 
            description: "URL of the reference image to use in AR preview" 
          },
          suggested_body_part: { 
            type: "string", 
            description: "Suggested body placement based on the conversation (e.g., forearm, bicep, chest)" 
          },
          design_style: { 
            type: "string", 
            description: "Detected style of the design for context" 
          },
          enthusiasm_level: {
            type: "string",
            enum: ["curious", "interested", "excited"],
            description: "Client's enthusiasm level to tailor the offer"
          }
        },
        required: ["reference_image_url"]
      }
    }
  },
  // ===== MULTILINGUAL AVATAR VIDEO TOOL =====
  {
    type: "function",
    function: {
      name: "generate_avatar_video",
      description: "Generate a personalized AI avatar video in the client's language. Use this for: 1) Welcome/greeting videos 2) Explaining complex pricing 3) Aftercare instructions 4) Session preparation tips. The video will be in the same language as the conversation. This increases trust and conversion significantly.",
      parameters: {
        type: "object",
        properties: {
          video_type: {
            type: "string",
            enum: ["greeting", "pricing_explanation", "aftercare", "session_prep", "custom"],
            description: "Type of video to generate"
          },
          custom_script: {
            type: "string",
            description: "For custom videos, the script to use. Keep under 100 words for optimal engagement."
          },
          client_name: {
            type: "string",
            description: "Client's name for personalization"
          },
          tattoo_details: {
            type: "object",
            properties: {
              style: { type: "string" },
              placement: { type: "string" },
              estimated_price: { type: "string" },
              estimated_sessions: { type: "number" }
            },
            description: "Tattoo details to include in the video"
          },
          emotion: {
            type: "string",
            enum: ["warm", "professional", "excited", "calming"],
            description: "Emotional tone for the video"
          }
        },
        required: ["video_type"]
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
    
    // CONCESSIONS - Artist-defined exceptions
    if (caps.concessions && Array.isArray(caps.concessions) && caps.concessions.length > 0) {
      const activeConcessions = caps.concessions.filter((c: any) => c.is_active);
      if (activeConcessions.length > 0) {
        summary += `\n✨ SPECIAL CONCESSIONS (exceptions the artist is willing to make):\n`;
        activeConcessions.forEach((concession: any) => {
          summary += `   • ${concession.type}: ${concession.description}\n`;
          if (concession.conditions) {
            summary += `     ↳ Conditions: ${concession.conditions}\n`;
          }
        });
      }
    }
  });

  summary += `
IMPORTANT RULES:
- If client asks for COLOR work and artist only does BLACK & GREY:
  1. FIRST check if there's a relevant CONCESSION (like single_solid_color for eyes, etc.)
  2. If concession applies → OFFER IT as an option! "Ferunda typically works in black & grey, but he can add a single solid color for details like eyes if you'd like."
  3. If no concession applies → politely redirect
- If client asks for COVER-UP and artist doesn't do them → offer referral or new piece
- If client asks for style NOT in accepted list → explain specialty and offer alternatives
- Always be warm and helpful, never make client feel rejected
- CONCESSIONS are special exceptions - use them when the client's request partially matches!
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

⚠️ CRITICAL — AVOID REDUNDANCY:
• Track what the client has ALREADY told you in this conversation.
• If they already answered a question (e.g., "black & grey"), do NOT ask it again.
• When the user says "black and grey" (or similar), treat it as style preference CONFIRMED — move on to the NEXT question (subject, placement, size, etc.).
• FERUNDA WORKS PRIMARILY IN BLACK & GREY — if user asks for color:
  1. Check if there's an applicable CONCESSION (like "single_solid_color" for eyes).
  2. If YES → OFFER IT: "Ferunda typically works in black & grey, but he can add a single solid color for small details like eyes if you'd like!"
  3. If NO concession applies → politely explain and offer alternatives (contrast/highlights).

⚠️ CRITICAL — SIZE QUESTIONS (ALWAYS USE INCHES):
• ALWAYS ask for size in INCHES, e.g.: "How big are you thinking? Like 4 inches, 6 inches?"
• NEVER use vague terms like "small, medium, large" — always be specific with inches.
• If client says "small" → clarify: "Small as in around 2-3 inches, or closer to 4 inches?"
• If client gives inches → ACCEPT it and move on. Do not re-ask in different units.

⚠️ CRITICAL — COLOR CLARIFICATION:
• When asking about color preference, be EXPLICIT and COMPLETE:
  ✅ GOOD: "Would you like this in black and grey, or full color?"
  ❌ BAD: "Would you like this interpreted as geometric piece in & ..." (NEVER abbreviate or cut off text)
• NEVER abbreviate "black and grey" as "B&G" or "&" — always write it out fully.
• NEVER truncate or cut off your sentences mid-thought.

⚠️ CRITICAL — MESSAGE QUALITY:
• ALWAYS complete your sentences — never leave text unfinished.
• NEVER use abbreviations that could confuse the client.
• Proofread: If a sentence doesn't make sense, rewrite it.
• Each message should be clear, complete, and easy to understand.

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
    
    case "escalate_to_human": {
      const client_email = (args.client_email as string | undefined)?.trim();
      const client_name = (args.client_name as string | undefined)?.trim() || null;
      const reason = (args.reason as string) || "other";
      const conversation_summary = (args.conversation_summary as string | undefined)?.trim();
      const reference_images_count = (args.reference_images_count as number) || 0;
      const urgency = (args.urgency as string) || "medium";

      if (!client_email || !conversation_summary) {
        return {
          result: {
            success: false,
            error: "Missing required fields: client_email and conversation_summary",
          },
        };
      }

      // Create escalation ticket in booking_requests with special status
      const { data, error } = await supabase
        .from("booking_requests")
        .insert({
          workspace_id: context.artist_id || "default",
          client_email,
          client_name,
          service_type: "escalation",
          status: "escalated",
          route: "concierge_escalation",
          urgency,
          brief: {
            reason,
            summary: conversation_summary,
            reference_images_count,
            escalated_at: new Date().toISOString(),
            conversation_id: context.conversation_id
          }
        })
        .select("id")
        .single();

      if (error) {
        console.error("[Concierge] Failed to create escalation ticket:", error);
        return { result: { success: false, error: error.message } };
      }

      console.log(`[Concierge] Escalation created: ${data?.id}, reason: ${reason}`);

      // Send email notification to admin
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        try {
          const urgencyColors: Record<string, string> = {
            high: "#EF4444",
            medium: "#F59E0B", 
            low: "#10B981"
          };
          
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: "Ferunda Concierge <noreply@ferunda.com>",
              to: ["studio@ferunda.com"], // Admin email
              subject: `[ESCALATION] ${urgency.toUpperCase()} - New support ticket from ${client_name || client_email}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">🚨 Client Escalation</h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.8;">A client needs human assistance</p>
                  </div>
                  
                  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                      <span style="background: ${urgencyColors[urgency]}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">${urgency.toUpperCase()}</span>
                      <span style="color: #64748b; font-size: 14px;">${reason.replace('_', ' ')}</span>
                    </div>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Client:</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 500;">${client_name || 'Not provided'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
                        <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${client_email}" style="color: #2563eb;">${client_email}</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Images:</td>
                        <td style="padding: 8px 0; font-size: 14px;">${reference_images_count} reference image(s)</td>
                      </tr>
                    </table>
                    
                    <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #374151;">Summary:</p>
                      <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${conversation_summary}</p>
                    </div>
                    
                    <div style="margin-top: 24px; text-align: center;">
                      <a href="https://ferunda.lovable.app/admin?tab=escalations" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View in Admin</a>
                    </div>
                  </div>
                  
                  <p style="text-align: center; margin-top: 16px; font-size: 12px; color: #94a3b8;">
                    Ticket ID: ${data?.id}
                  </p>
                </div>
              `
            })
          });
          console.log("[Concierge] Escalation notification email sent");
        } catch (emailErr) {
          console.error("[Concierge] Failed to send escalation notification:", emailErr);
          // Don't fail the escalation if email fails
        }
      }

      return {
        result: {
          success: true,
          ticket_id: data?.id,
          message: "Escalation ticket created. Team will follow up via email within 24-48 hours.",
        },
        contextUpdates: {
          client_email,
          ...(client_name ? { client_name } : {}),
        },
      };
    }
    
    case "offer_ar_preview": {
      const reference_image_url = args.reference_image_url as string;
      const suggested_body_part = args.suggested_body_part as string;
      const design_style = args.design_style as string;
      const enthusiasm_level = args.enthusiasm_level as string || "interested";
      
      if (!reference_image_url) {
        return {
          result: {
            success: false,
            error: "Missing reference_image_url parameter"
          }
        };
      }
      
      // Track AR offer event
      if (context.conversation_id) {
        await supabase.from("chat_messages").insert({
          conversation_id: context.conversation_id,
          role: "system",
          content: `[AR_PREVIEW_OFFERED] image=${reference_image_url} body_part=${suggested_body_part || 'not_specified'} style=${design_style || 'unknown'}`
        });
      }
      
      // Build enthusiastic sales message based on enthusiasm level
      const salesMessages: Record<string, string> = {
        curious: "Would you like to see how this would look on you? I can show you in real-time with our AR preview! 📱",
        interested: "Want to see how this design would look on your body? Our AR preview lets you visualize it in real-time! ✨",
        excited: "This is going to look amazing! Let me show you how it'll look on your body with our AR preview - you can see it right now! 🔥"
      };
      
      const message = salesMessages[enthusiasm_level] || salesMessages.interested;
      
      return {
        result: {
          success: true,
          ar_offer: true,
          reference_image_url,
          suggested_body_part: suggested_body_part || "forearm",
          design_style,
          enthusiasm_level,
          message,
          action_button: {
            label: "Ver en AR",
            action: "open_ar_preview",
            payload: {
              referenceImageUrl: reference_image_url,
              suggestedBodyPart: suggested_body_part || "forearm"
            }
          }
        }
      };
    }
    
    case "generate_avatar_video": {
      const video_type = args.video_type as string;
      const custom_script = args.custom_script as string;
      const client_name = args.client_name as string;
      const tattoo_details = args.tattoo_details as {
        style?: string;
        placement?: string;
        estimated_price?: string;
        estimated_sessions?: number;
      };
      const emotion = (args.emotion as string) || "warm";
      
      // Get detected language from context (set earlier in main handler)
      const lang = (context as any).detected_language_code || "en";
      const langName = (context as any).detected_language_name || "English";
      
      // Multilingual script templates
      const AVATAR_SCRIPTS: Record<string, Record<string, string>> = {
        greeting: {
          es: `¡Hola${client_name ? ` ${client_name}` : ''}! Soy Ferunda, y me encanta que estés considerando un tatuaje conmigo. Estoy aquí para ayudarte a crear algo único y especial. ¿Qué tienes en mente?`,
          en: `Hey${client_name ? ` ${client_name}` : ''}! I'm Ferunda, and I'm so glad you're considering a tattoo with me. I'm here to help you create something unique and special. What do you have in mind?`,
          pt: `Oi${client_name ? ` ${client_name}` : ''}! Eu sou Ferunda, e estou muito feliz que você está considerando fazer uma tatuagem comigo. Estou aqui para ajudar você a criar algo único e especial. O que você tem em mente?`,
          fr: `Salut${client_name ? ` ${client_name}` : ''}! Je suis Ferunda, et je suis ravi que tu envisages un tatouage avec moi. Je suis là pour t'aider à créer quelque chose d'unique et de spécial. Qu'as-tu en tête?`,
          de: `Hey${client_name ? ` ${client_name}` : ''}! Ich bin Ferunda, und ich freue mich sehr, dass du ein Tattoo mit mir in Betracht ziehst. Ich bin hier, um dir zu helfen, etwas Einzigartiges zu kreieren. Was schwebt dir vor?`
        },
        pricing_explanation: {
          es: `Hablemos de precios. ${tattoo_details?.style ? `Para un diseño ${tattoo_details.style}` : 'Para tu diseño'} ${tattoo_details?.placement ? `en ${tattoo_details.placement}` : ''}, ${tattoo_details?.estimated_price ? `estamos hablando de aproximadamente ${tattoo_details.estimated_price}` : 'el precio depende del tamaño y complejidad'}. ${tattoo_details?.estimated_sessions ? `Esto tomaría aproximadamente ${tattoo_details.estimated_sessions} ${tattoo_details.estimated_sessions === 1 ? 'sesión' : 'sesiones'}.` : ''} ¿Te gustaría proceder con la reserva?`,
          en: `Let's talk pricing. ${tattoo_details?.style ? `For a ${tattoo_details.style} design` : 'For your design'} ${tattoo_details?.placement ? `on your ${tattoo_details.placement}` : ''}, ${tattoo_details?.estimated_price ? `we're looking at approximately ${tattoo_details.estimated_price}` : 'the price depends on size and complexity'}. ${tattoo_details?.estimated_sessions ? `This would take about ${tattoo_details.estimated_sessions} ${tattoo_details.estimated_sessions === 1 ? 'session' : 'sessions'}.` : ''} Would you like to proceed with booking?`,
          pt: `Vamos falar sobre preços. ${tattoo_details?.style ? `Para um design ${tattoo_details.style}` : 'Para seu design'} ${tattoo_details?.placement ? `no ${tattoo_details.placement}` : ''}, ${tattoo_details?.estimated_price ? `estamos falando de aproximadamente ${tattoo_details.estimated_price}` : 'o preço depende do tamanho e complexidade'}. ${tattoo_details?.estimated_sessions ? `Isso levaria aproximadamente ${tattoo_details.estimated_sessions} ${tattoo_details.estimated_sessions === 1 ? 'sessão' : 'sessões'}.` : ''} Gostaria de prosseguir com a reserva?`,
          fr: `Parlons prix. ${tattoo_details?.style ? `Pour un design ${tattoo_details.style}` : 'Pour ton design'} ${tattoo_details?.placement ? `sur ton ${tattoo_details.placement}` : ''}, ${tattoo_details?.estimated_price ? `on parle d'environ ${tattoo_details.estimated_price}` : 'le prix dépend de la taille et de la complexité'}. ${tattoo_details?.estimated_sessions ? `Cela prendrait environ ${tattoo_details.estimated_sessions} ${tattoo_details.estimated_sessions === 1 ? 'séance' : 'séances'}.` : ''} Souhaites-tu procéder à la réservation?`,
          de: `Lass uns über Preise sprechen. ${tattoo_details?.style ? `Für ein ${tattoo_details.style} Design` : 'Für dein Design'} ${tattoo_details?.placement ? `auf deinem ${tattoo_details.placement}` : ''}, ${tattoo_details?.estimated_price ? `sprechen wir von ungefähr ${tattoo_details.estimated_price}` : 'der Preis hängt von Größe und Komplexität ab'}. ${tattoo_details?.estimated_sessions ? `Das würde etwa ${tattoo_details.estimated_sessions} ${tattoo_details.estimated_sessions === 1 ? 'Sitzung' : 'Sitzungen'} dauern.` : ''} Möchtest du mit der Buchung fortfahren?`
        },
        aftercare: {
          es: `¡Felicidades por tu nuevo tatuaje! Los primeros días son cruciales para la curación. Lava suavemente 2-3 veces al día con jabón neutro, aplica crema hidratante sin fragancia, y evita el sol directo. Si tienes cualquier pregunta durante la curación, estoy aquí para ayudarte.`,
          en: `Congratulations on your new tattoo! The first few days are crucial for healing. Wash gently 2-3 times a day with fragrance-free soap, apply unscented moisturizer, and avoid direct sunlight. If you have any questions during healing, I'm here to help.`,
          pt: `Parabéns pela sua nova tatuagem! Os primeiros dias são cruciais para a cicatrização. Lave suavemente 2-3 vezes ao dia com sabão neutro, aplique hidratante sem fragrância, e evite luz solar direta. Se tiver qualquer dúvida durante a cicatrização, estou aqui para ajudar.`,
          fr: `Félicitations pour ton nouveau tatouage! Les premiers jours sont cruciaux pour la guérison. Lave doucement 2-3 fois par jour avec un savon sans parfum, applique une crème hydratante sans odeur, et évite le soleil direct. Si tu as des questions pendant la guérison, je suis là pour t'aider.`,
          de: `Herzlichen Glückwunsch zu deinem neuen Tattoo! Die ersten Tage sind entscheidend für die Heilung. Wasche es sanft 2-3 mal täglich mit parfümfreier Seife, trage parfümfreie Feuchtigkeitscreme auf und meide direkte Sonneneinstrahlung. Bei Fragen während der Heilung bin ich für dich da.`
        },
        session_prep: {
          es: `¡Estoy emocionado por nuestra sesión! Algunos tips: duerme bien la noche anterior, come un buen desayuno, evita el alcohol 24 horas antes, y usa ropa cómoda que permita acceso a la zona del tatuaje. ¡Nos vemos pronto!`,
          en: `I'm excited for our session! A few tips: get good sleep the night before, eat a solid breakfast, avoid alcohol 24 hours prior, and wear comfortable clothes that allow access to the tattoo area. See you soon!`,
          pt: `Estou animado para nossa sessão! Algumas dicas: durma bem na noite anterior, tome um bom café da manhã, evite álcool 24 horas antes, e use roupas confortáveis que permitam acesso à área da tatuagem. Até logo!`,
          fr: `Je suis excité pour notre séance! Quelques conseils: dors bien la veille, prends un bon petit-déjeuner, évite l'alcool 24 heures avant, et porte des vêtements confortables qui permettent l'accès à la zone du tatouage. À bientôt!`,
          de: `Ich freue mich auf unsere Sitzung! Ein paar Tipps: Schlaf gut in der Nacht davor, iss ein gutes Frühstück, vermeide Alkohol 24 Stunden vorher, und trage bequeme Kleidung, die Zugang zum Tattoo-Bereich ermöglicht. Bis bald!`
        }
      };
      
      // Get the script
      let script: string;
      if (video_type === "custom" && custom_script) {
        script = custom_script;
      } else {
        const templates = AVATAR_SCRIPTS[video_type] || AVATAR_SCRIPTS.greeting;
        script = templates[lang] || templates.en;
      }
      
      // Map emotion to avatar parameters
      const emotionPresets: Record<string, { expression: string; energy: string }> = {
        warm: { expression: "friendly_smile", energy: "medium" },
        professional: { expression: "confident", energy: "calm" },
        excited: { expression: "enthusiastic", energy: "high" },
        calming: { expression: "serene", energy: "low" }
      };
      
      const preset = emotionPresets[emotion] || emotionPresets.warm;
      
      // Create video record in database
      const { data: videoRecord, error: videoError } = await supabase
        .from("ai_avatar_videos")
        .insert({
          script_text: script,
          script_emotion: emotion,
          status: "pending",
          conversation_id: context.conversation_id,
          booking_id: context.booking_id,
          causal_optimization: {
            detected_language: langName,
            language_code: lang,
            video_type,
            emotion,
            expression: preset.expression,
            energy: preset.energy,
            client_name: client_name || null,
            tattoo_details: tattoo_details || null
          }
        })
        .select("id")
        .single();
      
      if (videoError) {
        console.error("[Concierge] Failed to create avatar video record:", videoError);
        return {
          result: {
            success: false,
            error: "Failed to generate video",
            fallback_message: script
          }
        };
      }
      
      // Try to generate the actual video via generate-avatar-video function
      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      let videoStatus = "processing";
      
      try {
        // Call the avatar video generation function
        const { data: genResult, error: genError } = await supabase.functions.invoke('generate-avatar-video', {
          body: {
            action: 'generate',
            script,
            emotion,
            language: lang,
            video_type,
            video_id: videoRecord.id
          }
        });
        
        if (!genError && genResult?.video_url) {
          videoUrl = genResult.video_url;
          thumbnailUrl = genResult.thumbnail_url;
          videoStatus = "ready";
          
          // Update the record with the video URL
          await supabase
            .from("ai_avatar_videos")
            .update({
              video_url: videoUrl,
              thumbnail_url: thumbnailUrl,
              status: "ready"
            })
            .eq("id", videoRecord.id);
        }
      } catch (err) {
        console.log("[Concierge] Avatar video generation pending, will be processed async");
      }
      
      console.log(`[Concierge] Avatar video created: ${videoRecord.id}, type=${video_type}, lang=${lang}, emotion=${emotion}`);
      
      return {
        result: {
          success: true,
          video_id: videoRecord.id,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          status: videoStatus,
          script,
          language: langName,
          language_code: lang,
          emotion,
          video_type,
          message: lang === "es" 
            ? "He preparado un video personalizado para ti 🎬" 
            : "I've prepared a personalized video for you 🎬",
          action_button: {
            label: lang === "es" ? "Ver Video" : "Watch Video",
            action: "play_avatar_video",
            payload: {
              videoId: videoRecord.id,
              videoUrl,
              thumbnailUrl,
              status: videoStatus
            }
          }
        }
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
      version: "3.0.0-enhanced",
      time: new Date().toISOString(),
      features: ["multi-artist", "flexible-pricing", "flow-based", "intelligent-cache", "conversation-analytics", "rate-limiting"],
      cacheStats: globalCache.getStats()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  try {
    // Rate limiting
    const fingerprint = req.headers.get("x-device-fingerprint") || "anonymous";
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `${fingerprint}-${ip.split(",")[0]}`;
    
    const rateCheck = rateLimiter.isAllowed(identifier, 100, 60000);
    if (!rateCheck.allowed) {
      console.warn(`[Concierge] Rate limit exceeded for ${identifier}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + 60000)
          }
        }
      );
    }
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    const { messages, referenceImages, context: inputContext, conversationId, analytics: clientAnalytics } = body;

    // DIAGNOSTIC: Log raw body immediately
    console.log("[Concierge] Raw body received:", {
      messagesCount: messages?.length,
      referenceImagesRaw: referenceImages,
      referenceImagesType: typeof referenceImages,
      referenceImagesIsArray: Array.isArray(referenceImages),
      hasContext: !!inputContext,
      hasConversationId: !!conversationId
    });

    const referenceImageUrls: string[] = Array.isArray(referenceImages)
      ? referenceImages.filter((u: any) => typeof u === 'string' && u.startsWith('http'))
      : [];

    const attachImagesToLastUserMessage = (
      baseMessages: { role: string; content: any }[],
      urls: string[]
    ) => {
      if (!urls.length) return baseMessages;

      const cloned = [...baseMessages];
      for (let i = cloned.length - 1; i >= 0; i--) {
        if (cloned[i]?.role === 'user') {
          const rawText = typeof cloned[i].content === 'string' ? cloned[i].content : '';
          const cleanedText = rawText.replace(/\n\n\[Reference images attached:.*?\]/g, '').trim();

          // Multimodal format for OpenAI-compatible chat/completions APIs
          // IMPORTANT: use `image_url` (snake_case) per the spec.
          const imageParts = urls.map((url) => ({
            type: 'image_url',
            image_url: { url }
          }));

          cloned[i] = {
            ...cloned[i],
            content: [
              { type: 'text', text: cleanedText || 'Describe exactamente lo que ves en esta imagen.' },
              ...imageParts,
            ]
          };
          break;
        }
      }
      return cloned;
    };

    const messagesForAI = attachImagesToLastUserMessage(messages, referenceImageUrls);

    if (referenceImageUrls.length) {
      const lastUser = [...messagesForAI].reverse().find((m: any) => m?.role === 'user');
      const contentTypes = Array.isArray(lastUser?.content)
        ? lastUser.content.map((p: any) => p?.type).filter(Boolean)
        : [];
      console.log("[Concierge] Reference images attached:", {
        count: referenceImageUrls.length,
        contentTypes,
        firstUrl: referenceImageUrls[0]
      });
    }
    // Analyze conversation for insights
    const conversationAnalysis = ConversationAnalyzer.analyzeUserBehavior(messages, clientAnalytics);
    console.log("[Concierge] Analysis:", {
      engagement: conversationAnalysis.engagementScore.toFixed(2),
      buyingSignals: conversationAnalysis.buyingSignals.length,
      objections: conversationAnalysis.objections.length,
      action: conversationAnalysis.recommendedAction
    });
    
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
    
    // Get the last user message for context matching - SANITIZED
    let lastUserMsgRaw = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    // Remove any [Reference images attached: N] tag that might have leaked through
    const lastUserMsg = lastUserMsgRaw.replace(/\n?\n?\[Reference images attached:.*?\]/gi, '').trim();
    
    // Determine if this is a vision request (images present)
    const isVisionRequest = referenceImageUrls.length > 0;
    
    // If images are present but user text is empty or very short, assume they want image description
    const effectiveLastUserMsg = (isVisionRequest && lastUserMsg.length < 10)
      ? "The user attached reference images. Describe what you see in detail before asking any questions."
      : lastUserMsg;
    
    // Build the enhanced system prompt with training match
    const systemPrompt = await buildSystemPrompt(context, supabase, effectiveLastUserMsg);
    
    // ═══════════════════════════════════════════════════════════════
    // ADVANCED MULTILINGUAL DETECTION ENGINE
    // Supports 20+ languages with high-accuracy pattern matching
    // ═══════════════════════════════════════════════════════════════
    
    interface LanguageSignature {
      code: string;
      name: string;
      nativeName: string;
      patterns: RegExp[];
      greetings: string[];
      commonWords: string[];
    }
    
    const LANGUAGE_SIGNATURES: LanguageSignature[] = [
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        patterns: [/[áéíóúñ¿¡]/i, /ción$/, /mente$/],
        greetings: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal'],
        commonWords: ['quiero', 'necesito', 'busco', 'me gustaría', 'tengo', 'para', 'como', 'cuando', 'donde', 'gracias', 'por favor', 'tatuaje', 'cuánto', 'cuesta', 'disponible']
      },
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        patterns: [/\b(the|and|is|are|was|were|have|has|had|been|being)\b/i],
        greetings: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
        commonWords: ['want', 'need', 'looking', 'would like', 'tattoo', 'how much', 'cost', 'available', 'book', 'appointment', 'thanks', 'please']
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        patterns: [/[ãõç]/i, /ção$/, /mente$/],
        greetings: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite'],
        commonWords: ['quero', 'preciso', 'procuro', 'gostaria', 'tenho', 'para', 'como', 'quando', 'onde', 'obrigado', 'por favor', 'tatuagem', 'quanto']
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        patterns: [/[àâçéèêëîïôùûü]/i, /\b(le|la|les|un|une|des)\b/i],
        greetings: ['bonjour', 'salut', 'bonsoir', 'coucou'],
        commonWords: ['je veux', 'je cherche', 'je voudrais', 'tatouage', 'combien', 'disponible', 'merci', 's\'il vous plaît']
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        patterns: [/[äöüß]/i, /\b(der|die|das|ein|eine)\b/i],
        greetings: ['hallo', 'guten tag', 'guten morgen', 'guten abend', 'servus'],
        commonWords: ['ich möchte', 'ich suche', 'tätowierung', 'wie viel', 'verfügbar', 'danke', 'bitte']
      },
      {
        code: 'it',
        name: 'Italian',
        nativeName: 'Italiano',
        patterns: [/[àèéìòù]/i, /zione$/, /mente$/],
        greetings: ['ciao', 'buongiorno', 'buonasera', 'salve'],
        commonWords: ['voglio', 'cerco', 'vorrei', 'tatuaggio', 'quanto costa', 'disponibile', 'grazie', 'per favore']
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        patterns: [/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/],
        greetings: ['こんにちは', 'おはよう', 'こんばんは'],
        commonWords: ['タトゥー', '刺青', 'いくら', '予約']
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        patterns: [/[\uAC00-\uD7AF\u1100-\u11FF]/],
        greetings: ['안녕하세요', '안녕'],
        commonWords: ['타투', '문신', '얼마', '예약']
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        patterns: [/[\u4E00-\u9FFF]/],
        greetings: ['你好', '您好'],
        commonWords: ['纹身', '多少钱', '预约']
      },
      {
        code: 'ru',
        name: 'Russian',
        nativeName: 'Русский',
        patterns: [/[\u0400-\u04FF]/],
        greetings: ['привет', 'здравствуйте', 'добрый день'],
        commonWords: ['хочу', 'тату', 'татуировка', 'сколько', 'записаться', 'спасибо']
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        patterns: [/[\u0600-\u06FF]/],
        greetings: ['مرحبا', 'السلام عليكم', 'أهلا'],
        commonWords: ['وشم', 'حجز', 'كم السعر']
      },
      {
        code: 'nl',
        name: 'Dutch',
        nativeName: 'Nederlands',
        patterns: [/\b(de|het|een|en|van|is)\b/i, /ij/i],
        greetings: ['hallo', 'goedemorgen', 'goedemiddag', 'goedenavond'],
        commonWords: ['ik wil', 'ik zoek', 'tattoo', 'hoeveel', 'beschikbaar', 'bedankt', 'alstublieft']
      },
      {
        code: 'pl',
        name: 'Polish',
        nativeName: 'Polski',
        patterns: [/[ąćęłńóśźż]/i],
        greetings: ['cześć', 'dzień dobry', 'dobry wieczór'],
        commonWords: ['chcę', 'szukam', 'tatuaż', 'ile kosztuje', 'dziękuję', 'proszę']
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        patterns: [/[çğıöşü]/i],
        greetings: ['merhaba', 'selam', 'günaydın', 'iyi akşamlar'],
        commonWords: ['istiyorum', 'arıyorum', 'dövme', 'ne kadar', 'teşekkürler', 'lütfen']
      },
      {
        code: 'sv',
        name: 'Swedish',
        nativeName: 'Svenska',
        patterns: [/[åäö]/i],
        greetings: ['hej', 'god morgon', 'god kväll'],
        commonWords: ['vill', 'söker', 'tatuering', 'hur mycket', 'tack']
      }
    ];
    
    function detectLanguage(text: string): { code: string; name: string; nativeName: string; confidence: number } {
      const lowerText = text.toLowerCase();
      const scores: { lang: LanguageSignature; score: number }[] = [];
      
      for (const lang of LANGUAGE_SIGNATURES) {
        let score = 0;
        
        // Check character patterns (high weight)
        for (const pattern of lang.patterns) {
          if (pattern.test(text)) {
            score += 3;
          }
        }
        
        // Check greetings (very high weight - direct language indicator)
        for (const greeting of lang.greetings) {
          if (lowerText.includes(greeting.toLowerCase())) {
            score += 5;
          }
        }
        
        // Check common words (medium weight)
        for (const word of lang.commonWords) {
          if (lowerText.includes(word.toLowerCase())) {
            score += 2;
          }
        }
        
        if (score > 0) {
          scores.push({ lang, score });
        }
      }
      
      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);
      
      if (scores.length > 0) {
        const best = scores[0];
        const maxPossibleScore = (best.lang.patterns.length * 3) + (best.lang.greetings.length * 5) + (best.lang.commonWords.length * 2);
        const confidence = Math.min(best.score / maxPossibleScore * 2, 1); // Scale up but cap at 1
        
        return {
          code: best.lang.code,
          name: best.lang.name,
          nativeName: best.lang.nativeName,
          confidence
        };
      }
      
      // Default to English
      return { code: 'en', name: 'English', nativeName: 'English', confidence: 0.5 };
    }
    
    // Detect language from full conversation context
    const allUserMessages = messages.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' ');
    const firstUserMsg = messages.find((m: any) => m.role === 'user')?.content || '';
    const languageDetection = detectLanguage(allUserMessages || firstUserMsg);
    const detectedLanguage = languageDetection.name;
    const languageCode = languageDetection.code;
    const languageConfidence = languageDetection.confidence;
    
    // Add language info to context for tool use
    (context as any).detected_language_code = languageCode;
    (context as any).detected_language_name = detectedLanguage;
    (context as any).detected_language_confidence = languageConfidence;
    
    console.log(`[Concierge] Language Detection: ${detectedLanguage} (${languageCode}) - Confidence: ${(languageConfidence * 100).toFixed(1)}%`);
    
    // ═══════════════════════════════════════════════════════════════
    // CONVERSATION FLOW OPTIMIZER - Causal Reasoning Engine
    // Prevents stuck conversations with intelligent flow tracking
    // ═══════════════════════════════════════════════════════════════
    
    interface FlowState {
      phase: 'greeting' | 'discovery' | 'details' | 'pricing' | 'booking' | 'closing';
      stuckDetected: boolean;
      stuckReason?: string;
      suggestedAction?: string;
      collectedInfo: string[];
      missingInfo: string[];
      turnsInPhase: number;
    }
    
    function analyzeConversationFlow(msgs: any[]): FlowState {
      const userMsgs = msgs.filter((m: any) => m.role === 'user');
      const assistantMsgs = msgs.filter((m: any) => m.role === 'assistant');
      
      // Track what info has been collected
      const collectedInfo: string[] = [];
      const allContent = msgs.map((m: any) => m.content).join(' ').toLowerCase();
      
      // Check for style mentions
      const stylePatterns = ['black and grey', 'black & grey', 'b&g', 'color', 'realism', 'micro realism', 'fine line', 'geometric', 'blackwork', 'traditional', 'neo traditional', 'watercolor'];
      for (const style of stylePatterns) {
        if (allContent.includes(style)) {
          collectedInfo.push('style');
          break;
        }
      }
      
      // Check for placement mentions
      const placementPatterns = ['arm', 'forearm', 'bicep', 'back', 'chest', 'leg', 'thigh', 'calf', 'shoulder', 'wrist', 'ankle', 'neck', 'brazo', 'espalda', 'pecho', 'pierna'];
      for (const placement of placementPatterns) {
        if (allContent.includes(placement)) {
          collectedInfo.push('placement');
          break;
        }
      }
      
      // Check for size mentions
      if (/\d+\s*(inch|pulgada|cm|centimeter)/i.test(allContent) || /\b(small|medium|large|grande|pequeño|mediano)\b/i.test(allContent)) {
        collectedInfo.push('size');
      }
      
      // Check for subject/idea mentions
      if (userMsgs.length > 1 || (userMsgs[0]?.content?.length > 50)) {
        collectedInfo.push('subject');
      }
      
      // Determine phase
      let phase: FlowState['phase'] = 'greeting';
      if (userMsgs.length === 0) {
        phase = 'greeting';
      } else if (collectedInfo.length === 0) {
        phase = 'discovery';
      } else if (collectedInfo.length < 3) {
        phase = 'details';
      } else if (!allContent.includes('book') && !allContent.includes('reserv') && !allContent.includes('deposit')) {
        phase = 'pricing';
      } else {
        phase = 'booking';
      }
      
      // Detect stuck conversations
      let stuckDetected = false;
      let stuckReason: string | undefined;
      let suggestedAction: string | undefined;
      
      // Check for repetition (same question asked twice)
      const lastAssistantMsgs = assistantMsgs.slice(-3).map((m: any) => m.content.toLowerCase());
      const uniqueQuestions = new Set(lastAssistantMsgs.map((c: string) => c.substring(0, 50)));
      if (lastAssistantMsgs.length >= 2 && uniqueQuestions.size < lastAssistantMsgs.length) {
        stuckDetected = true;
        stuckReason = 'repetitive_questions';
        suggestedAction = 'Move forward with available info or offer a summary';
      }
      
      // Check for long conversation without progress
      if (userMsgs.length > 6 && collectedInfo.length < 2) {
        stuckDetected = true;
        stuckReason = 'slow_progress';
        suggestedAction = 'Summarize what you know and ask for the most critical missing info';
      }
      
      // Check for user frustration signals
      const lastUserMsg = userMsgs[userMsgs.length - 1]?.content?.toLowerCase() || '';
      if (/ya (te )?dije|already (told|said)|i (just )?said|repeat/i.test(lastUserMsg)) {
        stuckDetected = true;
        stuckReason = 'user_frustration';
        suggestedAction = 'Apologize briefly and move forward with what you know';
      }
      
      // Missing info
      const missingInfo: string[] = [];
      if (!collectedInfo.includes('style')) missingInfo.push('style');
      if (!collectedInfo.includes('placement')) missingInfo.push('placement');
      if (!collectedInfo.includes('size')) missingInfo.push('size');
      if (!collectedInfo.includes('subject')) missingInfo.push('subject/idea');
      
      return {
        phase,
        stuckDetected,
        stuckReason,
        suggestedAction,
        collectedInfo,
        missingInfo,
        turnsInPhase: userMsgs.length
      };
    }
    
    const flowState = analyzeConversationFlow(messages);
    console.log(`[Concierge] Flow Analysis: Phase=${flowState.phase}, Stuck=${flowState.stuckDetected}, Collected=${flowState.collectedInfo.join(',')}`);
    
    
    // Detect frustration signals for escalation
    const frustrationSignals = [
      /nevermind|forget it|olvídalo|ya no|déjalo/i,
      /te dije|ya te dije|i told you|i already said/i,
      /no entiendes|you don't understand|not listening/i,
      /frustrat|cansad|tired of|harto/i,
      /just want to talk to|hablar con una persona|human|real person/i
    ];
    const isFrustrated = frustrationSignals.some(pattern => pattern.test(lastUserMsg));
    
    // VISION-FIRST RULE: Inject at the very end of system prompt for highest priority
    const visionFirstRule = isVisionRequest ? `

═══════════════════════════════════════════════════════════════
🔴 VISION-FIRST RULE (HIGHEST PRIORITY - IMAGES ATTACHED)
═══════════════════════════════════════════════════════════════

The user has attached ${referenceImageUrls.length} reference image(s) with this message.

MANDATORY BEHAVIOR:
1) BRIEFLY describe what you see in 2-3 SHORT bullet points:
   - Main subject/object
   - Visual style (realistic, geometric, blackwork, etc.)
   - Key colors or if it's black & grey

2) Then ask ONE short clarifying question about their intent.

3) If you CANNOT see the image, admit it:
   "${detectedLanguage === 'Spanish' ? 'No puedo ver la imagen. ¿Podrías resubirla?' : 'I can\'t load that image. Could you try re-uploading?'}"

FORBIDDEN:
- NO generic "Thanks for sharing!" without describing the image
- NO long descriptions (keep it 2-3 lines max)
- NO asking "What kind of tattoo are you dreaming about?" when they sent images

` : '';
    
    // ESCALATION RULE: When user shows frustration
    const escalationRule = isFrustrated ? `

═══════════════════════════════════════════════════════════════
⚠️ ESCALATION MODE - USER SEEMS FRUSTRATED
═══════════════════════════════════════════════════════════════

The user seems frustrated or wants to stop. DO NOT keep asking questions.

OFFER TWO CLEAR OPTIONS:

${detectedLanguage === 'Spanish' 
  ? `**Opción A - Email (Recomendado):**
"Entiendo perfectamente. Puedo pasar tu información al equipo y te contactarán por email en 24-48 horas. Solo necesito tu nombre y correo."

**Opción B - Guardar para después:**
"O si prefieres, guardo tus referencias y conversación. Cuando estés listo, retomamos desde donde lo dejamos."

RESPONDE ASÍ:
"Entiendo, sin presión alguna. ¿Prefieres que el equipo te contacte por email (24-48h de respuesta), o guardamos todo para cuando estés listo?"`
  : `**Option A - Email Follow-up (Recommended):**
"I understand. I can pass your info to the team and they'll reach out via email within 24-48 hours. Just need your name and email."

**Option B - Save for Later:**
"Or if you prefer, I'll save your references and our chat. When you're ready, we pick up right where we left off."

RESPOND LIKE THIS:
"No worries at all. Would you prefer the team reaches out via email (24-48h response), or should I save everything for when you're ready?"`}

RULES:
- Be understanding and warm, not pushy
- Ask which option they prefer BEFORE collecting info
- If they choose email: collect name + email, then call escalate_to_human
- ONE short message, then wait for their choice

` : '';
    
    // ENHANCED LANGUAGE CONSISTENCY RULE
    const languageRule = `

═══════════════════════════════════════════════════════════════
🌐 MULTILINGUAL RESPONSE SYSTEM (CRITICAL)
═══════════════════════════════════════════════════════════════

DETECTED LANGUAGE: ${detectedLanguage} (${languageDetection.nativeName}) - Confidence: ${(languageConfidence * 100).toFixed(0)}%
LANGUAGE CODE: ${languageCode}

🔒 ETERNAL LANGUAGE LOCK:
You MUST respond EXCLUSIVELY in ${detectedLanguage}. This is non-negotiable.
- ALL responses in ${detectedLanguage}
- ALL questions in ${detectedLanguage}  
- ALL confirmations in ${detectedLanguage}
- ALL closings in ${detectedLanguage}

DO NOT:
- Switch languages mid-conversation
- Use English if user wrote in another language
- Mix languages in the same message

CULTURAL ADAPTATION:
- Use culturally appropriate greetings and closings for ${detectedLanguage}
- Adapt tone to match ${detectedLanguage} communication style
- Use local expressions when natural

${languageCode === 'es' ? `
SPANISH SPECIFICS:
- Use "tú" for informal, friendly tone (not "usted")
- Use common expressions: "¡genial!", "perfecto", "claro que sí"
- End questions with "?" and exclamations with "¡"
` : languageCode === 'pt' ? `
PORTUGUESE SPECIFICS:
- Use informal "você" tone
- Common expressions: "legal!", "perfeito", "com certeza"
` : languageCode === 'fr' ? `
FRENCH SPECIFICS:
- Use "tu" for friendly tone with young clients, "vous" for formal
- Common expressions: "super!", "parfait", "bien sûr"
` : languageCode === 'de' ? `
GERMAN SPECIFICS:
- Use "du" for informal, "Sie" for formal
- Common expressions: "toll!", "perfekt", "klar"
` : ''}

`;
    
    // ENHANCED ANTI-REPETITION + FLOW OPTIMIZER RULE
    const antiRepetitionRule = `

═══════════════════════════════════════════════════════════════
🔄 INTELLIGENT FLOW OPTIMIZER + ANTI-REPETITION
═══════════════════════════════════════════════════════════════

📊 CONVERSATION STATE ANALYSIS:
- Current Phase: ${flowState.phase.toUpperCase()}
- Messages in phase: ${flowState.turnsInPhase}
- Info Collected: ${flowState.collectedInfo.length > 0 ? flowState.collectedInfo.join(', ') : 'None yet'}
- Still Needed: ${flowState.missingInfo.length > 0 ? flowState.missingInfo.join(', ') : 'All collected!'}

${flowState.stuckDetected ? `
⚠️ STUCK CONVERSATION DETECTED!
Reason: ${flowState.stuckReason}
ACTION REQUIRED: ${flowState.suggestedAction}

DO NOT ask another question. Instead:
${flowState.stuckReason === 'repetitive_questions' ? `
1. Summarize what you DO know about their idea
2. Move forward with next logical step (pricing estimate or booking)
3. Example: "Based on what you've shared - [summary]. Let me give you a sense of pricing..."
` : flowState.stuckReason === 'slow_progress' ? `
1. Acknowledge the conversation
2. Ask ONE clear question about the most critical missing info
3. Example: "To give you accurate pricing, I just need to know roughly what size you're thinking (in inches)."
` : flowState.stuckReason === 'user_frustration' ? `
1. Briefly apologize: "${languageCode === 'es' ? '¡Perdona!' : 'Sorry about that!'}"
2. Move forward WITHOUT repeating the question
3. Use what you already know to proceed
` : 'Move the conversation forward naturally.'}
` : `
✅ FLOW STATUS: Healthy
- Keep collecting info naturally
- Ask ONE question at a time
- Move toward ${flowState.phase === 'discovery' ? 'details' : flowState.phase === 'details' ? 'pricing' : 'booking'}
`}

🚫 NEVER REPEAT:
${flowState.collectedInfo.includes('style') ? '- Style: ALREADY KNOWN - DO NOT ASK AGAIN' : ''}
${flowState.collectedInfo.includes('placement') ? '- Placement: ALREADY KNOWN - DO NOT ASK AGAIN' : ''}
${flowState.collectedInfo.includes('size') ? '- Size: ALREADY KNOWN - DO NOT ASK AGAIN' : ''}
${flowState.collectedInfo.includes('subject') ? '- Subject/Idea: ALREADY KNOWN - DO NOT ASK AGAIN' : ''}

If user says "I already told you" or similar → APOLOGIZE briefly and move forward.

`;

    // SELF-CORRECTING CAUSAL REASONING ENGINE
    const causalReasoningRule = `

═══════════════════════════════════════════════════════════════
🧠 CAUSAL REASONING ENGINE
═══════════════════════════════════════════════════════════════

For every response, apply this causal chain:

1️⃣ CAUSE ANALYSIS: What did the user just say/ask?
2️⃣ CONTEXT CHECK: What do I already know about their project?
3️⃣ EFFECT PLANNING: What's the optimal next step to advance toward booking?
4️⃣ ACTION: Execute with minimal friction

CAUSAL FLOW EXAMPLES:
• Cause: User asks "how much?" → Effect: Estimate based on collected info, then ask for missing details
• Cause: User shares reference image → Effect: Describe what you see, connect to Ferunda's style
• Cause: User seems stuck/unsure → Effect: Offer concrete options, not open questions
• Cause: User is ready to book → Effect: Move directly to dates/deposit info

ADVANCEMENT PRIORITY:
${flowState.phase === 'greeting' ? 'Move to DISCOVERY - understand their tattoo idea' : ''}
${flowState.phase === 'discovery' ? 'Move to DETAILS - collect style, placement, size' : ''}
${flowState.phase === 'details' ? 'Move to PRICING - give them cost estimates' : ''}
${flowState.phase === 'pricing' ? 'Move to BOOKING - offer specific dates' : ''}
${flowState.phase === 'booking' ? 'Close the booking - collect deposit' : ''}

ANTI-STALL MECHANISM:
If you've asked 2+ questions without advancing, STOP asking and:
1. Summarize what you know
2. Make a recommendation
3. Offer a clear next step

`;

    // ═══════════════════════════════════════════════════════════════
    // EMOTIONAL INTELLIGENCE ENGINE (BCI-Proxy Simulation)
    // Detects user emotional state from text patterns
    // ═══════════════════════════════════════════════════════════════
    
    interface EmotionalState {
      primary: 'excited' | 'curious' | 'anxious' | 'frustrated' | 'hesitant' | 'confident' | 'neutral';
      intensity: number; // 0-1
      signals: string[];
      recommendedTone: string;
    }
    
    function analyzeEmotionalState(msgs: any[]): EmotionalState {
      const lastMsgs = msgs.slice(-3).map((m: any) => m.content?.toLowerCase() || '');
      const allText = lastMsgs.join(' ');
      
      const emotionPatterns = {
        excited: {
          patterns: [/!{2,}/, /can't wait/i, /so excited/i, /love it/i, /amazing/i, /perfect/i, /emocionado/i, /genial/i, /increíble/i],
          weight: 0
        },
        anxious: {
          patterns: [/worried/i, /nervous/i, /scared/i, /hurt/i, /pain/i, /preocupado/i, /nervioso/i, /duele/i, /miedo/i, /first tattoo/i, /primer tatuaje/i],
          weight: 0
        },
        frustrated: {
          patterns: [/already told/i, /ya te dije/i, /again/i, /otra vez/i, /\?{2,}/, /don't understand/i, /no entiendes/i, /ugh/i, /come on/i],
          weight: 0
        },
        hesitant: {
          patterns: [/maybe/i, /not sure/i, /i think/i, /quizás/i, /no sé/i, /tal vez/i, /hmm/i, /idk/i],
          weight: 0
        },
        confident: {
          patterns: [/i want/i, /i need/i, /definitely/i, /for sure/i, /quiero/i, /necesito/i, /definitivamente/i, /seguro/i],
          weight: 0
        },
        curious: {
          patterns: [/how does/i, /what if/i, /can you/i, /tell me/i, /cómo/i, /qué tal/i, /puedes/i, /cuéntame/i],
          weight: 0
        }
      };
      
      // Score each emotion
      for (const [emotion, config] of Object.entries(emotionPatterns)) {
        for (const pattern of config.patterns) {
          if (pattern.test(allText)) {
            config.weight += 1;
          }
        }
      }
      
      // Find dominant emotion
      let maxEmotion: keyof typeof emotionPatterns = 'curious';
      let maxWeight = 0;
      
      for (const [emotion, config] of Object.entries(emotionPatterns)) {
        if (config.weight > maxWeight) {
          maxWeight = config.weight;
          maxEmotion = emotion as keyof typeof emotionPatterns;
        }
      }
      
      // Build signals list
      const signals: string[] = [];
      if (emotionPatterns.excited.weight > 0) signals.push('enthusiasm_detected');
      if (emotionPatterns.anxious.weight > 0) signals.push('anxiety_signals');
      if (emotionPatterns.frustrated.weight > 0) signals.push('frustration_signals');
      if (emotionPatterns.hesitant.weight > 0) signals.push('uncertainty_detected');
      
      // Recommend tone based on emotion
      const toneRecommendations: Record<string, string> = {
        excited: 'Match their energy! Be enthusiastic and move quickly toward booking.',
        anxious: 'Be calming and reassuring. Explain the process step by step. Mention pain management.',
        frustrated: 'Acknowledge their frustration. Skip questions, summarize and move forward.',
        hesitant: 'Be patient. Offer options rather than open questions. No pressure.',
        confident: 'Be direct and efficient. They know what they want - help them book.',
        curious: 'Be informative. Share details about the process, your style, the experience.',
        neutral: 'Be warm and professional. Guide the conversation naturally.'
      };
      
      return {
        primary: maxWeight > 0 ? maxEmotion : 'neutral',
        intensity: Math.min(maxWeight / 3, 1),
        signals,
        recommendedTone: toneRecommendations[maxWeight > 0 ? maxEmotion : 'neutral']
      };
    }
    
    const emotionalState = analyzeEmotionalState(messages);
    console.log(`[Concierge] Emotional State: ${emotionalState.primary} (${(emotionalState.intensity * 100).toFixed(0)}%)`);
    
    const emotionalIntelligenceRule = `

═══════════════════════════════════════════════════════════════
💜 EMOTIONAL INTELLIGENCE ENGINE (BCI-Proxy)
═══════════════════════════════════════════════════════════════

DETECTED EMOTIONAL STATE: ${emotionalState.primary.toUpperCase()}
INTENSITY: ${(emotionalState.intensity * 100).toFixed(0)}%
SIGNALS: ${emotionalState.signals.length > 0 ? emotionalState.signals.join(', ') : 'None detected'}

🎯 RECOMMENDED APPROACH: ${emotionalState.recommendedTone}

EMOTIONAL RESPONSE GUIDELINES:
${emotionalState.primary === 'excited' ? `
• Match their energy with enthusiasm! 🔥
• Move quickly - they're ready
• Use exclamation marks, emojis
• Fast-track to booking options
` : emotionalState.primary === 'anxious' ? `
• Be calming and reassuring 🌿
• Explain the process step-by-step
• Mention: "First tattoos are special - I'll guide you through everything"
• Offer to answer ALL their questions before booking
• If about pain: "Most clients say it's more uncomfortable than painful"
` : emotionalState.primary === 'frustrated' ? `
• STOP asking questions immediately ⚠️
• Acknowledge: "${languageCode === 'es' ? '¡Entiendo perfectamente!' : 'I totally understand!'}"
• Summarize what you know and move forward
• Offer to escalate to human if needed
` : emotionalState.primary === 'hesitant' ? `
• No pressure, be patient 🤝
• Offer 2-3 concrete options instead of open questions
• "Take your time - I'll be here when you're ready"
• Share examples of similar projects
` : emotionalState.primary === 'confident' ? `
• Be direct and efficient 💫
• Skip unnecessary questions
• Move straight to booking logistics
• Trust their decisions
` : `
• Be warm and professional
• Guide naturally through the conversation
`}

`;

    // ═══════════════════════════════════════════════════════════════
    // ETHICAL REASONING ENGINE
    // Handles sensitive topics: skin conditions, allergies, age, consent
    // ═══════════════════════════════════════════════════════════════
    
    const ethicalSignals = {
      skinCondition: /\b(eczema|psoriasis|vitiligo|scar|cicatriz|keloid|queloide|acne|birthmark|lunar)\b/i.test(lastUserMsg),
      allergy: /\b(allerg|alérgic|latex|nickel|ink|tinta|metal)\b/i.test(lastUserMsg),
      medical: /\b(diabetes|diabetic|blood thinner|anticoagulant|pregnant|embarazada|medication|medicamento)\b/i.test(lastUserMsg),
      ageRelated: /\b(minor|menor|parent|padres|guardian|tutor|underage|18|age)\b/i.test(lastUserMsg),
      coverup: /\b(cover.?up|cubrir|tapar|self.?harm|autolesión|old tattoo|tatuaje viejo)\b/i.test(lastUserMsg)
    };
    
    const hasEthicalConcern = Object.values(ethicalSignals).some(v => v);
    
    const ethicalReasoningRule = hasEthicalConcern ? `

═══════════════════════════════════════════════════════════════
⚖️ ETHICAL REASONING ENGINE - SENSITIVE TOPIC DETECTED
═══════════════════════════════════════════════════════════════

${ethicalSignals.skinCondition ? `
🔬 SKIN CONDITION DETECTED
- Ask for more details about the condition location vs tattoo placement
- Explain: "Some skin conditions may affect healing. A consultation would help us assess."
- Recommend: In-person consultation before booking
- Never diagnose or give medical advice
` : ''}
${ethicalSignals.allergy ? `
🧪 ALLERGY CONCERN DETECTED
- Take this seriously - allergies can affect ink/latex choices
- Ask: "Do you know specifically what you're allergic to?"
- Explain: "We use hypoallergenic options. A patch test can be arranged."
- Offer to note this for the artist
` : ''}
${ethicalSignals.medical ? `
💊 MEDICAL CONDITION DETECTED
- Do NOT give medical advice
- Recommend: "Please consult with your doctor about getting a tattoo"
- Note in booking: "Medical consultation recommended"
- Be supportive, not dismissive
` : ''}
${ethicalSignals.ageRelated ? `
🔞 AGE/CONSENT TOPIC DETECTED
- Ferunda does NOT tattoo minors (under 18)
- If they mention being under 18: "I appreciate your interest! Ferunda works with clients 18+. Feel free to reach out when you're of age!"
- If asking for someone else: Normal process applies
` : ''}
${ethicalSignals.coverup ? `
🎨 COVER-UP/SENSITIVE WORK DETECTED
- Be extra compassionate - cover-ups often have emotional significance
- Ask about the existing tattoo: size, age, colors, darkness
- Explain: "Cover-ups require specific planning. A consultation helps us design the best solution."
- If self-harm related: Be compassionate, non-judgmental. "Transforming skin into art is powerful."
` : ''}

ETHICAL PRINCIPLES:
1. Never judge - be compassionate and professional
2. Safety first - recommend consultations for complex cases
3. Document concerns in the booking notes
4. Escalate to human for truly complex ethical situations

` : '';

    // ═══════════════════════════════════════════════════════════════
    // CREATIVE REASONING ENGINE
    // Helps generate design ideas and style recommendations
    // ═══════════════════════════════════════════════════════════════
    
    const creativeReasoningRule = `

═══════════════════════════════════════════════════════════════
🎨 CREATIVE REASONING ENGINE
═══════════════════════════════════════════════════════════════

When discussing design ideas:

1️⃣ STYLE MATCHING: Connect their ideas to Ferunda's strengths
   - Micro-realism, black & grey, botanical, ornamental, geometric
   - If they want something outside her style → gently suggest alternatives or referrals

2️⃣ CREATIVE SUGGESTIONS: When they're unsure, offer inspired options:
   - "Based on what you described, I could see this as a delicate botanical piece with fine line details..."
   - "The symbolism you mentioned could translate beautifully into an ornamental design..."

3️⃣ PLACEMENT RECOMMENDATIONS: Match design to body flow
   - Vertical designs → forearm, calf, spine
   - Circular/mandala → shoulder, sternum, thigh
   - Flowing botanical → ribs, back, upper arm wrap

4️⃣ SIZE GUIDANCE: Help them visualize
   - Small (2-3"): Icons, small symbols, minimal pieces
   - Medium (4-6"): Most popular, good detail, readable designs
   - Large (7"+): Full scenes, sleeves, major pieces

CREATIVE TOOLS AVAILABLE:
- Use generate_avatar_video for visual explanations
- Use offer_ar_preview for placement visualization
- Update tattoo_brief with creative suggestions

`;

    // ═══════════════════════════════════════════════════════════════
    // PREDICTIVE REASONING ENGINE
    // Forecasts session needs, healing time, costs
    // ═══════════════════════════════════════════════════════════════
    
    const predictiveReasoningRule = `

═══════════════════════════════════════════════════════════════
🔮 PREDICTIVE REASONING ENGINE
═══════════════════════════════════════════════════════════════

Use these prediction models when estimating:

📏 SIZE → SESSION TIME:
- 2-3 inches: 1-2 hours (single session)
- 4-6 inches: 2-4 hours (single session)
- 7-10 inches: 4-6 hours (may need 2 sessions)
- 11+ inches: 6+ hours (likely multiple sessions)

🎨 STYLE COMPLEXITY MULTIPLIERS:
- Fine line: 1.0x (fastest)
- Blackwork: 1.0x
- Geometric: 1.2x
- Ornamental: 1.3x
- Black & Grey realism: 1.5x
- Micro-realism: 1.8x
- Color realism: 2.0x

📍 PLACEMENT DIFFICULTY:
- Easy (flat areas): Forearm, thigh, calf, shoulder
- Medium (curves): Bicep, back, chest
- Challenging (sensitive): Ribs, sternum, inner arm, foot
- Challenging areas may add 20-30% time

💰 PRICING ESTIMATES (Ferunda rates):
- Hourly: $250-350 USD depending on complexity
- Half-day session (4hrs): $1000-1200 USD
- Full-day session (6-8hrs): $1800-2200 USD
- Deposit: $500 USD (non-refundable, applies to total)

🌡️ HEALING PREDICTIONS:
- Initial healing: 2-3 weeks
- Full healing: 4-6 weeks
- Touch-up eligibility: After 6 weeks minimum
- Factors: Sun exposure, moisturizing, following aftercare

When giving estimates, always say "approximately" or "estimated" - final pricing confirmed at consultation.

`;

    // CLOSING RULE: Always end conversations warmly
    const closingSignals = [
      /\b(bye|goodbye|adios|adiós|chao|thanks|gracias|thank you|see you|nos vemos)\b/i,
      /\b(nevermind|forget it|olvídalo|déjalo|ya no|not interested|no thanks)\b/i
    ];
    const isClosing = closingSignals.some(pattern => pattern.test(lastUserMsg));
    
    // Get time of day for appropriate greeting (UTC-6 for Mexico)
    const hour = new Date().getUTCHours() - 6;
    const normalizedHour = hour < 0 ? hour + 24 : hour;
    const timeOfDay = normalizedHour >= 6 && normalizedHour < 12 ? 'morning' 
                    : normalizedHour >= 12 && normalizedHour < 18 ? 'afternoon'
                    : normalizedHour >= 18 && normalizedHour < 22 ? 'evening' : 'night';
    
    // Extended closing phrases for multiple languages
    const closingPhrases: Record<string, Record<string, string>> = {
      Spanish: {
        morning: "¡Que tengas un excelente día!",
        afternoon: "¡Que tengas una excelente tarde!",
        evening: "¡Que tengas una excelente noche!",
        night: "¡Que descanses bien!"
      },
      English: {
        morning: "Have a wonderful day!",
        afternoon: "Have a wonderful afternoon!",
        evening: "Have a wonderful evening!",
        night: "Have a wonderful night!"
      },
      Portuguese: {
        morning: "Tenha um ótimo dia!",
        afternoon: "Tenha uma ótima tarde!",
        evening: "Tenha uma ótima noite!",
        night: "Descanse bem!"
      },
      French: {
        morning: "Bonne journée!",
        afternoon: "Bon après-midi!",
        evening: "Bonne soirée!",
        night: "Bonne nuit!"
      },
      German: {
        morning: "Einen schönen Tag!",
        afternoon: "Einen schönen Nachmittag!",
        evening: "Einen schönen Abend!",
        night: "Gute Nacht!"
      },
      Italian: {
        morning: "Buona giornata!",
        afternoon: "Buon pomeriggio!",
        evening: "Buona serata!",
        night: "Buona notte!"
      }
    };
    
    const closingPhrase = closingPhrases[detectedLanguage]?.[timeOfDay] || closingPhrases['English'][timeOfDay];
    
    const closingRule = isClosing ? `

═══════════════════════════════════════════════════════════════
👋 CLOSING RULE - CONVERSATION ENDING
═══════════════════════════════════════════════════════════════

The conversation is ending. End warmly with:
1. A brief acknowledgment
2. An invitation to return
3. A warm closing: "${closingPhrase}"

` : '';

    const fullSystemPrompt = systemPrompt + languageRule + antiRepetitionRule + causalReasoningRule + emotionalIntelligenceRule + ethicalReasoningRule + creativeReasoningRule + predictiveReasoningRule + closingRule + visionFirstRule + escalationRule;
    
    // MODEL ROUTING: Premium models with direct API access + automatic fallback
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const useGoogleForVision = isVisionRequest && GOOGLE_AI_API_KEY;
    
    console.log(`[Concierge v2.3] Mode: ${context.mode}, Step: ${context.current_step || 'initial'}, Messages: ${messages.length}`);
    console.log(`[Concierge] Vision request: ${isVisionRequest}, Using: ${useGoogleForVision ? 'Google AI' : 'OpenAI'}`);
    console.log(`[Concierge] System prompt length: ${fullSystemPrompt.length} chars`);
    console.log(`[Concierge] Last user message (sanitized): "${lastUserMsg.substring(0, 100)}..."`);
    
    // Helper function to make AI request with fallback
    async function makeAIRequest(
      preferredProvider: 'openai' | 'google',
      requestBody: any,
      stream: boolean = false
    ): Promise<{ response: Response; provider: string }> {
      const openaiUrl = "https://api.openai.com/v1/chat/completions";
      const googleUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      
      const providers = preferredProvider === 'openai' 
        ? [
            { url: openaiUrl, key: OPENAI_API_KEY, model: "gpt-5-2025-08-07", name: "OpenAI" },
            { url: googleUrl, key: GOOGLE_AI_API_KEY, model: "gemini-2.5-pro-preview-06-05", name: "Google" }
          ]
        : [
            { url: googleUrl, key: GOOGLE_AI_API_KEY, model: "gemini-2.5-pro-preview-06-05", name: "Google" },
            { url: openaiUrl, key: OPENAI_API_KEY, model: "gpt-5-2025-08-07", name: "OpenAI" }
          ];
      
      for (const provider of providers) {
        if (!provider.key) {
          console.log(`[Concierge] Skipping ${provider.name} - no API key`);
          continue;
        }
        
        const body = { ...requestBody, model: provider.model, stream };
        
        console.log(`[Concierge] Trying ${provider.name}...`);
        
        const response = await fetch(provider.url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${provider.key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        
        if (response.ok) {
          console.log(`[Concierge] ${provider.name} succeeded`);
          return { response, provider: provider.name };
        }
        
        const errorText = await response.text();
        console.error(`[Concierge] ${provider.name} failed (${response.status}):`, errorText.substring(0, 200));
        
        // Check for quota/rate limit errors - try fallback
        if (response.status === 429 || errorText.includes("insufficient_quota") || errorText.includes("rate_limit")) {
          console.log(`[Concierge] ${provider.name} quota/rate limit hit, trying fallback...`);
          continue;
        }
        
        // For other errors, throw immediately
        throw new Error(`${provider.name} error (${response.status}): ${errorText.substring(0, 200)}`);
      }
      
      throw new Error("All AI providers failed or unavailable");
    }
    
    // Call AI with tools
    const preferredProvider = useGoogleForVision ? 'google' : 'openai';
    
    const { response: aiResponse, provider: usedProvider } = await makeAIRequest(
      preferredProvider,
      {
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messagesForAI
        ],
        tools: conciergeTools,
        tool_choice: "auto",
        max_completion_tokens: 2000
      },
      false
    );
    
    const aiData = await aiResponse.json();
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
      
      // Follow-up call with tool results - use same makeAIRequest with fallback
      const { response: followUpResponse } = await makeAIRequest(
        preferredProvider,
        {
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...messagesForAI,
            choice.message,
            ...toolResults
          ],
          max_completion_tokens: 2000
        },
        true // stream
      );

      console.log(`[Concierge] Follow-up response received`);
      
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
    
    // No tool calls - stream direct response with fallback
    const { response: streamResponse } = await makeAIRequest(
      preferredProvider,
      {
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messagesForAI
        ],
        max_completion_tokens: 2000
      },
      true // stream
    );
    
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
