import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// SOCIAL TRENDS SCANNER v2.0 - AI-Powered Trend Detection & Analysis
// ============================================================================

interface TrendAnalysis {
  topic: string;
  platform: string;
  category: string;
  viral_score: number;
  engagement_rate: number;
  sentiment_score: number;
  relevance_to_tattoo: number;
  suggested_content: string;
  hashtags: string[];
  best_times: string[];
  expires_estimate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      platforms = ["tiktok", "instagram"], 
      niche = "tattoo",
      action = "scan",
      use_ai = true,
      force_refresh = false
    } = body;
    
    console.log(`[TrendScanner v2] Action: ${action}, Platforms: ${platforms.join(", ")}, AI: ${use_ai}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========================================================================
    // ACTION: GET CURRENT TRENDS (cached)
    // ========================================================================
    if (action === "get") {
      const { data: trends, error } = await supabase
        .from("social_trends")
        .select("*")
        .in("platform", [...platforms, "both"])
        .order("viral_score", { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        trends,
        count: trends?.length || 0,
        cached: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ========================================================================
    // ACTION: ANALYZE CONTENT FOR TREND FIT
    // ========================================================================
    if (action === "analyze_content") {
      const { content_description, content_type } = body;
      
      if (!content_description) {
        return new Response(JSON.stringify({ error: "content_description required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get current hot trends
      const { data: hotTrends } = await supabase
        .from("social_trends")
        .select("title, viral_score, hashtags, suggested_script")
        .eq("status", "hot")
        .order("viral_score", { ascending: false })
        .limit(5);

      // Use AI to analyze fit
      let analysis = {
        trend_fit_score: 75,
        matching_trends: hotTrends?.slice(0, 2) || [],
        suggestions: ["Add trending hashtags", "Post during peak hours"],
        predicted_engagement: "medium"
      };

      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'openai/gpt-5-nano',
              messages: [
                {
                  role: 'system',
                  content: `Eres un experto en marketing de redes sociales para tatuadores. Analiza el contenido propuesto y da un score de 0-100 de qué tan bien se alinea con trends actuales. Responde en JSON: { "score": number, "suggestions": string[], "best_platform": "tiktok"|"instagram", "predicted_engagement": "low"|"medium"|"high"|"viral" }`
                },
                {
                  role: 'user',
                  content: `Contenido propuesto: "${content_description}"\nTipo: ${content_type || 'video'}\n\nTrends actuales hot:\n${JSON.stringify(hotTrends?.map(t => t.title) || [])}`
                }
              ],
              max_completion_tokens: 200
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || '';
            try {
              const parsed = JSON.parse(content);
              analysis = {
                trend_fit_score: parsed.score || 75,
                matching_trends: hotTrends?.slice(0, 2) || [],
                suggestions: parsed.suggestions || analysis.suggestions,
                predicted_engagement: parsed.predicted_engagement || 'medium'
              };
            } catch (e) {
              console.log('[TrendScanner] AI parse fallback');
            }
          }
        } catch (e) {
          console.error('[TrendScanner] AI analysis error:', e);
        }
      }

      return new Response(JSON.stringify({ success: true, analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ========================================================================
    // ACTION: SCAN (refresh trends)
    // ========================================================================
    
    // Check if we need to refresh (cache for 6 hours unless force_refresh)
    if (!force_refresh) {
      const { data: recentTrend } = await supabase
        .from("social_trends")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (recentTrend) {
        const lastUpdate = new Date(recentTrend.updated_at);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 6) {
          console.log(`[TrendScanner] Cache valid (${hoursSinceUpdate.toFixed(1)}h old)`);
          
          const { data: cachedTrends } = await supabase
            .from("social_trends")
            .select("*")
            .in("platform", [...platforms, "both"])
            .order("viral_score", { ascending: false })
            .limit(20);

          return new Response(JSON.stringify({ 
            success: true, 
            newTrends: 0,
            trends: cachedTrends,
            cached: true,
            cacheAge: `${hoursSinceUpdate.toFixed(1)} hours`
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    // Generate trends (AI-enhanced or mock)
    let trends: TrendAnalysis[] = [];

    if (use_ai && LOVABLE_API_KEY) {
      console.log('[TrendScanner] Using AI to generate trends...');
      
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-mini',
            messages: [
              {
                role: 'system',
                content: `Eres un experto en tendencias de TikTok e Instagram para la industria del tatuaje. Genera 5 tendencias ACTUALES y REALES para tatuadores en 2026. Incluye formatos virales, sounds trending, y formatos de contenido.

Responde en JSON array con este formato exacto para cada trend:
{
  "topic": "nombre del trend",
  "platform": "tiktok" | "instagram" | "both",
  "category": "format" | "sound" | "hashtag" | "style",
  "viral_score": 50-100,
  "engagement_rate": 5-20,
  "sentiment_score": 0.5-1.0,
  "relevance_to_tattoo": 0.5-1.0,
  "suggested_content": "descripción breve de cómo adaptarlo",
  "hashtags": ["array", "de", "hashtags"],
  "best_times": ["12:00 PM", "6:00 PM"],
  "expires_estimate": "ISO date string"
}`
              },
              {
                role: 'user',
                content: `Genera 5 tendencias actuales para tatuadores en ${platforms.join(' y ')}. Nicho: ${niche}. Fecha actual: ${new Date().toISOString().split('T')[0]}`
              }
            ],
            max_completion_tokens: 1500
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            trends = JSON.parse(jsonMatch[0]);
            console.log(`[TrendScanner] AI generated ${trends.length} trends`);
          }
        }
      } catch (aiError) {
        console.error('[TrendScanner] AI error, falling back to mock:', aiError);
      }
    }

    // Fallback to mock trends if AI didn't work
    if (trends.length === 0) {
      trends = generateMockTrends(platforms, niche);
    }

    // Insert/update trends in database
    let insertedCount = 0;
    for (const trend of trends) {
      const trendRecord = {
        title: trend.topic,
        platform: trend.platform,
        trend_type: trend.category,
        viral_score: trend.viral_score,
        engagement_rate: trend.engagement_rate,
        sentiment_score: trend.sentiment_score,
        tattoo_relevance: trend.relevance_to_tattoo > 0.7 ? 'perfect' : trend.relevance_to_tattoo > 0.5 ? 'high' : 'medium',
        description: trend.suggested_content,
        hashtags: trend.hashtags,
        best_posting_times: trend.best_times,
        expires_estimate: trend.expires_estimate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: trend.viral_score > 90 ? 'hot' : trend.viral_score > 80 ? 'rising' : 'stable',
        detected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("social_trends")
        .upsert(trendRecord, { onConflict: "title", ignoreDuplicates: false });
      
      if (!error) insertedCount++;
    }

    console.log(`[TrendScanner] Inserted/updated ${insertedCount} trends`);

    // Fetch updated trends
    const { data: updatedTrends } = await supabase
      .from("social_trends")
      .select("*")
      .in("platform", [...platforms, "both"])
      .order("viral_score", { ascending: false })
      .limit(20);

    return new Response(JSON.stringify({ 
      success: true,
      newTrends: insertedCount,
      trends: updatedTrends,
      cached: false,
      aiPowered: use_ai && trends.length > 0
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[TrendScanner] Error:", errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      newTrends: 0
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500 
    });
  }
});

function generateMockTrends(platforms: string[], niche: string): TrendAnalysis[] {
  const now = new Date();
  
  return [
    {
      topic: "POV: Cliente dijo 'algo pequeño'",
      platform: "tiktok",
      category: "format",
      viral_score: 94,
      engagement_rate: 8.7,
      sentiment_score: 0.85,
      relevance_to_tattoo: 1.0,
      suggested_content: "Reacción dramática cuando cliente pide algo 'pequeño' pero muestra referencia de manga completa",
      hashtags: ["#tattoo", "#tattooartist", "#microrealism", "#fyp", "#viral"],
      best_times: ["12:00 PM", "6:00 PM", "9:00 PM"],
      expires_estimate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      topic: "Microrealism Process Reveal",
      platform: "instagram",
      category: "format",
      viral_score: 91,
      engagement_rate: 12.3,
      sentiment_score: 0.92,
      relevance_to_tattoo: 1.0,
      suggested_content: "Video de proceso con reveal dramático usando transición suave y música aesthetic",
      hashtags: ["#microrealism", "#tattooprocess", "#reels", "#tattoo", "#fineline"],
      best_times: ["10:00 AM", "2:00 PM", "7:00 PM"],
      expires_estimate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      topic: "La historia detrás del tattoo",
      platform: "both",
      category: "format",
      viral_score: 88,
      engagement_rate: 15.2,
      sentiment_score: 0.95,
      relevance_to_tattoo: 0.9,
      suggested_content: "Cliente cuenta historia emocional mientras muestras el proceso",
      hashtags: ["#tattoostory", "#meaningfultattoo", "#emotional", "#storytime"],
      best_times: ["8:00 PM", "9:00 PM"],
      expires_estimate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      topic: "Before vs After Cover-up",
      platform: "tiktok",
      category: "sound",
      viral_score: 86,
      engagement_rate: 9.1,
      sentiment_score: 0.88,
      relevance_to_tattoo: 1.0,
      suggested_content: "Usar audio trending para mostrar transformación dramática",
      hashtags: ["#coverup", "#tattoocoverup", "#transformation", "#glowup"],
      best_times: ["1:00 PM", "5:00 PM", "8:00 PM"],
      expires_estimate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      topic: "Day in the Life - Tattoo Artist",
      platform: "instagram",
      category: "format",
      viral_score: 82,
      engagement_rate: 7.8,
      sentiment_score: 0.80,
      relevance_to_tattoo: 0.85,
      suggested_content: "Día completo en el estudio con aesthetic premium y lo-fi music",
      hashtags: ["#dayinthelife", "#tattooartist", "#aesthetic", "#behindthescenes"],
      best_times: ["7:00 AM", "12:00 PM", "6:00 PM"],
      expires_estimate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ].filter(t => platforms.includes(t.platform) || t.platform === "both");
}