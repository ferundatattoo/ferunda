import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Provider {
  id: string;
  name: string;
  type: 'llm' | 'image' | 'embedding' | 'tts' | 'stt';
  priority: number;
  healthScore: number;
  latencyMs: number;
  costPerCall: number;
  isAvailable: boolean;
  lastChecked: string;
}

interface FallbackConfig {
  maxRetries: number;
  timeoutMs: number;
  gracefulDegradation: boolean;
  cacheEnabled: boolean;
  circuitBreakerThreshold: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();
    console.log(`[provider-fallback] Action: ${action}`, params);

    // Provider registry
    const providers: Provider[] = [
      { id: 'openai-gpt4', name: 'OpenAI GPT-4', type: 'llm', priority: 1, healthScore: 0.98, latencyMs: 450, costPerCall: 0.03, isAvailable: true, lastChecked: new Date().toISOString() },
      { id: 'anthropic-claude', name: 'Anthropic Claude', type: 'llm', priority: 2, healthScore: 0.97, latencyMs: 380, costPerCall: 0.025, isAvailable: true, lastChecked: new Date().toISOString() },
      { id: 'google-gemini', name: 'Google Gemini', type: 'llm', priority: 3, healthScore: 0.95, latencyMs: 320, costPerCall: 0.02, isAvailable: true, lastChecked: new Date().toISOString() },
      { id: 'openai-dalle', name: 'OpenAI DALL-E', type: 'image', priority: 1, healthScore: 0.96, latencyMs: 8000, costPerCall: 0.04, isAvailable: true, lastChecked: new Date().toISOString() },
      { id: 'stability-sdxl', name: 'Stability SDXL', type: 'image', priority: 2, healthScore: 0.94, latencyMs: 6000, costPerCall: 0.02, isAvailable: true, lastChecked: new Date().toISOString() },
      { id: 'flux-schnell', name: 'Flux Schnell', type: 'image', priority: 3, healthScore: 0.92, latencyMs: 3000, costPerCall: 0.01, isAvailable: true, lastChecked: new Date().toISOString() },
      { id: 'openai-embedding', name: 'OpenAI Embedding', type: 'embedding', priority: 1, healthScore: 0.99, latencyMs: 100, costPerCall: 0.0001, isAvailable: true, lastChecked: new Date().toISOString() },
      { id: 'elevenlabs', name: 'ElevenLabs', type: 'tts', priority: 1, healthScore: 0.95, latencyMs: 800, costPerCall: 0.005, isAvailable: true, lastChecked: new Date().toISOString() },
    ];

    switch (action) {
      case 'get_providers': {
        const { type } = params;
        
        const filtered = type 
          ? providers.filter(p => p.type === type)
          : providers;

        return new Response(JSON.stringify({
          success: true,
          providers: filtered.sort((a, b) => a.priority - b.priority),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'select_provider': {
        const { type, strategy = 'priority' } = params;

        const available = providers
          .filter(p => p.type === type && p.isAvailable && p.healthScore > 0.5);

        if (available.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No available providers for this type',
            fallbackMode: true,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let selected: Provider;

        switch (strategy) {
          case 'priority':
            selected = available.sort((a, b) => a.priority - b.priority)[0];
            break;
          case 'latency':
            selected = available.sort((a, b) => a.latencyMs - b.latencyMs)[0];
            break;
          case 'cost':
            selected = available.sort((a, b) => a.costPerCall - b.costPerCall)[0];
            break;
          case 'health':
            selected = available.sort((a, b) => b.healthScore - a.healthScore)[0];
            break;
          default:
            selected = available[0];
        }

        return new Response(JSON.stringify({
          success: true,
          provider: selected,
          alternatives: available.filter(p => p.id !== selected.id),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'execute_with_fallback': {
        const { type, payload, config } = params;

        const fallbackConfig: FallbackConfig = {
          maxRetries: config?.maxRetries || 3,
          timeoutMs: config?.timeoutMs || 30000,
          gracefulDegradation: config?.gracefulDegradation ?? true,
          cacheEnabled: config?.cacheEnabled ?? true,
          circuitBreakerThreshold: config?.circuitBreakerThreshold || 5,
        };

        const available = providers
          .filter(p => p.type === type && p.isAvailable)
          .sort((a, b) => a.priority - b.priority);

        const executionLog: Array<{ provider: string; status: string; latency: number }> = [];
        let result = null;

        for (const provider of available.slice(0, fallbackConfig.maxRetries)) {
          const startTime = Date.now();
          
          try {
            // Simulate provider call
            await new Promise(r => setTimeout(r, 100));
            
            // Mock success (in real impl, would call actual provider)
            result = {
              provider: provider.id,
              response: `Mock response from ${provider.name}`,
              cached: false,
            };

            executionLog.push({
              provider: provider.id,
              status: 'success',
              latency: Date.now() - startTime,
            });

            break;
          } catch (error) {
            executionLog.push({
              provider: provider.id,
              status: 'failed',
              latency: Date.now() - startTime,
            });

            // Update provider health
            provider.healthScore = Math.max(0.1, provider.healthScore - 0.1);
          }
        }

        if (!result && fallbackConfig.gracefulDegradation) {
          result = {
            provider: 'degraded',
            response: 'Fallback response - all providers unavailable',
            degraded: true,
          };
        }

        return new Response(JSON.stringify({
          success: !!result,
          result,
          executionLog,
          config: fallbackConfig,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'health_check': {
        const healthResults = await Promise.all(
          providers.map(async (provider) => {
            // Simulate health check
            const isHealthy = Math.random() > 0.05;
            const latency = Math.floor(100 + Math.random() * 500);

            return {
              providerId: provider.id,
              isHealthy,
              latency,
              timestamp: new Date().toISOString(),
            };
          })
        );

        // Update provider status
        for (const result of healthResults) {
          const provider = providers.find(p => p.id === result.providerId);
          if (provider) {
            provider.isAvailable = result.isHealthy;
            provider.latencyMs = result.latency;
            provider.lastChecked = result.timestamp;
          }
        }

        const healthyCount = healthResults.filter(r => r.isHealthy).length;

        return new Response(JSON.stringify({
          success: true,
          results: healthResults,
          summary: {
            total: providers.length,
            healthy: healthyCount,
            unhealthy: providers.length - healthyCount,
            avgLatency: Math.round(
              healthResults.reduce((sum, r) => sum + r.latency, 0) / healthResults.length
            ),
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_priority': {
        const { providerId, newPriority } = params;

        const provider = providers.find(p => p.id === providerId);
        if (provider) {
          provider.priority = newPriority;
        }

        return new Response(JSON.stringify({
          success: true,
          updated: !!provider,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_circuit_breaker_status': {
        // Circuit breaker status for each provider
        const circuitBreakers = providers.map(p => ({
          providerId: p.id,
          state: p.healthScore > 0.5 ? 'closed' : p.healthScore > 0.2 ? 'half-open' : 'open',
          failureCount: Math.floor((1 - p.healthScore) * 10),
          lastFailure: p.healthScore < 1 ? new Date().toISOString() : null,
          resetAfter: p.healthScore < 0.5 ? '30s' : null,
        }));

        return new Response(JSON.stringify({
          success: true,
          circuitBreakers,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[provider-fallback] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
