import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs for different payment types
const PRICE_IDS = {
  deposit: "price_1SjhHbCwDxrP8HLxgkTzYF1q", // $500 deposit
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { 
      booking_id, 
      payment_type = "deposit", 
      custom_amount,
      customer_email,
      customer_name,
      success_url,
      cancel_url 
    } = body;

    console.log("[STRIPE] Creating checkout for booking:", booking_id, "type:", payment_type);

    if (!booking_id) {
      throw new Error("booking_id is required");
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    const email = customer_email || booking.email;
    const name = customer_name || booking.name;

    // Check if customer exists in Stripe
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          booking_id,
          source: "ferunda_tattoo"
        }
      });
      customerId = customer.id;
    }

    // Determine price/amount
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    
    if (custom_amount && custom_amount > 0) {
      // For custom amounts (session payments)
      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: payment_type === "deposit" ? "Tattoo Deposit" : "Tattoo Session Payment",
            description: `Payment for booking ${booking.name} - ${booking.tattoo_description?.slice(0, 50)}...`,
          },
          unit_amount: Math.round(custom_amount * 100), // Convert to cents
        },
        quantity: 1,
      }];
    } else {
      // Use predefined price for deposits
      lineItems = [{
        price: PRICE_IDS.deposit,
        quantity: 1,
      }];
    }

    const origin = req.headers.get("origin") || "https://ferunda.com";
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "payment",
      success_url: success_url || `${origin}/booking-status?code=${booking.tracking_code}&payment=success`,
      cancel_url: cancel_url || `${origin}/booking-status?code=${booking.tracking_code}&payment=cancelled`,
      metadata: {
        booking_id,
        payment_type,
        customer_name: name,
      },
      payment_intent_data: {
        metadata: {
          booking_id,
          payment_type,
        },
        // Future-proof for Stripe Connect multi-artist setup
        // transfer_data: { destination: "connected_account_id" },
        // application_fee_amount: fee_amount,
      },
    });

    // Record payment attempt in customer_payments
    await supabase.from("customer_payments").insert({
      booking_id,
      amount: custom_amount || 500,
      payment_type,
      status: "pending",
      payment_link_url: session.url,
      payment_link_id: session.id,
      metadata: {
        stripe_session_id: session.id,
        customer_id: customerId,
      }
    });

    // Update booking with deposit requested timestamp
    if (payment_type === "deposit") {
      await supabase
        .from("bookings")
        .update({ deposit_requested_at: new Date().toISOString() })
        .eq("id", booking_id);
    }

    console.log("[STRIPE] Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        session_id: session.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[STRIPE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Payment failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
