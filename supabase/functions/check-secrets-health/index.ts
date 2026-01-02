import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecretHealth {
  name: string;
  configured: boolean;
  service: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secrets: SecretHealth[] = [];

    // Check Resend API Key
    const resendKey = Deno.env.get("RESEND_API_KEY");
    secrets.push({
      name: "RESEND_API_KEY",
      configured: !!resendKey && resendKey.length > 10,
      service: "Email (Resend)"
    });

    // Check Stripe Secret Key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    secrets.push({
      name: "STRIPE_SECRET_KEY",
      configured: !!stripeKey && stripeKey.startsWith("sk_"),
      service: "Stripe Payments"
    });

    // Check OpenAI API Key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    secrets.push({
      name: "OPENAI_API_KEY",
      configured: !!openaiKey && openaiKey.startsWith("sk-"),
      service: "OpenAI"
    });

    // Check Google OAuth credentials
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    secrets.push({
      name: "GOOGLE_OAUTH",
      configured: !!googleClientId && !!googleClientSecret,
      service: "Google Calendar"
    });

    // Check Synthesia API Key (for video avatars)
    const synthesiaKey = Deno.env.get("SYNTHESIA_API_KEY");
    secrets.push({
      name: "SYNTHESIA_API_KEY",
      configured: !!synthesiaKey && synthesiaKey.length > 10,
      service: "Video Avatars"
    });

    // Check ElevenLabs API Key (for voice cloning)
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    secrets.push({
      name: "ELEVENLABS_API_KEY",
      configured: !!elevenLabsKey && elevenLabsKey.length > 10,
      service: "Voice Cloning"
    });

    // Check Instagram credentials
    const instagramToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    secrets.push({
      name: "INSTAGRAM_ACCESS_TOKEN",
      configured: !!instagramToken && instagramToken.length > 20,
      service: "Instagram"
    });

    // Check TikTok credentials
    const tiktokToken = Deno.env.get("TIKTOK_ACCESS_TOKEN");
    secrets.push({
      name: "TIKTOK_ACCESS_TOKEN",
      configured: !!tiktokToken && tiktokToken.length > 20,
      service: "TikTok"
    });

    // Lovable AI - always available (built into platform)
    secrets.push({
      name: "LOVABLE_AI",
      configured: true, // Always available - provided by platform
      service: "Lovable AI (Built-in)"
    });

    // Summary
    const configuredCount = secrets.filter(s => s.configured).length;
    const totalCount = secrets.length;

    console.log(`[SECRETS_HEALTH] ${configuredCount}/${totalCount} secrets configured`);

    return new Response(JSON.stringify({
      success: true,
      secrets,
      summary: {
        configured: configuredCount,
        total: totalCount,
        percentage: Math.round((configuredCount / totalCount) * 100)
      }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: unknown) {
    console.error("[CHECK_SECRETS_ERROR]", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to check secrets health"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});
