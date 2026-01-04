// =============================================================================
// SEND DEPOSIT REQUEST v2.0 - CORE BUS CONNECTED
// Consolidated: All deposit events published to ferunda-core-bus
// =============================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Core Bus Publisher
async function publishToCoreBus(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  payload: Record<string, unknown>
) {
  try {
    const channel = supabase.channel('ferunda-core-bus');
    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload: { ...payload, timestamp: Date.now(), source: 'send-deposit-request' }
    });
    console.log(`[DepositRequest] Published ${eventType} to Core Bus`);
  } catch (err) {
    console.error('[DepositRequest] Core Bus publish error:', err);
  }
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

// Price ID for $500 deposit
const DEPOSIT_PRICE_ID = "price_1SjhHbCwDxrP8HLxgkTzYF1q";
const DEPOSIT_AMOUNT = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[DEPOSIT-REQUEST] Starting automated deposit request...");

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { booking_id, custom_amount, custom_message } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for all operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[DEPOSIT-REQUEST] Processing for:", booking.name, booking.email);

    // Check required keys
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });

    // Create or find Stripe customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: booking.email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: booking.email,
        name: booking.name,
        metadata: {
          booking_id,
          source: "ferunda_tattoo"
        }
      });
      customerId = customer.id;
    }

    const depositAmount = custom_amount || DEPOSIT_AMOUNT;
    const origin = req.headers.get("origin") || "https://ferunda.com";

    // Create Stripe checkout session
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    
    if (custom_amount && custom_amount !== DEPOSIT_AMOUNT) {
      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tattoo Session Deposit",
            description: `Deposit for your custom tattoo session with Ferunda`,
          },
          unit_amount: Math.round(depositAmount * 100),
        },
        quantity: 1,
      }];
    } else {
      lineItems = [{
        price: DEPOSIT_PRICE_ID,
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/booking-status?code=${booking.tracking_code}&payment=success`,
      cancel_url: `${origin}/booking-status?code=${booking.tracking_code}`,
      metadata: {
        booking_id,
        payment_type: "deposit",
        customer_name: booking.name,
      },
      payment_intent_data: {
        metadata: {
          booking_id,
          payment_type: "deposit",
        },
      },
    });

    console.log("[DEPOSIT-REQUEST] Stripe session created:", session.id);

    // Record payment in database
    await supabase.from("customer_payments").insert({
      booking_id,
      amount: depositAmount,
      payment_type: "deposit",
      status: "pending",
      payment_link_url: session.url,
      payment_link_id: session.id,
      metadata: {
        stripe_session_id: session.id,
        customer_id: customerId,
        automated: true
      }
    });

    // Prepare email content
    const emailSubject = `Your Tattoo Deposit - Ferunda`;
    const defaultMessage = `Thank you for choosing me for your next tattoo! I'm excited to work with you on this piece.

To secure your appointment, please complete your $${depositAmount} deposit using the secure link below:`;

    const emailBody = `
Hi ${booking.name.split(" ")[0]},

${custom_message || defaultMessage}

<div style="text-align: center; margin: 30px 0;">
  <a href="${session.url}" style="display: inline-block; background-color: #000; color: #fff; padding: 16px 32px; text-decoration: none; font-weight: bold; font-size: 16px;">
    Pay $${depositAmount} Deposit →
  </a>
</div>

<p style="color: #666; font-size: 14px;">Or copy this link: ${session.url}</p>

<p><strong>What happens next?</strong></p>
<ul>
  <li>Once your deposit is confirmed, I'll reach out to schedule your session</li>
  <li>Your deposit goes toward your total session cost</li>
  <li>You can track your booking anytime with code: <strong>${booking.tracking_code}</strong></li>
</ul>

Looking forward to creating something amazing together!

Fernando`;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Fernando Unda <fernando@ferunda.com>",
        to: [booking.email],
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${emailBody.replace(/\n/g, '<br>')}
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Fernando Unda (Ferunda)<br>
              Tattoo Artist | Austin • Los Angeles • Houston<br>
              <a href="https://ferunda.com" style="color: #666;">ferunda.com</a>
            </p>
          </div>
        `,
        reply_to: "fernando@ferunda.com",
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[DEPOSIT-REQUEST] Email failed:", errorText);
      // Continue anyway - payment link was created
    } else {
      console.log("[DEPOSIT-REQUEST] Email sent successfully");
    }

    // Save email to customer_emails
    await supabase.from("customer_emails").insert({
      customer_email: booking.email,
      customer_name: booking.name,
      subject: emailSubject,
      email_body: emailBody,
      direction: "outbound",
      booking_id,
      is_read: true,
    });

    // Update booking status
    const updates: Record<string, any> = {
      deposit_requested_at: new Date().toISOString(),
      last_contacted_at: new Date().toISOString(),
      deposit_amount: depositAmount,
    };

    // Auto-advance to deposit_requested stage if in earlier stage
    const earlyStages = ["new_inquiry", "references_requested", "references_received"];
    if (!booking.pipeline_stage || earlyStages.includes(booking.pipeline_stage)) {
      updates.pipeline_stage = "deposit_requested";
    }

    await supabase
      .from("bookings")
      .update(updates)
      .eq("id", booking_id);

    // Log activity
    await supabase.from("booking_activities").insert({
      booking_id,
      activity_type: "deposit_request_sent",
      description: `Deposit request ($${depositAmount}) sent via email`,
      metadata: { 
        stripe_session_id: session.id,
        amount: depositAmount,
        email: booking.email,
        automated: true
      }
    });

    console.log("[DEPOSIT-REQUEST] Completed successfully!");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Deposit request sent to ${booking.email}`,
        payment_url: session.url,
        session_id: session.id,
        amount: depositAmount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[DEPOSIT-REQUEST] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send deposit request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
