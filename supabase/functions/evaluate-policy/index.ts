import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// JSONLogic-like evaluation (simplified for common patterns)
function evaluateCondition(condition: any, context: any): boolean {
  if (!condition || typeof condition !== 'object') {
    return false;
  }

  // Handle operators
  const operator = Object.keys(condition)[0];
  const operands = condition[operator];

  switch (operator) {
    case "==":
    case "===": {
      const [left, right] = operands.map((op: any) => resolveValue(op, context));
      return left === right;
    }
    
    case "!=":
    case "!==": {
      const [left, right] = operands.map((op: any) => resolveValue(op, context));
      return left !== right;
    }
    
    case ">": {
      const [left, right] = operands.map((op: any) => resolveValue(op, context));
      return left > right;
    }
    
    case ">=": {
      const [left, right] = operands.map((op: any) => resolveValue(op, context));
      return left >= right;
    }
    
    case "<": {
      const [left, right] = operands.map((op: any) => resolveValue(op, context));
      return left < right;
    }
    
    case "<=": {
      const [left, right] = operands.map((op: any) => resolveValue(op, context));
      return left <= right;
    }
    
    case "and": {
      return operands.every((op: any) => evaluateCondition(op, context));
    }
    
    case "or": {
      return operands.some((op: any) => evaluateCondition(op, context));
    }
    
    case "not":
    case "!": {
      return !evaluateCondition(operands[0] || operands, context);
    }
    
    case "in": {
      const [needle, haystack] = operands.map((op: any) => resolveValue(op, context));
      if (Array.isArray(haystack)) {
        return haystack.includes(needle);
      }
      if (typeof haystack === 'string') {
        return haystack.includes(needle);
      }
      return false;
    }
    
    case "contains": {
      const [arr, item] = operands.map((op: any) => resolveValue(op, context));
      if (Array.isArray(arr)) {
        return arr.includes(item);
      }
      return false;
    }
    
    case "if": {
      const [cond, thenVal, elseVal] = operands;
      return evaluateCondition(cond, context) 
        ? resolveValue(thenVal, context) 
        : resolveValue(elseVal, context);
    }
    
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

// Resolve a value from context or return literal
function resolveValue(value: any, context: any): any {
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle {var: "path.to.value"} syntax
  if (typeof value === 'object' && value.var !== undefined) {
    return getNestedValue(context, value.var);
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(v => resolveValue(v, context));
  }
  
  // Return literal value
  return value;
}

// Get nested value from object using dot notation
function getNestedValue(obj: any, path: string): any {
  if (!path) return obj;
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

interface PolicyRule {
  id: string;
  rule_id: string;
  name: string;
  scope_type: string;
  scope_id: string | null;
  priority: number;
  condition_json: any;
  action: {
    decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
    reasonCode: string;
    nextActions?: Array<{
      type: string;
      uiHint?: string;
      depositOverrideCents?: number;
      routeToArtistId?: string;
    }>;
  };
  explain_public: string;
  explain_internal: string;
}

interface EvaluationContext {
  declared?: Record<string, boolean | null>;
  inferred?: {
    includesColor?: { value: boolean | null; confidence: number };
    placement?: string;
    sizeInchesEstimate?: number;
    subjectTags?: string[];
  };
  workType?: { value: string; confidence: number };
  stylesDetected?: { tags: string[]; items: Array<{ tag: string; confidence: number }> };
  riskFlags?: { flags: string[]; items: Array<{ flag: string; severity: string }> };
  clientRisk?: {
    riskScore: number;
    noShowScore?: number;
    trustTier?: string;
  };
  studioId?: string;
  artistId?: string;
  clientId?: string;
}

interface EvaluatedRule {
  ruleId: string;
  name: string;
  scope: { type: string; id: string | null };
  priority: number;
  matched: boolean;
  matchNotes?: string;
  decisionDelta: {
    applied: boolean;
    decision?: 'ALLOW' | 'REVIEW' | 'BLOCK';
    reasonCode?: string;
  };
}

interface EvaluationResult {
  evaluationId: string;
  finalDecision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  finalReasons: Array<{ reasonCode: string; message: string; sourceRuleId?: string }>;
  nextActions: Array<{ type: string; uiHint?: string; depositOverrideCents?: number }>;
  evaluatedRules: EvaluatedRule[];
  matching?: { fitScores?: Array<{ artistId: string; score: number; explanation: string }>; selectedArtistId?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      structuredIntent, 
      preGateResponses,
      artistId, 
      clientId,
      conversationId,
      tattoo_brief_id
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build evaluation context
    const context: EvaluationContext = {
      declared: preGateResponses || structuredIntent?.declared || {},
      inferred: structuredIntent?.inferred || {},
      workType: structuredIntent?.work_type || structuredIntent?.workType || { value: 'unknown', confidence: 0 },
      stylesDetected: {
        tags: (structuredIntent?.styles_detected || structuredIntent?.stylesDetected || []).map((s: any) => s.tag),
        items: structuredIntent?.styles_detected || structuredIntent?.stylesDetected || []
      },
      riskFlags: {
        flags: (structuredIntent?.risk_flags || structuredIntent?.riskFlags || []).map((r: any) => r.flag),
        items: structuredIntent?.risk_flags || structuredIntent?.riskFlags || []
      },
      artistId,
      clientId,
    };

    // Fetch client risk if we have a client ID
    if (clientId) {
      const { data: clientProfile } = await supabase
        .from("client_profiles")
        .select("risk_score, no_show_count, trust_tier")
        .eq("id", clientId)
        .single();

      if (clientProfile) {
        context.clientRisk = {
          riskScore: clientProfile.risk_score || 0,
          noShowScore: clientProfile.no_show_count || 0,
          trustTier: clientProfile.trust_tier || 'new',
        };
      }
    }

    // Fetch applicable policy rules
    let rulesQuery = supabase
      .from("policy_rules")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: false });

    // Filter by scope (global + artist-specific)
    if (artistId) {
      rulesQuery = rulesQuery.or(`scope_id.is.null,scope_id.eq.${artistId}`);
    }

    const { data: rules, error: rulesError } = await rulesQuery;

    if (rulesError) {
      console.error("Failed to fetch rules:", rulesError);
      throw new Error("Failed to fetch policy rules");
    }

    // Evaluate rules
    const evaluatedRules: EvaluatedRule[] = [];
    let finalDecision: 'ALLOW' | 'REVIEW' | 'BLOCK' = 'ALLOW';
    const finalReasons: Array<{ reasonCode: string; message: string; sourceRuleId?: string }> = [];
    const nextActions: Array<{ type: string; uiHint?: string; depositOverrideCents?: number }> = [];

    for (const rule of (rules || []) as PolicyRule[]) {
      const matched = evaluateCondition(rule.condition_json, context);
      
      const evaluatedRule: EvaluatedRule = {
        ruleId: rule.rule_id,
        name: rule.name,
        scope: { type: rule.scope_type, id: rule.scope_id },
        priority: rule.priority,
        matched,
        decisionDelta: { applied: false },
      };

      if (matched) {
        evaluatedRule.matchNotes = `Condition matched: ${JSON.stringify(rule.condition_json)}`;
        
        // Apply decision based on priority
        const ruleDecision = rule.action.decision;
        
        // BLOCK takes priority, then REVIEW, then ALLOW
        if (ruleDecision === 'BLOCK' && finalDecision !== 'BLOCK') {
          finalDecision = 'BLOCK';
          evaluatedRule.decisionDelta = {
            applied: true,
            decision: 'BLOCK',
            reasonCode: rule.action.reasonCode,
          };
          finalReasons.push({
            reasonCode: rule.action.reasonCode,
            message: rule.explain_public,
            sourceRuleId: rule.rule_id,
          });
          
          // Add next actions from rule
          if (rule.action.nextActions) {
            nextActions.push(...rule.action.nextActions);
          }
        } else if (ruleDecision === 'REVIEW' && finalDecision === 'ALLOW') {
          finalDecision = 'REVIEW';
          evaluatedRule.decisionDelta = {
            applied: true,
            decision: 'REVIEW',
            reasonCode: rule.action.reasonCode,
          };
          finalReasons.push({
            reasonCode: rule.action.reasonCode,
            message: rule.explain_public,
            sourceRuleId: rule.rule_id,
          });
          
          if (rule.action.nextActions) {
            nextActions.push(...rule.action.nextActions);
          }
        } else if (ruleDecision === 'ALLOW' && rule.action.nextActions) {
          // Allow with modifications (e.g., higher deposit)
          evaluatedRule.decisionDelta = { applied: true };
          nextActions.push(...rule.action.nextActions);
        }
      }

      evaluatedRules.push(evaluatedRule);
    }

    // Generate evaluation ID
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build result
    const result: EvaluationResult = {
      evaluationId,
      finalDecision,
      finalReasons,
      nextActions,
      evaluatedRules,
    };

    // Store evaluation trace
    const { error: traceError } = await supabase
      .from("rule_evaluation_results")
      .insert({
        evaluation_id: evaluationId,
        conversation_id: conversationId,
        tattoo_brief_id,
        context: {
          artistId,
          clientId,
          timezone: 'America/Chicago',
        },
        input_snapshot: {
          structuredIntent,
          preGateResponses,
          clientRisk: context.clientRisk,
        },
        evaluated_rules: evaluatedRules,
        final_decision: finalDecision,
        final_reasons: finalReasons,
        next_actions: nextActions,
      });

    if (traceError) {
      console.error("Failed to store evaluation trace:", traceError);
      // Don't fail the request, just log
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Policy evaluation error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to evaluate policy", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
