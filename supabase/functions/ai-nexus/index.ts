// ============================================================================
// AI-NEXUS - Hub Central de Inteligencia Artificial Ferunda
// Punto ÚNICO de entrada para TODAS las operaciones de IA
// Circuit breaker, fallback automático, logging centralizado
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface AIRole {
  task_type: string;
  primary_provider: string;
  fallback_provider: string | null;
  model_config: Record<string, any>;
  is_active: boolean;
}

interface AIRequest {
  taskType: 'conversation' | 'vision' | 'generation' | 'embedding' | 'tts' | 'marketing';
  messages?: { role: string; content: string }[];
  prompt?: string;
  imageUrl?: string;
  language?: 'es' | 'en';
  sessionId?: string;
  stream?: boolean;
  correlationId?: string;
}

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

const circuitBreakers: Map<string, CircuitState> = new Map();
const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 30000;

function getCircuitState(provider: string): CircuitState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return circuitBreakers.get(provider)!;
}

function recordFailure(provider: string): void {
  const state = getCircuitState(provider);
  state.failures += 1;
  state.lastFailure = Date.now();
  
  if (state.failures >= CIRCUIT_THRESHOLD) {
    state.isOpen = true;
    console.log(`[Circuit] 🔴 Circuit OPEN for ${provider} (${state.failures} failures)`);
  }
}

function recordSuccess(provider: string): void {
  const state = getCircuitState(provider);
  state.failures = 0;
  state.isOpen = false;
}

function isCircuitOpen(provider: string): boolean {
  const state = getCircuitState(provider);
  
  // Auto-reset after timeout
  if (state.isOpen && Date.now() - state.lastFailure > CIRCUIT_RESET_MS) {
    console.log(`[Circuit] 🟢 Circuit RESET for ${provider}`);
    state.isOpen = false;
    state.failures = 0;
  }
  
  return state.isOpen;
}

// ============================================================================
// AI PROVIDERS
// ============================================================================

async function callGrok(
  messages: { role: string; content: string }[],
  config: Record<string, any>,
  imageUrl?: string
): Promise<{ content: string; tokensUsed: number }> {
  const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
  if (!XAI_API_KEY) throw new Error('XAI_API_KEY not configured');

  const model = imageUrl ? 'grok-2-vision-1212' : (config.model || 'grok-3-fast');
  
  const formattedMessages = messages.map(m => {
    if (m.role === 'user' && imageUrl) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      };
    }
    return m;
  });

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      max_tokens: config.max_tokens || 1024,
      temperature: config.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;

  return { content, tokensUsed };
}

