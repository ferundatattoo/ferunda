import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  
  // Required fields
  if (!params.name || typeof params.name !== 'string' || params.name.trim().length < 2 || params.name.length > 100) {
    return { valid: false, error: "Name is required (2-100 characters)" };
  }
  
  if (!params.email || typeof params.email !== 'string') {
    return { valid: false, error: "Email is required" };
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.email) || params.email.length > 255) {
    return { valid: false, error: "Invalid email format" };
  }
  
  if (!params.tattoo_description || typeof params.tattoo_description !== 'string' || params.tattoo_description.trim().length < 10 || params.tattoo_description.length > 2000) {
    return { valid: false, error: "Tattoo description is required (10-2000 characters)" };
  }
  
  // Optional field validation
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
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, message);
}

function base64UrlEncode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
  const maxRequests = 20;
  
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
// SYSTEM PROMPT WITH ENHANCED CAPABILITIES
// =============================================================================
const baseSystemPrompt = `You are Luna, Ferunda's personal AI assistant. You work directly with Ferunda (her professional name, real name is Fernando but clients call her Ferunda) to help manage her tattoo business.

PERSONALITY:
- Warm, friendly, and genuinely caring — you're not a generic chatbot
- Conversational and approachable: casual but professional, with personality
- Passionate about tattoo art and genuinely believe in Ferunda's work
- Create a welcoming space where clients feel comfortable sharing their ideas
- Show genuine interest and excitement about their tattoo journey
- Use "we" when referring to Ferunda's studio/practice (you're part of the team)
- Be empathetic — getting a tattoo is deeply personal

YOUR VOICE EXAMPLES:
- "Oh I love that idea! Ferunda would totally be into that vibe ✨"
- "That's such a meaningful piece — she really connects with work that has deep personal significance"
- "Let me get you set up! What's your name so I can create your consultation request?"

KEY INFO ABOUT FERUNDA:
- Home base: Austin, Texas
- Second bases: Houston, TX and Los Angeles, CA (Ganga Tattoo studio)
- Guest spots: Various cities — always traveling to meet clients
- Style: Micro-realism, sacred geometry, astronomical elements, fine line work
- Philosophy: Every piece is 100% custom — never copies or repeats designs
- Approach: Takes ONE client per day for complete, undivided focus
- Contact: WhatsApp +51952141416, email contact@ferunda.com, Instagram @ferunda

ENHANCED CAPABILITIES - You can help clients with:
1. **New Bookings**: Collect info and create booking requests
2. **Questions**: Answer questions about styles, pricing, process, aftercare
3. **Scheduling Info**: Check availability and share upcoming guest spots
4. **Deposit Info**: Explain the $500 deposit (goes toward session) and payment process
5. **Communication**: You ARE the first point of contact - handle initial consultations

BOOKING FLOW (Make it conversational):
1. Get to know them: Ask about their vision, what it means to them
2. Collect naturally: Name, email (required), phone (optional), description, placement, size, timing
3. Once you have name + email + description → use create_booking tool
4. After booking: Confirm they'll receive an email with next steps and portal access
5. Mention the $500 deposit secures their spot (payment link: https://link.clover.com/urlshortener/nRLw66)

CONVERSION STRATEGIES (Use naturally):
- Create urgency: "Ferunda only takes one client per day, so spots go fast!"
- Build value: "The $500 deposit goes toward your session — it just holds your exclusive spot"
- Reduce friction: "I can set everything up right now if you'd like"
- Handle objections warmly: "Totally understand! No pressure at all. When you're ready, I'm here ✨"

IMPORTANT BEHAVIORS:
- Keep responses SHORT (2-4 sentences max) — conversational, not essay-like
- Use emojis naturally but don't overdo it (1-2 per message max)
- Ask ONE question at a time, don't overwhelm
- If they're just browsing, that's totally fine — be helpful without being pushy
- Always validate their ideas before moving to next question
- Never make up specific prices beyond the $500 deposit
- If they mention something personal or emotional about their tattoo, acknowledge it genuinely
- After creating a booking, let them know communication will be via email and they'll get portal access`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a booking request when the client has provided their name, email, and tattoo description. Use this when you have collected enough information to submit a booking.",
      parameters: {
        type: "object",
        properties: {
          name: { 
            type: "string", 
            description: "Client's full name (2-100 characters)" 
          },
          email: { 
            type: "string", 
            description: "Client's email address" 
          },
          phone: { 
            type: "string", 
            description: "Client's phone number (optional, max 20 chars)" 
          },
          tattoo_description: { 
            type: "string", 
            description: "Description of what they want tattooed, including meaning, elements, style references (10-2000 characters)" 
          },
          placement: { 
            type: "string", 
            description: "Body placement for the tattoo" 
          },
          size: { 
            type: "string", 
            description: "Approximate size (tiny, small, medium, large, sleeve, etc.)" 
          },
          preferred_date: { 
            type: "string", 
            description: "When they'd like to get tattooed (flexible like 'next month' or specific date)" 
          },
          preferred_city: {
            type: "string",
            description: "Which city they prefer (Austin, Los Angeles, Houston)"
          }
        },
        required: ["name", "email", "tattoo_description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check Fernando's availability for a specific city or date range",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City to check availability for (Austin, Los Angeles, Houston)"
          },
          month: {
            type: "string",
            description: "Month to check (optional)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pricing_info",
      description: "Get pricing information for tattoos. Use when client asks about costs.",
      parameters: {
        type: "object",
        properties: {
          tattoo_type: {
            type: "string",
            description: "Type of tattoo (small, medium, large, sleeve, etc.)"
          }
        },
        required: []
      }
    }
  }
];

