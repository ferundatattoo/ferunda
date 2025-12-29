import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Create a signed JWT session token
async function createSessionToken(secret: string): Promise<{ token: string; sessionId: string; expiresAt: number }> {
  const sessionId = crypto.randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + (24 * 60 * 60); // 24 hours

  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sid: sessionId, iat: issuedAt, exp: expiresAt, iss: "luna-chat" };

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
async function verifySessionToken(token: string, secret: string): Promise<{ valid: boolean; sessionId?: string; error?: string }> {
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

    return { valid: true, sessionId: payload.sid };
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
  
  if (!CHAT_SESSION_SECRET) {
    console.error("CHAT_SESSION_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Session service unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "create";

    if (action === "create" && req.method === "POST") {
      const { token, sessionId, expiresAt } = await createSessionToken(CHAT_SESSION_SECRET);
      console.log(`Created session: ${sessionId.substring(0, 8)}...`);
      
      return new Response(
        JSON.stringify({ token, sessionId, expiresAt }),
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

      const result = await verifySessionToken(token, CHAT_SESSION_SECRET);
      return new Response(
        JSON.stringify(result),
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
