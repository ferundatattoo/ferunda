import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-honeypot",
};

type PublicBookingStatusRequest = {
  trackingCode?: string;
  honeypot?: string; // Hidden field - should always be empty
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeTrackingCode(input: string) {
  return input.trim().toUpperCase();
}

// Validate 32-character hex tracking code
function isValidTrackingCode(code: string) {
  return /^[A-F0-9]{32}$/.test(code);
}

// Simple proof-of-work validation
function validateProofOfWork(nonce: string, difficulty: number = 2): boolean {
  if (!nonce) return false;
  // Check if hash starts with required zeros (simplified PoW)
  return nonce.startsWith('0'.repeat(difficulty));
}

// In-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number; blocked: boolean }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  const blockDuration = 300000; // 5 minutes
  
  const limit = rateLimitMap.get(ip);
  
  if (limit?.blocked && now < limit.resetAt) {
    return { allowed: false, remaining: 0 };
  }
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs, blocked: false });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (limit.count >= maxRequests) {
    rateLimitMap.set(ip, { count: limit.count, resetAt: now + blockDuration, blocked: true });
    return { allowed: false, remaining: 0 };
  }
  
  limit.count++;
  return { allowed: true, remaining: maxRequests - limit.count };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Rate limiting
  const rateCheck = checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    return json(429, { error: "Too many requests. Please try again later." });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PublicBookingStatusRequest;
    
    // HONEYPOT CHECK - This field should never be filled by real users
    const honeypotHeader = req.headers.get("x-honeypot");
    if (body.honeypot || honeypotHeader) {
      console.warn("Honeypot triggered from IP:", clientIP);
      
      // Log to database
      const url = Deno.env.get("SUPABASE_URL")?.trim();
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
      
      if (url && serviceRoleKey) {
        const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
        await supabase.rpc('log_honeypot_trigger', {
          p_ip_address: clientIP,
          p_user_agent: userAgent,
          p_trigger_type: 'form_field',
          p_trigger_details: { endpoint: 'public-booking-status' }
        });
      }
      
      // Return fake success to waste bot's time
      return json(200, { booking: { status: "pending", tracking_code: "FAKE12345678901234567890123456" } });
    }
    
    const trackingCode = normalizeTrackingCode(body.trackingCode || "");

    if (!trackingCode) return json(400, { error: "Missing trackingCode" });
    
    // Validate 32-character format
    if (!isValidTrackingCode(trackingCode)) {
      return json(400, { error: "Invalid tracking code format. Please use the 32-character code from your confirmation email." });
    }

    const url = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

    if (!url) return json(500, { error: "Server not configured: missing SUPABASE_URL" });
    if (!serviceRoleKey) return json(500, { error: "Server not configured: missing SUPABASE_SERVICE_ROLE_KEY" });

    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check if tracking code is expired
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "tracking_code,status,pipeline_stage,created_at,updated_at,scheduled_date,scheduled_time,deposit_paid,deposit_amount,session_rate,tracking_code_expires_at"
      )
      .eq("tracking_code", trackingCode)
      .maybeSingle();

    if (error) {
      console.error("public-booking-status db error", error);
      return json(500, { error: "Database error" });
    }

    if (!data) {
      // Log failed lookup
      await supabase.rpc('append_security_log', {
        p_event_type: 'tracking_code_invalid',
        p_ip_address: clientIP,
        p_success: false,
        p_details: { tracking_code_prefix: trackingCode.substring(0, 8) }
      });
      
      return json(404, { error: "Booking not found. Please verify your tracking code." });
    }

    // Check if tracking code is expired
    if (data.tracking_code_expires_at && new Date(data.tracking_code_expires_at) < new Date()) {
      return json(403, { 
        error: "Tracking code has expired. Please request a magic link via email for continued access.",
        expired: true
      });
    }

    // Log successful lookup
    await supabase.rpc('append_security_log', {
      p_event_type: 'tracking_code_lookup',
      p_ip_address: clientIP,
      p_success: true,
      p_details: { tracking_code_prefix: trackingCode.substring(0, 8) }
    });

    // Don't expose tracking_code_expires_at to client
    const { tracking_code_expires_at, ...safeData } = data;

    return json(200, { booking: safeData });
  } catch (e) {
    console.error("public-booking-status error", e);
    return json(500, { error: "Unexpected server error" });
  }
});
