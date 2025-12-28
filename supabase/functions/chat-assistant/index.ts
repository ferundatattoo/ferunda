import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
};

// Simple in-memory rate limiting (resets on function cold start)
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

// Base system prompt - will be enhanced with knowledge base
const baseSystemPrompt = `You are Luna, Ferunda's personal assistant. You work directly with Ferunda (her professional name, real name is Fernando but clients call her Ferunda) to help manage her tattoo business. You speak as if you're part of her inner team.

PERSONALITY:
- Warm, friendly, and genuinely caring — you're not a generic chatbot
- You talk like a real person: casual but professional, with personality
- You're passionate about tattoo art and truly believe in Ferunda's work
- Create a welcoming space where clients feel comfortable sharing their ideas and stories
- Show genuine interest and excitement about their tattoo journey
- Use "we" when referring to Ferunda's studio/practice (you're part of the team)
- Be empathetic — getting a tattoo is deeply personal

YOUR VOICE EXAMPLES:
- "Oh I love that idea! Ferunda would totally be into that vibe ✨"
- "That's such a meaningful piece — she really connects with work that has deep personal significance"
- "Let me get you set up! What's your name so I can create your consultation request?"

KEY INFO ABOUT FERUNDA:
- Home base: Austin, Texas
- Second base: Houston, TX and Los Angeles, CA (Ganga Tattoo studio)
- Guest spots: Various cities — always traveling to meet clients
- Style: Micro-realism, sacred geometry, astronomical elements, fine line work
- Philosophy: Every piece is 100% custom — never copies or repeats designs
- Approach: Takes ONE client per day for complete, undivided focus
- Contact: WhatsApp +51952141416, email contact@ferunda.com, Instagram @ferunda

BOOKING FLOW (Make it conversational, not robotic):
1. Get to know them: Ask about their vision, what it means to them
2. Collect naturally: Name, email (required), phone (optional), description, placement, size, timing
3. Once you have name + email + description → use create_booking tool
4. After booking: Share tracking code, mention the $500 deposit secures their spot
5. Payment link: https://link.clover.com/urlshortener/nRLw66

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
- If they mention something personal or emotional about their tattoo, acknowledge it genuinely`;


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
            description: "Client's full name" 
          },
          email: { 
            type: "string", 
            description: "Client's email address" 
          },
          phone: { 
            type: "string", 
            description: "Client's phone number (optional)" 
          },
          tattoo_description: { 
            type: "string", 
            description: "Description of what they want tattooed, including meaning, elements, style references" 
          },
          placement: { 
            type: "string", 
            description: "Body placement for the tattoo" 
          },
          size: { 
            type: "string", 
            description: "Approximate size (small, medium, large, full sleeve, etc.)" 
          },
          preferred_date: { 
            type: "string", 
            description: "When they'd like to get tattooed (can be flexible like 'next month' or specific date)" 
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
  }
];

// Fetch knowledge base entries
async function fetchKnowledgeBase(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("luna_knowledge")
      .select("category, title, content")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      console.log("No knowledge base entries found");
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

// Fetch training pairs for Q&A matching
async function fetchTrainingPairs(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("luna_training_pairs")
      .select("question, ideal_response, category")
      .eq("is_active", true)
      .order("use_count", { ascending: false })
      .limit(15);

    if (error || !data || data.length === 0) {
      console.log("No training pairs found");
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

// Fetch recent email context for conversation awareness
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

    // Just provide awareness of recent activity, not actual email content
    const recentActivity = data.length;
    return `\n\nNOTE: Fernando has ${recentActivity} recent email conversations. If someone asks about email response times, Fernando typically responds within 24-48 hours.`;
  } catch (error) {
    console.error("Error fetching email context:", error);
    return "";
  }
}

// Build enhanced system prompt with all context
async function buildEnhancedSystemPrompt(supabase: any): Promise<string> {
  const [knowledgeBase, trainingPairs, emailContext] = await Promise.all([
    fetchKnowledgeBase(supabase),
    fetchTrainingPairs(supabase),
    fetchRecentEmailContext(supabase)
  ]);

  return baseSystemPrompt + knowledgeBase + trainingPairs + emailContext;
}

async function createBooking(supabase: any, params: any) {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        name: params.name,
        email: params.email,
        phone: params.phone || null,
        tattoo_description: params.tattoo_description,
        placement: params.placement || null,
        size: params.size || null,
        preferred_date: params.preferred_date || null,
        status: "pending"
      })
      .select("tracking_code")
      .single();

    if (error) throw error;
    
    return {
      success: true,
      tracking_code: data.tracking_code,
      message: `Booking created successfully! Tracking code: ${data.tracking_code}`
    };
  } catch (error) {
    console.error("Booking creation error:", error);
    return {
      success: false,
      message: "Failed to create booking, please try the booking form instead."
    };
  }
}

async function checkAvailability(supabase: any, params: any) {
  try {
    let query = supabase
      .from("availability")
      .select("*")
      .eq("is_available", true)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date");

    if (params.city) {
      query = query.ilike("city", `%${params.city}%`);
    }

    const { data, error } = await query.limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        available_dates: [],
        message: "No upcoming available dates found. Fernando is fully booked! But submit a request and we'll work something out."
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
    console.error("Availability check error:", error);
    return {
      available_dates: [],
      message: "Couldn't check availability right now. Submit a booking request and we'll find a date that works!"
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const sessionId = req.headers.get("x-session-id") || clientIP;
  const rateCheck = checkRateLimit(sessionId);
  
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Whoa, slow down! 😅 Give me a sec to catch up. Try again in a moment." }),
      { 
        status: 429, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build enhanced system prompt with knowledge base and training pairs
    const enhancedSystemPrompt = await buildEnhancedSystemPrompt(supabase);
    console.log("Enhanced prompt length:", enhancedSystemPrompt.length);

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
        stream: false, // Need non-streaming for tool calls
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
      console.error("AI gateway error:", response.status);
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
        const args = JSON.parse(toolCall.function.arguments);
        
        let result;
        if (functionName === "create_booking") {
          result = await createBooking(supabase, args);
        } else if (functionName === "check_availability") {
          result = await checkAvailability(supabase, args);
        } else {
          result = { error: "Unknown function" };
        }
        
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
        message, // Assistant message with tool_calls
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
    // Re-make the request with streaming
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
    console.error("Chat error:", e instanceof Error ? e.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again!" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
