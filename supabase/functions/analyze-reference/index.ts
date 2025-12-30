import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referenceId, imageUrls } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to analyzing
    if (referenceId) {
      await supabase
        .from('tattoo_references')
        .update({ analysis_status: 'analyzing' })
        .eq('id', referenceId);
    }

    console.log(`Analyzing ${imageUrls.length} reference images`);

    // Build content array with images for multimodal analysis
    const imageContent = await Promise.all(
      imageUrls.map(async (url: string) => {
        try {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          return {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          };
        } catch (e) {
          console.error(`Failed to fetch image ${url}:`, e);
          return null;
        }
      })
    );

    const validImages = imageContent.filter(Boolean);

    if (validImages.length === 0) {
      throw new Error("Could not process any images");
    }

    const systemPrompt = `You are an expert tattoo artist consultant analyzing reference images for a tattoo studio. 
Analyze the provided tattoo reference images and provide a detailed assessment.

Your response MUST be valid JSON with this exact structure:
{
  "style_detected": ["array of detected tattoo styles like 'fine line', 'blackwork', 'neo-traditional', etc."],
  "complexity_score": number from 1-10 (1=simple, 10=extremely complex),
  "estimated_hours": number representing estimated session hours,
  "color_palette": ["array of colors detected or recommended"],
  "placement_suggestions": ["array of body placement recommendations based on design"],
  "technical_notes": "string with technical observations about the design",
  "client_preparation": "string with advice for the client",
  "potential_challenges": ["array of potential challenges in executing this design"],
  "style_description": "brief description of the overall aesthetic",
  "size_recommendation": "recommended size range in inches"
}

Be specific and professional. Focus on practical information that helps both the artist and client.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Please analyze these tattoo reference images and provide your professional assessment:" },
              ...validImages
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("Raw AI response:", content);

    // Parse the JSON response
    let analysisReport;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisReport = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Create a fallback report
      analysisReport = {
        style_detected: ["Unable to determine"],
        complexity_score: 5,
        estimated_hours: 2,
        color_palette: ["black"],
        placement_suggestions: ["Consult with artist"],
        technical_notes: content,
        client_preparation: "Please discuss with your artist",
        potential_challenges: [],
        style_description: "Analysis pending manual review",
        size_recommendation: "To be determined"
      };
    }

    // Update the reference record with analysis
    if (referenceId) {
      const { error: updateError } = await supabase
        .from('tattoo_references')
        .update({
          analysis_report: analysisReport,
          analysis_status: 'completed',
          style_detected: analysisReport.style_detected || [],
          complexity_score: analysisReport.complexity_score || null,
          estimated_hours: analysisReport.estimated_hours || null,
          color_palette: analysisReport.color_palette || [],
          placement_suggestions: analysisReport.placement_suggestions || []
        })
        .eq('id', referenceId);

      if (updateError) {
        console.error("Failed to update reference:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisReport,
        referenceId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Analysis error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Analysis failed",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});