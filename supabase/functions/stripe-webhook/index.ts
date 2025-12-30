import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "https://ferunda.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!STRIPE_SECRET_KEY) {
    console.error("[WEBHOOK] Stripe not configured");
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error("[WEBHOOK] Signature verification failed:", err);
        return new Response("Invalid signature", { status: 400 });
      }
    } else {
      // For development/testing without webhook signature
      event = JSON.parse(body);
      console.log("[WEBHOOK] Processing without signature verification (dev mode)");
    }

    console.log("[WEBHOOK] Event received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        const paymentType = session.metadata?.payment_type || "deposit";
        const customerName = session.metadata?.customer_name || "";

        console.log("[WEBHOOK] Checkout completed for booking:", bookingId);

        if (bookingId) {
          // Get booking details first
          const { data: booking } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single();

          // Update customer_payments
          await supabase
            .from("customer_payments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              external_transaction_id: session.payment_intent as string,
            })
            .eq("payment_link_id", session.id);

          // Update booking based on payment type
          if (paymentType === "deposit") {
            const amountPaid = (session.amount_total || 50000) / 100; // Convert from cents
            
            await supabase
              .from("bookings")
              .update({
                deposit_paid: true,
                deposit_paid_at: new Date().toISOString(),
                total_paid: amountPaid,
                pipeline_stage: "deposit_paid",
                status: "confirmed",
              })
              .eq("id", bookingId);

            // Log activity
            await supabase.from("booking_activities").insert({
              booking_id: bookingId,
              activity_type: "payment",
              description: `✅ Deposit of $${amountPaid} received via Stripe`,
              metadata: {
                payment_intent: session.payment_intent,
                amount: amountPaid,
                payment_type: paymentType,
              }
            });

            // =====================================================
            // AUTOMATED: Send deposit confirmation email to client
            // =====================================================
            if (RESEND_API_KEY && booking) {
              const firstName = booking.name.split(" ")[0];
              
              try {
                const emailResponse = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                  },
                  body: JSON.stringify({
                    from: "Fernando Unda <fernando@ferunda.com>",
                    to: [booking.email],
                    reply_to: "fernando@ferunda.com",
                    subject: `✅ Deposit Confirmed - You're Booked!`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h1 style="font-size: 24px; color: #000;">🎉 You're officially booked, ${firstName}!</h1>
                        
                        <p style="font-size: 16px; line-height: 1.6;">
                          I just received your $${amountPaid} deposit—thank you for trusting me with your next tattoo!
                        </p>

                        <div style="background: #f0fff4; padding: 20px; margin: 25px 0; border-left: 4px solid #22c55e;">
                          <h3 style="margin: 0 0 10px 0; color: #166534;">Payment Confirmed</h3>
                          <p style="margin: 0; font-size: 18px;">Amount: <strong>$${amountPaid}</strong></p>
                        </div>

                        <h2 style="font-size: 18px; margin-top: 30px;">What happens next?</h2>
                        <ol style="padding-left: 20px; line-height: 2;">
                          <li><strong>Scheduling:</strong> I'll reach out within 24-48 hours to confirm your session date</li>
                          <li><strong>Design:</strong> I'll start working on concepts based on your vision</li>
                          <li><strong>Prep:</strong> You'll get session prep info closer to your appointment</li>
                        </ol>

                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${SITE_URL}/booking-status?code=${booking.tracking_code}" 
                             style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: bold;">
                            Track Your Booking →
                          </a>
                        </div>

                        <p style="font-size: 14px; color: #666;">
                          Questions? Just reply to this email anytime.
                        </p>

                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        
                        <p style="font-size: 14px; color: #333;">
                          Excited to create something amazing!<br>
                          <strong>Fernando</strong><br>
                          <span style="color: #666;">Ferunda Tattoo</span>
                        </p>
                      </div>
                    `,
                  }),
                });

                if (emailResponse.ok) {
                  console.log("[WEBHOOK] Deposit confirmation email sent to", booking.email);
                  
                  // Log email
                  await supabase.from("customer_emails").insert({
                    customer_email: booking.email,
                    customer_name: booking.name,
                    subject: "✅ Deposit Confirmed - You're Booked!",
                    email_body: `Automated deposit confirmation for $${amountPaid}`,
                    direction: "outbound",
                    booking_id: bookingId,
                    is_read: true,
                    tags: ["automated", "payment_confirmation"],
                  });
                } else {
                  console.error("[WEBHOOK] Failed to send confirmation email:", await emailResponse.text());
                }
              } catch (emailErr) {
                console.error("[WEBHOOK] Email error:", emailErr);
              }

              // Also notify admin
              try {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                  },
                  body: JSON.stringify({
                    from: "Ferunda Notifications <notifications@ferunda.com>",
                    to: ["fernando@ferunda.com"],
                    subject: `💰 Deposit Received: ${booking.name} - $${amountPaid}`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>💰 Deposit Payment Received!</h2>
                        <p><strong>Client:</strong> ${booking.name}</p>
                        <p><strong>Email:</strong> ${booking.email}</p>
                        <p><strong>Amount:</strong> $${amountPaid}</p>
                        <p><strong>Tracking Code:</strong> ${booking.tracking_code}</p>
                        <hr>
                        <p>The client has been automatically moved to "Deposit Paid" stage.</p>
                        <p><a href="${SITE_URL}/admin">Open CRM →</a></p>
                      </div>
                    `,
                  }),
                });
              } catch (adminEmailErr) {
                console.error("[WEBHOOK] Admin email error:", adminEmailErr);
              }
            }
          } else {
            // Session payment
            const amountPaid = (session.amount_total || 0) / 100;
            
            // Get current total_paid
            const currentTotalPaid = booking?.total_paid || 0;
            const newTotal = currentTotalPaid + amountPaid;

            await supabase
              .from("bookings")
              .update({
                total_paid: newTotal,
              })
              .eq("id", bookingId);

            await supabase.from("booking_activities").insert({
              booking_id: bookingId,
              activity_type: "payment",
              description: `✅ Session payment of $${amountPaid} received via Stripe`,
              metadata: {
                payment_intent: session.payment_intent,
                amount: amountPaid,
                payment_type: paymentType,
              }
            });
          }

          console.log("[WEBHOOK] Booking updated successfully");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.booking_id;

        console.log("[WEBHOOK] Payment failed for booking:", bookingId);

        if (bookingId) {
          await supabase
            .from("customer_payments")
            .update({
              status: "failed",
              metadata: {
                failure_message: paymentIntent.last_payment_error?.message,
              }
            })
            .eq("external_transaction_id", paymentIntent.id);

          await supabase.from("booking_activities").insert({
            booking_id: bookingId,
            activity_type: "payment_failed",
            description: `❌ Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent = charge.payment_intent as string;

        console.log("[WEBHOOK] Refund processed for payment:", paymentIntent);

        // Find the payment record
        const { data: payment } = await supabase
          .from("customer_payments")
          .select("booking_id, amount")
          .eq("external_transaction_id", paymentIntent)
          .single();

        if (payment) {
          await supabase
            .from("customer_payments")
            .update({ status: "refunded" })
            .eq("external_transaction_id", paymentIntent);

          await supabase.from("booking_activities").insert({
            booking_id: payment.booking_id,
            activity_type: "refund",
            description: `↩️ Refund of $${(charge.amount_refunded || 0) / 100} processed`,
          });
        }
        break;
      }

      default:
        console.log("[WEBHOOK] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
