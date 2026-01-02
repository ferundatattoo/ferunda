import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =====================================================
// SECURITY CONFIGURATION
// =====================================================
const ALLOWED_ORIGINS = [
  'https://ferunda.com',
  'https://www.ferunda.com',
  'https://preview--ferunda-ink.lovable.app',
  'https://ferunda-ink.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080'
];

const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const RATE_LIMIT_BOOKINGS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_BLOCK_MINUTES = 1440; // 24 hours

// Security headers
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  
  // Allow Lovable preview domains dynamically
  const isLovablePreview = origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || isLovablePreview ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fingerprint-hash, x-load-time, x-verification-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    ...securityHeaders
  };
}

function json(status: number, body: unknown, req: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
  });
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validateName(name: string): boolean {
  const nameRegex = /^[\p{L}\s'-]+$/u;
  return nameRegex.test(name) && name.length >= 2 && name.length <= 100;
}

function validatePhone(phone: string): boolean {
  if (!phone) return true; // Optional
  const phoneRegex = /^[\d\s\-+()]*$/;
  return phoneRegex.test(phone) && phone.length <= 20;
}

function validateDescription(desc: string): boolean {
  return desc.length >= 10 && desc.length <= 2000;
}

function validateSize(size: string): boolean {
  const validSizes = ['tiny', 'small', 'medium', 'large', 'extra-large'];
  return validSizes.includes(size);
}

function validatePlacement(placement: string): boolean {
  return placement.length <= 100;
}

function validateImageUrls(urls: string[]): string[] {
  const supabasePrefix = "https://twujzugbhryzzdhpfvts.supabase.co/";
  return urls.filter(url => url.startsWith(supabasePrefix));
}

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 32; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['email', 'phone', 'password', 'token', 'tracking_code'];
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      result[key] = typeof value === 'string' ? value.substring(0, 3) + '***' : '[REDACTED]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

// =====================================================
// MAIN HANDLER
// =====================================================
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, req);
  }

  const startTime = Date.now();
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = req.headers.get('user-agent') || '';
    const fingerprintHash = req.headers.get('x-fingerprint-hash') || '';
    const loadTime = parseInt(req.headers.get('x-load-time') || '0');
    const verificationToken = req.headers.get('x-verification-token') || '';

  try {
    // Check body size
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > MAX_BODY_SIZE) {
      return json(413, { error: "Payload too large" }, req);
    }

    const body = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // HONEYPOT CHECK
    // =====================================================
    if (body._hp_url || body.company || body.website || body._gotcha) {
      console.log(`[HONEYPOT] Triggered by IP: ${clientIP}`);
      
      await supabase.from('honeypot_triggers').insert({
        ip_address: clientIP,
        user_agent: userAgent,
        trigger_type: 'booking_form',
        trigger_details: { 
          fields: Object.keys(body).filter(k => ['_hp_url', 'company', 'website', '_gotcha'].includes(k))
        }
      });

      // Return fake success to waste bot's time
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      return json(200, { 
        success: true, 
        tracking_code: 'FAKE' + generateTrackingCode().substring(4)
      }, req);
    }

    // =====================================================
    // TIMING ANALYSIS - Detect bots
    // =====================================================
    const timeSincePageLoad = Date.now() - loadTime;
    const isSuspiciousTiming = loadTime > 0 && timeSincePageLoad < 3000; // < 3 seconds

    if (isSuspiciousTiming) {
      console.log(`[SUSPICIOUS] Fast submission from IP: ${clientIP}, time: ${timeSincePageLoad}ms`);
      
      await supabase.rpc('append_security_log', {
        p_event_type: 'suspicious_fast_submission',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_details: { time_since_load: timeSincePageLoad },
        p_success: false
      });
    }

    // =====================================================
    // RATE LIMITING
    // =====================================================
    const { data: rateLimit, error: rateLimitError } = await supabase.rpc('check_global_rate_limit', {
      p_identifier: clientIP,
      p_action_type: 'booking',
      p_max_actions: RATE_LIMIT_BOOKINGS_PER_HOUR,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
      p_block_minutes: RATE_LIMIT_BLOCK_MINUTES
    });

    if (rateLimitError) {
      console.error('[RATE_LIMIT_ERROR]', rateLimitError);
    }

    if (rateLimit && rateLimit[0] && !rateLimit[0].allowed) {
      console.log(`[RATE_LIMITED] IP: ${clientIP}, blocked until: ${rateLimit[0].blocked_until}`);
      
      await supabase.rpc('append_security_audit', {
        p_event_type: 'rate_limit_exceeded',
        p_actor_type: 'anonymous',
        p_resource_type: 'booking',
        p_action: 'create',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_fingerprint_hash: fingerprintHash,
        p_severity: 'warning',
        p_details: { action_type: 'booking', blocked_until: rateLimit[0].blocked_until }
      });

      return json(429, { 
        error: "Too many booking requests. Please try again later.",
        blocked_until: rateLimit[0].blocked_until
      }, req);
    }

    // =====================================================
    // FINGERPRINT TRACKING
    // =====================================================
    if (fingerprintHash) {
      const { data: fpResult } = await supabase.rpc('track_device_fingerprint', {
        p_fingerprint_hash: fingerprintHash,
        p_session_id: `booking_${Date.now()}`
      });

      if (fpResult?.is_suspicious) {
        console.log(`[SUSPICIOUS_FINGERPRINT] Hash: ${fingerprintHash.substring(0, 8)}...`);
        
        // Add extra delay for suspicious fingerprints
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // =====================================================
    // INPUT VALIDATION
    // =====================================================
    const { name, email, phone, tattoo_description, placement, size, reference_images, requested_city, preferred_date, subscribe_newsletter, utm_params } = body;

    // Required field validation
    if (!name || !validateName(name.trim())) {
      return json(400, { error: "Invalid name. Must be 2-100 characters." }, req);
    }

    if (!email || !validateEmail(email.trim().toLowerCase())) {
      return json(400, { error: "Invalid email address." }, req);
    }

    // =====================================================
    // EMAIL VERIFICATION CHECK
    // =====================================================
    if (!verificationToken) {
      return json(400, { error: "Email verification required. Please verify your email first." }, req);
    }

    // Hash the verification token to match what's stored in the database
    const tokenEncoder = new TextEncoder();
    const tokenData = tokenEncoder.encode(verificationToken + supabaseServiceKey.substring(0, 32));
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Validate the verification token by passing the hash
    const { data: isVerified, error: verifyError } = await supabase.rpc('validate_email_verification', {
      p_email: email.trim().toLowerCase(),
      p_verification_token: tokenHash // Pass the hash, not the raw token
    });

    if (verifyError || !isVerified) {
      console.log(`[VERIFICATION_FAILED] Email: ${email.trim().substring(0, 3)}***, Token valid: ${isVerified}`);
      
      await supabase.rpc('append_security_audit', {
        p_event_type: 'booking_unverified_attempt',
        p_actor_type: 'anonymous',
        p_resource_type: 'booking',
        p_action: 'create',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_fingerprint_hash: fingerprintHash,
        p_details: { email_prefix: email.trim().substring(0, 3) }
      });

      return json(403, { error: "Email verification expired or invalid. Please verify your email again." }, req);
    }

    if (phone && !validatePhone(phone)) {
      return json(400, { error: "Invalid phone number format." }, req);
    }

    if (!tattoo_description || !validateDescription(tattoo_description.trim())) {
      return json(400, { error: "Description must be 10-2000 characters." }, req);
    }

    if (size && !validateSize(size)) {
      return json(400, { error: "Invalid size selection." }, req);
    }

    if (placement && !validatePlacement(placement)) {
      return json(400, { error: "Placement description too long." }, req);
    }

    // Sanitize and validate image URLs
    const sanitizedImages = Array.isArray(reference_images) 
      ? validateImageUrls(reference_images).slice(0, 5)
      : [];

    // =====================================================
    // CREATE BOOKING
    // =====================================================
    const trackingCode = generateTrackingCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days expiry

    const bookingData = {
      name: escapeHtml(name.trim()),
      email: email.trim().toLowerCase(),
      phone: phone ? escapeHtml(phone.trim()) : null,
      tattoo_description: escapeHtml(tattoo_description.trim()),
      placement: placement ? escapeHtml(placement.trim()) : null,
      size: size || null,
      reference_images: sanitizedImages,
      requested_city: requested_city ? escapeHtml(requested_city.trim()) : null,
      preferred_date: preferred_date || null,
      tracking_code: trackingCode,
      tracking_code_expires_at: expiresAt.toISOString(),
      status: 'pending',
      pipeline_stage: 'new_inquiry',
      source: 'website',
      customer_portal_enabled: true
    };

    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id, tracking_code, name, email')
      .single();

    if (insertError) {
      console.error('[INSERT_ERROR]', insertError);
      
      await supabase.rpc('append_security_audit', {
        p_event_type: 'booking_creation_failed',
        p_actor_type: 'anonymous',
        p_resource_type: 'booking',
        p_action: 'create',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_fingerprint_hash: fingerprintHash,
        p_severity: 'warning',
        p_details: { error: insertError.message }
      });

      return json(500, { error: "Failed to create booking. Please try again." }, req);
    }

    // =====================================================
    // GOOGLE CALENDAR AUTO-BLOCK (if preferred_date set)
    // =====================================================
    if (booking && preferred_date) {
      try {
        // Check if there's a calendar sync token for the workspace
        const { data: calendarToken } = await supabase
          .from('calendar_sync_tokens')
          .select('access_token, refresh_token, expires_at')
          .limit(1)
          .single();

        if (calendarToken?.access_token) {
          const eventDate = new Date(preferred_date);
          const eventEnd = new Date(eventDate);
          eventEnd.setHours(eventEnd.getHours() + 3); // Default 3 hour block

          // Create Google Calendar event
          const googleCalendarEvent = {
            summary: `🔒 Tentative: ${escapeHtml(name.trim())} - New Inquiry`,
            description: `New booking inquiry from ${escapeHtml(name.trim())}\n\nDescription: ${escapeHtml(tattoo_description.trim().substring(0, 200))}\n\nTracking: ${trackingCode}\n\n⚠️ This is a tentative hold. Confirm or release after review.`,
            start: {
              dateTime: eventDate.toISOString(),
              timeZone: 'America/Chicago',
            },
            end: {
              dateTime: eventEnd.toISOString(),
              timeZone: 'America/Chicago',
            },
            colorId: '5', // Yellow for tentative
            transparency: 'opaque',
          };

          const calendarResponse = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${calendarToken.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(googleCalendarEvent),
            }
          );

          if (calendarResponse.ok) {
            const calendarEvent = await calendarResponse.json();
            
            // Update booking with Google event ID
            await supabase
              .from('bookings')
              .update({ google_event_id: calendarEvent.id })
              .eq('id', booking.id);

            console.log(`[CALENDAR_BLOCKED] Event ${calendarEvent.id} created for booking ${booking.id}`);
          } else {
            console.error('[CALENDAR_ERROR]', await calendarResponse.text());
          }
        }
      } catch (calendarError) {
        console.error('[CALENDAR_EXCEPTION]', calendarError);
        // Don't fail booking if calendar sync fails
      }
    }

    // =====================================================
    // SEND EMAIL NOTIFICATIONS (Internal + Client Confirmation)
    // =====================================================
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "https://ferunda.com";
    
    if (resendApiKey && booking) {
      // 1. ADMIN NOTIFICATION
      try {
        const adminEmailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Ferunda Website <notifications@ferunda.com>",
            to: ["fernando@ferunda.com"],
            subject: `🔔 New Booking Request: ${escapeHtml(name.trim())}`,
            html: `
              <h2>New Tattoo Booking Request</h2>
              <p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>
              <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
              ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone.trim())}</p>` : ''}
              <p><strong>City:</strong> ${requested_city ? escapeHtml(requested_city) : 'Not specified'}</p>
              <p><strong>Size:</strong> ${size || 'Not specified'}</p>
              <p><strong>Placement:</strong> ${placement ? escapeHtml(placement) : 'Not specified'}</p>
              <h3>Tattoo Description:</h3>
              <p>${escapeHtml(tattoo_description.trim()).replace(/\n/g, '<br>')}</p>
              ${sanitizedImages.length > 0 ? `
                <h3>Reference Images:</h3>
                ${sanitizedImages.map(url => `<img src="${url}" style="max-width:200px;margin:5px;" />`).join('')}
              ` : ''}
              <hr>
              <p><strong>Tracking Code:</strong> ${trackingCode}</p>
              <p><strong>Booking ID:</strong> ${booking.id}</p>
              <div style="margin-top: 20px;">
                <a href="${siteUrl}/admin" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none;">
                  View in CRM →
                </a>
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">Submitted from ferunda.com</p>
            `,
          }),
        });

        if (!adminEmailResponse.ok) {
          console.error('[ADMIN_EMAIL_ERROR]', await adminEmailResponse.text());
        } else {
          console.log(`[ADMIN_EMAIL_SENT] Notification for booking ${booking.id}`);
        }
      } catch (emailError) {
        console.error('[ADMIN_EMAIL_EXCEPTION]', emailError);
      }

      // 2. CLIENT CONFIRMATION EMAIL (AUTOMATED)
      try {
        const firstName = name.trim().split(' ')[0];
        const clientEmailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Fernando Unda <fernando@ferunda.com>",
            to: [email.trim().toLowerCase()],
            reply_to: "fernando@ferunda.com",
            subject: `Got it! Your Tattoo Request is Confirmed ✓`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <h1 style="font-size: 24px; margin-bottom: 20px; color: #000;">Hey ${escapeHtml(firstName)}!</h1>
                
                <p style="font-size: 16px; line-height: 1.6;">
                  I just received your tattoo request and I'm excited to review your vision. 
                  Thank you for reaching out!
                </p>
                
                <div style="background: #f8f8f8; padding: 20px; margin: 25px 0; border-left: 4px solid #000;">
                  <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #666;">Your Tracking Code</h3>
                  <p style="font-size: 24px; font-family: monospace; margin: 0; color: #000; letter-spacing: 2px;">${trackingCode}</p>
                  <p style="font-size: 12px; color: #666; margin: 10px 0 0 0;">Save this to check your booking status anytime</p>
                </div>

                <h2 style="font-size: 18px; margin-top: 30px; color: #000;">What happens next?</h2>
                
                <ol style="padding-left: 20px; line-height: 2;">
                  <li><strong>Review</strong> — I'll personally review your request within 24-48 hours</li>
                  <li><strong>Deposit</strong> — If we're a good fit, you'll receive a secure payment link for your deposit</li>
                  <li><strong>Schedule</strong> — Once the deposit is confirmed, we'll book your session</li>
                </ol>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${siteUrl}/booking-status?code=${trackingCode}" 
                     style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: bold;">
                    Track Your Booking →
                  </a>
                </div>

                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  Have questions? Just reply to this email—I read every message.
                </p>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="font-size: 14px; color: #333;">
                  Talk soon,<br>
                  <strong>Fernando Unda</strong><br>
                  <span style="color: #666;">Ferunda Tattoo • Austin • Los Angeles • Houston</span>
                </p>

                <p style="font-size: 12px; color: #999; margin-top: 20px;">
                  <a href="${siteUrl}" style="color: #999;">ferunda.com</a> • 
                  <a href="https://instagram.com/ferundatattoo" style="color: #999;">@ferundatattoo</a>
                </p>
              </div>
            `,
          }),
        });

        if (!clientEmailResponse.ok) {
          console.error('[CLIENT_EMAIL_ERROR]', await clientEmailResponse.text());
        } else {
          console.log(`[CLIENT_EMAIL_SENT] Confirmation to ${email.trim()}`);
          
          // Log the email in customer_emails table
          await supabase.from('customer_emails').insert({
            customer_email: email.trim().toLowerCase(),
            customer_name: name.trim(),
            subject: `Got it! Your Tattoo Request is Confirmed ✓`,
            email_body: `Automated booking confirmation email sent with tracking code ${trackingCode}`,
            direction: 'outbound',
            booking_id: booking.id,
            is_read: true,
            tags: ['automated', 'confirmation']
          });
        }
      } catch (clientEmailError) {
        console.error('[CLIENT_EMAIL_EXCEPTION]', clientEmailError);
        // Don't fail the booking if email fails
      }
    }

    // =====================================================
    // NEWSLETTER SUBSCRIPTION
    // =====================================================
    if (subscribe_newsletter && booking) {
      try {
        const subscriberData: Record<string, unknown> = {
          email: email.trim().toLowerCase(),
          name: escapeHtml(name.trim()),
          phone: phone ? escapeHtml(phone.trim()) : null,
          status: 'active',
          source: 'booking_form',
          booking_id: booking.id,
          verified_at: new Date().toISOString(),
          lead_score: 35, // Verified email + booking = 10 + 25
          tags: ['verified', 'booking_submitted'],
        };

        // Add UTM params if present
        if (utm_params) {
          if (utm_params.utm_source) subscriberData.utm_source = utm_params.utm_source;
          if (utm_params.utm_medium) subscriberData.utm_medium = utm_params.utm_medium;
          if (utm_params.utm_campaign) subscriberData.utm_campaign = utm_params.utm_campaign;
          if (utm_params.utm_content) subscriberData.utm_content = utm_params.utm_content;
          if (utm_params.utm_term) subscriberData.utm_term = utm_params.utm_term;
        }

        const { error: subError } = await supabase
          .from('newsletter_subscribers')
          .upsert(subscriberData, { onConflict: 'email' });

        if (subError) {
          console.error('[NEWSLETTER_ERROR]', subError);
        } else {
          console.log(`[NEWSLETTER] Subscriber added: ${email.trim().toLowerCase()}`);
        }
      } catch (nlError) {
        console.error('[NEWSLETTER_EXCEPTION]', nlError);
        // Don't fail the booking if newsletter subscription fails
      }
    }

    // =====================================================
    // LOG SUCCESS
    // =====================================================
    await supabase.rpc('append_security_audit', {
      p_event_type: 'booking_created',
      p_actor_type: 'anonymous',
      p_resource_type: 'booking',
      p_resource_id: booking.id,
      p_action: 'create',
      p_ip_address: clientIP,
      p_user_agent: userAgent,
      p_fingerprint_hash: fingerprintHash,
      p_severity: 'info',
      p_details: { 
        processing_time_ms: Date.now() - startTime,
        has_reference_images: sanitizedImages.length > 0,
        subscribed_newsletter: !!subscribe_newsletter
      }
    });

    console.log(`[BOOKING_CREATED] ID: ${booking.id}, Time: ${Date.now() - startTime}ms`);

    return json(200, { 
      success: true, 
      tracking_code: trackingCode,
      message: "Your booking request has been submitted successfully!"
    }, req);

  } catch (error: unknown) {
    console.error('[CRITICAL_ERROR]', error);
    
    return json(500, { 
      error: "An unexpected error occurred. Please try again." 
    }, req);
  }
});
