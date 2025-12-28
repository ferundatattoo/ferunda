import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentLinkRequest {
  bookingId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, amount, customerEmail, customerName }: PaymentLinkRequest = await req.json();

    // Get the Clover payment link from environment
    const cloverPaymentLink = Deno.env.get("CLOVER_PAYMENT_LINK");

    if (!cloverPaymentLink) {
      throw new Error("Payment link not configured");
    }

    // Build the payment URL with parameters if the link supports them
    // Clover links can often accept prefill parameters
    const paymentUrl = new URL(cloverPaymentLink);
    
    // Add tracking/reference params if the URL supports them
    try {
      paymentUrl.searchParams.set("ref", bookingId);
      paymentUrl.searchParams.set("email", customerEmail);
    } catch {
      // If URL manipulation fails, just use the base link
    }

    console.log(`Payment link generated for booking ${bookingId}, customer: ${customerName}`);

    return new Response(
      JSON.stringify({ 
        paymentUrl: paymentUrl.toString(),
        amount,
        bookingId 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error generating payment link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});