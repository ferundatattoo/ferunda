import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShadowEvaluationRequest {
  action: 'evaluate' | 'compare' | 'promote';
  conversation_id?: string;
  message_content?: string;
  human_persona?: string;
  context?: Record<string, unknown>;
  decision_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, conversation_id, message_content, human_persona, context, decision_id } = 
      await req.json() as ShadowEvaluationRequest;

    switch (action) {
      case 'evaluate': {
        // Run shadow evaluation without sending
        const routerDecision = await runRouterEvaluation(context || {});
        
        // Calculate predicted outcome delta
        const outcomeDelta = calculateOutcomeDelta(
          human_persona || 'unknown',
          routerDecision.persona,
          context || {}
        );

        // Store shadow decision
        const { data: shadowDecision, error } = await supabase
          .from('shadow_decisions')
          .insert([{
            conversation_id,
            human_persona_used: human_persona,
            router_persona_suggested: routerDecision.persona,
            diff_summary: {
              tone_difference: routerDecision.tone !== human_persona ? 
                `${human_persona} → ${routerDecision.tone}` : null,
              key_divergence: routerDecision.divergence_reason,
            },
            predicted_outcome_delta: outcomeDelta,
            confidence: routerDecision.confidence,
          }])
          .select()
          .single();

        if (error) throw error;

        // Store explanation
        await supabase
          .from('decision_explanations')
          .insert([{
            conversation_id,
            decision_type: 'shadow_evaluation',
            persona_chosen: routerDecision.persona,
            top_signals: routerDecision.signals,
            confidence: routerDecision.confidence,
            fallback_used: routerDecision.fallback_used,
            processing_time_ms: routerDecision.processing_time,
          }]);

        // Check deployment gates
        await checkDeploymentGates(supabase, outcomeDelta);

        return new Response(
          JSON.stringify({
            success: true,
            shadow_decision: shadowDecision,
            router_suggestion: routerDecision.persona,
            would_improve: outcomeDelta > 0,
            confidence: routerDecision.confidence,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'compare': {
        // Get recent shadow decisions for comparison
        const { data: decisions, error } = await supabase
          .from('shadow_decisions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const improvements = decisions?.filter(d => d.predicted_outcome_delta > 0.1) || [];
        const dangerous = decisions?.filter(d => d.predicted_outcome_delta < -0.1) || [];
        const divergences = decisions?.filter(d => 
          d.human_persona_used !== d.router_persona_suggested
        ) || [];

        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              total: decisions?.length || 0,
              improvements: improvements.length,
              dangerous: dangerous.length,
              divergences: divergences.length,
              avg_delta: decisions?.reduce((acc, d) => 
                acc + (d.predicted_outcome_delta || 0), 0
              ) / (decisions?.length || 1),
            },
            top_improvements: improvements.slice(0, 5),
            dangerous_cases: dangerous.slice(0, 5),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'promote': {
        // Promote a shadow decision to limited rollout
        if (!decision_id) throw new Error('decision_id required');

        const { data: decision, error: fetchError } = await supabase
          .from('shadow_decisions')
          .select('*')
          .eq('id', decision_id)
          .single();

        if (fetchError) throw fetchError;

        // Create or update deployment gate for this persona
        await supabase
          .from('deployment_gates')
          .upsert([{
            gate_name: `persona_${decision.router_persona_suggested}_rollout`,
            gate_conditions: {
              rollout_percentage: 10,
              promoted_from_shadow: decision_id,
              promoted_at: new Date().toISOString(),
            },
            status: 'active',
          }]);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Promoted to 10% rollout for ${decision.router_persona_suggested}`,
            decision,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error("Shadow evaluator error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simulated router evaluation (would use actual ML model)
function runRouterEvaluation(context: Record<string, unknown>) {
  const startTime = Date.now();
  
  // Extract signals from context
  const signals = [];
  
  if (context.intent) {
    signals.push({ signal: 'intent', weight: 0.35, value: context.intent });
  }
  if (context.stage) {
    signals.push({ signal: 'stage', weight: 0.25, value: context.stage });
  }
  if (context.sentiment) {
    signals.push({ signal: 'sentiment', weight: 0.20, value: context.sentiment });
  }
  if (context.risk_level) {
    signals.push({ signal: 'risk', weight: 0.20, value: context.risk_level });
  }

  // Simple persona selection logic (placeholder for ML model)
  let persona = 'studio';
  let confidence = 0.75;
  
  if (context.intent === 'pricing' || context.intent === 'booking') {
    persona = 'concierge';
    confidence = 0.85;
  } else if (context.intent === 'design' || context.intent === 'style') {
    persona = 'artist';
    confidence = 0.80;
  } else if (context.stage === 'intake') {
    persona = 'studio';
    confidence = 0.70;
  }

  const processingTime = Date.now() - startTime;

  return {
    persona,
    tone: persona,
    confidence,
    signals,
    divergence_reason: signals.length > 0 ? 
      `Primary signal: ${signals[0]?.signal}=${signals[0]?.value}` : null,
    fallback_used: signals.length === 0,
    processing_time: processingTime,
  };
}

// Calculate expected outcome difference
function calculateOutcomeDelta(
  humanPersona: string, 
  routerPersona: string,
  context: Record<string, unknown>
): number {
  if (humanPersona === routerPersona) return 0;

  // Simplified delta calculation (would use historical data)
  const personaScores: Record<string, Record<string, number>> = {
    'pricing': { concierge: 0.85, studio: 0.70, artist: 0.60 },
    'design': { artist: 0.90, hybrid: 0.75, studio: 0.60 },
    'booking': { concierge: 0.88, studio: 0.75, artist: 0.65 },
    'intake': { studio: 0.80, concierge: 0.75, artist: 0.70 },
  };

  const intent = String(context.intent || 'intake');
  const scores = personaScores[intent] || personaScores['intake'];
  
  const humanScore = scores[humanPersona] || 0.70;
  const routerScore = scores[routerPersona] || 0.70;

  return routerScore - humanScore;
}

// Check and update deployment gates
async function checkDeploymentGates(supabase: any, outcomeDelta: number) {
  if (outcomeDelta < -0.15) {
    // Potential policy violation - increment counter
    await supabase
      .from('deployment_gates')
      .update({ 
        current_violations: supabase.raw('current_violations + 1'),
        last_evaluated_at: new Date().toISOString(),
      })
      .eq('status', 'active');
  }
}
