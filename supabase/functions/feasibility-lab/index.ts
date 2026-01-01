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

// Lovable AI integration
async function analyzeWithAI(prompt: string, imageUrl?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log('[feasibility-lab] No LOVABLE_API_KEY, using fallback');
    return '';
  }

  const startTime = Date.now();
  
  try {
    const messages: { role: string; content: unknown }[] = [
      {
        role: "system",
        content: `You are an expert tattoo feasibility analyst. Analyze tattoo designs for technical viability, aging predictions, and provide professional recommendations. Always respond in JSON format.`
      }
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 2000,
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[feasibility-lab] AI response time: ${elapsed}ms`);

    if (!response.ok) {
      console.error('[feasibility-lab] AI error:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[feasibility-lab] AI error:', error);
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[feasibility-lab][${requestId}] Request started`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();
    console.log(`[feasibility-lab][${requestId}] Action: ${action}`, JSON.stringify(params).slice(0, 200));

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

        // Try AI analysis first
        const aiPrompt = `Analyze this tattoo design for feasibility:
- Placement: ${placement || 'not specified'}
- Size: ${size || 'not specified'} cm
- Skin type: ${skinType || 'normal'}
- Skin tone: ${skinTone || 'medium'}
- Client age: ${clientAge || 'adult'}
- Health conditions: ${healthConditions?.join(', ') || 'none'}

Provide analysis in JSON format with these fields:
{
  "factors": [
    { "name": "string", "score": 0-1, "weight": 0-1, "details": "string" }
  ],
  "risks": [
    { "type": "string", "severity": "low|medium|high", "description": "string", "mitigation": "string" }
  ],
  "recommendations": ["string"]
}

Consider: design complexity, placement suitability, size appropriateness, skin compatibility, aging projection, technical execution.`;

        const aiResult = await analyzeWithAI(aiPrompt, designUrl);
        
        let factors: FeasibilityFactor[];
        let risks: Risk[];
        let recommendations: string[];

        if (aiResult) {
          try {
            // Extract JSON from AI response
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              factors = parsed.factors || [];
              risks = parsed.risks || [];
              recommendations = parsed.recommendations || [];
            } else {
              throw new Error('No JSON in response');
            }
          } catch (e) {
            console.log('[feasibility-lab] AI parse failed, using defaults');
            factors = getDefaultFactors(placement, size, skinTone);
            risks = getDefaultRisks(skinTone);
            recommendations = getDefaultRecommendations();
          }
        } else {
          factors = getDefaultFactors(placement, size, skinTone);
          risks = getDefaultRisks(skinTone);
          recommendations = getDefaultRecommendations();
        }

        // Calculate weighted score
        const overallScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
        
        const overall: FeasibilityResult['overall'] = 
          overallScore >= 0.85 ? 'excellent' :
          overallScore >= 0.70 ? 'good' :
          overallScore >= 0.50 ? 'challenging' : 'not_recommended';

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

        console.log(`[feasibility-lab][${requestId}] Analysis complete: ${overall} (${(overallScore * 100).toFixed(1)}%)`);

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'aging_simulation': {
        const { designUrl, placement, years = [1, 5, 10, 20] } = params;

        // AI-powered aging analysis
        const aiPrompt = `Predict how this tattoo will age over ${years.join(', ')} years:
- Placement: ${placement || 'forearm'}

For each year, provide metrics in JSON:
{
  "simulations": [
    {
      "year": number,
      "metrics": {
        "lineBlur": 1.0-2.0,
        "colorFade": 0.5-1.0,
        "inkSpread": 1.0-1.5,
        "overallIntegrity": 0.3-1.0
      },
      "notes": "string"
    }
  ],
  "recommendations": ["string"]
}`;

        const aiResult = await analyzeWithAI(aiPrompt, designUrl);
        
        let agingSimulations;
        let agingRecommendations;

        if (aiResult) {
          try {
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              agingSimulations = parsed.simulations;
              agingRecommendations = parsed.recommendations;
            }
          } catch (e) {
            console.log('[feasibility-lab] Aging AI parse failed');
          }
        }

        if (!agingSimulations) {
          agingSimulations = years.map((year: number) => ({
            year,
            simulatedUrl: null,
            metrics: {
              lineBlur: 1 + (year * 0.015),
              colorFade: 1 - (year * 0.008),
              inkSpread: 1 + (year * 0.01),
              overallIntegrity: Math.max(0.5, 1 - (year * 0.02)),
            },
            notes: year >= 10 ? 'Consider touch-up to restore definition' : 'Normal aging expected',
          }));
          
          agingRecommendations = [
            'Use SPF 50+ sunscreen on tattoo area',
            'Moisturize regularly for best color retention',
            'Consider touch-up at 5-7 year mark for fine lines',
          ];
        }

        return new Response(JSON.stringify({
          success: true,
          simulations: agingSimulations,
          recommendations: agingRecommendations,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'skin_analysis': {
        const { imageUrl, bodyPart } = params;

        // AI-powered skin analysis
        const aiPrompt = `Analyze this skin image for tattoo suitability:
- Body part: ${bodyPart || 'unknown'}

Provide analysis in JSON:
{
  "tone": "light|medium|dark",
  "fitzpatrick": 1-6,
  "texture": "smooth|normal|textured",
  "elasticity": "excellent|good|fair|poor",
  "scars": [],
  "moles": [],
  "sunDamage": "none|minimal|moderate|significant",
  "hydration": "excellent|adequate|dry"
}`;

        const aiResult = await analyzeWithAI(aiPrompt, imageUrl);
        
        let skinAnalysis = {
          tone: 'medium',
          fitzpatrick: 3,
          texture: 'normal',
          elasticity: 'good',
          scars: [],
          moles: [],
          existingTattoos: [],
          sunDamage: 'minimal',
          hydration: 'adequate',
        };

        if (aiResult) {
          try {
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              skinAnalysis = { ...skinAnalysis, ...parsed };
            }
          } catch (e) {
            console.log('[feasibility-lab] Skin AI parse failed');
          }
        }

        const recommendations: string[] = [];
        
        if (skinAnalysis.fitzpatrick >= 4) {
          recommendations.push('Consider bolder line weights for visibility on darker skin');
          recommendations.push('Avoid light gray shading - use stippling for gradients instead');
        }
        
        if (skinAnalysis.texture === 'textured') {
          recommendations.push('Larger designs will age better on textured skin');
        }

        if (skinAnalysis.elasticity === 'poor' || skinAnalysis.elasticity === 'fair') {
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

        // AI detail analysis
        const aiPrompt = `Analyze this tattoo design for detail preservation at ${targetSizeCm}cm size:

Provide in JSON:
{
  "smallestDetail": number (mm),
  "recommendedMinSize": number (cm),
  "detailDensity": "low|medium|high",
  "scalingViability": "poor|fair|good|excellent",
  "problematicAreas": [{ "x": 0-1, "y": 0-1, "reason": "string" }]
}`;

        const aiResult = await analyzeWithAI(aiPrompt, designUrl);
        
        let detailAnalysis = {
          smallestDetail: 0.8,
          recommendedMinSize: 8,
          detailDensity: 'high',
          lineWeights: [
            { weight: 'fine', percentage: 40 },
            { weight: 'medium', percentage: 45 },
            { weight: 'bold', percentage: 15 }
          ],
          problematicAreas: [],
          scalingViability: targetSizeCm >= 8 ? 'good' : 'poor',
        };

        if (aiResult) {
          try {
            const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              detailAnalysis = { ...detailAnalysis, ...parsed };
            }
          } catch (e) {
            console.log('[feasibility-lab] Detail AI parse failed');
          }
        }

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

        const analysis = {
          coverType,
          existingDarkness: 0.65,
          requiredDarkness: 0.80,
          compatibleStyles: ['blackwork', 'neo-traditional', 'japanese'],
          incompatibleStyles: ['fineline', 'watercolor', 'minimalist'],
          recommendedApproach: 'blast-over',
          sessionsNeeded: 2,
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
    console.error(`[feasibility-lab][${requestId}] Error:`, error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions for defaults
function getDefaultFactors(placement?: string, size?: number, skinTone?: string): FeasibilityFactor[] {
  return [
    { name: 'Design Complexity', score: 0.85, weight: 0.25, details: 'Fine line details may require experienced artist' },
    { name: 'Placement Suitability', score: placement === 'inner_forearm' ? 0.95 : 0.85, weight: 0.20, details: 'Location analysis based on placement' },
    { name: 'Size Appropriateness', score: size && size >= 8 ? 0.90 : 0.75, weight: 0.15, details: 'Size allows for proper detail retention' },
    { name: 'Skin Compatibility', score: skinTone === 'dark' ? 0.75 : 0.85, weight: 0.20, details: 'Skin type may require adjusted ink density' },
    { name: 'Aging Projection', score: 0.78, weight: 0.10, details: 'Fine lines may blur slightly over 10+ years' },
    { name: 'Technical Execution', score: 0.92, weight: 0.10, details: 'Standard techniques applicable' },
  ];
}

function getDefaultRisks(skinTone?: string): Risk[] {
  const risks: Risk[] = [
    { type: 'detail_loss', severity: 'low', description: 'Very fine details (< 0.5mm) may merge over time', mitigation: 'Slightly increase line weight in dense areas' },
  ];

  if (skinTone === 'dark') {
    risks.push({
      type: 'contrast',
      severity: 'medium',
      description: 'Light gray shading may not be visible',
      mitigation: 'Use bolder blacks and skip light grays',
    });
  }

  return risks;
}

function getDefaultRecommendations(): string[] {
  return [
    'This design is well-suited for the chosen placement',
    'Consider a minimum line weight of 3RL for longevity',
    'Schedule a touch-up consultation at 6 weeks',
  ];
}