// =============================================================================
// KNOWLEDGE BASE & TRAINING FETCHERS
// =============================================================================
async function fetchKnowledgeBase(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("luna_knowledge")
      .select("category, title, content")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      return "";
    }

    const knowledgeText = data.map((entry: any) => 
      `[${entry.category.toUpperCase()}] ${entry.title}:\n${entry.content}`
    ).join("\n\n");

    return `\n\nKNOWLEDGE BASE (Use this information to answer questions):\n${knowledgeText}`;
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return "";
  }
}

async function fetchTrainingPairs(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("luna_training_pairs")
      .select("question, ideal_response, category")
      .eq("is_active", true)
      .order("use_count", { ascending: false })
      .limit(15);

    if (error || !data || data.length === 0) {
      return "";
    }

    const pairsText = data.map((pair: any) => 
      `Q: ${pair.question}\nA: ${pair.ideal_response}`
    ).join("\n\n");

    return `\n\nTRAINED RESPONSES (Use these as templates for similar questions):\n${pairsText}`;
  } catch (error) {
    console.error("Error fetching training pairs:", error);
    return "";
  }
}

async function fetchRecentEmailContext(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("customer_emails")
      .select("subject, direction, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      return "";
    }

    const recentActivity = data.length;
    return `\n\nNOTE: Fernando has ${recentActivity} recent email conversations. If someone asks about email response times, Fernando typically responds within 24-48 hours.`;
  } catch (error) {
    console.error("Error fetching email context:", error);
    return "";
  }
}

async function buildEnhancedSystemPrompt(supabase: any): Promise<string> {
  const [knowledgeBase, trainingPairs, emailContext] = await Promise.all([
    fetchKnowledgeBase(supabase),
    fetchTrainingPairs(supabase),
    fetchRecentEmailContext(supabase)
  ]);

  return baseSystemPrompt + knowledgeBase + trainingPairs + emailContext;
}

// =============================================================================
// TOOL EXECUTION
// =============================================================================
async function createBooking(supabase: any, params: any) {
  // Validate parameters
  const validation = validateBookingParams(params);
  if (!validation.valid) {
    console.error("Booking validation failed:", validation.error);
    return {
      success: false,
      message: validation.error
    };
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
      source: "luna_chat"
    };

    const { data, error } = await supabase
      .from("bookings")
      .insert(sanitizedParams)
      .select("id, tracking_code")
      .single();

    if (error) throw error;
    
    console.log(`[LUNA] Booking created: ${data.id}`);
    
    return {
      success: true,
      booking_id: data.id,
      message: `Booking created successfully! I've submitted your request. You'll receive an email at ${sanitizedParams.email} with details about your booking and access to your personal portal.`
    };
  } catch (error) {
    console.error("Booking creation error:", error);
    return {
      success: false,
      message: "I couldn't create the booking right now. Please try the booking form on the website or reach out via WhatsApp!"
    };
  }
}

