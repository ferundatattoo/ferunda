// =============================================================================
// AI ROUTER - Central Entry Point for All AI Requests
// Routes to appropriate providers with automatic fallback
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-fingerprint",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// =============================================================================
// TYPES
// =============================================================================

type AIRequestType = 
  | 'chat'           // General conversation
  | 'vision'         // Image analysis
  | 'booking'        // Booking flow (studio-concierge)
  | 'marketing'      // Marketing content generation
  | 'finance'        // Financial analysis
  | 'ar'             // AR/placement analysis
  | 'design'         // Design generation
  | 'voice';         // Voice synthesis (ElevenLabs)

interface AIRouterRequest {
  type: AIRequestType;
  messages?: Array<{ role: string; content: string }>;
  imageUrl?: string;
  referenceImages?: string[];
  conversationId?: string;
  fingerprint?: string;
  workspaceId?: string; // REQUIRED for new sessions
  stream?: boolean;
  language?: 'es' | 'en'; // User's detected language
  context?: Record<string, unknown>;
  // For specialized requests
  action?: string;
  payload?: Record<string, unknown>;
}

interface ProviderResult {
  success: boolean;
  content?: string;
  data?: Record<string, unknown>;
  provider: string;
  fallbackUsed: boolean;
  error?: string;
}

// =============================================================================
// AI ROLES DEFINITION
// =============================================================================
// Grok (XAI): Conversational chat + Vision - Primary for client interactions
// Lovable AI (Gemini): Primary fallback + Image generation
// ElevenLabs: Voice synthesis
// HuggingFace: Pose detection + Embeddings
// OpenAI: Secondary fallback
// Anthropic: Tertiary fallback

// =============================================================================
// SYSTEM PROMPTS (Language-aware)
// =============================================================================

function getSystemPrompt(language: 'es' | 'en' = 'en'): string {
  if (language === 'es') {
    return `Eres ETHEREAL, un asistente de élite para el estudio de tatuajes Ferunda.
Estilo: Micro-realismo geométrico, SOLO BLANCO Y NEGRO.
Tono: Cálido, profesional, eficiente.
SIEMPRE responde en ESPAÑOL.
Sé conciso (2-3 oraciones máximo).
Especialidad: Tatuajes geométricos, micro-realismo, black and grey.`;
  }
  return `You are ETHEREAL, an elite AI concierge for Ferunda tattoo studio.
Style: Geometric micro-realism, BLACK AND GREY ONLY.
Tone: Warm, professional, efficient.
ALWAYS respond in ENGLISH.
Be concise (2-3 sentences max).
Specialty: Geometric tattoos, micro-realism, black and grey.`;
}

function getVisionSystemPrompt(language: 'es' | 'en' = 'en'): string {
  if (language === 'es') {
    return `Eres ETHEREAL, asistente de élite para el estudio Ferunda. Analiza imágenes de tatuajes y referencias. Responde SIEMPRE en ESPAÑOL. Sé conciso.`;
  }
  return `You are ETHEREAL, elite assistant for Ferunda studio. Analyze tattoo images and references. ALWAYS respond in ENGLISH. Be concise.`;
}

// =============================================================================
// PROVIDER IMPLEMENTATIONS
// =============================================================================

// Valid Grok models - V4 safe vivo
const VALID_GROK_MODELS = ['grok-4', 'grok-beta', 'grok-2-vision-1212', 'grok-2-1212'];

