import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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

        console.log("[WEBHOOK] Checkout completed for booking:", bookingId);

        if (bookingId) {
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
              description: `Deposit of $${amountPaid} received via Stripe`,
              metadata: {
                payment_intent: session.payment_intent,
                amount: amountPaid,
                payment_type: paymentType,
              }
            });
          } else {
            // Session payment
            const amountPaid = (session.amount_total || 0) / 100;
            
            // Get current total_paid
            const { data: booking } = await supabase
              .from("bookings")
              .select("total_paid")
              .eq("id", bookingId)
              .single();

            const newTotal = (booking?.total_paid || 0) + amountPaid;

            await supabase
              .from("bookings")
              .update({
                total_paid: newTotal,
              })
              .eq("id", bookingId);

            await supabase.from("booking_activities").insert({
              booking_id: bookingId,
              activity_type: "payment",
              description: `Session payment of $${amountPaid} received via Stripe`,
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
            description: `Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
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
            description: `Refund of $${(charge.amount_refunded || 0) / 100} processed`,
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
