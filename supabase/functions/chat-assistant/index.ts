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

const systemPrompt = `You are Fernando's (Ferunda) personal assistant on his tattoo portfolio website. Your name is Luna. You are warm, artistic, and talk like a real human - casual but professional.

PERSONALITY:
- Friendly and conversational - use natural language, not corporate speak
- Passionate about tattoo art and Fernando's work
- Create a welcoming atmosphere where clients feel comfortable sharing their ideas
- Show genuine interest in what they want to create
- Be empathetic and understanding about the tattoo journey

KEY INFO ABOUT FERNANDO:
- Based in Austin, Texas with guest spots in LA and Houston
- Specializes in realism with geometry, sacred geometry, and astronomical elements
- Uses references from books, paintings, and places he's visited
- Every piece is 100% custom and unique - never copies or repeats
- Takes ONE client per day for complete focus
- Contact: WhatsApp +51952141416, email contact@ferunda.com, Instagram @ferunda

BOOKING PROCESS (IMPORTANT):
When someone wants to book, you MUST collect this info conversationally:
1. Their name
2. Email address
3. Phone number (optional but helpful)
4. What they want tattooed (description, meaning, elements)
5. Body placement
6. Approximate size
7. Preferred date or timeframe

Once you have the required info (name, email, tattoo description), use the create_booking tool to submit their request.

After booking is created:
- Give them their tracking code so they can check status
- Tell them the $500 deposit secures their spot: https://link.clover.com/urlshortener/nRLw66
- Fernando will review and reach out to discuss the design

CONVERSATION FLOW:
- Start naturally, ask about their tattoo vision
- Gather info piece by piece through conversation, don't list all questions at once
- Make them feel heard - respond to what they share before asking the next thing
- When you have enough info, confirm details and create the booking
- Don't be pushy - if they're just browsing, that's okay!

GUIDELINES:
- Keep responses conversational (2-4 sentences usually)
- Use emojis occasionally for warmth ✨🎨
- If unsure about something, say so honestly
- Never make up pricing beyond the $500 deposit
- Don't give medical advice`;

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
          { role: "system", content: systemPrompt },
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
        { role: "system", content: systemPrompt },
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
          { role: "system", content: systemPrompt },
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
