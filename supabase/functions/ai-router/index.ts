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
// PROVIDER IMPLEMENTATIONS
// =============================================================================

async function callGrok(
  messages: Array<{ role: string; content: string }>,
  imageUrl?: string,
  stream = false
): Promise<{ success: boolean; content: string; stream?: ReadableStream }> {
  const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
  if (!XAI_API_KEY) {
    return { success: false, content: "XAI_API_KEY not configured" };
  }

  try {
    const model = imageUrl ? "grok-2-vision-latest" : "grok-3-mini";
    
    const grokMessages = imageUrl 
      ? [
          { role: "system", content: "You are ETHEREAL, an elite AI concierge for Ferunda tattoo studio." },
          {
            role: "user",
            content: [
              { type: "text", text: messages[messages.length - 1]?.content || "Analyze this image" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ]
      : [
          { role: "system", content: "You are ETHEREAL, an elite AI concierge for Ferunda tattoo studio. Be warm, professional, and knowledgeable about tattoo art." },
          ...messages,
        ];

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: grokMessages,
        stream,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error(`[AI-Router] Grok error: ${response.status}`);
      return { success: false, content: `Grok API error: ${response.status}` };
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
    console.error("[AI-Router] Grok exception:", error);
    return { success: false, content: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function callLovableAI(
  messages: Array<{ role: string; content: string }>,
  stream = false
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
          { role: "system", content: "You are ETHEREAL, an elite AI concierge for Ferunda tattoo studio. Be warm, professional, and knowledgeable about tattoo art." },
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

async function routeRequest(request: AIRouterRequest): Promise<ProviderResult> {
  const { type, messages = [], imageUrl, stream = false } = request;
  
  console.log(`[AI-Router] Routing request: type=${type}, hasImage=${!!imageUrl}, stream=${stream}`);

  // Route based on request type
  switch (type) {
    case 'chat':
    case 'booking':
    case 'marketing':
    case 'finance':
    case 'ar': {
      // Try Grok first for chat/vision
      const grokResult = await callGrok(messages, imageUrl, stream);
      
      if (grokResult.success) {
        return {
          success: true,
          content: grokResult.content,
          provider: 'grok',
          fallbackUsed: false,
          data: grokResult.stream ? { stream: true } : undefined,
        };
      }

      // Fallback to Lovable AI
      console.log("[AI-Router] Grok failed, falling back to Lovable AI");
      const lovableResult = await callLovableAI(messages, stream);
      
      if (lovableResult.success) {
        return {
          success: true,
          content: lovableResult.content,
          provider: 'lovable-ai',
          fallbackUsed: true,
          data: lovableResult.stream ? { stream: true } : undefined,
        };
      }

      // All providers failed
      return {
        success: false,
        content: "All AI providers unavailable",
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

      const grokResult = await callGrok(messages, imageUrl, false);
      
      if (grokResult.success) {
        return {
          success: true,
          content: grokResult.content,
          provider: 'grok-vision',
          fallbackUsed: false,
        };
      }

      // Fallback: Use Lovable AI with text description request
      const fallbackMessages = [
        ...messages,
        { 
          role: "user", 
          content: `I'm sharing an image at this URL: ${imageUrl}. Please acknowledge that you cannot see the image directly but can help if I describe it.` 
        },
      ];
      
      const lovableResult = await callLovableAI(fallbackMessages, false);
      
      return {
        success: lovableResult.success,
        content: lovableResult.content,
        provider: lovableResult.success ? 'lovable-ai' : 'none',
        fallbackUsed: true,
        error: lovableResult.success ? undefined : lovableResult.content,
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
    const body = await req.json() as AIRouterRequest;
    const { type, messages, conversationId, fingerprint, workspaceId, stream } = body;

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

    // Return response
    if (stream && result.data?.stream) {
      // Handle streaming - not implemented in this simplified version
      // Would need to pass through the actual stream from the provider
    }

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
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
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
