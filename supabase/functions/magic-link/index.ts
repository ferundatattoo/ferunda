import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fingerprint-hash",
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

// In-memory rate limiting as first layer
const ipRateLimitMap = new Map<string, { count: number; resetAt: number; blocked: boolean }>();

function checkIPRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  const blockDuration = 300000; // 5 minutes

  const limit = ipRateLimitMap.get(ip);

  if (limit?.blocked && now < limit.resetAt) {
    return { allowed: false, remaining: 0 };
  }

  if (!limit || now > limit.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs, blocked: false });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (limit.count >= maxRequests) {
    ipRateLimitMap.set(ip, { count: limit.count, resetAt: now + blockDuration, blocked: true });
    return { allowed: false, remaining: 0 };
  }

  limit.count++;
  return { allowed: true, remaining: maxRequests - limit.count };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "create";
  
  // Get client IP and fingerprint
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const fingerprintHash = req.headers.get("x-fingerprint-hash") || null;
  const userAgent = req.headers.get("user-agent") || "unknown";

  // First layer: In-memory rate limit by IP
  const ipCheck = checkIPRateLimit(clientIP);
  if (!ipCheck.allowed) {
    console.warn(`[SECURITY] IP rate limit exceeded: ${clientIP}`);
    return json(429, { error: "Too many requests. Please try again later." });
  }

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
    // Second layer: Database rate limit check for magic links
    const { data: dbRateCheck, error: dbRateError } = await supabase.rpc('check_magic_link_rate_limit', {
      p_ip_address: clientIP
    });

    if (dbRateError) {
      console.error("[SECURITY] Rate limit check failed:", dbRateError);
    } else if (dbRateCheck && !dbRateCheck.allowed) {
      console.warn(`[SECURITY] DB rate limit blocked IP: ${clientIP}, attempts: ${dbRateCheck.attempts}`);
      return json(429, { 
        error: "Too many failed attempts. Please try again later.",
        blocked_until: dbRateCheck.blocked_until
      });
    }

    // Track device fingerprint if provided
    if (fingerprintHash) {
      const { data: fpResult } = await supabase.rpc('track_device_fingerprint', {
        p_fingerprint_hash: fingerprintHash,
        p_session_id: `magic_link_${Date.now()}`
      });

      if (fpResult?.is_suspicious) {
        console.warn(`[SECURITY] Suspicious fingerprint detected: ${fingerprintHash.substring(0, 16)}...`);
        await supabase.rpc('append_security_log', {
          p_event_type: 'suspicious_fingerprint_magic_link',
          p_ip_address: clientIP,
          p_success: false,
          p_details: { fingerprint_prefix: fingerprintHash.substring(0, 16), risk_score: fpResult.risk_score }
        });
      }
    }

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
          p_ip_address: clientIP,
          p_user_agent: userAgent,
          p_success: false,
          p_details: { booking_id, provided_email: email, fingerprint: fingerprintHash?.substring(0, 16) }
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
        p_ip_address: clientIP,
        p_details: { booking_id, fingerprint: fingerprintHash?.substring(0, 16) }
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

      if (!token) {
        return json(400, { error: "Missing token" });
      }

      // Validate token format (64 hex characters)
      if (!/^[a-f0-9]{64}$/i.test(token)) {
        console.warn(`[SECURITY] Invalid token format from IP: ${clientIP}`);
        await supabase.rpc('record_magic_link_failure', { p_ip_address: clientIP });
        return json(400, { error: "Invalid token format" });
      }

      const tokenHash = await hashToken(token);

      // Validate token using SECURITY DEFINER function
      const { data: result, error } = await supabase.rpc('validate_magic_link', {
        p_token_hash: tokenHash,
        p_fingerprint_hash: fingerprint_hash || fingerprintHash || null,
        p_ip_address: clientIP
      });

      if (error) {
        console.error("Token validation error:", error);
        return json(500, { error: "Validation failed" });
      }

      if (!result.valid) {
        // Log failed attempt (already recorded in the function, but add more context)
        await supabase.rpc('append_security_log', {
          p_event_type: 'magic_link_invalid',
          p_ip_address: clientIP,
          p_user_agent: userAgent,
          p_success: false,
          p_details: { 
            error: result.error,
            fingerprint: (fingerprint_hash || fingerprintHash)?.substring(0, 16)
          }
        });

        return json(401, { error: result.error || "Invalid or expired link" });
      }

      // Log successful validation
      await supabase.rpc('append_security_log', {
        p_event_type: 'magic_link_validated',
        p_ip_address: clientIP,
        p_details: { 
          booking_id: result.booking_id,
          fingerprint: (fingerprint_hash || fingerprintHash)?.substring(0, 16)
        }
      });

      return json(200, result);
    }

    // ============================================
    // ACTION: Request magic link (by email)
    // ============================================
    if (action === "request" && req.method === "POST") {
      const { email, tracking_code } = await req.json();

      if (!email) {
        return json(400, { error: "Email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return json(400, { error: "Invalid email format" });
      }

      // Rate limit: max 3 requests per email per hour (query bookings first)
      const { data: bookingForEmail } = await supabase
        .from("bookings")
        .select("id")
        .ilike("email", email)
        .limit(1)
        .single();

      if (bookingForEmail) {
        const { count: recentRequests } = await supabase
          .from("magic_link_tokens")
          .select("id", { count: 'exact', head: true })
          .eq("booking_id", bookingForEmail.id)
          .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

        if ((recentRequests || 0) >= 3) {
          console.warn(`[SECURITY] Magic link request rate limit for email: ${email.substring(0, 3)}***`);
          return json(429, { error: "Too many requests. Please try again later." });
        }
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
          p_user_agent: userAgent,
          p_success: false,
          p_details: { fingerprint: fingerprintHash?.substring(0, 16) }
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
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
                .button { display: inline-block; background: #1a1a1a; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="font-weight: 300; letter-spacing: 2px;">FERUNDA</h1>
                </div>
                <div class="content">
                  <h2>Access Your Booking</h2>
                  <p>Click the button below to access your secure booking portal:</p>
                  <p style="text-align: center;">
                    <a href="${magicLinkUrl}" class="button">Access Portal</a>
                  </p>
                  <p style="font-size: 12px; color: #666;">This link expires in 24 hours and can only be used once.</p>
                </div>
                <div class="footer">
                  <p>If you didn't request this link, you can safely ignore this email.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }

      await supabase.rpc('append_security_log', {
        p_event_type: 'magic_link_requested',
        p_email: email,
        p_ip_address: clientIP,
        p_details: { booking_id: bookings.id, fingerprint: fingerprintHash?.substring(0, 16) }
      });

      return json(200, { success: true, message: "If a booking exists with this email, you'll receive a magic link shortly." });
    }

    // ============================================
    // ACTION: Admin generate magic link (no email)
    // ============================================
    if (action === "admin-generate" && req.method === "POST") {
      // Verify admin authentication
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return json(401, { error: "Unauthorized" });
      }

      const token = authHeader.replace("Bearer ", "");
      
      // Create an authenticated client to verify the JWT
      const { createClient: createAuthClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const authSupabase = createAuthClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: { user }, error: userError } = await authSupabase.auth.getUser();
      if (userError || !user) {
        return json(401, { error: "Invalid authentication" });
      }

      // Verify admin role
      const { data: isAdmin } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });

      if (!isAdmin) {
        return json(403, { error: "Admin access required" });
      }

      const { booking_id } = await req.json();
      if (!booking_id) {
        return json(400, { error: "Missing booking_id" });
      }

      // Get booking info
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, email, name, tracking_code")
        .eq("id", booking_id)
        .single();

      if (bookingError || !booking) {
        return json(404, { error: "Booking not found" });
      }

      // Generate token
      const magicToken = generateToken();
      const tokenHash = await hashToken(magicToken);

      // Create token in database
      const { error: tokenError } = await supabase.rpc('create_magic_link_token', {
        p_booking_id: booking_id,
        p_token_hash: tokenHash
      });

      if (tokenError) {
        console.error("Error creating token:", tokenError);
        return json(500, { error: "Failed to generate portal link" });
      }

      // Generate the magic link URL with fallback logic
      const siteUrl = Deno.env.get("SITE_URL");
      const requestOrigin = req.headers.get("origin");
      const projectId = Deno.env.get("SUPABASE_PROJECT_ID") || "twujzugbhryzzdhpfvts";
      const baseUrl = siteUrl || requestOrigin || `https://${projectId}.lovableproject.com`;
      const portalUrl = `${baseUrl}/customer-portal?token=${magicToken}`;

      // Log admin action
      await supabase.rpc('append_security_log', {
        p_event_type: 'admin_magic_link_generated',
        p_email: booking.email,
        p_ip_address: clientIP,
        p_details: { booking_id, admin_id: user.id, admin_email: user.email }
      });

      return json(200, { 
        success: true, 
        portal_url: portalUrl,
        expires_in: "24 hours"
      });
    }

    return json(400, { error: "Invalid action" });

  } catch (error) {
    console.error("Magic link error:", error);
    return json(500, { error: "Internal server error" });
  }
});
