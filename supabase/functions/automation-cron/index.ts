import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "https://ferunda.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results = {
    deposit_reminders: 0,
    confirmation_24h: 0,
    followups: 0,
    errors: [] as string[],
  };

  try {
    console.log("[AUTOMATION] Starting automated tasks...");

    // =====================================================
    // 1. DEPOSIT REMINDERS (48 hours after request, if not paid)
    // =====================================================
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const { data: pendingDeposits, error: depError } = await supabase
      .from("bookings")
      .select("id, name, email, tracking_code, deposit_requested_at, deposit_amount")
      .eq("deposit_paid", false)
      .eq("pipeline_stage", "deposit_requested")
      .lt("deposit_requested_at", twoDaysAgo.toISOString())
      .is("status", "pending")
      .limit(20);

    if (depError) {
      console.error("[AUTOMATION] Error fetching pending deposits:", depError);
      results.errors.push(`Deposit query: ${depError.message}`);
    } else if (pendingDeposits && pendingDeposits.length > 0) {
      console.log(`[AUTOMATION] Found ${pendingDeposits.length} pending deposits to remind`);

      for (const booking of pendingDeposits) {
        // Check if we already sent a reminder in the last 24 hours
        const { data: recentReminder } = await supabase
          .from("customer_emails")
          .select("id")
          .eq("booking_id", booking.id)
          .ilike("subject", "%reminder%")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentReminder && recentReminder.length > 0) {
          console.log(`[AUTOMATION] Skipping ${booking.name} - reminder already sent recently`);
          continue;
        }

        // Get the payment link
        const { data: payment } = await supabase
          .from("customer_payments")
          .select("payment_link_url")
          .eq("booking_id", booking.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!payment?.payment_link_url) {
          console.log(`[AUTOMATION] No payment link for ${booking.name}, skipping`);
          continue;
        }

        const firstName = booking.name.split(" ")[0];
        const depositAmount = booking.deposit_amount || 500;

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
              subject: `Quick reminder about your tattoo deposit`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="font-size: 22px; color: #000;">Hey ${firstName}!</h1>
                  
                  <p style="font-size: 16px; line-height: 1.6;">
                    Just a friendly reminder—your tattoo deposit is still waiting for you!
                  </p>
                  
                  <p style="font-size: 16px; line-height: 1.6;">
                    I'd love to get you on the calendar and start bringing your vision to life.
                    No pressure, but spots fill up quickly and I don't want you to miss out.
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${payment.payment_link_url}" 
                       style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; text-decoration: none; font-weight: bold; font-size: 16px;">
                      Complete $${depositAmount} Deposit →
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #666;">
                    If you've changed your mind or have any questions, just hit reply—no hard feelings!
                  </p>

                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  
                  <p style="font-size: 14px; color: #333;">
                    Fernando<br>
                    <span style="color: #666;">Ferunda Tattoo</span>
                  </p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            results.deposit_reminders++;
            
            // Log the email
            await supabase.from("customer_emails").insert({
              customer_email: booking.email,
              customer_name: booking.name,
              subject: "Quick reminder about your tattoo deposit",
              email_body: `Automated deposit reminder sent`,
              direction: "outbound",
              booking_id: booking.id,
              is_read: true,
              tags: ["automated", "reminder", "deposit"],
            });

            await supabase.from("booking_activities").insert({
              booking_id: booking.id,
              activity_type: "automated_reminder",
              description: "Deposit reminder email sent automatically",
              metadata: { type: "deposit_reminder" },
            });

            console.log(`[AUTOMATION] Deposit reminder sent to ${booking.name}`);
          }
        } catch (emailErr) {
          console.error(`[AUTOMATION] Failed to send reminder to ${booking.email}:`, emailErr);
          results.errors.push(`Deposit reminder to ${booking.email}: ${emailErr}`);
        }
      }
    }

    // =====================================================
    // 2. 24-HOUR APPOINTMENT CONFIRMATION
    // =====================================================
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(tomorrowEnd.getHours() + 4); // 4-hour window

    const { data: upcomingAppointments, error: aptError } = await supabase
      .from("bookings")
      .select("id, name, email, tracking_code, scheduled_date, scheduled_time, requested_city, confirmed_24h")
      .eq("deposit_paid", true)
      .eq("confirmed_24h", false)
      .gte("scheduled_date", tomorrow.toISOString().split("T")[0])
      .lte("scheduled_date", tomorrowEnd.toISOString().split("T")[0])
      .in("pipeline_stage", ["deposit_paid", "scheduled"])
      .limit(20);

    if (aptError) {
      console.error("[AUTOMATION] Error fetching upcoming appointments:", aptError);
      results.errors.push(`Appointment query: ${aptError.message}`);
    } else if (upcomingAppointments && upcomingAppointments.length > 0) {
      console.log(`[AUTOMATION] Found ${upcomingAppointments.length} appointments needing 24h confirmation`);

      for (const booking of upcomingAppointments) {
        const firstName = booking.name.split(" ")[0];
        const formattedDate = new Date(booking.scheduled_date!).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

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
              subject: `Tomorrow! Your tattoo session is almost here 🎨`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="font-size: 22px; color: #000;">Hey ${firstName}!</h1>
                  
                  <p style="font-size: 16px; line-height: 1.6;">
                    Your tattoo session is <strong>tomorrow</strong>! I'm excited to create something amazing with you.
                  </p>

                  <div style="background: #f8f8f8; padding: 20px; margin: 25px 0; border-left: 4px solid #000;">
                    <p style="margin: 0 0 8px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
                    ${booking.scheduled_time ? `<p style="margin: 0 0 8px 0;"><strong>🕐 Time:</strong> ${booking.scheduled_time}</p>` : ""}
                    ${booking.requested_city ? `<p style="margin: 0;"><strong>📍 Location:</strong> ${booking.requested_city}</p>` : ""}
                  </div>

                  <h2 style="font-size: 18px; margin-top: 30px;">Quick prep checklist:</h2>
                  <ul style="padding-left: 20px; line-height: 2;">
                    <li>Get a good night's sleep</li>
                    <li>Eat a solid meal before your appointment</li>
                    <li>Stay hydrated (but avoid alcohol 24 hours before)</li>
                    <li>Wear comfortable clothes with easy access to the tattoo area</li>
                    <li>Moisturize the area lightly (no heavy lotions day-of)</li>
                  </ul>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${SITE_URL}/booking-status?code=${booking.tracking_code}" 
                       style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: bold;">
                      View Session Details →
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #666;">
                    Need to reschedule? Reply ASAP and we'll work something out.
                  </p>

                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  
                  <p style="font-size: 14px; color: #333;">
                    See you tomorrow!<br>
                    <strong>Fernando</strong>
                  </p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            results.confirmation_24h++;

            // Mark as confirmation sent
            await supabase
              .from("bookings")
              .update({ 
                confirmed_24h: true,
                confirmed_24h_at: new Date().toISOString(),
                last_contacted_at: new Date().toISOString()
              })
              .eq("id", booking.id);

            await supabase.from("customer_emails").insert({
              customer_email: booking.email,
              customer_name: booking.name,
              subject: "Tomorrow! Your tattoo session is almost here 🎨",
              email_body: "24-hour appointment confirmation sent",
              direction: "outbound",
              booking_id: booking.id,
              is_read: true,
              tags: ["automated", "24h_confirmation"],
            });

            await supabase.from("booking_activities").insert({
              booking_id: booking.id,
              activity_type: "automated_confirmation",
              description: "24-hour appointment confirmation sent automatically",
              metadata: { type: "24h_confirmation" },
            });

            console.log(`[AUTOMATION] 24h confirmation sent to ${booking.name}`);
          }
        } catch (emailErr) {
          console.error(`[AUTOMATION] Failed to send 24h confirmation to ${booking.email}:`, emailErr);
          results.errors.push(`24h confirmation to ${booking.email}: ${emailErr}`);
        }
      }
    }

    // =====================================================
    // 3. FOLLOW-UP FOR STALE INQUIRIES (7 days, no activity)
    // =====================================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: staleInquiries, error: staleError } = await supabase
      .from("bookings")
      .select("id, name, email, tracking_code, created_at, last_contacted_at")
      .eq("pipeline_stage", "new_inquiry")
      .eq("deposit_paid", false)
      .lt("created_at", sevenDaysAgo.toISOString())
      .or(`last_contacted_at.is.null,last_contacted_at.lt.${sevenDaysAgo.toISOString()}`)
      .eq("status", "pending")
      .limit(10);

    if (staleError) {
      console.error("[AUTOMATION] Error fetching stale inquiries:", staleError);
      results.errors.push(`Stale query: ${staleError.message}`);
    } else if (staleInquiries && staleInquiries.length > 0) {
      console.log(`[AUTOMATION] Found ${staleInquiries.length} stale inquiries to follow up`);

      for (const booking of staleInquiries) {
        // Check if we already sent a follow-up
        const { data: recentFollowup } = await supabase
          .from("customer_emails")
          .select("id")
          .eq("booking_id", booking.id)
          .contains("tags", ["followup"])
          .limit(1);

        if (recentFollowup && recentFollowup.length > 0) {
          continue; // Already sent a follow-up
        }

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
              subject: `Still thinking about that tattoo?`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="font-size: 22px; color: #000;">Hey ${firstName}!</h1>
                  
                  <p style="font-size: 16px; line-height: 1.6;">
                    I noticed your tattoo inquiry from last week and wanted to check in.
                    Still interested in making that vision a reality?
                  </p>
                  
                  <p style="font-size: 16px; line-height: 1.6;">
                    If you have any questions about the process, pricing, or anything else—just 
                    hit reply. I'm here to help!
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${SITE_URL}/booking-status?code=${booking.tracking_code}" 
                       style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: bold;">
                      View Your Request →
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #666;">
                    No rush—great tattoos are worth waiting for. But if you're ready, 
                    I've got some great dates opening up soon.
                  </p>

                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  
                  <p style="font-size: 14px; color: #333;">
                    Fernando<br>
                    <span style="color: #666;">Ferunda Tattoo</span>
                  </p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            results.followups++;

            await supabase
              .from("bookings")
              .update({ last_contacted_at: new Date().toISOString() })
              .eq("id", booking.id);

            await supabase.from("customer_emails").insert({
              customer_email: booking.email,
              customer_name: booking.name,
              subject: "Still thinking about that tattoo?",
              email_body: "Automated 7-day follow-up sent",
              direction: "outbound",
              booking_id: booking.id,
              is_read: true,
              tags: ["automated", "followup"],
            });

            await supabase.from("booking_activities").insert({
              booking_id: booking.id,
              activity_type: "automated_followup",
              description: "7-day follow-up email sent automatically",
              metadata: { type: "7_day_followup" },
            });

            console.log(`[AUTOMATION] Follow-up sent to ${booking.name}`);
          }
        } catch (emailErr) {
          console.error(`[AUTOMATION] Failed to send follow-up to ${booking.email}:`, emailErr);
          results.errors.push(`Follow-up to ${booking.email}: ${emailErr}`);
        }
      }
    }

    console.log("[AUTOMATION] Completed!", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AUTOMATION] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Automation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
