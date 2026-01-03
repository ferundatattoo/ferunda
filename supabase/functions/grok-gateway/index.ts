import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// LANGUAGE DETECTION - Neutral (no priority)
// ============================================================================

function detectLanguage(text: string): "en" | "es" {
  const spanishPatterns = [
    /\b(hola|quiero|tengo|necesito|puedo|cómo|cuánto|dónde|cuándo|porque|gracias|por favor)\b/i,
    /[áéíóúñ¿¡ü]/,
    /\b(tatuaje|diseño|cita|precio|artista|estudio)\b/i,
  ];
  
  const isSpanish = spanishPatterns.some(p => p.test(text));
  return isSpanish ? "es" : "en";
}

// ============================================================================
// SYSTEM PROMPTS BY LANGUAGE
// ============================================================================

const SYSTEM_PROMPTS = {
  en: `You are ETHEREAL, an elite AI concierge for Ferunda tattoo studio. You are sophisticated, knowledgeable, and speak with artistic authority. You help clients with:
- Understanding tattoo styles and techniques
- Planning their tattoo journey
- Answering questions about the process, healing, and care
- Booking consultations and sessions

Be warm but professional. Use your deep knowledge of tattoo art to provide excellent guidance. Keep responses concise but informative.`,

  es: `Eres ETHEREAL, un concierge AI de élite para el estudio de tatuajes Ferunda. Eres sofisticado, conocedor y hablas con autoridad artística. Ayudas a los clientes con:
- Entender estilos y técnicas de tatuaje
- Planificar su viaje de tatuaje
- Responder preguntas sobre el proceso, cicatrización y cuidado
- Reservar consultas y sesiones

Sé cálido pero profesional. Usa tu profundo conocimiento del arte del tatuaje para proporcionar excelente guía. Mantén las respuestas concisas pero informativas.`
};

// ============================================================================
// GROK API CALL
// ============================================================================

interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface GrokRequest {
  messages: Array<{ role: string; content: string }>;
  imageUrl?: string;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

async function callGrokAPI(
  messages: GrokMessage[],
  options: {
    model?: string;
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<Response> {
  const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
  if (!XAI_API_KEY) {
    throw new Error("XAI_API_KEY not configured");
  }

  const model = options.model || "grok-3-mini";
  const stream = options.stream ?? true;
  const maxTokens = options.maxTokens || 2048;
  const temperature = options.temperature ?? 0.7;

  console.log(`[Grok Gateway] Calling ${model}, stream=${stream}, messages=${messages.length}`);

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Grok Gateway] API error: ${response.status}`, errorText);
    throw new Error(`Grok API error: ${response.status}`);
  }

  return response;
}

// ============================================================================
// VISION ANALYSIS
// ============================================================================

async function analyzeWithVision(
  imageUrl: string,
  prompt: string,
  language: "en" | "es"
): Promise<string> {
  const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
  if (!XAI_API_KEY) {
    throw new Error("XAI_API_KEY not configured");
  }

  const systemPrompt = language === "es" 
    ? "Eres un experto analista de imágenes de tatuajes. Analiza la imagen proporcionada y responde en español."
    : "You are an expert tattoo image analyst. Analyze the provided image and respond in English.";

  console.log(`[Grok Gateway] Vision analysis for image, lang=${language}`);

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-2-vision-latest",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Grok Gateway] Vision API error: ${response.status}`, errorText);
    throw new Error(`Grok Vision API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ============================================================================
// STREAMING HANDLER
// ============================================================================

function createStreamingResponse(grokResponse: Response): Response {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const reader = grokResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

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
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error) {
        console.error("[Grok Gateway] Stream error:", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as GrokRequest;
    const { messages, imageUrl, stream = true, maxTokens, temperature } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect language from last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    const detectedLanguage = lastUserMessage 
      ? detectLanguage(lastUserMessage.content)
      : "en";

    console.log(`[Grok Gateway] Detected language: ${detectedLanguage}`);

    // Handle vision request
    if (imageUrl) {
      const prompt = lastUserMessage?.content || (detectedLanguage === "es" 
        ? "Analiza esta imagen de tatuaje"
        : "Analyze this tattoo image");
      
      const analysis = await analyzeWithVision(imageUrl, prompt, detectedLanguage);
      
      return new Response(
        JSON.stringify({ content: analysis, language: detectedLanguage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages with system prompt
    const grokMessages: GrokMessage[] = [
      { role: "system", content: SYSTEM_PROMPTS[detectedLanguage] },
      ...messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Call Grok API
    const grokResponse = await callGrokAPI(grokMessages, {
      stream,
      maxTokens,
      temperature,
    });

    // Return streaming or JSON response
    if (stream) {
      return createStreamingResponse(grokResponse);
    }

    const data = await grokResponse.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content, language: detectedLanguage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Grok Gateway] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal error",
        fallback: true 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
