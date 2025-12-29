import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token, x-fingerprint",
};

// =====================================================
// SECURITY LAYER 1: JWT Session Token Utilities
// =====================================================

async function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, message);
}

function base64UrlEncode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifySessionToken(
  token: string,
  secret: string,
  currentFingerprint: string
): Promise<{ valid: boolean; payload?: any; error?: string }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, error: "Invalid token format" };

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Verify signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);
    const expectedSignature = await hmacSha256(keyData, signatureInput);
    const expectedSignatureB64 = base64UrlEncode(expectedSignature);
    
    if (signatureB64 !== expectedSignatureB64) {
      return { valid: false, error: "Invalid signature" };
    }

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expired" };
    }

    // SECURITY LAYER 2: Fingerprint binding verification
    if (payload.fingerprint) {
      const currentFpHash = await hashString(currentFingerprint);
      if (payload.fingerprint !== currentFpHash) {
        return { valid: false, error: "Fingerprint mismatch - possible session hijacking" };
      }
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: `Token verification failed: ${(error as Error).message}` };
  }
}

async function createSessionToken(
  secret: string,
  bookingId: string,
  emailHash: string,
  fingerprint: string,
  permissions: object
): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
  const fingerprintHash = await hashString(fingerprint);
  
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    booking_id: bookingId,
    email_hash: emailHash,
    fingerprint: fingerprintHash,
    permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: expiresAt
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  const signatureInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const keyData = encoder.encode(secret);
  const signature = await hmacSha256(keyData, signatureInput);
  const signatureB64 = base64UrlEncode(signature);

  return { token: `${headerB64}.${payloadB64}.${signatureB64}`, expiresAt };
}

// =====================================================
// RATE LIMIT CONFIGURATIONS (Security Layer 6)
// =====================================================

const RATE_LIMITS = {
  upload_reference: { max: 5, windowMinutes: 60 },
  send_message: { max: 20, windowMinutes: 60 },
  request_reschedule: { max: 2, windowMinutes: 1440 }, // 2 per day
  request_payment: { max: 5, windowMinutes: 60 },
  get_booking: { max: 60, windowMinutes: 60 }
};

