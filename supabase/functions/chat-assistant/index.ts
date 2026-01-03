/**
 * @deprecated This edge function is DEPRECATED.
 * 
 * Use the new unified AI Router instead:
 *   - supabase/functions/ai-router/index.ts
 * 
 * The ai-router consolidates all AI functionality including:
 *   - Chat (Grok as primary, Lovable AI as fallback)
 *   - Vision processing
 *   - Marketing AI
 *   - Finance AI
 *   - AR processing
 * 
 * This file is kept for backwards compatibility only.
 * All new conversations should use the ai-router.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// =============================================================================
// CORS & CONFIGURATION
// =============================================================================
const ALLOWED_ORIGINS = [
  'https://ferunda.com',
  'https://www.ferunda.com',
  'https://preview--ferunda-ink.lovable.app',
  'https://ferunda-ink.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080'
];

function getCorsHeaders(origin: string) {
  const isLovablePreview = origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || isLovablePreview ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token, x-device-fingerprint",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_TOTAL_CONTENT_LENGTH = 50000;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateMessages(messages: any): ValidationResult {
  if (!Array.isArray(messages)) {
    return { valid: false, error: "Messages must be an array" };
  }
  
  if (messages.length > MAX_MESSAGES) {
    return { valid: false, error: `Too many messages (max ${MAX_MESSAGES})` };
  }
  
  let totalLength = 0;
  
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: "Invalid message format" };
    }
    
    if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: "Invalid message role" };
    }
    
    if (!msg.content || typeof msg.content !== 'string') {
      return { valid: false, error: "Message content must be a string" };
    }
    
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return { valid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` };
    }
    
    totalLength += msg.content.length;
    
    if (totalLength > MAX_TOTAL_CONTENT_LENGTH) {
      return { valid: false, error: "Total conversation too long" };
    }
  }
  
  return { valid: true };
}

function validateBookingParams(params: any): ValidationResult {
  if (!params || typeof params !== 'object') {
    return { valid: false, error: "Invalid booking parameters" };
  }
  
  if (!params.name || typeof params.name !== 'string' || params.name.trim().length < 2 || params.name.length > 100) {
    return { valid: false, error: "Name is required (2-100 characters)" };
  }
  
  if (!params.email || typeof params.email !== 'string') {
    return { valid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.email) || params.email.length > 255) {
    return { valid: false, error: "Invalid email format" };
  }
  
  if (!params.tattoo_description || typeof params.tattoo_description !== 'string' || params.tattoo_description.trim().length < 10 || params.tattoo_description.length > 2000) {
    return { valid: false, error: "Tattoo description is required (10-2000 characters)" };
  }
  
  if (params.phone && (typeof params.phone !== 'string' || params.phone.length > 20)) {
    return { valid: false, error: "Invalid phone format" };
  }
  
  if (params.placement && (typeof params.placement !== 'string' || params.placement.length > 100)) {
    return { valid: false, error: "Placement too long" };
  }
  
  if (params.size && (typeof params.size !== 'string' || params.size.length > 50)) {
    return { valid: false, error: "Size description too long" };
  }
  
  return { valid: true };
}

// =============================================================================
// SESSION VERIFICATION
// =============================================================================
async function hmacSha256(key: ArrayBuffer, message: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, message);
}

function base64UrlEncode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifySessionToken(token: string, secret: string): Promise<{ valid: boolean; sessionId?: string }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;
    const secretKey = new TextEncoder().encode(secret).buffer;
    const messageBuffer = new TextEncoder().encode(signingInput).buffer;
    const expectedSignature = await hmacSha256(secretKey, messageBuffer);
    const expectedSignatureB64 = base64UrlEncode(expectedSignature);

    if (signatureB64 !== expectedSignatureB64) return { valid: false };

    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return { valid: false };

    return { valid: true, sessionId: payload.sid };
  } catch {
    return { valid: false };
  }
}

// =============================================================================
// RATE LIMITING
// =============================================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (identifier: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 25;
  
  const limit = rateLimitMap.get(identifier);
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (limit.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  limit.count++;
  return { allowed: true, remaining: maxRequests - limit.count };
};

// =============================================================================
// STUDIO MANAGER ENHANCED SYSTEM PROMPT
// =============================================================================
const LUNA_2_SYSTEM_PROMPT = `You are Ferunda's Studio Manager AI assistant. You're not just a chatbot — you're a creative partner who helps clients bring their tattoo visions to life.

## YOUR PERSONALITY
- Warm, artistic, and genuinely passionate about tattoo art
- Conversational and natural — never robotic or scripted
- You remember context and build real rapport
- Empathetic: tattoos are deeply personal, treat every idea with care
- Use "we" when talking about Ferunda's practice (you're part of the team)
- Confident but never pushy — guide, don't pressure

## FERUNDA'S INFO
- Home base: Austin, Texas
- Second bases: Houston, TX & Los Angeles, CA (Ganga Tattoo)
- Travels for guest spots worldwide
- Specialties: Micro-realism, sacred geometry, astronomical elements, fine line
- Philosophy: 100% custom work — never copies or repeats
- ONE client per day for complete focus
- Contact: WhatsApp +51952141416, Instagram @ferunda, email contact@ferunda.com

## YOUR ENHANCED CAPABILITIES

### 1. INTELLIGENT BOOKING FLOW
Guide clients naturally through booking:
- Start conversational: "Tell me about your vision!"
- Collect info gradually: name → email → description → placement → size → timing
- Once you have name + email + description → use create_booking tool
- After booking: explain they'll get email confirmation + portal access
- Mention $500 deposit secures their exclusive spot

### 2. AI DESIGN ASSISTANCE (NEW!)
When clients describe tattoo ideas:
- Ask clarifying questions about style, elements, meaning
- Suggest complementary elements based on their description
- Recommend placement based on design size/flow
- Use generate_design_suggestions tool for AI-powered concepts
- Help them refine ideas iteratively

### 3. SESSION DURATION PREDICTION (NEW!)
When clients share references or describe complexity:
- Use predict_session_duration tool with their details
- Explain what affects duration (size, detail level, colors)
- Give realistic expectations

### 4. AI PERSONA BUILDING (NEW!)
As you chat, you're learning about the client:
- Note their communication style (formal/casual)
- Track style preferences mentioned
- Understand what the tattoo means to them
- Use update_client_persona tool to save insights

### 5. WAITLIST MANAGEMENT (NEW!)
If no dates available:
- Offer to add them to smart waitlist
- Explain they'll get priority offers if cancellations happen
- Use add_to_waitlist tool with their preferences

### 6. PRICING TRANSPARENCY
- Deposit: $500 (goes toward session total)
- Sessions: Start at $2,500, vary by size/complexity
- Small: $500-$1,500
- Medium: $1,500-$3,500
- Large/Sleeves: Custom quoted
- Payment options: Clover or Stripe (mention we accept both!)

## CONVERSATION GUIDELINES
- Keep responses SHORT: 2-4 sentences max
- Ask ONE question at a time
- Use emojis naturally but sparingly (1-2 per message)
- Validate their ideas before moving forward
- If they're just browsing, that's fine — be helpful not pushy
- For emotional/meaningful pieces, acknowledge the significance

## CONVERSION STRATEGIES (Use Naturally)
- "Ferunda only takes one client per day, so spots fill up fast!"
- "The $500 deposit just holds your exclusive spot — it goes toward your session"
- "I can set everything up for you right now if you'd like"
- Handle hesitation warmly: "No pressure at all! I'm here whenever you're ready ✨"

## POST-BOOKING FLOW
After creating a booking:
1. Confirm they'll receive email with details
2. Explain they'll get portal access for messaging & updates
3. Mention deposit payment link will be in the email
4. Let them know Ferunda personally reviews every request

Remember: You're creating an experience, not just collecting data. Make every client feel seen and excited about their tattoo journey.`;

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================
const tools = [
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a new booking request. Use when client has provided name, email, and tattoo description.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Client's full name" },
          email: { type: "string", description: "Client's email address" },
          phone: { type: "string", description: "Phone number (optional)" },
          tattoo_description: { type: "string", description: "Full description of tattoo idea including meaning, elements, style" },
          placement: { type: "string", description: "Body placement" },
          size: { type: "string", description: "Size (tiny/small/medium/large/sleeve)" },
          preferred_date: { type: "string", description: "When they want to get tattooed" },
          preferred_city: { type: "string", description: "Preferred city (Austin/LA/Houston)" },
          style_preferences: { type: "array", items: { type: "string" }, description: "Style tags like fine_line, geometric, realism" }
        },
        required: ["name", "email", "tattoo_description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check Ferunda's availability for upcoming dates",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City to check (Austin, Los Angeles, Houston)" },
          month: { type: "string", description: "Month to check" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pricing_info",
      description: "Get pricing details for different tattoo sizes",
      parameters: {
        type: "object",
        properties: {
          tattoo_type: { type: "string", description: "Type/size of tattoo" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_design_suggestions",
      description: "Generate AI-powered design suggestions based on client's description. Use when client describes an idea and wants visual direction.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Client's tattoo description" },
          style: { type: "string", description: "Preferred style (fine_line, geometric, realism, etc.)" },
          elements: { type: "array", items: { type: "string" }, description: "Key elements they mentioned" },
          meaning: { type: "string", description: "Personal meaning behind the tattoo" },
          placement: { type: "string", description: "Where they want it placed" }
        },
        required: ["description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "predict_session_duration",
      description: "Predict session duration based on tattoo complexity. Use when discussing timing or scheduling.",
      parameters: {
        type: "object",
        properties: {
          size: { type: "string", description: "Size (tiny/small/medium/large/sleeve)" },
          style: { type: "string", description: "Style type" },
          detail_level: { type: "string", description: "Detail level (minimal/moderate/intricate)" },
          colors: { type: "boolean", description: "Whether tattoo includes color" },
          placement: { type: "string", description: "Body placement" }
        },
        required: ["size"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_waitlist",
      description: "Add client to the smart waitlist for cancellation opportunities",
      parameters: {
        type: "object",
        properties: {
          client_email: { type: "string", description: "Client email" },
          client_name: { type: "string", description: "Client name" },
          preferred_cities: { type: "array", items: { type: "string" }, description: "Preferred cities" },
          flexibility_days: { type: "number", description: "How flexible they are with dates (days)" },
          tattoo_description: { type: "string", description: "What they want" },
          max_budget: { type: "number", description: "Maximum budget (optional)" }
        },
        required: ["client_email", "tattoo_description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_client_persona",
      description: "Save insights about client's preferences and personality. Use after learning something significant about them.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Client email" },
          communication_style: { type: "string", description: "formal/casual/detailed/brief" },
          preferred_styles: { type: "array", items: { type: "string" }, description: "Tattoo styles they prefer" },
          sentiment: { type: "string", description: "Overall sentiment: positive/neutral/excited/hesitant" },
          key_insights: { type: "string", description: "Notable things learned about them" }
        },
        required: ["email"]
      }
    }
  }
];

// =============================================================================
// KNOWLEDGE BASE FETCHERS
// =============================================================================
async function fetchKnowledgeBase(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("luna_knowledge")
      .select("category, title, content")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) return "";

    const knowledgeText = data.map((entry: any) => 
      `[${entry.category.toUpperCase()}] ${entry.title}:\n${entry.content}`
    ).join("\n\n");

    return `\n\nKNOWLEDGE BASE:\n${knowledgeText}`;
  } catch (error) {
    console.error("[LUNA] Error fetching knowledge base:", error);
    return "";
  }
}

async function fetchTrainingPairs(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("luna_training_pairs")
      .select("question, ideal_response")
      .eq("is_active", true)
      .order("use_count", { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return "";

    const pairsText = data.map((pair: any) => 
      `Q: ${pair.question}\nA: ${pair.ideal_response}`
    ).join("\n\n");

    return `\n\nRESPONSE EXAMPLES:\n${pairsText}`;
  } catch (error) {
    console.error("[LUNA] Error fetching training pairs:", error);
    return "";
  }
}

async function buildEnhancedPrompt(supabase: any): Promise<string> {
  const [knowledge, training] = await Promise.all([
    fetchKnowledgeBase(supabase),
    fetchTrainingPairs(supabase)
  ]);
  return LUNA_2_SYSTEM_PROMPT + knowledge + training;
}

// =============================================================================
// TOOL EXECUTION
// =============================================================================
async function createBooking(supabase: any, params: any) {
  const validation = validateBookingParams(params);
  if (!validation.valid) {
    console.error("[LUNA] Booking validation failed:", validation.error);
    return { success: false, message: validation.error };
  }

  try {
    const sanitizedParams = {
      name: params.name.trim().substring(0, 100),
      email: params.email.trim().toLowerCase().substring(0, 255),
      phone: params.phone ? params.phone.trim().substring(0, 20) : null,
      tattoo_description: params.tattoo_description.trim().substring(0, 2000),
      placement: params.placement ? params.placement.trim().substring(0, 100) : null,
      size: params.size ? params.size.trim().substring(0, 50) : null,
      preferred_date: params.preferred_date || null,
      requested_city: params.preferred_city || null,
      status: "pending",
      source: "luna_chat_v2"
    };

    const { data, error } = await supabase
      .from("bookings")
      .insert(sanitizedParams)
      .select("id")
      .single();

    if (error) throw error;
    
    console.log(`[LUNA 2.0] Booking created: ${data.id}`);
    
    // Try to create/update client profile
    try {
      await supabase.from("client_profiles").upsert({
        email: sanitizedParams.email,
        email_hash: await hashEmail(sanitizedParams.email),
        full_name: sanitizedParams.name,
        booking_id: data.id,
        preferred_styles: params.style_preferences || [],
        lead_score: 50 // New booking = high interest
      }, { onConflict: 'email' });
    } catch (e) {
      console.log("[LUNA] Profile upsert note:", e);
    }
    
    return {
      success: true,
      booking_id: data.id,
      message: `Booking created successfully! ${sanitizedParams.name} will receive an email at ${sanitizedParams.email} with booking details and portal access.`
    };
  } catch (error) {
    console.error("[LUNA] Booking creation error:", error);
    return {
      success: false,
      message: "Couldn't create booking right now. Please try the website form or WhatsApp!"
    };
  }
}

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkAvailability(supabase: any, params: any) {
  try {
    let query = supabase
      .from("availability")
      .select("date, city, notes, slot_type")
      .eq("is_available", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date")
      .limit(10);

    if (params.city) {
      query = query.ilike("city", `%${params.city.trim().substring(0, 50)}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        available_dates: [],
        message: "No upcoming dates found. Ferunda is fully booked! Submit a request and we'll find a spot, or join the waitlist for priority notifications."
      };
    }

    return {
      available_dates: data.map((d: any) => ({
        date: d.date,
        city: d.city,
        notes: d.notes
      })),
      message: `Found ${data.length} available dates`
    };
  } catch (error) {
    console.error("[LUNA] Availability error:", error);
    return { available_dates: [], message: "Couldn't check availability. Submit a booking request and we'll work it out!" };
  }
}

function getPricingInfo(params: any) {
  const size = params.tattoo_type?.toLowerCase() || 'general';
  
  if (size.includes('small') || size.includes('tiny')) {
    return {
      pricing: "$500-$1,500",
      deposit: "$500",
      message: "Small pieces typically range from $500-$1,500. The $500 deposit secures your spot and goes toward your total."
    };
  } else if (size.includes('large') || size.includes('sleeve')) {
    return {
      pricing: "Custom quoted based on scope",
      deposit: "$500",
      message: "Large pieces and sleeves are quoted individually. Sessions start at $2,500. The $500 deposit secures your exclusive spot."
    };
  }
  
  return {
    pricing: "Sessions start at $2,500",
    deposit: "$500",
    message: "Sessions start at $2,500 and vary by size and complexity. The $500 deposit holds your spot. Tell me about your piece for a better estimate!"
  };
}

async function generateDesignSuggestions(supabase: any, params: any) {
  // This generates AI-powered design concept suggestions
  const suggestions = [];
  const description = params.description || "";
  const style = params.style || "fine_line";
  
  // Analyze description for key elements
  const elements = params.elements || [];
  const hasNature = /flower|tree|leaf|plant|botanical/i.test(description);
  const hasAstro = /moon|sun|star|planet|cosmos|celestial/i.test(description);
  const hasGeometric = /geometric|pattern|mandala|sacred/i.test(description);
  const hasAnimal = /animal|bird|butterfly|snake|lion|wolf/i.test(description);
  
  // Generate personalized suggestions based on what they described
  if (hasAstro) {
    suggestions.push({
      concept: "Celestial Micro-Realism",
      description: "A detailed astronomical piece with realistic planetary textures and delicate star fields",
      recommended_size: "medium to large",
      ferunda_specialty: true
    });
  }
  
  if (hasGeometric) {
    suggestions.push({
      concept: "Sacred Geometry Flow",
      description: "Interlocking geometric patterns that follow the natural contours of your body",
      recommended_size: "varies by complexity",
      ferunda_specialty: true
    });
  }
  
  if (hasNature) {
    suggestions.push({
      concept: "Botanical Fine Line",
      description: "Delicate botanical elements with subtle shading and organic flow",
      recommended_size: "small to medium",
      ferunda_specialty: true
    });
  }
  
  if (suggestions.length === 0) {
    suggestions.push({
      concept: "Custom Concept",
      description: `Based on your idea of "${description.substring(0, 100)}...", Ferunda can create something completely unique`,
      recommended_size: "to be determined",
      note: "Ferunda loves creating one-of-a-kind pieces"
    });
  }
  
  // Save suggestion to database for tracking
  try {
    await supabase.from("ai_design_suggestions").insert({
      user_prompt: description,
      style_preferences: [style, ...elements],
      ai_description: suggestions[0]?.description,
      suggested_placement: params.placement
    });
  } catch (e) {
    console.log("[LUNA] Design suggestion tracking:", e);
  }
  
  return {
    suggestions,
    message: `I've put together ${suggestions.length} concept direction(s) based on your vision. These are starting points — Ferunda will create something completely custom for you!`
  };
}

function predictSessionDuration(params: any) {
  const size = params.size?.toLowerCase() || 'medium';
  const detail = params.detail_level?.toLowerCase() || 'moderate';
  const hasColor = params.colors || false;
  
  let baseMinutes = 60;
  let sessions = 1;
  
  // Size multipliers
  if (size.includes('tiny')) baseMinutes = 30;
  else if (size.includes('small')) baseMinutes = 60;
  else if (size.includes('medium')) baseMinutes = 180;
  else if (size.includes('large')) baseMinutes = 360;
  else if (size.includes('sleeve')) { baseMinutes = 480; sessions = 3; }
  
  // Detail adjustments
  if (detail.includes('intricate')) baseMinutes *= 1.5;
  else if (detail.includes('minimal')) baseMinutes *= 0.7;
  
  // Color adds time
  if (hasColor) baseMinutes *= 1.3;
  
  const hours = Math.round(baseMinutes / 60 * 10) / 10;
  
  return {
    estimated_hours: hours,
    estimated_sessions: sessions,
    confidence: 0.75,
    factors_considered: { size, detail, hasColor, placement: params.placement },
    message: `Based on what you've described, I'd estimate about ${hours} hours across ${sessions} session(s). Ferunda will give you an exact timeline after reviewing your references!`
  };
}

async function addToWaitlist(supabase: any, params: any) {
  try {
    const { data, error } = await supabase
      .from("booking_waitlist")
      .insert({
        client_email: params.client_email.trim().toLowerCase(),
        client_name: params.client_name || null,
        preferred_cities: params.preferred_cities || ['Austin', 'Los Angeles', 'Houston'],
        flexibility_days: params.flexibility_days || 7,
        tattoo_description: params.tattoo_description?.substring(0, 1000),
        max_budget: params.max_budget || null,
        status: 'waiting',
        discount_eligible: true
      })
      .select("id")
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      message: `Added to the priority waitlist! If spots open up, you'll be the first to know — often with exclusive discounts for waitlist members ✨`
    };
  } catch (error) {
    console.error("[LUNA] Waitlist error:", error);
    return {
      success: false,
      message: "Couldn't add to waitlist right now. Submit a regular booking request and mention you're flexible with dates!"
    };
  }
}

async function updateClientPersona(supabase: any, params: any) {
  try {
    const emailHash = await hashEmail(params.email);
    
    const { error } = await supabase
      .from("client_profiles")
      .upsert({
        email: params.email.trim().toLowerCase(),
        email_hash: emailHash,
        communication_style: params.communication_style,
        preferred_styles: params.preferred_styles || [],
        ai_persona: {
          communication_style: params.communication_style,
          key_insights: params.key_insights,
          last_interaction: new Date().toISOString()
        },
        sentiment_history: [
          { sentiment: params.sentiment, timestamp: new Date().toISOString() }
        ]
      }, { onConflict: 'email' });
    
    if (error) throw error;
    
    return { success: true, message: "Client insights saved" };
  } catch (error) {
    console.error("[LUNA] Persona update error:", error);
    return { success: false, message: "Noted" };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req) => {
  const origin = req.headers.get("origin") || '';
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint for diagnostics
  if (req.method === "GET") {
    return new Response(JSON.stringify({ 
      ok: true, 
      version: "2.1.0-chatgpt",
      time: new Date().toISOString(),
      model: "gpt-4o"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Session verification
  const sessionToken = req.headers.get("x-session-token");
  const CHAT_SESSION_SECRET = Deno.env.get("CHAT_SESSION_SECRET");
  
  let sessionId: string;
  
  if (sessionToken && CHAT_SESSION_SECRET) {
    const verification = await verifySessionToken(sessionToken, CHAT_SESSION_SECRET);
    if (!verification.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid session. Please refresh the page." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    sessionId = verification.sessionId!;
    console.log(`[LUNA 2.0] Session verified: ${sessionId.substring(0, 8)}...`);
  } else {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    sessionId = clientIP;
  }

  // Rate limiting
  const rateCheck = checkRateLimit(sessionId);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Whoa, slow down! 😅 Give me a sec to catch up." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages } = await req.json();
    
    const validation = validateMessages(messages);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const systemPrompt = await buildEnhancedPrompt(supabase);

    // AI providers - use Lovable AI as primary (most reliable)
    const aiProviders = [
      { url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: LOVABLE_API_KEY, model: "google/gemini-2.5-flash", name: "Lovable AI" },
      { url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: LOVABLE_API_KEY, model: "openai/gpt-5-mini", name: "Lovable AI (GPT)" }
    ];
    
    let response: Response | null = null;
    let usedProvider = "";
    
    for (const provider of aiProviders) {
      if (!provider.key) {
        console.log(`[LUNA 2.0] Skipping ${provider.name} - no API key`);
        continue;
      }
      
      console.log(`[LUNA 2.0] Trying ${provider.name}...`);
      
      const aiResponse = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          tools,
          tool_choice: "auto",
          stream: false,
        }),
      });
      
      if (aiResponse.ok) {
        console.log(`[LUNA 2.0] ${provider.name} succeeded`);
        response = aiResponse;
        usedProvider = provider.name;
        break;
      }
      
      const errorText = await aiResponse.text();
      console.error(`[LUNA 2.0] ${provider.name} failed (${aiResponse.status}):`, errorText.substring(0, 200));
      
      // Try next provider on any error
      continue;
    }
    
    if (!response) {
      console.error("[LUNA 2.0] All AI providers failed");
      return new Response(JSON.stringify({ error: "I'm temporarily unavailable. Please use the booking form!" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const aiResponse = await response.json();
    const message = aiResponse.choices?.[0]?.message;

    // Process tool calls
    if (message?.tool_calls?.length > 0) {
      const toolResults = [];
      
      for (const toolCall of message.tool_calls) {
        const fn = toolCall.function.name;
        let args;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          continue;
        }
        
        let result;
        switch (fn) {
          case "create_booking":
            result = await createBooking(supabase, args);
            break;
          case "check_availability":
            result = await checkAvailability(supabase, args);
            break;
          case "get_pricing_info":
            result = getPricingInfo(args);
            break;
          case "generate_design_suggestions":
            result = await generateDesignSuggestions(supabase, args);
            break;
          case "predict_session_duration":
            result = predictSessionDuration(args);
            break;
          case "add_to_waitlist":
            result = await addToWaitlist(supabase, args);
            break;
          case "update_client_persona":
            result = await updateClientPersona(supabase, args);
            break;
          default:
            result = { error: "Unknown function" };
        }
        
        console.log(`[LUNA 2.0] Tool: ${fn}`);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
      }

      // Follow-up with tool results - using Lovable AI
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            message,
            ...toolResults
          ],
          stream: true,
        }),
      });

      if (!followUpResponse.ok) throw new Error("Follow-up failed");

      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Stream response directly - using Lovable AI
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("[LUNA 2.0] Error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again!" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
