import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =====================================================
// HARDENED PAYMENT LINK GENERATOR
// Requires valid session or admin authentication
// =====================================================

const ALLOWED_ORIGINS = [
  'https://ferunda.com',
  'https://www.ferunda.com',
  'https://preview--ferunda-ink.lovable.app',
  'https://ferunda-ink.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080'
];

const RATE_LIMIT_REQUESTS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_BLOCK_MINUTES = 60;

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token, x-fingerprint-hash",
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

interface PaymentLinkRequest {
  bookingId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, req);
  }

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const sessionToken = req.headers.get('x-session-token') || '';
  const fingerprintHash = req.headers.get('x-fingerprint-hash') || '';
  const authHeader = req.headers.get('authorization');

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // AUTHENTICATION CHECK
    // =====================================================
    let isAdmin = false;
    let userId: string | null = null;
    let validatedBookingId: string | null = null;

    // Check for admin authentication
    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user } } = await supabaseAuth.auth.getUser();
      
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (roles) {
          isAdmin = true;
          userId = user.id;
        }
      }
    }

    // Check for customer portal session
    if (!isAdmin && sessionToken) {
      const tokenHash = await hashString(sessionToken);
      
      const { data: session } = await supabase
        .from('customer_portal_sessions')
        .select('booking_id, is_active, expires_at')
        .eq('session_token_hash', tokenHash)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (session) {
        validatedBookingId = session.booking_id;
      }
    }

    // If neither admin nor valid session
    if (!isAdmin && !validatedBookingId) {
      console.log(`[BLOCKED] Unauthenticated payment link request from IP: ${clientIP}`);
      
      await supabase.rpc('append_security_audit', {
        p_event_type: 'unauthorized_payment_link_request',
        p_actor_type: 'anonymous',
        p_resource_type: 'payment',
        p_action: 'request',
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_fingerprint_hash: fingerprintHash,
        p_severity: 'warning'
      });

      return json(401, { error: "Authentication required" }, req);
    }

    // =====================================================
    // RATE LIMITING
    // =====================================================
    const rateLimitIdentifier = validatedBookingId || userId || clientIP;
    
    const { data: rateLimit } = await supabase.rpc('check_global_rate_limit', {
      p_identifier: rateLimitIdentifier,
      p_action_type: 'payment_link',
      p_max_actions: RATE_LIMIT_REQUESTS_PER_HOUR,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
      p_block_minutes: RATE_LIMIT_BLOCK_MINUTES
    });

    if (rateLimit && rateLimit[0] && !rateLimit[0].allowed) {
      console.log(`[RATE_LIMITED] Payment link request from: ${rateLimitIdentifier}`);
      
      return json(429, { 
        error: "Too many payment link requests. Please try again later.",
        blocked_until: rateLimit[0].blocked_until
      }, req);
    }

    // =====================================================
    // VALIDATE REQUEST
    // =====================================================
    const { bookingId, amount, customerEmail, customerName }: PaymentLinkRequest = await req.json();

    // Validate booking ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!bookingId || !uuidRegex.test(bookingId)) {
      return json(400, { error: "Invalid booking ID format" }, req);
    }

    // If customer session, verify booking matches session
    if (validatedBookingId && validatedBookingId !== bookingId) {
      console.log(`[BLOCKED] Booking ID mismatch: session=${validatedBookingId}, request=${bookingId}`);
      
      await supabase.rpc('append_security_audit', {
        p_event_type: 'booking_id_mismatch',
        p_actor_type: 'customer',
        p_resource_type: 'payment',
        p_resource_id: bookingId,
        p_action: 'request',
        p_ip_address: clientIP,
        p_fingerprint_hash: fingerprintHash,
        p_severity: 'warning',
        p_details: { session_booking_id: validatedBookingId }
      });

      return json(403, { error: "Unauthorized access to this booking" }, req);
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 50000) {
      return json(400, { error: "Invalid amount" }, req);
    }

    // =====================================================
    // GENERATE PAYMENT LINK
    // =====================================================
    const cloverPaymentLink = Deno.env.get("CLOVER_PAYMENT_LINK");

    if (!cloverPaymentLink) {
      return json(500, { error: "Payment link not configured" }, req);
    }

    const paymentUrl = new URL(cloverPaymentLink);
    
    try {
      paymentUrl.searchParams.set("ref", bookingId);
      if (customerEmail) {
        paymentUrl.searchParams.set("email", customerEmail.substring(0, 255));
      }
    } catch {
      // URL manipulation failed, use base link
    }

    // =====================================================
    // LOG PAYMENT LINK GENERATION
    // =====================================================
    await supabase.rpc('append_security_audit', {
      p_event_type: 'payment_link_generated',
      p_actor_type: isAdmin ? 'admin' : 'customer',
      p_actor_id: userId || undefined,
      p_resource_type: 'payment',
      p_resource_id: bookingId,
      p_action: 'generate',
      p_ip_address: clientIP,
      p_user_agent: userAgent,
      p_fingerprint_hash: fingerprintHash,
      p_severity: 'info',
      p_details: { amount, customer_name: customerName?.substring(0, 100) }
    });

    console.log(`[PAYMENT_LINK] Generated for booking ${bookingId}, amount: ${amount}`);

    return json(200, { 
      paymentUrl: paymentUrl.toString(),
      amount,
      bookingId 
    }, req);

  } catch (error: unknown) {
    console.error("Payment link error:", error);
    return json(500, { error: "Internal server error" }, req);
  }
});
