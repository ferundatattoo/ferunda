// Google OAuth PKCE code exchange (server-side)
// Exchanges `code` -> access_token (+ refresh_token) securely using GOOGLE_CLIENT_SECRET.
// Now includes token encryption for secure storage.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExchangeBody = {
  code?: string;
  redirectUri?: string;
  userId?: string;
  storeToken?: boolean;
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
    const userId = body.userId?.trim();
    const storeToken = body.storeToken ?? true;

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

    // If storeToken is true and userId is provided, store encrypted tokens in database
    if (storeToken && userId && tokenJson.access_token) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Calculate token expiry
      const expiresIn = tokenJson.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Encrypt tokens using database function
      const { data: encryptedAccess } = await supabase.rpc('encrypt_token', {
        plain_token: tokenJson.access_token
      });

      let encryptedRefresh = null;
      if (tokenJson.refresh_token) {
        const { data } = await supabase.rpc('encrypt_token', {
          plain_token: tokenJson.refresh_token
        });
        encryptedRefresh = data;
      }

      // Upsert the encrypted tokens
      const { error: upsertError } = await supabase
        .from('calendar_sync_tokens')
        .upsert({
          user_id: userId,
          provider: 'google',
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          token_expiry: tokenExpiry,
          last_rotated_at: new Date().toISOString(),
          rotation_count: 0,
          needs_rotation: false,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Failed to store encrypted tokens:', upsertError);
        // Don't fail the request, just log the error
      } else {
        console.log('Encrypted tokens stored successfully for user:', userId);
      }
    }

    // Return tokens to the client (access_token only, not refresh_token for security)
    return json(200, {
      access_token: tokenJson.access_token,
      expires_in: tokenJson.expires_in,
      scope: tokenJson.scope,
      token_type: tokenJson.token_type,
      stored: storeToken && userId ? true : false,
    });
  } catch (e) {
    console.error("google-oauth-exchange error", e);
    return json(500, { error: "Unexpected server error" });
  }
});
