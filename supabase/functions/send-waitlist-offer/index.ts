import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaitlistOfferRequest {
  waitlist_id: string;
  discount_percentage?: number;
  custom_message?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waitlist_id, discount_percentage = 10, custom_message } = await req.json() as WaitlistOfferRequest;

    if (!waitlist_id) {
      return new Response(
        JSON.stringify({ error: "waitlist_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service-role client for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch waitlist entry
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from("booking_waitlist")
      .select("*")
      .eq("id", waitlist_id)
      .single();

    if (fetchError || !entry) {
      console.error("[WAITLIST_OFFER] Entry not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Waitlist entry not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already converted
    if (entry.status === "converted") {
      return new Response(
        JSON.stringify({ error: "Entry already converted", status: entry.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[WAITLIST_OFFER] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exclusive Offer - Ferunda Ink</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.3);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
                    <h1 style="margin: 0; color: #d4af37; font-size: 28px; font-weight: 300; letter-spacing: 4px;">FERUNDA INK</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.6); font-size: 12px; letter-spacing: 2px;">EXCLUSIVE INVITATION</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 400;">
                      Hey ${entry.client_name || "there"}, 
                    </h2>
                    
                    <p style="margin: 0 0 25px; color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.7;">
                      You've been on our waitlist, and we appreciate your patience. We have an opening that might be perfect for you.
                    </p>

                    ${custom_message ? `
                    <div style="background: rgba(212, 175, 55, 0.1); border-left: 3px solid #d4af37; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 15px; font-style: italic;">
                        "${custom_message}"
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- Discount Badge -->
                    <div style="text-align: center; margin: 35px 0;">
                      <div style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 25px 45px; border-radius: 12px;">
                        <p style="margin: 0; color: #0a0a0a; font-size: 14px; font-weight: 500; letter-spacing: 2px;">EXCLUSIVE DISCOUNT</p>
                        <p style="margin: 8px 0 0; color: #0a0a0a; font-size: 42px; font-weight: 700;">${discount_percentage}% OFF</p>
                        <p style="margin: 8px 0 0; color: rgba(0,0,0,0.7); font-size: 13px;">Your next session</p>
                      </div>
                    </div>
                    
                    <!-- Details -->
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px; color: #d4af37; font-size: 14px; letter-spacing: 1px;">YOUR PREFERENCES</h3>
                      ${entry.preferred_city ? `<p style="margin: 0 0 8px; color: rgba(255,255,255,0.7); font-size: 14px;">📍 Location: <strong style="color: #fff;">${entry.preferred_city}</strong></p>` : ''}
                      ${entry.preferred_size ? `<p style="margin: 0 0 8px; color: rgba(255,255,255,0.7); font-size: 14px;">📐 Size: <strong style="color: #fff;">${entry.preferred_size}</strong></p>` : ''}
                      ${entry.style_preference ? `<p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">🎨 Style: <strong style="color: #fff;">${entry.style_preference}</strong></p>` : ''}
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="https://ferunda.ink/booking?code=WAITLIST${discount_percentage}&email=${encodeURIComponent(entry.client_email)}" 
                         style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #0a0a0a; text-decoration: none; padding: 18px 45px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                        Claim Your Spot
                      </a>
                    </div>
                    
                    <p style="margin: 25px 0 0; color: rgba(255,255,255,0.5); font-size: 13px; text-align: center;">
                      This offer expires in 72 hours. Don't miss out.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background: rgba(0,0,0,0.3); text-align: center; border-top: 1px solid rgba(212, 175, 55, 0.2);">
                    <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px;">
                      Ferunda Ink • Premium Tattoo Artistry
                    </p>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.3); font-size: 11px;">
                      You received this because you joined our waitlist.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Ferunda Ink <noreply@ferunda.ink>",
        to: [entry.client_email],
        subject: `🎨 ${discount_percentage}% Off - Your Exclusive Waitlist Offer`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[WAITLIST_OFFER] Email send failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update waitlist entry
    const { error: updateError } = await supabaseAdmin
      .from("booking_waitlist")
      .update({
        status: "offer_sent",
        offers_sent_count: (entry.offers_sent_count || 0) + 1,
        last_offer_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", waitlist_id);

    if (updateError) {
      console.error("[WAITLIST_OFFER] Failed to update entry:", updateError);
    }

    console.log(`[WAITLIST_OFFER] Sent ${discount_percentage}% offer to ${entry.client_email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Offer sent to ${entry.client_email}`,
        discount: discount_percentage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[WAITLIST_OFFER] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
