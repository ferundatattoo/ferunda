import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const MAX_BODY_SIZE = 50 * 1024; // 50KB for contact form
const RATE_LIMIT_EMAILS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_BLOCK_MINUTES = 720; // 12 hours

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fingerprint-hash, x-load-time",
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
// VALIDATION & SANITIZATION
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
  return emailRegex.test(email) && email.length >= 5 && email.length <= 255;
}

function validateName(name: string): boolean {
  const nameRegex = /^[\p{L}\s'-]+$/u;
  return nameRegex.test(name) && name.length >= 2 && name.length <= 100;
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  const phoneRegex = /^[\d\s\-+()]*$/;
  return phoneRegex.test(phone) && phone.length <= 20;
}

function validateMessage(message: string): boolean {
  return message.length >= 10 && message.length <= 2000;
}

function containsSuspiciousPatterns(text: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onclick/i,
    /onerror/i,
    /onload/i,
    /data:text\/html/i,
    /eval\(/i,
    /document\./i,
    /window\./i
  ];
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const handler = async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, req);
  }

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const fingerprintHash = req.headers.get('x-fingerprint-hash') || '';
  const loadTime = parseInt(req.headers.get('x-load-time') || '0');

  try {
    // Check body size
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > MAX_BODY_SIZE) {
      return json(413, { error: "Payload too large" }, req);
    }

    const body = await req.json();

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // HONEYPOT CHECK
    // =====================================================
    if (body._hp_url || body.company || body.website || body._gotcha) {
      console.log(`[HONEYPOT] Contact form triggered by IP: ${clientIP}`);
      
      await supabase.from('honeypot_triggers').insert({
        ip_address: clientIP,
        user_agent: userAgent,
        trigger_type: 'contact_form',
        trigger_details: { 
          fields: Object.keys(body).filter(k => ['_hp_url', 'company', 'website', '_gotcha'].includes(k))
        }
      });

      // Fake success
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      return json(200, { success: true }, req);
    }

    // =====================================================
    // TIMING ANALYSIS
    // =====================================================
    const timeSincePageLoad = Date.now() - loadTime;
    if (loadTime > 0 && timeSincePageLoad < 2000) {
      console.log(`[SUSPICIOUS] Fast contact submission from IP: ${clientIP}`);
      
      await supabase.rpc('append_security_log', {
        p_event_type: 'suspicious_fast_contact',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_details: { time_since_load: timeSincePageLoad },
        p_success: false
      });
    }

    // =====================================================
    // RATE LIMITING
    // =====================================================
    const { data: rateLimit } = await supabase.rpc('check_global_rate_limit', {
      p_identifier: clientIP,
      p_action_type: 'contact_email',
      p_max_actions: RATE_LIMIT_EMAILS_PER_HOUR,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
      p_block_minutes: RATE_LIMIT_BLOCK_MINUTES
    });

    if (rateLimit && rateLimit[0] && !rateLimit[0].allowed) {
      console.log(`[RATE_LIMITED] Contact form IP: ${clientIP}`);
      
      await supabase.rpc('append_security_audit', {
        p_event_type: 'contact_rate_limit_exceeded',
        p_actor_type: 'anonymous',
        p_resource_type: 'contact',
        p_action: 'send',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_fingerprint_hash: fingerprintHash,
        p_severity: 'warning'
      });

      return json(429, { 
        error: "Too many contact requests. Please try again later.",
        blocked_until: rateLimit[0].blocked_until
      }, req);
    }

    // =====================================================
    // INPUT VALIDATION
    // =====================================================
    const { name, email, phone, message, subject } = body;

    if (!name || !validateName(name.trim())) {
      return json(400, { error: "Invalid name. Must be 2-100 characters." }, req);
    }

    if (!email || !validateEmail(email.trim().toLowerCase())) {
      return json(400, { error: "Invalid email address." }, req);
    }

    if (phone && !validatePhone(phone)) {
      return json(400, { error: "Invalid phone number format." }, req);
    }

    if (!message || !validateMessage(message.trim())) {
      return json(400, { error: "Message must be 10-2000 characters." }, req);
    }

    // Check for suspicious patterns
    if (containsSuspiciousPatterns(message) || containsSuspiciousPatterns(name)) {
      console.log(`[SUSPICIOUS_CONTENT] From IP: ${clientIP}`);
      
      await supabase.rpc('append_security_audit', {
        p_event_type: 'suspicious_content_blocked',
        p_actor_type: 'anonymous',
        p_resource_type: 'contact',
        p_action: 'blocked',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_fingerprint_hash: fingerprintHash,
        p_severity: 'warning',
        p_details: { reason: 'suspicious_patterns' }
      });

      return json(400, { error: "Invalid content detected." }, req);
    }

    // =====================================================
    // FINGERPRINT TRACKING
    // =====================================================
    if (fingerprintHash) {
      await supabase.rpc('track_device_fingerprint', {
        p_fingerprint_hash: fingerprintHash,
        p_session_id: `contact_${Date.now()}`
      });
    }

    // Sanitize all inputs
    const sanitizedName = escapeHtml(name.trim());
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhone = phone ? escapeHtml(phone.trim()) : '';
    const sanitizedMessage = escapeHtml(message.trim());
    const sanitizedSubject = subject ? escapeHtml(subject.trim()).substring(0, 200) : '';

    console.log("Sending contact email from:", sanitizedName, sanitizedEmail);

    // =====================================================
    // SEND NOTIFICATION EMAIL
    // =====================================================
    const notificationResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ferunda Website <notifications@ferunda.com>",
        to: ["fernando@ferunda.com"],
        subject: sanitizedSubject || `New Contact: ${sanitizedName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${sanitizedName}</p>
          <p><strong>Email:</strong> ${sanitizedEmail}</p>
          ${sanitizedPhone ? `<p><strong>Phone:</strong> ${sanitizedPhone}</p>` : ''}
          <h3>Message:</h3>
          <div style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">
            ${sanitizedMessage.replace(/\n/g, '<br>')}
          </div>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent from ferunda.com contact form</p>
          <p style="color: #999; font-size: 10px;">IP: ${clientIP.substring(0, clientIP.indexOf('.') + 1)}***</p>
        `,
      }),
    });

    if (!notificationResponse.ok) {
      const error = await notificationResponse.text();
      console.error("Failed to send notification email:", error);
      throw new Error(`Failed to send notification: ${error}`);
    }

    console.log("Notification email sent successfully");

    // =====================================================
    // SEND CONFIRMATION TO USER
    // =====================================================
    const confirmationResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fernando Unda <fernando@ferunda.com>",
        to: [sanitizedEmail],
        subject: "Thanks for reaching out - Ferunda",
        html: `
          <h1>Thank you for contacting me, ${sanitizedName}!</h1>
          <p>I've received your message and will get back to you as soon as possible.</p>
          <p>If you have any urgent questions, feel free to reach me on WhatsApp at +1 (512) 850-9592.</p>
          <br>
          <p>Best,<br>Fernando Unda (Ferunda)</p>
          <p style="color: #666; font-size: 12px;">Tattoo Artist | Austin • Los Angeles • Houston</p>
        `,
      }),
    });

    if (!confirmationResponse.ok) {
      console.log("Warning: Confirmation email may have failed");
    } else {
      console.log("Confirmation email sent successfully");
    }

    // =====================================================
    // LOG SUCCESS
    // =====================================================
    await supabase.rpc('append_security_audit', {
      p_event_type: 'contact_email_sent',
      p_actor_type: 'anonymous',
      p_resource_type: 'contact',
      p_action: 'send',
      p_ip_address: clientIP,
      p_user_agent: userAgent,
      p_fingerprint_hash: fingerprintHash,
      p_severity: 'info'
    });

    return json(200, { success: true }, req);

  } catch (error: unknown) {
    console.error("Error in send-contact-email function:", error);
    return json(500, { error: error instanceof Error ? error.message : "Unknown error" }, req);
  }
};

serve(handler);
