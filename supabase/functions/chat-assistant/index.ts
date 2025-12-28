import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
};

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (identifier: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const maxRequests = 15; // 15 requests per minute
  
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

const systemPrompt = `You are Fernando's (Ferunda) virtual assistant on his tattoo portfolio website. Your role is to:

1. Welcome visitors warmly and help them learn about Fernando's artistry
2. Encourage visitors to book a session with a $500 deposit
3. Answer questions about the tattoo process and booking
4. Be knowledgeable, friendly, and reflect Fernando's artistic brand

Key information about Fernando (Ferunda):
- Based in Austin, Texas with regular guest spots in Los Angeles and Houston
- Specializes in realism, using references from books, paintings, and places he's visited
- Creates compositions with geometry, sacred geometry, and astronomical elements
- Every piece is 100% custom and unique - he doesn't copy or repeat tattoos
- Takes only ONE client per day for complete, undivided attention
- Can be reached via WhatsApp at +51952141416 or email at contact@ferunda.com
- Instagram: @ferunda

Booking process:
- First step: Pay a $500 deposit to secure the appointment at https://link.clover.com/urlshortener/nRLw66
- After booking, clients email references, meanings, symbols, placement photos
- Consultation can be phone or in person to discuss design details
- Design is revealed the day of the appointment
- Sessions are full-day experiences

Pricing:
- Session-based pricing (not per piece size)
- $500 deposit required, deducted from final session price
- One client per day ensures quality and focus

Guidelines:
- Keep responses concise (2-3 sentences max unless asked for details)
- Always encourage paying the deposit to secure their spot
- Mention the direct deposit link: https://link.clover.com/urlshortener/nRLw66
- Be warm, artistic, and professional
- Create urgency - limited spots available
- Use emojis sparingly to add personality ✨

DO NOT:
- Make up information you don't know
- Discuss other tattoo artists negatively
- Give medical advice
- Quote specific prices beyond the $500 deposit`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting based on IP or session
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const sessionId = req.headers.get("x-session-id") || clientIP;
  const rateCheck = checkRateLimit(sessionId);
  
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "You're sending messages too quickly. Please wait a moment and try again." }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60"
        } 
      }
    );
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm a bit busy right now. Please try again in a moment!" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "The assistant is temporarily unavailable. Please use the booking form or contact via WhatsApp." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Log only status code to avoid leaking sensitive info
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Something went wrong. Please try the booking form instead." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e instanceof Error ? e.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