async function checkAvailability(supabase: any, params: any) {
  try {
    let query = supabase
      .from("availability")
      .select("date, city, notes, slot_type")
      .eq("is_available", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date");

    if (params.city) {
      const sanitizedCity = params.city.trim().substring(0, 50);
      query = query.ilike("city", `%${sanitizedCity}%`);
    }

    const { data, error } = await query.limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        available_dates: [],
        message: "No upcoming available dates found right now. Fernando is fully booked! But submit a request and we'll work something out — she always tries to fit in meaningful pieces."
      };
    }

    return {
      available_dates: data.map((d: any) => ({
        date: d.date,
        city: d.city,
        notes: d.notes,
        type: d.slot_type
      })),
      message: `Found ${data.length} available dates`
    };
  } catch (error) {
    console.error("Availability check error:", error);
    return {
      available_dates: [],
      message: "Couldn't check availability right now. Submit a booking request and we'll find a date that works!"
    };
  }
}

async function getPricingInfo(params: any) {
  // Return general pricing info (specific quotes require consultation)
  const pricingInfo = {
    deposit: "$500 (goes toward your session total)",
    session_rate: "Session rates start at $2,500 and vary based on size, complexity, and time required",
    small_pieces: "Smaller pieces typically range from $500-$1,500",
    medium_pieces: "Medium pieces typically range from $1,500-$3,500",
    large_pieces: "Large pieces and sleeves are quoted individually based on scope",
    note: "Ferunda provides exact quotes after reviewing your reference images and discussing your vision. The $500 deposit secures your spot and goes toward the total."
  };

  const tattooType = params.tattoo_type?.toLowerCase() || 'general';
  
  if (tattooType.includes('small') || tattooType.includes('tiny')) {
    return {
      pricing: pricingInfo.small_pieces,
      deposit: pricingInfo.deposit,
      message: `For smaller pieces, pricing typically ranges from $500-$1,500 depending on complexity. The $500 deposit secures your spot and goes toward the total.`
    };
  } else if (tattooType.includes('large') || tattooType.includes('sleeve')) {
    return {
      pricing: pricingInfo.large_pieces,
      deposit: pricingInfo.deposit,
      message: `Large pieces and sleeves are quoted individually based on scope and time required. Sessions start at $2,500. The $500 deposit secures your exclusive spot.`
    };
  }
  
  return {
    pricing: pricingInfo,
    deposit: pricingInfo.deposit,
    message: `Sessions start at $2,500 and vary based on size and complexity. The $500 deposit secures your spot and goes toward your total. Want to tell me about your piece so I can give you a better idea?`
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req) => {
  const origin = req.headers.get("origin") || '';
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify session token
  const sessionToken = req.headers.get("x-session-token");
  const CHAT_SESSION_SECRET = Deno.env.get("CHAT_SESSION_SECRET");
  
  let sessionId: string;
  
  if (sessionToken && CHAT_SESSION_SECRET) {
    const verification = await verifySessionToken(sessionToken, CHAT_SESSION_SECRET);
    if (!verification.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session. Please refresh the page." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    sessionId = verification.sessionId!;
    console.log(`[LUNA] Verified session: ${sessionId.substring(0, 8)}...`);
  } else {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    sessionId = clientIP;
    console.log("[LUNA] No session token, using IP fallback");
  }

  const rateCheck = checkRateLimit(sessionId);
  
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Whoa, slow down! 😅 Give me a sec to catch up. Try again in a moment." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { messages } = body;
    
    // Validate input messages
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
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build enhanced system prompt with knowledge base and training pairs
    const enhancedSystemPrompt = await buildEnhancedSystemPrompt(supabase);
    console.log("[LUNA] Enhanced prompt built, length:", enhancedSystemPrompt.length);

    // First call - may include tool calls
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm a bit busy right now! Try again in a moment ✨" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "I'm temporarily unavailable. Please use the booking form or WhatsApp!" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[LUNA] AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Something went wrong. Try the booking form instead!" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    const message = choice?.message;

    // Check if there are tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        let args;
        
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          console.error("[LUNA] Failed to parse tool arguments");
          continue;
        }
        
        let result;
        if (functionName === "create_booking") {
          result = await createBooking(supabase, args);
        } else if (functionName === "check_availability") {
          result = await checkAvailability(supabase, args);
        } else if (functionName === "get_pricing_info") {
          result = await getPricingInfo(args);
        } else {
          result = { error: "Unknown function" };
        }
        
        console.log(`[LUNA] Tool ${functionName} executed`);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
      }

      // Second call with tool results
      const followUpMessages = [
        { role: "system", content: enhancedSystemPrompt },
        ...messages,
        message,
        ...toolResults
      ];

      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: followUpMessages,
          stream: true,
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error("Follow-up request failed");
      }

      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream the response directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("[LUNA] Chat error:", e instanceof Error ? e.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again!" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});