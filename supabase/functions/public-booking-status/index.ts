import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://ferunda.com',
  'https://www.ferunda.com',
  'https://preview--ferunda-ink.lovable.app',
  'https://ferunda-ink.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080'
];

function getCorsHeaders(origin: string) {
  // Allow Lovable preview domains dynamically
  const isLovablePreview = origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || isLovablePreview ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-honeypot, x-fingerprint-hash, x-pow-nonce",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

type PublicBookingStatusRequest = {
  trackingCode?: string;
  honeypot?: string; // Hidden field - should always be empty
  powNonce?: string; // Proof of work nonce
};

function json(status: number, body: unknown, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function normalizeTrackingCode(input: string) {
  return input.trim().toUpperCase();
}

// Validate 32-character hex tracking code
function isValidTrackingCode(code: string) {
  return /^[A-F0-9]{32}$/.test(code);
}

// Hash function for proof-of-work verification
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify proof-of-work challenge
async function verifyProofOfWork(trackingCode: string, nonce: string, difficulty: number = 3): Promise<boolean> {
  if (!nonce || nonce.length > 20) return false;
  
  const challenge = `${trackingCode}:${nonce}`;
  const hash = await sha256(challenge);
  
  // Check if hash starts with required zeros
  return hash.startsWith('0'.repeat(difficulty));
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
  const origin = req.headers.get("origin") || '';
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, origin);
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const fingerprintHash = req.headers.get("x-fingerprint-hash") || null;
  const powNonceHeader = req.headers.get("x-pow-nonce") || null;

  // Rate limiting (in-memory first layer)
  const rateCheck = checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    console.warn(`[SECURITY] Rate limit exceeded for IP: ${clientIP}`);
    return json(429, { error: "Too many requests. Please try again later." }, origin);
  }

  // Initialize Supabase early for DB-based rate limiting
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!url || !serviceRoleKey) {
    return json(500, { error: "Server not configured" }, origin);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Hash IP for database rate limiting
  const ipHash = await sha256(clientIP + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 16));
  
  // Database-backed rate limiting
  const { data: dbRateLimit, error: rlError } = await supabase.rpc('check_tracking_code_rate_limit', {
    p_ip_hash: ipHash
  });

  if (rlError) {
    console.error('[DB_RATE_LIMIT_ERROR]', rlError);
  }

  if (dbRateLimit && !dbRateLimit.allowed) {
    console.warn(`[SECURITY] DB rate limit exceeded for IP: ${clientIP}, blocked until: ${dbRateLimit.blocked_until}`);
    return json(429, { 
      error: "Too many lookup attempts. Please try again later.",
      blocked_until: dbRateLimit.blocked_until
    }, origin);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PublicBookingStatusRequest;
    
    // HONEYPOT CHECK - This field should never be filled by real users
    const honeypotHeader = req.headers.get("x-honeypot");
    if (body.honeypot || honeypotHeader) {
      console.warn("[SECURITY] Honeypot triggered from IP:", clientIP);
      
      // Log to database
      const url = Deno.env.get("SUPABASE_URL")?.trim();
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
      
      if (url && serviceRoleKey) {
        const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
        await supabase.rpc('log_honeypot_trigger', {
          p_ip_address: clientIP,
          p_user_agent: userAgent,
          p_trigger_type: 'form_field',
          p_trigger_details: { endpoint: 'public-booking-status', fingerprint: fingerprintHash?.substring(0, 16) }
        });
      }
      
      // Return fake success to waste bot's time
      return json(200, { booking: { status: "pending", tracking_code: "FAKE12345678901234567890123456" } }, origin);
    }
    
    const trackingCode = normalizeTrackingCode(body.trackingCode || "");
    const powNonce = body.powNonce || powNonceHeader;

    if (!trackingCode) return json(400, { error: "Missing trackingCode" }, origin);
    
    // Validate 32-character format
    if (!isValidTrackingCode(trackingCode)) {
      console.warn(`[SECURITY] Invalid tracking code format from IP: ${clientIP}`);
      return json(400, { error: "Invalid tracking code format. Please use the 32-character code from your confirmation email." }, origin);
    }

    // Supabase client already initialized above

    // Track device fingerprint if provided
    if (fingerprintHash) {
      const { data: fpResult } = await supabase.rpc('track_device_fingerprint', {
        p_fingerprint_hash: fingerprintHash,
        p_session_id: `booking_status_${Date.now()}`
      });

      if (fpResult?.is_suspicious) {
        console.warn(`[SECURITY] Suspicious fingerprint for booking status: ${fingerprintHash.substring(0, 16)}...`);
        await supabase.rpc('append_security_log', {
          p_event_type: 'suspicious_fingerprint_booking_status',
          p_ip_address: clientIP,
          p_success: false,
          p_details: { fingerprint_prefix: fingerprintHash.substring(0, 16), risk_score: fpResult.risk_score }
        });
        
        // For suspicious fingerprints, require proof-of-work
        if (!powNonce) {
          return json(403, { 
            error: "Security challenge required", 
            require_pow: true,
            difficulty: 3
          }, origin);
        }
        
        const powValid = await verifyProofOfWork(trackingCode, powNonce, 3);
        if (!powValid) {
          return json(403, { error: "Security challenge failed" }, origin);
        }
      }
    }

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
      return json(500, { error: "Database error" }, origin);
    }

    if (!data) {
      // Log failed lookup with more context
      await supabase.rpc('append_security_log', {
        p_event_type: 'tracking_code_invalid',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_success: false,
        p_details: { 
          tracking_code_prefix: trackingCode.substring(0, 8),
          fingerprint: fingerprintHash?.substring(0, 16)
        }
      });
      
      return json(404, { error: "Booking not found. Please verify your tracking code." }, origin);
    }

    // Check if tracking code is expired
    if (data.tracking_code_expires_at && new Date(data.tracking_code_expires_at) < new Date()) {
      return json(403, { 
        error: "Tracking code has expired. Please request a magic link via email for continued access.",
        expired: true
      }, origin);
    }

    // Log successful lookup
    await supabase.rpc('append_security_log', {
      p_event_type: 'tracking_code_lookup',
      p_ip_address: clientIP,
      p_success: true,
      p_details: { 
        tracking_code_prefix: trackingCode.substring(0, 8),
        fingerprint: fingerprintHash?.substring(0, 16)
      }
    });

    // Don't expose tracking_code_expires_at to client
    const { tracking_code_expires_at, ...safeData } = data;

    return json(200, { booking: safeData }, origin);
  } catch (e) {
    console.error("public-booking-status error", e);
    return json(500, { error: "Unexpected server error" }, origin);
  }
});