async function callLovableAI(
  messages: { role: string; content: string }[],
  config: Record<string, any>,
  imageUrl?: string
): Promise<{ content: string; tokensUsed: number }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const model = config.model || 'google/gemini-2.5-flash';
  
  // Format messages for Lovable AI
  const formattedMessages = messages.map(m => {
    if (m.role === 'user' && imageUrl) {
      return {
        role: m.role,
        content: [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      };
    }
    return m;
  });

  const response = await fetch('https://ai.lovable.dev/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      max_tokens: config.max_tokens || 1024,
      temperature: config.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;

  return { content, tokensUsed };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: AIRequest = await req.json();
    const { 
      taskType = 'conversation', 
      messages = [], 
      prompt, 
      imageUrl, 
      language = 'en',
      sessionId,
      correlationId,
    } = body;

    console.log(`[AI-Nexus] 🚀 Request: ${taskType}, session: ${sessionId}, hasImage: ${!!imageUrl}`);

    // Load AI role configuration
    const { data: roleData } = await supabase
      .from('ai_provider_roles')
      .select('*')
      .eq('task_type', taskType)
      .eq('is_active', true)
      .single();

    const role: AIRole = roleData || {
      task_type: taskType,
      primary_provider: 'lovable-ai',
      fallback_provider: null,
      model_config: { max_tokens: 1024, temperature: 0.7 },
      is_active: true,
    };

    console.log(`[AI-Nexus] 📋 Role loaded: primary=${role.primary_provider}, fallback=${role.fallback_provider}`);

    // Prepare messages
    const finalMessages = messages.length > 0 
      ? messages 
      : [{ role: 'user', content: prompt || '' }];

    let content = '';
    let tokensUsed = 0;
    let providerUsed = role.primary_provider;
    let success = true;
    let errorMessage: string | null = null;

    // Try primary provider
    if (!isCircuitOpen(role.primary_provider)) {
      try {
        console.log(`[AI-Nexus] 🎯 Trying primary: ${role.primary_provider}`);
        
        if (role.primary_provider === 'grok') {
          const result = await callGrok(finalMessages, role.model_config, imageUrl);
          content = result.content;
          tokensUsed = result.tokensUsed;
        } else if (role.primary_provider === 'lovable-ai') {
          const result = await callLovableAI(finalMessages, role.model_config, imageUrl);
          content = result.content;
          tokensUsed = result.tokensUsed;
        }

        recordSuccess(role.primary_provider);
        console.log(`[AI-Nexus] ✅ Primary success: ${tokensUsed} tokens`);
      } catch (err) {
        console.error(`[AI-Nexus] ❌ Primary failed:`, err);
        recordFailure(role.primary_provider);
        errorMessage = err instanceof Error ? err.message : String(err);
      }
    } else {
      console.log(`[AI-Nexus] ⚠️ Primary circuit OPEN, skipping`);
    }

    // Try fallback if primary failed
    if (!content && role.fallback_provider && !isCircuitOpen(role.fallback_provider)) {
      try {
        console.log(`[AI-Nexus] 🔄 Trying fallback: ${role.fallback_provider}`);
        providerUsed = role.fallback_provider;
        
        if (role.fallback_provider === 'grok') {
          const result = await callGrok(finalMessages, role.model_config, imageUrl);
          content = result.content;
          tokensUsed = result.tokensUsed;
        } else if (role.fallback_provider === 'lovable-ai') {
          const result = await callLovableAI(finalMessages, role.model_config, imageUrl);
          content = result.content;
          tokensUsed = result.tokensUsed;
        }

        recordSuccess(role.fallback_provider);
        console.log(`[AI-Nexus] ✅ Fallback success: ${tokensUsed} tokens`);
        errorMessage = null;
      } catch (err) {
        console.error(`[AI-Nexus] ❌ Fallback failed:`, err);
        recordFailure(role.fallback_provider);
        success = false;
        errorMessage = err instanceof Error ? err.message : String(err);
      }
    }

    // If still no content, return error
    if (!content) {
      success = false;
      content = language === 'es' 
        ? 'Lo siento, el servicio está temporalmente lento. Por favor intenta de nuevo.'
        : 'Sorry, the service is temporarily slow. Please try again.';
    }

    const durationMs = Date.now() - startTime;

    // Log usage to ai_usage_logs
    try {
      await supabase.from('ai_usage_logs').insert({
        provider: providerUsed,
        model: role.model_config.model || 'default',
        task_type: taskType,
        tokens_input: Math.floor(tokensUsed * 0.7), // Estimate
        tokens_output: Math.floor(tokensUsed * 0.3),
        duration_ms: durationMs,
        success,
        error_message: errorMessage,
        session_id: sessionId,
        correlation_id: correlationId,
        metadata: { language, hasImage: !!imageUrl },
      });
    } catch (logErr) {
      console.warn('[AI-Nexus] Failed to log usage:', logErr);
    }

    // Publish to Core Bus
    try {
      const channel = supabase.channel('ferunda-core-bus');
      await channel.send({
        type: 'broadcast',
        event: 'core_event',
        payload: {
          type: 'bus:ai_response',
          data: {
            taskType,
            provider: providerUsed,
            success,
            tokensUsed,
            durationMs,
            sessionId,
          },
          source: 'edge-function',
          correlationId,
          timestamp: new Date().toISOString(),
        },
      });
      await supabase.removeChannel(channel);
    } catch (busErr) {
      console.warn('[AI-Nexus] Failed to publish to Core Bus:', busErr);
    }

    console.log(`[AI-Nexus] 🏁 Complete: ${durationMs}ms, provider=${providerUsed}, success=${success}`);

    return new Response(
      JSON.stringify({
        content,
        provider: providerUsed,
        tokensUsed,
        durationMs,
        success,
        taskType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[AI-Nexus] ❌ Fatal error:', err);
    
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
        content: 'Service temporarily unavailable',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
