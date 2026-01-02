import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecretHealth {
  name: string;
  configured: boolean;
  service: string;
  category: 'core' | 'ai' | 'social' | 'payments' | 'video';
  description?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secrets: SecretHealth[] = [];

    // ========== CORE SERVICES ==========
    
    // Check Resend API Key
    const resendKey = Deno.env.get("RESEND_API_KEY");
    secrets.push({
      name: "RESEND_API_KEY",
      configured: !!resendKey && resendKey.length > 10,
      service: "Email (Resend)",
      category: 'core',
      description: 'Send transactional emails and notifications',
    });

    // Check Google OAuth credentials
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    secrets.push({
      name: "GOOGLE_OAUTH",
      configured: !!googleClientId && !!googleClientSecret,
      service: "Google Calendar",
      category: 'core',
      description: 'Sync appointments with Google Calendar',
    });

    // ========== AI SERVICES ==========
    
    // Lovable AI - always available (built into platform)
    secrets.push({
      name: "LOVABLE_AI",
      configured: true, // Always available - provided by platform
      service: "Lovable AI (Built-in)",
      category: 'ai',
      description: 'Gemini, Flux, and other AI models - no API key needed',
    });

    // Check OpenAI API Key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    secrets.push({
      name: "OPENAI_API_KEY",
      configured: !!openaiKey && openaiKey.startsWith("sk-"),
      service: "OpenAI (GPT-4, DALL-E)",
      category: 'ai',
      description: 'Optional: Additional AI models from OpenAI',
    });

    // Check Anthropic API Key
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    secrets.push({
      name: "ANTHROPIC_API_KEY",
      configured: !!anthropicKey && anthropicKey.startsWith("sk-"),
      service: "Anthropic Claude",
      category: 'ai',
      description: 'Optional: Claude AI models',
    });

    // Check Replicate API Key
    const replicateKey = Deno.env.get("REPLICATE_API_KEY");
    secrets.push({
      name: "REPLICATE_API_KEY",
      configured: !!replicateKey && replicateKey.length > 10,
      service: "Replicate (Image Gen)",
      category: 'ai',
      description: 'Optional: Additional image generation models',
    });

    // Check HuggingFace Access Token
    const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    secrets.push({
      name: "HUGGING_FACE_ACCESS_TOKEN",
      configured: !!hfToken && hfToken.length > 10,
      service: "HuggingFace (Vision/ML)",
      category: 'ai',
      description: 'Vision analysis and ML inference',
    });

    // Check ElevenLabs API Key (for voice cloning)
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    secrets.push({
      name: "ELEVENLABS_API_KEY",
      configured: !!elevenLabsKey && elevenLabsKey.length > 10,
      service: "Voice Cloning (ElevenLabs)",
      category: 'ai',
      description: 'AI voice cloning and text-to-speech',
    });

    // ========== VIDEO SERVICES ==========

    // Check Synthesia API Key (for video avatars)
    const synthesiaKey = Deno.env.get("SYNTHESIA_API_KEY");
    secrets.push({
      name: "SYNTHESIA_API_KEY",
      configured: !!synthesiaKey && synthesiaKey.length > 10,
      service: "Video Avatars (Synthesia)",
      category: 'video',
      description: 'AI video avatar generation',
    });

    // ========== SOCIAL SERVICES ==========

    // Check Instagram credentials
    const instagramToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    secrets.push({
      name: "INSTAGRAM_ACCESS_TOKEN",
      configured: !!instagramToken && instagramToken.length > 20,
      service: "Instagram",
      category: 'social',
      description: 'Post to Instagram and fetch content',
    });

    // Check TikTok credentials
    const tiktokToken = Deno.env.get("TIKTOK_ACCESS_TOKEN");
    secrets.push({
      name: "TIKTOK_ACCESS_TOKEN",
      configured: !!tiktokToken && tiktokToken.length > 20,
      service: "TikTok",
      category: 'social',
      description: 'Upload videos to TikTok',
    });

    const tiktokOpenId = Deno.env.get("TIKTOK_OPEN_ID");
    secrets.push({
      name: "TIKTOK_OPEN_ID",
      configured: !!tiktokOpenId && tiktokOpenId.length > 10,
      service: "TikTok User ID",
      category: 'social',
      description: 'TikTok user identification',
    });

    // ========== PAYMENT SERVICES ==========

    // Check Stripe Secret Key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    secrets.push({
      name: "STRIPE_SECRET_KEY",
      configured: !!stripeKey && stripeKey.startsWith("sk_"),
      service: "Stripe Payments",
      category: 'payments',
      description: 'Process payments and deposits',
    });

    // Check Stripe Webhook Secret
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    secrets.push({
      name: "STRIPE_WEBHOOK_SECRET",
      configured: !!stripeWebhookSecret && stripeWebhookSecret.startsWith("whsec_"),
      service: "Stripe Webhooks",
      category: 'payments',
      description: 'Handle Stripe payment events',
    });

    // Calculate summaries by category
    const categories = ['core', 'ai', 'social', 'payments', 'video'] as const;
    const categoryStats = categories.map(cat => {
      const catSecrets = secrets.filter(s => s.category === cat);
      const configured = catSecrets.filter(s => s.configured).length;
      return {
        category: cat,
        configured,
        total: catSecrets.length,
        percentage: catSecrets.length > 0 ? Math.round((configured / catSecrets.length) * 100) : 0,
      };
    });

    // Overall summary
    const configuredCount = secrets.filter(s => s.configured).length;
    const totalCount = secrets.length;

    console.log(`[SECRETS_HEALTH] ${configuredCount}/${totalCount} secrets configured`);

    return new Response(JSON.stringify({
      success: true,
      secrets,
      categoryStats,
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
