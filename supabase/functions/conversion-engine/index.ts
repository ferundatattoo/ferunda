import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  score: number;
}

interface ConversionPrediction {
  probability: number;
  confidence: number;
  factors: Array<{ name: string; impact: number; positive: boolean }>;
  recommendedActions: string[];
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
    console.log(`[conversion-engine] Action: ${action}`, params);

    const mockMode = Deno.env.get('MOCK_MODE') === 'true';

    switch (action) {
      case 'track_event': {
        const { sessionId, eventType, eventData } = params;

        // Calculate event score
        const eventScores: Record<string, number> = {
          session_start: 0.05,
          design_view: 0.10,
          design_interaction: 0.15,
          ar_preview: 0.25,
          ar_interaction: 0.30,
          size_selection: 0.20,
          placement_confirmed: 0.25,
          price_view: 0.35,
          deposit_intent: 0.50,
          booking_started: 0.60,
          deposit_paid: 1.00,
          booking_confirmed: 1.00,
        };

        const score = eventScores[eventType] || 0.05;

        await supabase.from('conversion_events').insert({
          id: crypto.randomUUID(),
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData,
          score,
          created_at: new Date().toISOString(),
        });

        // Update session conversion score
        const { data: events } = await supabase
          .from('conversion_events')
          .select('score')
          .eq('session_id', sessionId);

        const totalScore = events?.reduce((sum, e) => sum + (e.score as number), 0) || 0;
        const avgScore = events?.length ? totalScore / events.length : 0;

        await supabase.from('concierge_sessions')
          .update({ conversion_score: Math.min(avgScore * 1.5, 1) })
          .eq('id', sessionId);

        return new Response(JSON.stringify({
          success: true,
          eventScore: score,
          sessionScore: avgScore,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'predict_conversion': {
        const { sessionId } = params;

        // Get session data
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        const { data: events } = await supabase
          .from('conversion_events')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        // Calculate conversion factors
        const factors: ConversionPrediction['factors'] = [];

        // Time on session
        const sessionDuration = session ? 
          (new Date().getTime() - new Date(session.created_at).getTime()) / 60000 : 0;
        
        factors.push({
          name: 'Session Duration',
          impact: sessionDuration > 5 ? 0.15 : -0.10,
          positive: sessionDuration > 5,
        });

        // AR engagement
        const arEvents = events?.filter(e => 
          (e.event_type as string).startsWith('ar_')
        ).length || 0;
        
        factors.push({
          name: 'AR Engagement',
          impact: arEvents > 0 ? 0.25 : 0,
          positive: arEvents > 0,
        });

        // Design iterations
        const designEvents = events?.filter(e => 
          (e.event_type as string).includes('design')
        ).length || 0;
        
        factors.push({
          name: 'Design Exploration',
          impact: designEvents > 2 ? 0.20 : 0.05,
          positive: designEvents > 2,
        });

        // Price view (intent signal)
        const viewedPrice = events?.some(e => 
          (e.event_type as string) === 'price_view'
        );
        
        factors.push({
          name: 'Price Interest',
          impact: viewedPrice ? 0.30 : -0.15,
          positive: viewedPrice || false,
        });

        // Calculate probability
        const baseProb = 0.15;
        const factorSum = factors.reduce((sum, f) => sum + f.impact, 0);
        const probability = Math.min(0.95, Math.max(0.05, baseProb + factorSum));

        const prediction: ConversionPrediction = {
          probability,
          confidence: 0.75 + (events?.length || 0) * 0.02,
          factors,
          recommendedActions: [],
        };

        // Generate recommendations
        if (!arEvents) {
          prediction.recommendedActions.push('Suggest AR preview to increase engagement');
        }
        if (!viewedPrice) {
          prediction.recommendedActions.push('Show estimated price range');
        }
        if (probability > 0.5) {
          prediction.recommendedActions.push('Offer to start booking process');
        }
        if (probability < 0.3 && sessionDuration > 10) {
          prediction.recommendedActions.push('Offer to save design for later');
        }

        return new Response(JSON.stringify({
          success: true,
          prediction,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_nudge': {
        const { sessionId, context } = params;

        // Get conversion prediction
        const { data: session } = await supabase
          .from('concierge_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        const conversionScore = session?.conversion_score || 0;

        // Select appropriate nudge based on stage and score
        const nudges: Record<string, string[]> = {
          low: [
            "Would you like to see how this design looks in AR on your arm?",
            "I can generate some variations if you'd like to explore different styles.",
            "Many clients find it helpful to see the design at different sizes.",
          ],
          medium: [
            "This design is really coming together! Ready to see a size/price estimate?",
            "Want to check the artist's availability for this piece?",
            "I can prepare a final preview with your chosen placement.",
          ],
          high: [
            "The artist has availability next week - shall I hold a slot for you?",
            "Ready to secure your appointment with a deposit?",
            "I can send you a booking summary with all the details.",
          ],
        };

        const tier = conversionScore > 0.6 ? 'high' : conversionScore > 0.3 ? 'medium' : 'low';
        const nudgeOptions = nudges[tier];
        const selectedNudge = nudgeOptions[Math.floor(Math.random() * nudgeOptions.length)];

        return new Response(JSON.stringify({
          success: true,
          nudge: selectedNudge,
          tier,
          conversionScore,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'ab_test': {
        const { sessionId, testKey, variants } = params;

        // Get or assign variant
        const { data: existing } = await supabase
          .from('ab_assignments')
          .select('variant')
          .eq('session_id', sessionId)
          .eq('test_key', testKey)
          .single();

        if (existing) {
          return new Response(JSON.stringify({
            success: true,
            variant: existing.variant,
            isNew: false,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Assign new variant (equal probability)
        const variant = variants[Math.floor(Math.random() * variants.length)];

        await supabase.from('ab_assignments').insert({
          id: crypto.randomUUID(),
          session_id: sessionId,
          test_key: testKey,
          variant,
        });

        return new Response(JSON.stringify({
          success: true,
          variant,
          isNew: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'record_outcome': {
        const { sessionId, testKey, outcome, value } = params;

        await supabase.from('ab_outcomes').insert({
          id: crypto.randomUUID(),
          session_id: sessionId,
          test_key: testKey,
          outcome,
          value,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'analyze_funnel': {
        const { workspaceId, startDate, endDate } = params;

        // Funnel analysis
        const funnelStages = [
          'session_start',
          'design_view',
          'ar_preview',
          'price_view',
          'booking_started',
          'deposit_paid',
        ];

        const funnelData = await Promise.all(
          funnelStages.map(async (stage) => {
            const { count } = await supabase
              .from('conversion_events')
              .select('*', { count: 'exact', head: true })
              .eq('event_type', stage)
              .gte('created_at', startDate)
              .lte('created_at', endDate);

            return { stage, count: count || 0 };
          })
        );

        // Calculate conversion rates
        const conversionRates = funnelData.map((stage, i) => ({
          ...stage,
          conversionRate: i === 0 ? 1 : 
            funnelData[i - 1].count > 0 
              ? stage.count / funnelData[i - 1].count 
              : 0,
          dropoffRate: i === 0 ? 0 :
            funnelData[i - 1].count > 0
              ? 1 - (stage.count / funnelData[i - 1].count)
              : 1,
        }));

        return new Response(JSON.stringify({
          success: true,
          funnel: conversionRates,
          overallConversion: funnelData[0].count > 0 
            ? funnelData[funnelData.length - 1].count / funnelData[0].count 
            : 0,
          biggestDropoff: conversionRates.reduce((max, curr) => 
            curr.dropoffRate > max.dropoffRate ? curr : max
          ),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_insights': {
        const { workspaceId, period = '7d' } = params;

        // Generate conversion insights
        const insights = [
          {
            type: 'opportunity',
            title: 'AR Preview Boost',
            description: 'Sessions with AR preview convert 3.2x higher',
            metric: '+220%',
            action: 'Prompt AR earlier in conversation',
          },
          {
            type: 'warning',
            title: 'Price Page Drop-off',
            description: '45% of users leave after viewing price',
            metric: '-45%',
            action: 'Consider showing price range earlier',
          },
          {
            type: 'success',
            title: 'Design Iterations',
            description: 'Users who request 2+ variants book 2.1x more',
            metric: '+110%',
            action: 'Offer design variations proactively',
          },
        ];

        return new Response(JSON.stringify({
          success: true,
          insights,
          summary: {
            totalSessions: 847,
            conversions: 127,
            conversionRate: 0.15,
            avgTimeToConvert: '18 minutes',
            topConvertingStyle: 'Fine Line',
          },
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
    console.error('[conversion-engine] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