// =====================================================
// HELPER: JSON Response
// =====================================================

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sessionSecret = Deno.env.get("CUSTOMER_SESSION_SECRET") || supabaseServiceKey.slice(0, 32);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get security headers
  const sessionToken = req.headers.get("x-session-token");
  const fingerprint = req.headers.get("x-fingerprint") || "";
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || "";

  try {
    // =====================================================
    // ACTION: Validate Magic Link & Create Session
    // =====================================================
    if (action === "validate-magic-link" && req.method === "POST") {
      const { token } = await req.json();
      
      if (!token || token.length < 32) {
        return json(400, { error: "Invalid token" });
      }

      // Hash the token
      const tokenHash = await hashString(token);

      // Find and validate the magic link
      const { data: magicLink, error: mlError } = await supabase
        .from("magic_link_tokens")
        .select("*, bookings!inner(*)")
        .eq("token_hash", tokenHash)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (mlError || !magicLink) {
        // Log failed attempt
        await supabase.from("security_logs").insert({
          event_type: "magic_link_validation_failed",
          ip_address: clientIp,
          user_agent: userAgent,
          success: false,
          details: { token_prefix: token.slice(0, 8), error: mlError?.message || "Not found" }
        });
        return json(401, { error: "Invalid or expired magic link" });
      }

      // Mark as used
      await supabase
        .from("magic_link_tokens")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("id", magicLink.id);

      const booking = magicLink.bookings;
      
      // Get permissions based on pipeline stage
      const { data: permData } = await supabase.rpc("get_customer_permissions", {
        p_pipeline_stage: booking.pipeline_stage || "new_inquiry"
      });
      const permissions = permData || { can_view: true };

      // Create session token
      const emailHash = await hashString(booking.email.toLowerCase());
      const { token: sessionTokenNew, expiresAt } = await createSessionToken(
        sessionSecret,
        booking.id,
        emailHash,
        fingerprint,
        permissions
      );

      // Store session in database
      const sessionTokenHash = await hashString(sessionTokenNew);
      const fingerprintHash = await hashString(fingerprint);
      
      await supabase.from("customer_portal_sessions").insert({
        booking_id: booking.id,
        session_token_hash: sessionTokenHash,
        fingerprint_hash: fingerprintHash,
        ip_address: clientIp,
        user_agent: userAgent,
        expires_at: new Date(expiresAt * 1000).toISOString()
      });

      // Log successful access
      await supabase.from("security_logs").insert({
        event_type: "customer_portal_access",
        ip_address: clientIp,
        user_agent: userAgent,
        success: true,
        details: { booking_id: booking.id, fingerprint_hash: fingerprintHash }
      });

      // Update last customer activity
      await supabase.from("bookings").update({ last_customer_activity: new Date().toISOString() }).eq("id", booking.id);

      return json(200, {
        sessionToken: sessionTokenNew,
        expiresAt,
        booking: {
          id: booking.id,
          name: booking.name,
          status: booking.status,
          pipeline_stage: booking.pipeline_stage,
          tattoo_description: booking.tattoo_description,
          size: booking.size,
          placement: booking.placement,
          scheduled_date: booking.scheduled_date,
          scheduled_time: booking.scheduled_time,
          deposit_amount: booking.deposit_amount,
          deposit_paid: booking.deposit_paid,
          total_paid: booking.total_paid || 0,
          session_rate: booking.session_rate,
          reference_images: booking.reference_images,
          reference_images_customer: booking.reference_images_customer || [],
          requested_city: booking.requested_city,
          created_at: booking.created_at
        },
        permissions
      });
    }

    // =====================================================
    // SECURITY LAYER 3: Validate Session for All Other Actions
    // =====================================================
    if (!sessionToken) {
      return json(401, { error: "Session token required" });
    }

    const verification = await verifySessionToken(sessionToken, sessionSecret, fingerprint);
    
    if (!verification.valid) {
      await supabase.from("security_logs").insert({
        event_type: "session_validation_failed",
        ip_address: clientIp,
        user_agent: userAgent,
        success: false,
        details: { error: verification.error }
      });
      return json(401, { error: verification.error });
    }

    const { payload } = verification;
    const bookingId = payload.booking_id;
    const permissions = payload.permissions;

    // Verify session exists in database and is active
    const sessionTokenHash = await hashString(sessionToken);
    const { data: dbSession } = await supabase
      .from("customer_portal_sessions")
      .select("*")
      .eq("session_token_hash", sessionTokenHash)
      .eq("is_active", true)
      .single();

    if (!dbSession) {
      return json(401, { error: "Session not found or invalidated" });
    }

    // Update last activity
    await supabase
      .from("customer_portal_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", dbSession.id);

    // =====================================================
    // ACTION: Get Booking Details
    // =====================================================
    if (action === "get-booking" && req.method === "GET") {
      // Rate limit check
      const { data: rateLimit } = await supabase.rpc("check_customer_rate_limit", {
        p_booking_id: bookingId,
        p_action_type: "get_booking",
        p_max_actions: RATE_LIMITS.get_booking.max,
        p_window_minutes: RATE_LIMITS.get_booking.windowMinutes
      });

      if (rateLimit && !rateLimit[0]?.allowed) {
        return json(429, { error: "Rate limit exceeded", reset_at: rateLimit[0]?.reset_at });
      }

      const { data: booking, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        return json(404, { error: "Booking not found" });
      }

      // Get messages count
      const { count: unreadMessages } = await supabase
        .from("customer_messages")
        .select("*", { count: "exact", head: true })
        .eq("booking_id", bookingId)
        .eq("sender_type", "artist")
        .eq("is_read", false);

      // Get payment history
      const { data: payments } = await supabase
        .from("customer_payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      // Get current permissions
      const { data: currentPerms } = await supabase.rpc("get_customer_permissions", {
        p_pipeline_stage: booking.pipeline_stage || "new_inquiry"
      });

      return json(200, {
        booking: {
          id: booking.id,
          name: booking.name,
          email: booking.email,
          status: booking.status,
          pipeline_stage: booking.pipeline_stage,
          tattoo_description: booking.tattoo_description,
          size: booking.size,
          placement: booking.placement,
          scheduled_date: booking.scheduled_date,
          scheduled_time: booking.scheduled_time,
          deposit_amount: booking.deposit_amount,
          deposit_paid: booking.deposit_paid,
          total_paid: booking.total_paid || 0,
          session_rate: booking.session_rate,
          reference_images: booking.reference_images || [],
          reference_images_customer: booking.reference_images_customer || [],
          requested_city: booking.requested_city,
          created_at: booking.created_at,
          admin_notes: null // Hide admin notes from customer
        },
        unreadMessages: unreadMessages || 0,
        payments: payments || [],
        permissions: currentPerms
      });
    }

    // =====================================================
    // ACTION: Get Messages
    // =====================================================
    if (action === "get-messages" && req.method === "GET") {
      const { data: messages, error } = await supabase
        .from("customer_messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (error) {
        return json(500, { error: "Failed to fetch messages" });
      }

      // Mark artist messages as read
      await supabase
        .from("customer_messages")
        .update({ is_read: true })
        .eq("booking_id", bookingId)
        .eq("sender_type", "artist")
        .eq("is_read", false);

      return json(200, { messages: messages || [] });
    }

    // =====================================================
    // ACTION: Send Message
    // =====================================================
    if (action === "send-message" && req.method === "POST") {
      // SECURITY LAYER 4: Permission check
      if (!permissions.can_message) {
        return json(403, { error: "Messaging not available at this stage" });
      }

      // Rate limit check
      const { data: rateLimit } = await supabase.rpc("check_customer_rate_limit", {
        p_booking_id: bookingId,
        p_action_type: "send_message",
        p_max_actions: RATE_LIMITS.send_message.max,
        p_window_minutes: RATE_LIMITS.send_message.windowMinutes
      });

      if (rateLimit && !rateLimit[0]?.allowed) {
        return json(429, { error: "Rate limit exceeded", reset_at: rateLimit[0]?.reset_at });
      }

      const { content } = await req.json();
      
      if (!content || content.trim().length === 0 || content.length > 2000) {
        return json(400, { error: "Message must be 1-2000 characters" });
      }

      const fingerprintHash = await hashString(fingerprint);
      
      const { data: message, error } = await supabase
        .from("customer_messages")
        .insert({
          booking_id: bookingId,
          sender_type: "customer",
          content: content.trim(),
          fingerprint_hash: fingerprintHash,
          ip_address: clientIp
        })
        .select()
        .single();

      if (error) {
        return json(500, { error: "Failed to send message" });
      }

      // Update booking unread count
      await supabase.rpc("update_customer_activity", { p_booking_id: bookingId });

      return json(200, { message });
    }

    // =====================================================
    // ACTION: Upload Reference Image
    // =====================================================
    if (action === "upload-reference" && req.method === "POST") {
      // SECURITY LAYER 4: Permission check
      if (!permissions.can_upload) {
        return json(403, { error: "Uploads not available at this stage" });
      }

      // Rate limit check
      const { data: rateLimit } = await supabase.rpc("check_customer_rate_limit", {
        p_booking_id: bookingId,
        p_action_type: "upload_reference",
        p_max_actions: RATE_LIMITS.upload_reference.max,
        p_window_minutes: RATE_LIMITS.upload_reference.windowMinutes
      });

      if (rateLimit && !rateLimit[0]?.allowed) {
        return json(429, { error: "Upload limit exceeded", reset_at: rateLimit[0]?.reset_at });
      }

      // Get current customer references count
      const { data: booking } = await supabase
        .from("bookings")
        .select("reference_images_customer")
        .eq("id", bookingId)
        .single();

      const currentRefs = booking?.reference_images_customer || [];
      if (currentRefs.length >= 5) {
        return json(400, { error: "Maximum 5 additional references allowed" });
      }

      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return json(400, { error: "No file provided" });
      }

      // SECURITY LAYER 5: File validation
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      
      // Check declared MIME type
      if (!allowedTypes.includes(file.type)) {
        return json(400, { error: "Invalid file type. Only JPEG, PNG, WebP, HEIC allowed" });
      }

      // Check file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return json(400, { error: "File too large. Maximum 10MB" });
      }

      // Read file bytes for magic number validation
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Validate magic numbers (real MIME type check)
      const isValidMagic = 
        (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) || // JPEG
        (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) || // PNG
        (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) || // WebP (RIFF)
        (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70); // HEIC

      if (!isValidMagic) {
        await supabase.from("security_logs").insert({
          event_type: "invalid_file_upload_attempt",
          ip_address: clientIp,
          success: false,
          details: { booking_id: bookingId, declared_type: file.type, actual_magic: Array.from(bytes.slice(0, 8)) }
        });
        return json(400, { error: "File validation failed - magic number mismatch" });
      }

      // Generate unique filename
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${bookingId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("customer-references")
        .upload(filename, arrayBuffer, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return json(500, { error: "Failed to upload file" });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("customer-references")
        .getPublicUrl(filename);

      // Update booking with new reference
      const newRef = {
        url: urlData.publicUrl,
        filename,
        uploaded_at: new Date().toISOString(),
        fingerprint_hash: await hashString(fingerprint)
      };

      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          reference_images_customer: [...currentRefs, newRef],
          last_customer_activity: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (updateError) {
        return json(500, { error: "Failed to update booking" });
      }

      return json(200, { 
        success: true, 
        reference: newRef,
        remaining: 5 - currentRefs.length - 1
      });
    }

    // =====================================================
    // ACTION: Request Payment Link
    // =====================================================
    if (action === "request-payment" && req.method === "POST") {
      // SECURITY LAYER 4: Permission check
      if (!permissions.can_pay) {
        return json(403, { error: "Payments not available at this stage" });
      }

      // Rate limit check
      const { data: rateLimit } = await supabase.rpc("check_customer_rate_limit", {
        p_booking_id: bookingId,
        p_action_type: "request_payment",
        p_max_actions: RATE_LIMITS.request_payment.max,
        p_window_minutes: RATE_LIMITS.request_payment.windowMinutes
      });

      if (rateLimit && !rateLimit[0]?.allowed) {
        return json(429, { error: "Rate limit exceeded", reset_at: rateLimit[0]?.reset_at });
      }

      const { amount, payment_type } = await req.json();

      // SECURITY LAYER 7: Anti-fraud validation
      if (!amount || amount < 100) {
        return json(400, { error: "Minimum payment amount is $100" });
      }

      if (amount > 10000) {
        return json(400, { error: "Maximum payment amount is $10,000" });
      }

      // Get booking to verify
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (!booking) {
        return json(404, { error: "Booking not found" });
      }

      // Validate payment type based on booking state
      const validPaymentType = payment_type || (booking.deposit_paid ? "partial" : "deposit");
      
      if (validPaymentType === "deposit" && booking.deposit_paid) {
        return json(400, { error: "Deposit already paid" });
      }

      // Get Clover payment link
      const cloverPaymentLink = Deno.env.get("CLOVER_PAYMENT_LINK");
      if (!cloverPaymentLink) {
        return json(500, { error: "Payment system not configured" });
      }

      // Create payment record
      const fingerprintHash = await hashString(fingerprint);
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      const { data: payment, error: paymentError } = await supabase
        .from("customer_payments")
        .insert({
          booking_id: bookingId,
          amount,
          payment_type: validPaymentType,
          status: "link_generated",
          payment_link_url: cloverPaymentLink,
          payment_link_expires_at: expiresAt.toISOString(),
          fingerprint_hash: fingerprintHash,
          ip_address: clientIp,
          metadata: {
            requested_at: new Date().toISOString(),
            user_agent: userAgent
          }
        })
        .select()
        .single();

      if (paymentError) {
        return json(500, { error: "Failed to create payment record" });
      }

      // Log payment request
      await supabase.from("security_logs").insert({
        event_type: "payment_link_requested",
        ip_address: clientIp,
        success: true,
        details: { 
          booking_id: bookingId, 
          amount, 
          payment_type: validPaymentType,
          payment_id: payment.id 
        }
      });

      return json(200, { 
        payment_url: cloverPaymentLink,
        payment_id: payment.id,
        amount,
        expires_at: expiresAt.toISOString()
      });
    }

    // =====================================================
    // ACTION: Get Payment History
    // =====================================================
    if (action === "get-payments" && req.method === "GET") {
      const { data: payments, error } = await supabase
        .from("customer_payments")
        .select("id, amount, payment_type, status, created_at, completed_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) {
        return json(500, { error: "Failed to fetch payments" });
      }

      return json(200, { payments: payments || [] });
    }

    // =====================================================
    // ACTION: Request Reschedule
    // =====================================================
    if (action === "request-reschedule" && req.method === "POST") {
      // SECURITY LAYER 4: Permission check
      if (!permissions.can_reschedule) {
        return json(403, { error: "Rescheduling not available at this stage" });
      }

      // Rate limit check
      const { data: rateLimit } = await supabase.rpc("check_customer_rate_limit", {
        p_booking_id: bookingId,
        p_action_type: "request_reschedule",
        p_max_actions: RATE_LIMITS.request_reschedule.max,
        p_window_minutes: RATE_LIMITS.request_reschedule.windowMinutes
      });

      if (rateLimit && !rateLimit[0]?.allowed) {
        return json(429, { error: "Reschedule limit exceeded (2 per day)", reset_at: rateLimit[0]?.reset_at });
      }

      const { requested_date, requested_time, reason } = await req.json();

      if (!reason || reason.trim().length < 10) {
        return json(400, { error: "Please provide a reason (at least 10 characters)" });
      }

      // Get current booking
      const { data: booking } = await supabase
        .from("bookings")
        .select("scheduled_date, scheduled_time")
        .eq("id", bookingId)
        .single();

      // Check if rescheduling is allowed (at least 48 hours before)
      if (booking?.scheduled_date) {
        const scheduledDateTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time || "12:00"}`);
        const hoursUntil = (scheduledDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
        
        if (hoursUntil < 48) {
          return json(400, { error: "Cannot reschedule less than 48 hours before appointment" });
        }
      }

      const fingerprintHash = await hashString(fingerprint);

      const { data: request, error } = await supabase
        .from("reschedule_requests")
        .insert({
          booking_id: bookingId,
          original_date: booking?.scheduled_date,
          original_time: booking?.scheduled_time,
          requested_date,
          requested_time,
          reason: reason.trim(),
          fingerprint_hash: fingerprintHash,
          ip_address: clientIp
        })
        .select()
        .single();

      if (error) {
        return json(500, { error: "Failed to submit reschedule request" });
      }

      return json(200, { 
        success: true, 
        request_id: request.id,
        message: "Reschedule request submitted. You will receive an email confirmation."
      });
    }

    // =====================================================
    // ACTION: Refresh Session
    // =====================================================
    if (action === "refresh-session" && req.method === "POST") {
      // Get booking for fresh permissions
      const { data: booking } = await supabase
        .from("bookings")
        .select("email, pipeline_stage")
        .eq("id", bookingId)
        .single();

      if (!booking) {
        return json(404, { error: "Booking not found" });
      }

      // Get fresh permissions
      const { data: newPerms } = await supabase.rpc("get_customer_permissions", {
        p_pipeline_stage: booking.pipeline_stage || "new_inquiry"
      });

      // Invalidate old session
      await supabase
        .from("customer_portal_sessions")
        .update({ 
          is_active: false, 
          invalidated_at: new Date().toISOString(),
          invalidation_reason: "session_refreshed"
        })
        .eq("id", dbSession.id);

      // Create new session
      const emailHash = await hashString(booking.email.toLowerCase());
      const { token: newToken, expiresAt } = await createSessionToken(
        sessionSecret,
        bookingId,
        emailHash,
        fingerprint,
        newPerms
      );

      // Store new session
      const newTokenHash = await hashString(newToken);
      const fingerprintHash = await hashString(fingerprint);
      
      await supabase.from("customer_portal_sessions").insert({
        booking_id: bookingId,
        session_token_hash: newTokenHash,
        fingerprint_hash: fingerprintHash,
        ip_address: clientIp,
        user_agent: userAgent,
        expires_at: new Date(expiresAt * 1000).toISOString()
      });

      return json(200, {
        sessionToken: newToken,
        expiresAt,
        permissions: newPerms
      });
    }

    // =====================================================
    // ACTION: Logout
    // =====================================================
    if (action === "logout" && req.method === "POST") {
      await supabase
        .from("customer_portal_sessions")
        .update({ 
          is_active: false, 
          invalidated_at: new Date().toISOString(),
          invalidation_reason: "user_logout"
        })
        .eq("id", dbSession.id);

      return json(200, { success: true });
    }

    return json(400, { error: `Unknown action: ${action}` });

  } catch (error) {
    console.error("Customer portal error:", error);
    return json(500, { error: "Internal server error" });
  }
});
