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
  honeypot?: string;
  powNonce?: string;
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

// Hash function for security operations
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
  return hash.startsWith('0'.repeat(difficulty));
}

// In-memory rate limiting (first defense layer)
const rateLimitMap = new Map<string, { count: number; resetAt: number; blocked: boolean }>();

function checkInMemoryRateLimit(ip: string): { allowed: boolean; remaining: number } {
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

  // Layer 1: In-memory rate limiting (fast, prevents DDoS)
  const memRateCheck = checkInMemoryRateLimit(clientIP);
  if (!memRateCheck.allowed) {
    console.warn(`[SECURITY] In-memory rate limit exceeded for IP: ${clientIP}`);
    return json(429, { error: "Too many requests. Please try again later." }, origin);
  }

  // Initialize Supabase
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!url || !serviceRoleKey) {
    console.error("[CONFIG] Missing Supabase credentials");
    return json(500, { error: "Server not configured" }, origin);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const body = (await req.json().catch(() => ({}))) as PublicBookingStatusRequest;
    
    // HONEYPOT CHECK - Silent trap for bots
    const honeypotHeader = req.headers.get("x-honeypot");
    if (body.honeypot || honeypotHeader) {
      console.warn("[SECURITY] Honeypot triggered from IP:", clientIP);
      
      await supabase.rpc('log_honeypot_trigger', {
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_trigger_type: 'form_field',
        p_trigger_details: { 
          endpoint: 'public-booking-status', 
          fingerprint: fingerprintHash?.substring(0, 16) 
        }
      });
      
      // Return fake success to waste bot's time
      return json(200, { 
        booking: { 
          status: "pending", 
          tracking_code: "DECOY00000000000000000000000000" 
        } 
      }, origin);
    }
    
    const trackingCode = normalizeTrackingCode(body.trackingCode || "");
    const powNonce = body.powNonce || powNonceHeader;

    if (!trackingCode) {
      return json(400, { error: "Missing tracking code" }, origin);
    }

    // Create secure hash for IP
    const ipHash = await sha256(clientIP + serviceRoleKey.substring(0, 16));

    // Track device fingerprint if provided - detect suspicious behavior
    if (fingerprintHash) {
      const { data: fpResult } = await supabase.rpc('track_device_fingerprint', {
        p_fingerprint_hash: fingerprintHash,
        p_session_id: `booking_status_${Date.now()}`
      });

      if (fpResult?.is_suspicious) {
        console.warn(`[SECURITY] Suspicious fingerprint: ${fingerprintHash.substring(0, 16)}...`);
        
        // For suspicious fingerprints, require proof-of-work
        if (!powNonce) {
          return json(403, { 
            error: "Security verification required", 
            require_pow: true,
            difficulty: 3
          }, origin);
        }
        
        const powValid = await verifyProofOfWork(trackingCode, powNonce, 3);
        if (!powValid) {
          await supabase.rpc('append_security_audit', {
            p_event_type: 'security_challenge',
            p_action: 'pow_failed',
            p_ip_address: ipHash,
            p_fingerprint_hash: fingerprintHash,
            p_details: { tracking_code_prefix: trackingCode.substring(0, 4) }
          });
          return json(403, { error: "Security verification failed" }, origin);
        }
      }
    }

    // Use the SECURE tracking lookup function with anti-enumeration
    const { data: lookupResult, error: lookupError } = await supabase.rpc('secure_tracking_lookup', {
      p_tracking_code: trackingCode,
      p_ip_hash: ipHash,
      p_fingerprint_hash: fingerprintHash
    });

    if (lookupError) {
      console.error("[DB_ERROR] secure_tracking_lookup failed:", lookupError);
      return json(500, { error: "Server error during lookup" }, origin);
    }

    // Handle rate limiting from the secure function
    if (!lookupResult.success && lookupResult.error === 'rate_limited') {
      console.warn(`[SECURITY] DB rate limit hit for IP hash: ${ipHash.substring(0, 16)}...`);
      return json(429, { 
        error: "Too many lookup attempts. Please try again later.",
        retry_after: lookupResult.retry_after
      }, origin);
    }

    // Handle invalid format
    if (!lookupResult.success && lookupResult.error === 'invalid_format') {
      return json(400, { 
        error: "Invalid tracking code format. Please use the code from your confirmation email." 
      }, origin);
    }

    // Handle not found
    if (!lookupResult.success && lookupResult.error === 'not_found') {
      return json(404, { 
        error: "Booking not found. Please verify your tracking code." 
      }, origin);
    }

    // Handle expired
    if (!lookupResult.success && lookupResult.error === 'expired') {
      return json(403, { 
        error: "Tracking code has expired. Please request a magic link via email for continued access.",
        expired: true
      }, origin);
    }

    // Success - return sanitized booking data
    return json(200, { booking: lookupResult.booking }, origin);

  } catch (e) {
    console.error("[ERROR] public-booking-status unexpected error:", e);
    return json(500, { error: "Unexpected server error" }, origin);
  }
});
