import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate secure random token
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash token for storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "create";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Server configuration error" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // ============================================
    // ACTION: Create magic link and send email
    // ============================================
    if (action === "create" && req.method === "POST") {
      const { booking_id, email } = await req.json();

      if (!booking_id || !email) {
        return json(400, { error: "Missing booking_id or email" });
      }

      // Verify booking exists and email matches
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, email, name, tracking_code")
        .eq("id", booking_id)
        .single();

      if (bookingError || !booking) {
        console.error("Booking not found:", bookingError);
        return json(404, { error: "Booking not found" });
      }

      // Verify email matches (case insensitive)
      if (booking.email.toLowerCase() !== email.toLowerCase()) {
        // Log suspicious activity
        await supabase.rpc('append_security_log', {
          p_event_type: 'magic_link_email_mismatch',
          p_email: email,
          p_details: { booking_id, provided_email: email }
        });
        return json(403, { error: "Email does not match booking" });
      }

      // Generate token
      const token = generateToken();
      const tokenHash = await hashToken(token);

      // Create token in database
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('create_magic_link_token', {
          p_booking_id: booking_id,
          p_token_hash: tokenHash
        });

      if (tokenError) {
        console.error("Error creating token:", tokenError);
        return json(500, { error: "Failed to create magic link" });
      }

      // Generate the magic link URL
      const baseUrl = Deno.env.get("SITE_URL") || "https://your-site.lovable.app";
      const magicLinkUrl = `${baseUrl}/customer-portal?token=${token}`;

      // Send email if RESEND_API_KEY is configured
      if (RESEND_API_KEY) {
        const resend = new Resend(RESEND_API_KEY);
        
        try {
          await resend.emails.send({
            from: "Ferunda Tattoo <noreply@ferunda.com>",
            to: [email],
            subject: "Your Secure Booking Portal Link",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                  .header { text-align: center; margin-bottom: 30px; }
                  .logo { font-size: 24px; font-weight: 300; letter-spacing: 2px; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
                  .button { display: inline-block; background: #1a1a1a; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                  .warning { font-size: 12px; color: #666; margin-top: 20px; }
                  .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <div class="logo">FERUNDA</div>
                  </div>
                  <div class="content">
                    <p>Hey ${booking.name}! 👋</p>
                    <p>Here's your secure link to access your booking portal. You can check your appointment status, upload additional references, and communicate with Ferunda.</p>
                    <p style="text-align: center;">
                      <a href="${magicLinkUrl}" class="button">Access Your Portal</a>
                    </p>
                    <p>Your tracking code: <strong>${booking.tracking_code}</strong></p>
                    <p class="warning">
                      ⚠️ This link expires in 24 hours and can only be used once for security reasons.
                      If you need a new link, visit our website and request one using your email.
                    </p>
                  </div>
                  <div class="footer">
                    <p>Ferunda Tattoo | Austin, TX</p>
                    <p>If you didn't request this link, you can safely ignore this email.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          console.log("Magic link email sent to:", email);
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          // Don't fail the request, just log it
        }
      }

      // Log successful magic link creation
      await supabase.rpc('append_security_log', {
        p_event_type: 'magic_link_created',
        p_email: email,
        p_details: { booking_id }
      });

      return json(200, { 
        success: true, 
        message: "Magic link sent to your email",
        // Only return link in dev/testing mode
        ...(Deno.env.get("DEV_MODE") === "true" && { magic_link: magicLinkUrl })
      });
    }

    // ============================================
    // ACTION: Validate magic link token
    // ============================================
    if (action === "validate" && req.method === "POST") {
      const { token, fingerprint_hash } = await req.json();
      const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      if (!token) {
        return json(400, { error: "Missing token" });
      }

      const tokenHash = await hashToken(token);

      // Validate token using SECURITY DEFINER function
      const { data: result, error } = await supabase.rpc('validate_magic_link', {
        p_token_hash: tokenHash,
        p_fingerprint_hash: fingerprint_hash || null,
        p_ip_address: clientIP
      });

      if (error) {
        console.error("Token validation error:", error);
        return json(500, { error: "Validation failed" });
      }

      if (!result.valid) {
        // Log failed attempt
        await supabase.rpc('append_security_log', {
          p_event_type: 'magic_link_invalid',
          p_ip_address: clientIP,
          p_success: false,
          p_details: { error: result.error }
        });

        return json(401, { error: result.error || "Invalid or expired link" });
      }

      // Log successful validation
      await supabase.rpc('append_security_log', {
        p_event_type: 'magic_link_validated',
        p_ip_address: clientIP,
        p_details: { booking_id: result.booking_id }
      });

      return json(200, result);
    }

    // ============================================
    // ACTION: Request magic link (by email)
    // ============================================
    if (action === "request" && req.method === "POST") {
      const { email, tracking_code } = await req.json();
      const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      if (!email) {
        return json(400, { error: "Email is required" });
      }

      // Rate limit: max 3 requests per email per hour
      const { count: recentRequests } = await supabase
        .from("magic_link_tokens")
        .select("id", { count: 'exact', head: true })
        .eq("booking_id", await supabase
          .from("bookings")
          .select("id")
          .eq("email", email.toLowerCase())
          .limit(1)
          .single()
          .then(r => r.data?.id || '00000000-0000-0000-0000-000000000000')
        )
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if ((recentRequests || 0) >= 3) {
        return json(429, { error: "Too many requests. Please try again later." });
      }

      // Find booking by email (and optionally tracking code)
      let query = supabase
        .from("bookings")
        .select("id, email, name, tracking_code")
        .ilike("email", email);

      if (tracking_code) {
        query = query.eq("tracking_code", tracking_code.toUpperCase());
      }

      const { data: bookings, error: bookingError } = await query.limit(1).single();

      if (bookingError || !bookings) {
        // Don't reveal if email exists or not
        await supabase.rpc('append_security_log', {
          p_event_type: 'magic_link_request_not_found',
          p_email: email,
          p_ip_address: clientIP,
          p_success: false
        });
        
        // Return success to prevent email enumeration
        return json(200, { success: true, message: "If a booking exists with this email, you'll receive a magic link shortly." });
      }

      // Generate and send magic link
      const token = generateToken();
      const tokenHash = await hashToken(token);

      await supabase.rpc('create_magic_link_token', {
        p_booking_id: bookings.id,
        p_token_hash: tokenHash
      });

      const baseUrl = Deno.env.get("SITE_URL") || "https://your-site.lovable.app";
      const magicLinkUrl = `${baseUrl}/customer-portal?token=${token}`;

      // Send email
      if (RESEND_API_KEY) {
        const resend = new Resend(RESEND_API_KEY);
        await resend.emails.send({
          from: "Ferunda Tattoo <noreply@ferunda.com>",
          to: [email],
          subject: "Your Secure Booking Portal Link",
          html: `
            <h1>Access Your Booking</h1>
            <p>Click the link below to access your booking portal:</p>
            <a href="${magicLinkUrl}">Access Portal</a>
            <p>This link expires in 24 hours.</p>
          `,
        });
      }

      await supabase.rpc('append_security_log', {
        p_event_type: 'magic_link_requested',
        p_email: email,
        p_ip_address: clientIP,
        p_details: { booking_id: bookings.id }
      });

      return json(200, { success: true, message: "If a booking exists with this email, you'll receive a magic link shortly." });
    }

    return json(400, { error: "Invalid action" });

  } catch (error) {
    console.error("Magic link error:", error);
    return json(500, { error: "Internal server error" });
  }
});
