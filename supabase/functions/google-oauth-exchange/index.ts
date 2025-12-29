// Google OAuth PKCE code exchange (server-side)
// Exchanges `code` -> access_token (+ refresh_token) securely using GOOGLE_CLIENT_SECRET.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExchangeBody = {
  code?: string;
  redirectUri?: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = (await req.json()) as ExchangeBody;

    const code = body.code?.trim();
    const redirectUri = body.redirectUri?.trim();

    if (!code) return json(400, { error: "Missing code" });
    if (!redirectUri) return json(400, { error: "Missing redirectUri" });

    const clientId = Deno.env.get("VITE_GOOGLE_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")?.trim();

    if (!clientId) return json(500, { error: "Server not configured: missing VITE_GOOGLE_CLIENT_ID" });
    if (!clientSecret) return json(500, { error: "Server not configured: missing GOOGLE_CLIENT_SECRET" });

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = await tokenResp.json().catch(() => ({}));

    if (!tokenResp.ok) {
      return json(400, {
        error: "Google token exchange failed",
        google: {
          status: tokenResp.status,
          ...tokenJson,
        },
      });
    }

    // Return tokens to the client. (Client can store access_token; refresh_token is optional.)
    return json(200, {
      access_token: tokenJson.access_token,
      expires_in: tokenJson.expires_in,
      refresh_token: tokenJson.refresh_token,
      scope: tokenJson.scope,
      token_type: tokenJson.token_type,
    });
  } catch (e) {
    console.error("google-oauth-exchange error", e);
    return json(500, { error: "Unexpected server error" });
  }
});
