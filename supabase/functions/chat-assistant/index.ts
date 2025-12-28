import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are Fernando's (Ferunda) virtual assistant on his tattoo portfolio website. Your role is to:

1. Welcome visitors warmly and help them learn about Fernando's artistry
2. Encourage visitors to book a consultation for their tattoo ideas
3. Answer questions about the tattoo process, pricing, and booking
4. Be knowledgeable, friendly, and reflect Fernando's artistic brand

Key information about Fernando (Ferunda):
- Based in Los Angeles
- Specializes in fine line, geometric, and blackwork tattoos
- Known for creating meaningful, personalized designs
- Offers free consultations to discuss tattoo ideas
- Can be reached via WhatsApp at +51952141416 or email at contact@ferunda.com
- Instagram: @ferunda

Booking process:
- Visitors can fill out the booking form on the website
- They'll receive a response within 48 hours
- Consultations are free and help Fernando understand the vision
- Pricing depends on size, complexity, and placement

Guidelines:
- Keep responses concise (2-3 sentences max unless asked for details)
- Always encourage booking a consultation when appropriate
- Be warm, artistic, and professional
- If someone seems ready to book, mention they can click the "Book Consultation" button
- Use emojis sparingly to add personality ✨

DO NOT:
- Make up information you don't know
- Discuss other tattoo artists negatively
- Give medical advice`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Something went wrong. Please try the booking form instead." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
