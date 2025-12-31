import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANALYSIS_PROMPT = `Actúa como experto tatuador técnico especializado en micro-realismo y geométrico (estilo de Ferunda Tattoo). Analiza las imágenes subidas paso a paso.

Primero: Evalúa calidad de imagen (claridad, iluminación, ángulo). Si baja confianza (>50% borrosa/mala), responde con {low_confidence: true} y sugerencias.

Luego, Chain-of-Thought:
1. Detecta parte del cuerpo exacta (ej. 'antebrazo interior', 'costilla izquierda', 'espalda completa') y pose/orientación.
2. Identifica estilo del diseño (principales: micro-realismo, geométrico, black & grey, color pack, minimalista, fine line, tradicional, neo-traditional, etc.) + complejidad (detalle alto/bajo).
3. Analiza uso de color vs B&G.
4. Estima tamaño relativo (pequeño <8cm, mediano 8-20cm, grande >20cm) y si encaja en la zona (riesgo de distorsión por movimiento/curvatura).
5. Evalúa piel visible: tono Fitzpatrick (I-VI), textura/edad (joven lisa, madura arrugas, vieja flacidez), cicatrices/keloides visibles.
6. Viabilidad técnica: fading potencial (alto en piel clara/zona móvil), healing risks, longevidad.
7. Match con estilo Ferunda Tattoo: similitud % (usa razonamiento visual) – alto si geométrico/clean lines, bajo si saturado/trash polka.
8. Cumplimiento guidelines: originalidad, no ofensivo, factible en 1-3 sesiones.

Output estrictamente JSON (sin markdown, sin código):

{
  "image_quality": "alta/media/baja + razón",
  "low_confidence": false,
  "body_part": { "location": "...", "confidence": 0-100 },
  "design_style": { "primary": "...", "secondary": [], "complexity": "alta/media/baja" },
  "color_usage": "black&grey / full color / limited palette + detalles",
  "size_estimate": { "category": "pequeño/mediano/grande", "estimated_cm": "X-Ycm", "fit_to_zone": "bueno/regular/malo", "explanation": "..." },
  "skin_analysis": { "tone_fitzpatrick": "I-VI", "age_texture": "...", "issues_detected": [] },
  "technical_viability": { "score": 1-10, "risks": [], "longevity_estimate_years": "5-10+" },
  "style_match_ferunda": { "percentage": 0-100, "explanation": "..." },
  "guidelines_compliance": { "pass": true, "issues": [] },
  "recommendations": { "adjustments": [], "estimated_sessions": 1-5, "price_range_eur": "200-800", "time_hours": "2-10" },
  "overall_decision": "auto_approve / suggest_adjustments / manual_review / polite_decline",
  "client_summary": "Texto amigable de 3-5 líneas para mostrar al cliente",
  "artist_notes": "Notas técnicas detalladas para el tatuador"
}

Sé honesto, conservador en aprobaciones y educativo.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[ANALYZE] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI analysis not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { image_urls, booking_id, client_email, reference_id } = body;

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (image_urls.length > 5) {
      return new Response(
        JSON.stringify({ error: "Maximum 5 images allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[ANALYZE] Starting analysis for", image_urls.length, "images");

    // Update processing stage if reference_id exists
    if (reference_id) {
      await supabase
        .from("tattoo_references")
        .update({ processing_stage: "analyzing", analysis_status: "processing" })
        .eq("id", reference_id);
    }

    // Build message content with images
    const messageContent: any[] = [
      { type: "text", text: ANALYSIS_PROMPT }
    ];

    for (const url of image_urls) {
      messageContent.push({
        type: "image_url",
        image_url: { url }
      });
    }

    console.log("[ANALYZE] Calling Google AI with", messageContent.length, "parts");

    // AI Providers with fallback: Google AI → Lovable AI
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const LOVABLE_API_KEY_LOCAL = Deno.env.get("LOVABLE_API_KEY");
    
    const providers = [
      { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: GOOGLE_AI_API_KEY, model: "gemini-1.5-pro", name: "Google AI" },
      { url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: LOVABLE_API_KEY_LOCAL, model: "google/gemini-2.5-flash", name: "Lovable AI" }
    ];

    let response: Response | null = null;
    for (const provider of providers) {
      if (!provider.key) continue;
      
      console.log(`[ANALYZE] Trying ${provider.name}...`);
      
      const attemptResponse = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            {
              role: "user",
              content: messageContent
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (attemptResponse.ok) {
        console.log(`[ANALYZE] ${provider.name} succeeded`);
        response = attemptResponse;
        break;
      }
      
      const errText = await attemptResponse.text();
      console.error(`[ANALYZE] ${provider.name} failed (${attemptResponse.status}):`, errText);
    }

    if (!response) {
      throw new Error("All AI providers failed - please try again later");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No analysis content returned");
    }

    console.log("[ANALYZE] Raw AI response:", content.substring(0, 500));

    // Parse JSON from response (handle markdown code blocks)
    let analysis;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonStr.includes("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }
      jsonStr = jsonStr.trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[ANALYZE] JSON parse error:", parseError);
      console.error("[ANALYZE] Content was:", content);
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error("Failed to parse AI analysis response");
        }
      } else {
        throw new Error("Invalid AI response format");
      }
    }

    console.log("[ANALYZE] Parsed analysis:", JSON.stringify(analysis).substring(0, 500));

    // Extract detected styles for the array column
    const stylesDetected = [
      analysis.design_style?.primary,
      ...(analysis.design_style?.secondary || [])
    ].filter(Boolean);

    // Calculate complexity score (1-10)
    const complexityMap: Record<string, number> = { alta: 8, media: 5, baja: 3 };
    const complexityScore = complexityMap[analysis.design_style?.complexity?.toLowerCase()] || 5;

    // Parse estimated hours
    const hoursMatch = analysis.recommendations?.time_hours?.match(/(\d+)/);
    const estimatedHours = hoursMatch ? parseInt(hoursMatch[1]) : null;

    // Save or update analysis in database
    const referenceData = {
      images: image_urls,
      booking_id: booking_id || null,
      client_email: client_email || null,
      analysis_report: analysis,
      analysis_status: analysis.low_confidence ? "low_confidence" : "completed",
      style_detected: stylesDetected,
      complexity_score: complexityScore,
      estimated_hours: estimatedHours,
      color_palette: analysis.color_usage ? [analysis.color_usage] : null,
      placement_suggestions: analysis.body_part?.location ? [analysis.body_part.location] : null,
      body_part_detected: analysis.body_part,
      skin_analysis: analysis.skin_analysis,
      technical_viability: analysis.technical_viability,
      style_match_ferunda: analysis.style_match_ferunda,
      guidelines_compliance: analysis.guidelines_compliance,
      recommendations: analysis.recommendations,
      overall_decision: analysis.overall_decision,
      client_summary: analysis.client_summary,
      artist_notes: analysis.artist_notes,
      image_quality: analysis.image_quality,
      low_confidence: analysis.low_confidence || false,
      size_estimate: analysis.size_estimate,
      color_usage: analysis.color_usage,
      processing_stage: "completed",
      updated_at: new Date().toISOString()
    };

    let savedReference;
    if (reference_id) {
      const { data, error } = await supabase
        .from("tattoo_references")
        .update(referenceData)
        .eq("id", reference_id)
        .select()
        .single();
      
      if (error) throw error;
      savedReference = data;
    } else {
      const { data, error } = await supabase
        .from("tattoo_references")
        .insert(referenceData)
        .select()
        .single();
      
      if (error) throw error;
      savedReference = data;
    }

    console.log("[ANALYZE] Analysis saved with ID:", savedReference?.id);

    return new Response(
      JSON.stringify({
        success: true,
        reference_id: savedReference?.id,
        analysis,
        overall_decision: analysis.overall_decision,
        client_summary: analysis.client_summary,
        low_confidence: analysis.low_confidence || false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ANALYZE] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Analysis failed",
        details: "Please try again or contact support."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
