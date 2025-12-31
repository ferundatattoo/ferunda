import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArtistDescription {
  artistName: string;
  description: string;
  experienceLevel?: string;
  location?: string;
  portfolioImages?: string[];
}

interface GeneratedConfig {
  services: Array<{
    name: string;
    description: string;
    duration_minutes: number;
    deposit_amount: number;
    hourly_rate: number;
    is_active: boolean;
  }>;
  policies: {
    cancellation_window_hours: number;
    reschedule_window_hours: number;
    late_threshold_minutes: number;
    deposit_type: string;
    deposit_percent: number;
    deposit_fixed: number;
    no_show_rule: string;
  };
  styles: string[];
  priceRange: {
    hourly_min: number;
    hourly_max: number;
  };
  suggestions: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    if (action === "generate-config") {
      return await generateArtistConfig(data as ArtistDescription);
    }

    if (action === "analyze-style") {
      return await analyzePortfolioStyle(data.imageUrl);
    }

    if (action === "suggest-pricing") {
      return await suggestPricing(data);
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Setup error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateArtistConfig(input: ArtistDescription): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const systemPrompt = `You are an expert tattoo business consultant. Based on the artist description, generate a complete business configuration.

You must return a valid JSON object with this exact structure:
{
  "services": [
    {
      "name": "Service name",
      "description": "Brief description",
      "duration_minutes": number (30-480),
      "deposit_amount": number (0-500),
      "hourly_rate": number (100-500),
      "is_active": true
    }
  ],
  "policies": {
    "cancellation_window_hours": number (24-168),
    "reschedule_window_hours": number (24-168),
    "late_threshold_minutes": number (10-60),
    "deposit_type": "fixed" or "percent",
    "deposit_percent": number (10-50),
    "deposit_fixed": number (50-500),
    "no_show_rule": "deposit forfeited" or "full charge" or "reschedule only"
  },
  "styles": ["style1", "style2"],
  "priceRange": {
    "hourly_min": number,
    "hourly_max": number
  },
  "suggestions": ["suggestion1", "suggestion2"]
}

Consider:
- Experience level affects pricing
- Location affects rates (major cities = higher)
- Style specialty affects service offerings
- More established artists can have stricter policies
- Always include consultation as a free/low-cost option`;

  const userPrompt = `Artist: ${input.artistName}
Description: ${input.description}
Experience: ${input.experienceLevel || "Not specified"}
Location: ${input.location || "Not specified"}

Generate a complete configuration for this artist.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const config: GeneratedConfig = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ success: true, config }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Config generation error:", error);
    
    // Return fallback config
    const fallbackConfig: GeneratedConfig = {
      services: [
        { name: "Consultation", description: "Discuss your tattoo idea", duration_minutes: 30, deposit_amount: 0, hourly_rate: 0, is_active: true },
        { name: "Small Piece (2-3h)", description: "Small to medium designs", duration_minutes: 150, deposit_amount: 100, hourly_rate: 200, is_active: true },
        { name: "Medium Session (4-5h)", description: "Detailed work", duration_minutes: 270, deposit_amount: 150, hourly_rate: 200, is_active: true },
        { name: "Full Day (6-8h)", description: "Large scale projects", duration_minutes: 420, deposit_amount: 300, hourly_rate: 200, is_active: true },
      ],
      policies: {
        cancellation_window_hours: 72,
        reschedule_window_hours: 72,
        late_threshold_minutes: 30,
        deposit_type: "fixed",
        deposit_percent: 30,
        deposit_fixed: 150,
        no_show_rule: "deposit forfeited",
      },
      styles: ["Custom", "Traditional"],
      priceRange: { hourly_min: 150, hourly_max: 250 },
      suggestions: ["Consider adding portfolio images for better recommendations"],
    };

    return new Response(
      JSON.stringify({ success: true, config: fallbackConfig, fallback: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function analyzePortfolioStyle(imageUrl: string): Promise<Response> {
  const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
  
  if (!HF_TOKEN) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        styles: ["Custom Work"],
        confidence: 0.5,
        note: "Add Hugging Face token for AI style analysis"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const hf = new HfInference(HF_TOKEN);
    
    // Fetch the image as a blob
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    // Use image classification model
    const response = await hf.imageClassification({
      model: "microsoft/resnet-50",
      data: imageBlob,
    });

    // Map classifications to tattoo styles
    const styleMap: Record<string, string[]> = {
      "person": ["Portrait", "Realism"],
      "animal": ["Wildlife", "Realism"],
      "flower": ["Floral", "Botanical"],
      "skull": ["Dark Art", "Traditional"],
      "geometric": ["Geometric", "Blackwork"],
      "lion": ["Wildlife", "Neo-Traditional"],
      "dragon": ["Japanese", "Fantasy"],
      "rose": ["Traditional", "Floral"],
      "snake": ["Traditional", "Dark Art"],
      "tribal": ["Tribal", "Blackwork"],
    };

    const detectedStyles = new Set<string>();
    
    for (const item of response.slice(0, 5)) {
      const label = item.label.toLowerCase();
      for (const [keyword, styles] of Object.entries(styleMap)) {
        if (label.includes(keyword)) {
          styles.forEach(s => detectedStyles.add(s));
        }
      }
    }

    const stylesArray = Array.from(detectedStyles);
    if (stylesArray.length === 0) {
      stylesArray.push("Custom Work", "Fine Line");
    }

    return new Response(
      JSON.stringify({
        success: true,
        styles: stylesArray,
        confidence: response[0]?.score || 0.5,
        rawClassifications: response.slice(0, 5),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Style analysis error:", error);
    return new Response(
      JSON.stringify({
        success: true,
        styles: ["Custom Work"],
        confidence: 0.3,
        error: "Analysis failed, using defaults"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function suggestPricing(data: { 
  location: string; 
  experience: string; 
  styles: string[] 
}): Promise<Response> {
  // Base rates by experience
  const experienceRates: Record<string, { min: number; max: number }> = {
    "beginner": { min: 80, max: 150 },
    "intermediate": { min: 150, max: 250 },
    "experienced": { min: 200, max: 350 },
    "master": { min: 300, max: 500 },
  };

  // Location multipliers
  const locationMultipliers: Record<string, number> = {
    "new york": 1.4,
    "los angeles": 1.3,
    "miami": 1.2,
    "chicago": 1.15,
    "austin": 1.1,
    "houston": 1.05,
    "default": 1.0,
  };

  // Style premiums
  const stylePremiums: Record<string, number> = {
    "realism": 1.3,
    "micro realism": 1.4,
    "portrait": 1.25,
    "japanese": 1.2,
    "geometric": 1.1,
    "blackwork": 1.05,
    "traditional": 1.0,
    "fine line": 1.15,
  };

  const baseRate = experienceRates[data.experience.toLowerCase()] || experienceRates["intermediate"];
  
  // Find location multiplier
  let locationMult = locationMultipliers["default"];
  for (const [loc, mult] of Object.entries(locationMultipliers)) {
    if (data.location.toLowerCase().includes(loc)) {
      locationMult = mult;
      break;
    }
  }

  // Find highest style premium
  let styleMult = 1.0;
  for (const style of data.styles) {
    const premium = stylePremiums[style.toLowerCase()] || 1.0;
    styleMult = Math.max(styleMult, premium);
  }

  const finalMin = Math.round(baseRate.min * locationMult * styleMult);
  const finalMax = Math.round(baseRate.max * locationMult * styleMult);

  // Generate deposit recommendations
  const deposits = {
    consultation: 0,
    small_session: Math.round(finalMin * 0.5),
    medium_session: Math.round(finalMin * 0.75),
    large_session: Math.round(finalMax * 0.5),
  };

  return new Response(
    JSON.stringify({
      success: true,
      pricing: {
        hourly_min: finalMin,
        hourly_max: finalMax,
        suggested_rate: Math.round((finalMin + finalMax) / 2),
      },
      deposits,
      factors: {
        location: data.location,
        locationMultiplier: locationMult,
        experience: data.experience,
        experienceRange: baseRate,
        styles: data.styles,
        styleMultiplier: styleMult,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
