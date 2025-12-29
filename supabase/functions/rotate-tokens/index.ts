// Token rotation edge function - called by cron job every day
// Checks for tokens needing rotation (older than 7 days) and refreshes them

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Token rotation job started');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const clientId = Deno.env.get("VITE_GOOGLE_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")?.trim();

    if (!clientId || !clientSecret) {
      return json(500, { error: "Missing Google OAuth credentials" });
    }

    // Find tokens that need rotation (last rotated > 7 days ago)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: tokensToRotate, error: fetchError } = await supabase
      .from('calendar_sync_tokens')
      .select('*')
      .eq('is_active', true)
      .eq('provider', 'google')
      .or(`last_rotated_at.lt.${sevenDaysAgo},last_rotated_at.is.null`);

    if (fetchError) {
      console.error('Error fetching tokens:', fetchError);
      return json(500, { error: 'Failed to fetch tokens' });
    }

    if (!tokensToRotate || tokensToRotate.length === 0) {
      console.log('No tokens need rotation');
      return json(200, { message: 'No tokens need rotation', rotated: 0 });
    }

    console.log(`Found ${tokensToRotate.length} tokens to rotate`);

    let rotatedCount = 0;
    const errors: string[] = [];

    for (const token of tokensToRotate) {
      try {
        // Decrypt the refresh token
        const { data: decryptedRefresh, error: decryptError } = await supabase.rpc('decrypt_token', {
          encrypted_token: token.refresh_token
        });

        if (decryptError || !decryptedRefresh) {
          console.error(`Failed to decrypt refresh token for user ${token.user_id}:`, decryptError);
          errors.push(`User ${token.user_id}: Failed to decrypt refresh token`);
          continue;
        }

        // Use refresh token to get new access token
        const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: decryptedRefresh,
            grant_type: "refresh_token",
          }),
        });

        const tokenJson = await tokenResp.json().catch(() => ({}));

        if (!tokenResp.ok) {
          console.error(`Failed to refresh token for user ${token.user_id}:`, tokenJson);
          errors.push(`User ${token.user_id}: Google refresh failed - ${tokenJson.error || 'Unknown error'}`);
          
          // If refresh token is invalid, mark token as inactive
          if (tokenJson.error === 'invalid_grant') {
            await supabase
              .from('calendar_sync_tokens')
              .update({ 
                is_active: false, 
                sync_errors: [...(token.sync_errors || []), `Invalid refresh token at ${new Date().toISOString()}`]
              })
              .eq('id', token.id);
          }
          continue;
        }

        // Encrypt new access token
        const { data: encryptedAccess } = await supabase.rpc('encrypt_token', {
          plain_token: tokenJson.access_token
        });

        // Calculate new expiry
        const expiresIn = tokenJson.expires_in || 3600;
        const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

        // If a new refresh token was provided, encrypt and store it
        let encryptedRefresh = token.refresh_token;
        if (tokenJson.refresh_token) {
          const { data } = await supabase.rpc('encrypt_token', {
            plain_token: tokenJson.refresh_token
          });
          encryptedRefresh = data;
        }

        // Update the token record
        const { error: updateError } = await supabase
          .from('calendar_sync_tokens')
          .update({
            access_token: encryptedAccess,
            refresh_token: encryptedRefresh,
            token_expiry: tokenExpiry,
            last_rotated_at: new Date().toISOString(),
            rotation_count: (token.rotation_count || 0) + 1,
            needs_rotation: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', token.id);

        if (updateError) {
          console.error(`Failed to update token for user ${token.user_id}:`, updateError);
          errors.push(`User ${token.user_id}: Database update failed`);
          continue;
        }

        rotatedCount++;
        console.log(`Successfully rotated token for user ${token.user_id}`);

      } catch (err) {
        console.error(`Error rotating token for user ${token.user_id}:`, err);
        errors.push(`User ${token.user_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Log the rotation event to security_logs
    await supabase.from('security_logs').insert([{
      event_type: 'token_rotation',
      success: errors.length === 0,
      details: {
        total_tokens: tokensToRotate.length,
        rotated: rotatedCount,
        errors: errors.length,
        error_details: errors.slice(0, 10), // Limit error details
      }
    }]);

    console.log(`Token rotation complete: ${rotatedCount}/${tokensToRotate.length} rotated`);

    return json(200, {
      message: 'Token rotation complete',
      total: tokensToRotate.length,
      rotated: rotatedCount,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
    });

  } catch (error) {
    console.error('Token rotation error:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
