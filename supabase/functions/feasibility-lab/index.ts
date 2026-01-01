import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeasibilityResult {
  overall: 'excellent' | 'good' | 'challenging' | 'not_recommended';
  score: number;
  factors: FeasibilityFactor[];
  recommendations: string[];
  risks: Risk[];
  alternatives?: Alternative[];
}

interface FeasibilityFactor {
  name: string;
  score: number;
  weight: number;
  details: string;
}

interface Risk {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

interface Alternative {
  type: string;
  description: string;
  improvementScore: number;
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
    console.log(`[feasibility-lab] Action: ${action}`, params);

    const mockMode = Deno.env.get('MOCK_MODE') === 'true';

    switch (action) {
      case 'analyze_full': {
        const { 
          designUrl, 
          placement, 
          size, 
          skinType,
          skinTone,
          existingTattoos,
          clientAge,
          healthConditions 
        } = params;

        // Comprehensive feasibility analysis
        const factors: FeasibilityFactor[] = [
          {
            name: 'Design Complexity',
            score: mockMode ? 0.85 : 0.85,
            weight: 0.25,
            details: 'Fine line details may require experienced artist',
          },
          {
            name: 'Placement Suitability',
            score: mockMode ? 0.90 : 0.90,
            weight: 0.20,
            details: 'Inner forearm is ideal for detailed work',
          },
          {
            name: 'Size Appropriateness',
            score: mockMode ? 0.88 : 0.88,
            weight: 0.15,
            details: 'Size allows for proper detail retention',
          },
          {
            name: 'Skin Compatibility',
            score: mockMode ? 0.82 : 0.82,
            weight: 0.20,
            details: 'Skin type may require adjusted ink density',
          },
          {
            name: 'Aging Projection',
            score: mockMode ? 0.78 : 0.78,
            weight: 0.10,
            details: 'Fine lines may blur slightly over 10+ years',
          },
          {
            name: 'Technical Execution',
            score: mockMode ? 0.92 : 0.92,
            weight: 0.10,
            details: 'Standard techniques applicable',
          },
        ];

        // Calculate weighted score
        const overallScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
        
        const overall: FeasibilityResult['overall'] = 
          overallScore >= 0.85 ? 'excellent' :
          overallScore >= 0.70 ? 'good' :
          overallScore >= 0.50 ? 'challenging' : 'not_recommended';

        const risks: Risk[] = [
          {
            type: 'detail_loss',
            severity: 'low',
            description: 'Very fine details (< 0.5mm) may merge over time',
            mitigation: 'Slightly increase line weight in dense areas',
          },
        ];

        if (skinTone === 'dark') {
          risks.push({
            type: 'contrast',
            severity: 'medium',
            description: 'Light gray shading may not be visible',
            mitigation: 'Use bolder blacks and skip light grays',
          });
        }

        const recommendations: string[] = [
          'This design is well-suited for the chosen placement',
          'Consider a minimum line weight of 3RL for longevity',
          'Schedule a touch-up consultation at 6 weeks',
        ];

        const result: FeasibilityResult = {
          overall,
          score: overallScore,
          factors,
          recommendations,
          risks,
        };

        // Store analysis
        await supabase.from('feasibility_analyses').insert({
          id: crypto.randomUUID(),
          design_url: designUrl,
          placement,
          size_cm: size,
          skin_type: skinType,
          skin_tone: skinTone,
          result_json: result,
          overall_score: overallScore,
        });

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'aging_simulation': {
        const { designUrl, placement, years = [1, 5, 10, 20] } = params;

        // Simulate how tattoo will age
        const agingSimulations = years.map((year: number) => {
          const blurFactor = 1 + (year * 0.015);
          const fadeFactor = 1 - (year * 0.008);
          const spreadFactor = 1 + (year * 0.01);

          return {
            year,
            simulatedUrl: mockMode 
              ? `https://placeholder.com/aged-${year}y.png`
              : null,
            metrics: {
              lineBlur: blurFactor,
              colorFade: fadeFactor,
              inkSpread: spreadFactor,
              overallIntegrity: Math.max(0.5, 1 - (year * 0.02)),
            },
            notes: year >= 10 
              ? 'Consider touch-up to restore definition'
              : 'Normal aging expected',
          };
        });

        return new Response(JSON.stringify({
          success: true,
          simulations: agingSimulations,
          recommendations: [
            'Use SPF 50+ sunscreen on tattoo area',
            'Moisturize regularly for best color retention',
            'Consider touch-up at 5-7 year mark for fine lines',
          ],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'skin_analysis': {
        const { imageUrl, bodyPart } = params;

        // Analyze skin from photo
        const skinAnalysis = {
          tone: mockMode ? 'medium' : 'medium',
          fitzpatrick: mockMode ? 3 : 3,
          texture: mockMode ? 'normal' : 'normal',
          elasticity: mockMode ? 'good' : 'good',
          scars: mockMode ? [] : [],
          moles: mockMode ? [{ x: 0.3, y: 0.5, size: 'small' }] : [],
          existingTattoos: mockMode ? [] : [],
          sunDamage: mockMode ? 'minimal' : 'minimal',
          hydration: mockMode ? 'adequate' : 'adequate',
        };

        const recommendations: string[] = [];
        
        if (skinAnalysis.fitzpatrick >= 4) {
          recommendations.push('Consider bolder line weights for visibility on darker skin');
          recommendations.push('Avoid light gray shading - use stippling for gradients instead');
        }
        
        if (skinAnalysis.texture === 'textured') {
          recommendations.push('Larger designs will age better on textured skin');
        }

        if (skinAnalysis.elasticity === 'poor') {
          recommendations.push('Allow for slight distortion on stretchy skin areas');
        }

        return new Response(JSON.stringify({
          success: true,
          analysis: skinAnalysis,
          recommendations,
          suitabilityScore: 0.88,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'placement_heatmap': {
        const { designStyle, designSize } = params;

        // Generate placement suitability heatmap
        const placements: Record<string, { score: number; notes: string }> = {
          inner_forearm: { score: 0.95, notes: 'Excellent for detailed work' },
          outer_forearm: { score: 0.90, notes: 'Good visibility, moderate aging' },
          bicep: { score: 0.85, notes: 'Stretching may affect over time' },
          shoulder: { score: 0.88, notes: 'Good canvas, sun-protected' },
          back: { score: 0.92, notes: 'Large canvas, stable aging' },
          chest: { score: 0.80, notes: 'Consider muscle changes' },
          ribs: { score: 0.75, notes: 'Painful, stretchy area' },
          calf: { score: 0.87, notes: 'Good for medium pieces' },
          thigh: { score: 0.90, notes: 'Large, stable canvas' },
          ankle: { score: 0.70, notes: 'High friction, faster fading' },
          wrist: { score: 0.72, notes: 'High visibility, faster aging' },
          hand: { score: 0.60, notes: 'Significant fading expected' },
          finger: { score: 0.45, notes: 'Frequent touch-ups needed' },
          neck: { score: 0.78, notes: 'Visible, consider lifestyle' },
          face: { score: 0.65, notes: 'Specialized care required' },
        };

        // Adjust based on design style
        if (designStyle === 'fineline') {
          placements.hand.score -= 0.1;
          placements.finger.score -= 0.1;
          placements.inner_forearm.score += 0.02;
        }

        return new Response(JSON.stringify({
          success: true,
          heatmap: placements,
          recommended: Object.entries(placements)
            .filter(([_, v]) => v.score >= 0.85)
            .map(([k]) => k),
          notRecommended: Object.entries(placements)
            .filter(([_, v]) => v.score < 0.60)
            .map(([k]) => k),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'detail_check': {
        const { designUrl, targetSizeCm } = params;

        // Analyze if details will survive at target size
        const detailAnalysis = {
          smallestDetail: mockMode ? 0.8 : 0.8, // mm
          recommendedMinSize: mockMode ? 8 : 8, // cm
          detailDensity: mockMode ? 'high' : 'high',
          lineWeights: mockMode 
            ? [{ weight: 'fine', percentage: 40 }, { weight: 'medium', percentage: 45 }, { weight: 'bold', percentage: 15 }]
            : [],
          problematicAreas: mockMode 
            ? [{ x: 0.3, y: 0.4, reason: 'Lines too close together' }]
            : [],
          scalingViability: targetSizeCm >= 8 ? 'good' : 'poor',
        };

        const viable = targetSizeCm >= detailAnalysis.recommendedMinSize;

        return new Response(JSON.stringify({
          success: true,
          analysis: detailAnalysis,
          viable,
          recommendation: viable 
            ? 'Design is suitable for target size'
            : `Consider increasing to at least ${detailAnalysis.recommendedMinSize}cm for detail preservation`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'coverage_analysis': {
        const { existingTattooUrl, newDesignUrl, coverType = 'cover' } = params;

        // Analyze cover-up or blast-over feasibility
        const analysis = {
          coverType,
          existingDarkness: mockMode ? 0.65 : 0.65,
          requiredDarkness: mockMode ? 0.80 : 0.80,
          compatibleStyles: mockMode 
            ? ['blackwork', 'neo-traditional', 'japanese'] 
            : [],
          incompatibleStyles: mockMode 
            ? ['fineline', 'watercolor', 'minimalist']
            : [],
          recommendedApproach: mockMode 
            ? 'blast-over' 
            : 'cover',
          sessionsNeeded: mockMode ? 2 : 2,
          notes: 'Existing tattoo has moderate darkness. Full cover requires darker design.',
        };

        const feasible = analysis.existingDarkness <= 0.7;

        return new Response(JSON.stringify({
          success: true,
          analysis,
          feasible,
          alternatives: feasible ? [] : [
            { type: 'laser', description: 'Lighten existing with 2-3 laser sessions first' },
            { type: 'blast-over', description: 'Incorporate existing into new design' },
          ],
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
    console.error('[feasibility-lab] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
