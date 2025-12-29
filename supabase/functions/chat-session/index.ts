import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-fingerprint",
};

// Simple HMAC-SHA256 implementation for JWT signing
async function hmacSha256(key: ArrayBuffer, message: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, message);
}

// Base64URL encode (JWT compatible)
function base64UrlEncode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function stringToBase64Url(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Hash fingerprint for storage
async function hashFingerprint(fp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(fp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create a signed JWT session token with fingerprint binding
async function createSessionToken(
  secret: string, 
  fingerprintHash: string | null,
  origin: string | null
): Promise<{ token: string; sessionId: string; expiresAt: number }> {
  const sessionId = crypto.randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + (24 * 60 * 60); // 24 hours

  const header = { alg: "HS256", typ: "JWT" };
  const payload = { 
    sid: sessionId, 
    iat: issuedAt, 
    exp: expiresAt, 
    iss: "luna-chat",
    fp: fingerprintHash, // Device fingerprint hash
    org: origin ? await hashFingerprint(origin) : null, // Origin binding
    mc: 0 // Message count for rotation
  };

  const headerB64 = stringToBase64Url(JSON.stringify(header));
  const payloadB64 = stringToBase64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const secretKey = new TextEncoder().encode(secret).buffer;
  const messageBuffer = new TextEncoder().encode(signingInput).buffer;
  const signature = await hmacSha256(secretKey, messageBuffer);
  const signatureB64 = base64UrlEncode(signature);

  return {
    token: `${signingInput}.${signatureB64}`,
    sessionId,
    expiresAt: expiresAt * 1000
  };
}

// Verify and decode a JWT session token
async function verifySessionToken(
  token: string, 
  secret: string,
  currentFingerprint: string | null
): Promise<{ valid: boolean; sessionId?: string; payload?: any; error?: string }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid token format" };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    const signingInput = `${headerB64}.${payloadB64}`;
    const secretKey = new TextEncoder().encode(secret).buffer;
    const messageBuffer = new TextEncoder().encode(signingInput).buffer;
    const expectedSignature = await hmacSha256(secretKey, messageBuffer);
    const expectedSignatureB64 = base64UrlEncode(expectedSignature);

    if (signatureB64 !== expectedSignatureB64) {
      return { valid: false, error: "Invalid signature" };
    }

    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "Token expired" };
    }

    // Verify fingerprint if present in token
    if (payload.fp && currentFingerprint) {
      const currentFpHash = await hashFingerprint(currentFingerprint);
      if (payload.fp !== currentFpHash) {
        console.warn("Fingerprint mismatch detected - possible session hijacking");
        return { valid: false, error: "Session security violation" };
      }
    }

    return { valid: true, sessionId: payload.sid, payload };
  } catch (error) {
    console.error("Token verification error:", error);
    return { valid: false, error: "Token verification failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const CHAT_SESSION_SECRET = Deno.env.get("CHAT_SESSION_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!CHAT_SESSION_SECRET) {
    console.error("CHAT_SESSION_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Session service unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";
    
    // Get fingerprint from header
    const deviceFingerprint = req.headers.get("x-device-fingerprint");
    const origin = req.headers.get("origin");
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    if (action === "create" && req.method === "POST") {
      let fingerprintHash: string | null = null;
      
      if (deviceFingerprint) {
        fingerprintHash = await hashFingerprint(deviceFingerprint);
        
        // Track device fingerprint in database
        if (supabase) {
          try {
            const sessionId = crypto.randomUUID();
            const { data: fpResult } = await supabase.rpc('track_device_fingerprint', {
              p_fingerprint_hash: fingerprintHash,
              p_session_id: sessionId
            });

            if (fpResult?.is_suspicious) {
              console.warn("Suspicious device fingerprint detected:", fingerprintHash.substring(0, 16));
              // Log but don't block - could be legitimate
              await supabase.rpc('append_security_log', {
                p_event_type: 'suspicious_fingerprint',
                p_ip_address: clientIP,
                p_details: { fingerprint_prefix: fingerprintHash.substring(0, 16), risk_score: fpResult.risk_score }
              });
            }
          } catch (e) {
            console.error("Error tracking fingerprint:", e);
          }
        }
      }
      
      const { token, sessionId, expiresAt } = await createSessionToken(
        CHAT_SESSION_SECRET, 
        fingerprintHash,
        origin
      );
      
      console.log(`Created session: ${sessionId.substring(0, 8)}... with fingerprint: ${fingerprintHash ? 'yes' : 'no'}`);
      
      return new Response(
        JSON.stringify({ token, sessionId, expiresAt, fingerprintBound: !!fingerprintHash }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify" && req.method === "POST") {
      const { token } = await req.json();
      
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: "No token provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await verifySessionToken(token, CHAT_SESSION_SECRET, deviceFingerprint);
      
      if (!result.valid && supabase) {
        // Log failed verification
        await supabase.rpc('append_security_log', {
          p_event_type: 'session_verify_failed',
          p_ip_address: clientIP,
          p_success: false,
          p_details: { error: result.error }
        });
      }
      
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Rotate token (get new token with same session)
    if (action === "rotate" && req.method === "POST") {
      const { token } = await req.json();
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: "No token provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await verifySessionToken(token, CHAT_SESSION_SECRET, deviceFingerprint);
      
      if (!result.valid) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new token with same fingerprint binding
      const fingerprintHash = deviceFingerprint ? await hashFingerprint(deviceFingerprint) : null;
      const newToken = await createSessionToken(CHAT_SESSION_SECRET, fingerprintHash, origin);
      
      console.log(`Rotated session: ${result.sessionId?.substring(0, 8)}... -> ${newToken.sessionId.substring(0, 8)}...`);
      
      return new Response(
        JSON.stringify({ 
          token: newToken.token, 
          sessionId: newToken.sessionId, 
          expiresAt: newToken.expiresAt,
          rotated: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Session error:", error);
    return new Response(
      JSON.stringify({ error: "Session operation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
