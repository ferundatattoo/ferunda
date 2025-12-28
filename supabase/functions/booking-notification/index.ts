import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { booking } = await req.json();
    
    if (!booking) {
      throw new Error("No booking data provided");
    }

    console.log("Sending notification for new booking:", booking.name);

    // Send notification email to Fernando
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ferunda Ink <fernando@ferunda.com>",
        to: ["Fernando.moralesunda@gmail.com", "fernando@ferunda.com"],
        subject: `🔔 New Booking Request from ${booking.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px;">
              New Booking Request
            </h1>
            
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #333;">Client Details</h2>
              <p><strong>Name:</strong> ${booking.name}</p>
              <p><strong>Email:</strong> ${booking.email}</p>
              ${booking.phone ? `<p><strong>Phone:</strong> ${booking.phone}</p>` : ''}
              ${booking.tracking_code ? `<p><strong>Tracking Code:</strong> ${booking.tracking_code}</p>` : ''}
            </div>
            
            <div style="background: #fafafa; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #333;">Tattoo Details</h2>
              <p><strong>Description:</strong></p>
              <p style="white-space: pre-wrap;">${booking.tattoo_description}</p>
              ${booking.placement ? `<p><strong>Placement:</strong> ${booking.placement}</p>` : ''}
              ${booking.size ? `<p><strong>Size:</strong> ${booking.size}</p>` : ''}
              ${booking.preferred_date ? `<p><strong>Preferred Date:</strong> ${booking.preferred_date}</p>` : ''}
            </div>
            
            ${booking.reference_images && booking.reference_images.length > 0 ? `
              <div style="margin: 20px 0;">
                <h2 style="color: #333;">Reference Images (${booking.reference_images.length})</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                  ${booking.reference_images.map((url: string, i: number) => 
                    `<a href="${url}" target="_blank"><img src="${url}" alt="Reference ${i+1}" style="width: 100px; height: 100px; object-fit: cover; border: 1px solid #ddd;"/></a>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <a href="https://ferundaink.com/admin" 
                 style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold;">
                View in CRM →
              </a>
            </div>
            
            <p style="color: #888; font-size: 12px; margin-top: 30px;">
              Submitted: ${new Date(booking.created_at).toLocaleString()}
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      throw new Error("Failed to send notification email");
    }

    console.log("Notification email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
