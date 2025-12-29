import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, amount, payment_type, customer_email, customer_name } = await req.json();
    
    // Validate inputs
    if (!booking_id || !amount || !payment_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: booking_id, amount, payment_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount < 100 || amount > 1000000) { // $1 to $10,000 in cents
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Verify booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, email, name")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = customer_email || booking.email;
    const name = customer_name || booking.name;

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const newCustomer = await stripe.customers.create({
        email,
        name,
        metadata: {
          booking_id,
          source: "ferunda_crm"
        }
      });
      customerId = newCustomer.id;
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: payment_type === "deposit" ? "Tattoo Session Deposit" : "Tattoo Session Payment",
              description: payment_type === "deposit" 
                ? "Deposit to secure your exclusive tattoo session with Ferunda. This amount goes toward your session total."
                : "Payment for your custom tattoo session with Ferunda.",
              images: ["https://ferunda.com/logo.png"],
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin") || "https://ferunda.com"}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin") || "https://ferunda.com"}/payment-canceled`,
      metadata: {
        booking_id,
        payment_type,
      },
      payment_intent_data: {
        metadata: {
          booking_id,
          payment_type,
        }
      }
    });

    // Record payment attempt in database
    await supabase.from("customer_payments").insert({
      booking_id,
      amount: amount / 100, // Convert from cents to dollars
      payment_type,
      status: "pending",
      payment_link_url: session.url,
      payment_link_id: session.id,
      payment_link_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      metadata: {
        stripe_session_id: session.id,
        customer_id: customerId
      }
    });

    console.log(`[STRIPE] Payment session created for booking ${booking_id}: ${session.id}`);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("[STRIPE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Payment error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
