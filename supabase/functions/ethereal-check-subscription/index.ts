import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ETHEREAL-CHECK-SUB] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No customer found, returning free tier");
      return new Response(JSON.stringify({
        subscribed: false,
        plan_key: "free",
        product_id: null,
        subscription_end: null,
        addons: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions");
      return new Response(JSON.stringify({
        subscribed: false,
        plan_key: "free",
        product_id: null,
        subscription_end: null,
        addons: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract product IDs from all subscriptions
    const productIds: string[] = [];
    let subscriptionEnd: string | null = null;
    let mainProductId: string | null = null;
    let totalSeats = 0;

    for (const sub of subscriptions.data) {
      const endDate = new Date(sub.current_period_end * 1000).toISOString();
      if (!subscriptionEnd || endDate > subscriptionEnd) {
        subscriptionEnd = endDate;
      }

      for (const item of sub.items.data) {
        const prodId = typeof item.price.product === 'string' 
          ? item.price.product 
          : item.price.product.id;
        productIds.push(prodId);
        
        // Track seats
        if (prodId === 'prod_TiqfA57pjPcSqz') { // Extra seat product
          totalSeats += item.quantity || 1;
        }
        
        // Identify main plan product
        if (!mainProductId && !prodId.includes('seat') && !prodId.includes('addon')) {
          mainProductId = prodId;
        }
      }
    }

    logStep("Subscription data processed", { 
      productIds, 
      mainProductId, 
      subscriptionEnd,
      totalSeats 
    });

    // Map product ID to plan key
    const productToPlan: Record<string, string> = {
      'prod_Tiqe9znV1MdNCB': 'solo_pro',
      'prod_TiqfFo6TscA7ag': 'solo_ultimate',
      'prod_TiqfDhztQBaBIE': 'studio_basic',
      'prod_Tiqff2dusVTLVw': 'studio_pro',
      'prod_Tiqf28AUJiq3eg': 'studio_ultimate',
    };

    const addonProducts: Record<string, string> = {
      'prod_Tiqf0tHk3sXS1M': 'growth',
      'prod_TiqfCj1Typabx5': 'ai_center',
    };

    const planKey = mainProductId ? (productToPlan[mainProductId] || 'free') : 'free';
    const addons = productIds
      .filter(id => addonProducts[id])
      .map(id => addonProducts[id]);

    logStep("Response prepared", { planKey, addons, totalSeats });

    return new Response(JSON.stringify({
      subscribed: true,
      plan_key: planKey,
      product_id: mainProductId,
      subscription_end: subscriptionEnd,
      addons,
      extra_seats: totalSeats,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
