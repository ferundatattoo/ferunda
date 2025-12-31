import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platforms = ["tiktok", "instagram"], niche = "tattoo" } = await req.json();
    
    console.log(`Scanning trends for platforms: ${platforms.join(", ")}, niche: ${niche}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate mock trends using AI analysis logic
    // In production, this would integrate with TikTok Creative API and Instagram Graph API
    const mockTrends = generateTattooTrends(platforms, niche);

    // Insert new trends into database
    let insertedCount = 0;
    for (const trend of mockTrends) {
      const { error } = await supabase
        .from("social_trends")
        .upsert({
          ...trend,
          detected_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "title",
          ignoreDuplicates: true 
        });
      
      if (!error) {
        insertedCount++;
      }
    }

    console.log(`Inserted ${insertedCount} new trends`);

    return new Response(
      JSON.stringify({ 
        success: true,
        newTrends: insertedCount,
        scannedPlatforms: platforms,
        message: `Found ${mockTrends.length} trends, inserted ${insertedCount} new ones`
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error scanning trends:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        newTrends: 0
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

function generateTattooTrends(platforms: string[], niche: string) {
  // Mock trend data - in production this would come from API analysis
  const trendTemplates = [
    {
      platform: "tiktok" as const,
      trend_type: "format" as const,
      title: "POV: Mi cliente dijo 'algo pequeño'",
      description: "Mostrar la reacción del artista cuando el cliente pide algo pequeño y termina siendo un proyecto grande",
      viral_score: 94,
      views_estimate: "12.5M",
      engagement_rate: 8.7,
      audio_name: "Dramatic Sound Effect",
      adaptability_score: 95,
      tattoo_relevance: "perfect" as const,
      suggested_script: {
        scenes: [
          { order: 1, duration: "2s", visual: "😮", action: "Tu cara cuando el cliente dice 'quiero algo pequeño'", text_overlay: "POV: Cliente dice 'algo pequeño'" },
          { order: 2, duration: "3s", visual: "📱", action: "Cliente mostrando referencia de manga completa", text_overlay: "La referencia:" },
          { order: 3, duration: "4s", visual: "✨", action: "Montaje rápido del proceso de tatuar", text_overlay: "8 horas después..." },
          { order: 4, duration: "2s", visual: "🎨", action: "Reveal del resultado final", text_overlay: "El resultado" }
        ]
      },
      hashtags: ["#tattoo", "#tattooartist", "#microrealism", "#fyp", "#viral"],
      best_posting_times: ["12:00 PM", "6:00 PM", "9:00 PM"],
      status: "hot" as const,
      expires_estimate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      platform: "instagram" as const,
      trend_type: "format" as const,
      title: "Microrealism Process Reveal",
      description: "Video de proceso con reveal dramático del resultado final usando transición suave",
      viral_score: 91,
      views_estimate: "8.2M",
      engagement_rate: 12.3,
      audio_name: "Aesthetic Piano",
      adaptability_score: 98,
      tattoo_relevance: "perfect" as const,
      suggested_script: {
        scenes: [
          { order: 1, duration: "3s", visual: "🎬", action: "Close-up de tu mano preparando equipo", text_overlay: null },
          { order: 2, duration: "5s", visual: "✍️", action: "Tomas del proceso de tatuar en diferentes ángulos", text_overlay: "Creating..." },
          { order: 3, duration: "2s", visual: "💫", action: "Transición con wipe hacia resultado", text_overlay: null },
          { order: 4, duration: "3s", visual: "🖼️", action: "Resultado final con zoom out lento", text_overlay: "@ferunda" }
        ]
      },
      hashtags: ["#microrealism", "#tattooprocess", "#reels", "#tattoo", "#fineline"],
      best_posting_times: ["10:00 AM", "2:00 PM", "7:00 PM"],
      status: "rising" as const,
      expires_estimate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      platform: "both" as const,
      trend_type: "format" as const,
      title: "La historia detrás del tattoo",
      description: "Cliente cuenta la historia emocional detrás de su tatuaje mientras muestras el proceso",
      viral_score: 88,
      views_estimate: "15.1M",
      engagement_rate: 15.2,
      audio_name: "Emotional Storytelling",
      adaptability_score: 85,
      tattoo_relevance: "high" as const,
      suggested_script: {
        scenes: [
          { order: 1, duration: "3s", visual: "🎤", action: "Cliente hablando a cámara sobre el significado", text_overlay: "Su historia:" },
          { order: 2, duration: "4s", visual: "📸", action: "Fotos/videos del contexto de la historia", text_overlay: null },
          { order: 3, duration: "5s", visual: "✨", action: "Proceso de creación del tatuaje", text_overlay: "El proceso" },
          { order: 4, duration: "3s", visual: "😢", action: "Reacción emocional del cliente al ver resultado", text_overlay: "Su reacción" }
        ]
      },
      hashtags: ["#tattoostory", "#meaningfultattoo", "#tattooartist", "#emotional", "#storytime"],
      best_posting_times: ["8:00 PM", "9:00 PM", "10:00 PM"],
      status: "stable" as const,
      expires_estimate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      platform: "tiktok" as const,
      trend_type: "sound" as const,
      title: "Before vs After Transformation",
      description: "Usar audio trending para mostrar transformación dramática de cover-up o rework",
      viral_score: 86,
      views_estimate: "6.8M",
      engagement_rate: 9.1,
      audio_name: "Glow Up Sound",
      adaptability_score: 80,
      tattoo_relevance: "high" as const,
      suggested_script: {
        scenes: [
          { order: 1, duration: "2s", visual: "😬", action: "Mostrar tatuaje viejo/problema", text_overlay: "Before" },
          { order: 2, duration: "1s", visual: "⚡", action: "Transición con beat del audio", text_overlay: null },
          { order: 3, duration: "3s", visual: "🔥", action: "Reveal del cover-up terminado", text_overlay: "After" }
        ]
      },
      hashtags: ["#coverup", "#tattoocoverup", "#transformation", "#beforeafter", "#glowup"],
      best_posting_times: ["1:00 PM", "5:00 PM", "8:00 PM"],
      status: "hot" as const,
      expires_estimate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      platform: "instagram" as const,
      trend_type: "format" as const,
      title: "Day in the Life - Tattoo Artist Edition",
      description: "Mostrar un día completo en el estudio con aesthetic premium",
      viral_score: 82,
      views_estimate: "4.5M",
      engagement_rate: 7.8,
      audio_name: "Lo-fi Aesthetic",
      adaptability_score: 90,
      tattoo_relevance: "medium" as const,
      suggested_script: {
        scenes: [
          { order: 1, duration: "2s", visual: "☀️", action: "Morning routine / café", text_overlay: "6:00 AM" },
          { order: 2, duration: "2s", visual: "🚗", action: "Llegando al estudio", text_overlay: "9:00 AM" },
          { order: 3, duration: "3s", visual: "🎨", action: "Preparando diseño", text_overlay: "10:00 AM" },
          { order: 4, duration: "4s", visual: "✍️", action: "Sesión de tatuaje", text_overlay: "2:00 PM" },
          { order: 5, duration: "2s", visual: "🌙", action: "Cerrando el día / resultado", text_overlay: "8:00 PM" }
        ]
      },
      hashtags: ["#dayinthelife", "#tattooartist", "#aesthetic", "#artistlife", "#behindthescenes"],
      best_posting_times: ["7:00 AM", "12:00 PM", "6:00 PM"],
      status: "stable" as const,
      expires_estimate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Filter by requested platforms
  return trendTemplates.filter(trend => 
    platforms.includes(trend.platform) || trend.platform === "both"
  );
}