async function callGrok(
  messages: Array<{ role: string; content: string }>,
  imageUrl?: string,
  stream = false,
  language: 'es' | 'en' = 'en'
): Promise<{ success: boolean; content: string; stream?: ReadableStream }> {
  const rawXaiKey = Deno.env.get("XAI_API_KEY");
  
  // Clean API key - remove non-ASCII characters, quotes, whitespace
  const XAI_API_KEY = rawXaiKey 
    ? rawXaiKey.replace(/[^\x00-\x7F]/g, '').replace(/['"]/g, '').trim() 
    : null;
  
  console.log(`[AI-Router] 🔑 XAI_API_KEY check: exists=${!!rawXaiKey}, cleaned=${!!XAI_API_KEY}, length=${XAI_API_KEY?.length || 0}`);
  
  if (!XAI_API_KEY || XAI_API_KEY.length < 20) {
    console.error("[AI-Router] ❌ XAI_API_KEY not configured or too short");
    return { success: false, content: "XAI_API_KEY not configured" };
  }

  // Use grok-4 as primary, grok-beta as fallback
  const models = imageUrl
    ? ["grok-2-vision-1212"]
    : ["grok-4", "grok-beta"];

  for (const model of models) {
    try {
      console.log(`[AI-Router] 🚀 Trying Grok model: ${model}, hasImage=${!!imageUrl}, stream=${stream}`);
      
      const grokMessages = imageUrl 
        ? [
            { role: "system", content: getVisionSystemPrompt(language) },
            {
              role: "user",
              content: [
                { type: "text", text: messages[messages.length - 1]?.content || "Analyze this image" },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ]
        : [
            { role: "system", content: getSystemPrompt(language) },
            ...messages,
          ];

       // Build a minimal, Grok-compatible body (safe vivo)
       // Per xAI expectations: {"model":"grok-4","messages":[...]} (plus stream when requested)
       const requestBody: Record<string, unknown> = {
         model,
         messages: grokMessages,
       };
       if (stream) requestBody.stream = true;

       console.log(`[AI-Router] 📤 Full request body (${model}):`, JSON.stringify(requestBody));

       // Add timeout with AbortController
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

       const response = await fetch("https://api.x.ai/v1/chat/completions", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${XAI_API_KEY}`,
         },
         body: JSON.stringify(requestBody),
         signal: controller.signal,
       });

      clearTimeout(timeoutId);

      console.log(`[AI-Router] 📥 Grok response: status=${response.status}, model=${model}`);

       if (!response.ok) {
         const errorText = await response.text();
         console.error(`[AI-Router] ❌ Grok API non-2xx (${model})`, {
           status: response.status,
           statusText: response.statusText,
           responseHeaders: Object.fromEntries(response.headers.entries()),
           responseBody: errorText,
         });

         // If it's a model error, try next model
         if (response.status === 400 || response.status === 404) {
           console.log(`[AI-Router] ⚠️ Model ${model} not available/invalid request, trying next...`);
           continue;
         }

         // Rate limit or auth error - don't retry, but stay friendly
         if (response.status === 429 || response.status === 401 || response.status === 403) {
           return { success: false, content: "Try Again" };
         }

         continue; // Try next model
       }

      if (stream) {
        console.log(`[AI-Router] ✅ Grok stream started (${model})`);
        return { success: true, content: "", stream: response.body || undefined };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      console.log(`[AI-Router] ✅ Grok success (${model}): ${content.length} chars`);
      
      if (!content) {
        console.warn(`[AI-Router] ⚠️ Empty response from ${model}`, { data });
        continue; // Try next model
      }
      
      return { success: true, content };
      
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      console.error(`[AI-Router] ❌ Grok exception (${model}):`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        isTimeout,
      });
      
      if (isTimeout) {
        console.log(`[AI-Router] ⏱️ Timeout on ${model}, trying next...`);
        continue;
      }
      
      // Network error - try next model
      continue;
    }
  }
  
  // All models failed
  console.error("[AI-Router] ❌ All Grok models failed");
  return { success: false, content: "Grok unavailable - Try again" };
}

async function callLovableAI(
  messages: Array<{ role: string; content: string }>,
  stream = false,
  language: 'es' | 'en' = 'en'
): Promise<{ success: boolean; content: string; stream?: ReadableStream }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { success: false, content: "LOVABLE_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: getSystemPrompt(language) },
          ...messages,
        ],
        stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI-Router] Lovable AI error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return { success: false, content: "Rate limit exceeded" };
      }
      if (response.status === 402) {
        return { success: false, content: "Payment required" };
      }
      
      return { success: false, content: `Lovable AI error: ${response.status}` };
    }

    if (stream) {
      return { success: true, content: "", stream: response.body || undefined };
    }

    const data = await response.json();
    return { 
      success: true, 
      content: data.choices?.[0]?.message?.content || "" 
    };
  } catch (error) {
    console.error("[AI-Router] Lovable AI exception:", error);
    return { success: false, content: error instanceof Error ? error.message : "Unknown error" };
  }
}

// =============================================================================
// ROUTING LOGIC
// =============================================================================

async function routeRequest(request: AIRouterRequest): Promise<ProviderResult & { stream?: ReadableStream }> {
  const { type, messages = [], imageUrl, stream = false, language = 'en' } = request;
  
  console.log(`[AI-Router Vivo] 🚀 Routing: type=${type}, hasImage=${!!imageUrl}, stream=${stream}, lang=${language}`);

  // Route based on request type
  switch (type) {
    case 'chat':
    case 'booking':
    case 'marketing':
    case 'finance':
    case 'ar': {
      // 🔥 GROK CORE VIVO: Try Grok first for ALL chat/vision
      console.log(`[AI-Router Vivo] 🧠 Calling Grok (primary)...`);
      const grokResult = await callGrok(messages, imageUrl, stream, language);
      
      if (grokResult.success) {
        console.log(`[AI-Router Vivo] ✅ Grok success`);
        return {
          success: true,
          content: grokResult.content,
          provider: 'grok',
          fallbackUsed: false,
          stream: grokResult.stream,
          data: grokResult.stream ? { stream: true } : undefined,
        };
      }

      // Fallback to Lovable AI (preserve old AI - safe vivo)
      console.log("[AI-Router Vivo] ⚠️ Grok failed, falling back to Lovable AI");
      const lovableResult = await callLovableAI(messages, stream, language);
      
      if (lovableResult.success) {
        console.log(`[AI-Router Vivo] ✅ Lovable AI fallback success`);
        return {
          success: true,
          content: lovableResult.content,
          provider: 'lovable-ai',
          fallbackUsed: true,
          stream: lovableResult.stream,
          data: lovableResult.stream ? { stream: true } : undefined,
        };
      }

      // All providers failed - return friendly message
      console.log(`[AI-Router Vivo] ❌ All providers failed`);
      return {
        success: false,
        content: language === 'es' 
          ? "Los servicios AI están ocupados. Intenta de nuevo en un momento."
          : "AI services are busy. Please try again in a moment.",
        provider: 'none',
        fallbackUsed: true,
        error: lovableResult.content,
      };
    }

    case 'vision': {
      // Vision specifically needs Grok with image support
      if (!imageUrl) {
        return {
          success: false,
          content: "Vision request requires imageUrl",
          provider: 'none',
          fallbackUsed: false,
          error: "Missing imageUrl",
        };
      }

      console.log(`[AI-Router] 📸 Vision request: imageUrl=${imageUrl.substring(0, 50)}...`);

      // Build vision-specific prompt in user's language
      const visionPrompt = language === 'es'
        ? `Analiza esta imagen de tatuaje o referencia. Describe:
1. Estilo detectado (blackwork, fine-line, neo-traditional, etc.)
2. Elementos principales (flores, calaveras, animales, geometría)
3. Nivel de complejidad (simple, moderado, complejo)
4. Sugerencias de ubicación corporal
5. Tiempo estimado de sesión

Sé breve y útil para el cliente.`
        : `Analyze this tattoo or reference image. Describe:
1. Detected style (blackwork, fine-line, neo-traditional, etc.)
2. Main elements (flowers, skulls, animals, geometry)
3. Complexity level (simple, moderate, complex)
4. Suggested body placement
5. Estimated session time

Be concise and helpful for the client.`;

      const visionMessages = [
        { role: 'user', content: visionPrompt }
      ];

      const grokResult = await callGrok(visionMessages, imageUrl, false, language);
      
      if (grokResult.success && grokResult.content) {
        console.log(`[AI-Router] ✅ Vision analysis complete: ${grokResult.content.length} chars`);
        
        // Format response with visual indicator
        const formattedContent = language === 'es'
          ? `🔍 **Ethereal analizó tu imagen:**\n\n${grokResult.content}`
          : `🔍 **Ethereal analyzed your image:**\n\n${grokResult.content}`;
        
        return {
          success: true,
          content: formattedContent,
          provider: 'grok-vision',
          fallbackUsed: false,
        };
      }

      console.log(`[AI-Router] ⚠️ Grok vision failed, using fallback`);

      // Fallback: Use Lovable AI with descriptive request
      const fallbackMessage = language === 'es' 
        ? `Recibí una imagen de referencia de tatuaje. Aunque no puedo verla directamente, puedo ayudar si el cliente la describe. Por favor, pregúntale qué muestra la imagen.`
        : `I received a tattoo reference image. Although I cannot see it directly, I can help if the client describes it. Please ask them what the image shows.`;
      
      const fallbackResponse = language === 'es'
        ? `📷 **Imagen recibida** – Por favor, describe lo que muestra tu referencia para que pueda ayudarte mejor con el diseño.`
        : `📷 **Image received** – Please describe what your reference shows so I can better help you with the design.`;
      
      return {
        success: true,
        content: fallbackResponse,
        provider: 'fallback',
        fallbackUsed: true,
      };
    }

    case 'voice': {
      // ElevenLabs - no fallback for voice
      return {
        success: false,
        content: "Voice synthesis routed to elevenlabs-voice function",
        provider: 'elevenlabs',
        fallbackUsed: false,
        error: "Use elevenlabs-voice function directly",
      };
    }

    case 'design': {
      // Design generation - route to design-orchestrator
      return {
        success: false,
        content: "Design generation routed to design-orchestrator function",
        provider: 'design-orchestrator',
        fallbackUsed: false,
        error: "Use design-orchestrator function directly",
      };
    }

    default: {
      // Unknown type - try chat flow
      console.log(`[AI-Router] Unknown type '${type}', using chat flow`);
      return routeRequest({ ...request, type: 'chat' });
    }
  }
}

// =============================================================================
// CONVERSATION PERSISTENCE
// =============================================================================

async function saveMessage(
  supabase: any,
  sessionId: string,
  sender: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('concierge_messages').insert({
      session_id: sessionId,
      sender,
      content,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error("[AI-Router] Failed to save message:", error);
  }
}

async function ensureSession(
  supabase: any,
  fingerprint: string,
  conversationId?: string,
  workspaceId?: string
): Promise<string> {
  if (conversationId) {
    // Verify session exists
    const { data } = await supabase
      .from('concierge_sessions')
      .select('id')
      .eq('id', conversationId)
      .single();
    
    if (data) return conversationId;
  }

  // Create new session - ALWAYS include workspace_id
  // Use provided workspace_id or fallback to default studio
  const defaultWorkspaceId = '4c4452fc-77f8-4f42-a96c-d0e0c28901fd';
  const { data: newSession, error } = await supabase
    .from('concierge_sessions')
    .insert({
      workspace_id: workspaceId || defaultWorkspaceId,
      stage: 'discovery',
      message_count: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error("[AI-Router] Failed to create session:", error);
    return crypto.randomUUID();
  }

  return newSession.id;
}

// =============================================================================
// STREAMING HANDLER
// =============================================================================

function createStreamingResponse(stream: ReadableStream, provider: string): Response {
  const encoder = new TextEncoder();
  
  const transformedStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, provider })}\n\n`));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error) {
        console.error("[AI-Router] Stream error:", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(transformedStream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    
    // Handle health check requests
    if (body.healthCheck) {
      console.log("[AI-Router] Health check received");
      return new Response(
        JSON.stringify({ status: "ok", timestamp: Date.now() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { type, messages, conversationId, fingerprint, workspaceId, stream } = body as AIRouterRequest;

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Request type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Ensure session exists for persistence (include workspace_id)
    const sessionId = await ensureSession(supabase, fingerprint || "anonymous", conversationId, workspaceId);

    // Save user message if present
    if (messages?.length) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMsg) {
        await saveMessage(supabase, sessionId, 'user', lastUserMsg.content);
      }
    }

    // Route the request
    const result = await routeRequest(body);

    // Save assistant response
    if (result.success && result.content && !stream) {
      await saveMessage(supabase, sessionId, 'assistant', result.content, {
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        latencyMs: Date.now() - startTime,
      });
    }

    // Log AI run metrics
    try {
      await supabase.from('ai_runs').insert({
        task_type: type,
        provider: result.provider,
        success: result.success,
        latency_ms: Date.now() - startTime,
        session_id: sessionId,
      });
    } catch (logErr) {
      console.error("[AI-Router] Failed to log run:", logErr);
    }

    // 🔥 STREAMING FIX VIVO: Pass through actual stream from provider
    if (stream && (result as any).stream) {
      console.log(`[AI-Router Vivo] 📡 Returning stream from ${result.provider}`);
      return createStreamingResponse((result as any).stream, result.provider);
    }

    // Non-streaming response
    return new Response(
      JSON.stringify({
        success: result.success,
        content: result.content,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        sessionId,
        latencyMs: Date.now() - startTime,
        ...(result.error && { error: result.error }),
      }),
      {
        // Always return 200 for provider failures (client handles success flag)
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[AI-Router] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
        provider: "none",
        fallbackUsed: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
