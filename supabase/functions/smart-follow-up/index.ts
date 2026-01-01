import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * SMART FOLLOW-UP ENGINE v1.0 - AI-Powered Client Nurturing
 * 
 * Intelligent follow-up system that:
 * - Tracks client journey stages
 * - Sends personalized follow-ups at optimal times
 * - Re-engages dormant leads
 * - Nurtures hesitant prospects
 * - Celebrates milestones (booking anniversary, healing complete)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";
const RESEND_API_URL = "https://api.resend.com/emails";

interface FollowUpRule {
  trigger: string;
  delay_hours: number;
  template_key: string;
  priority: number;
  conditions?: Record<string, unknown>;
}

// Follow-up rules by pipeline stage
const FOLLOW_UP_RULES: FollowUpRule[] = [
  // New inquiry nurturing
  { trigger: "new_inquiry_no_response", delay_hours: 24, template_key: "gentle_check_in", priority: 1 },
  { trigger: "new_inquiry_no_response", delay_hours: 72, template_key: "share_portfolio", priority: 2 },
  { trigger: "new_inquiry_no_response", delay_hours: 168, template_key: "limited_availability", priority: 3 },
  
  // Deposit pending
  { trigger: "deposit_pending", delay_hours: 24, template_key: "deposit_reminder_soft", priority: 1 },
  { trigger: "deposit_pending", delay_hours: 48, template_key: "deposit_reminder_urgent", priority: 2 },
  { trigger: "deposit_pending", delay_hours: 96, template_key: "deposit_last_chance", priority: 3 },
  
  // Pre-appointment
  { trigger: "appointment_upcoming", delay_hours: -72, template_key: "prep_reminder_3_days", priority: 1 },
  { trigger: "appointment_upcoming", delay_hours: -24, template_key: "prep_reminder_1_day", priority: 2 },
  { trigger: "appointment_upcoming", delay_hours: -2, template_key: "see_you_soon", priority: 3 },
  
  // Post-session
  { trigger: "session_completed", delay_hours: 2, template_key: "aftercare_day_0", priority: 1 },
  { trigger: "session_completed", delay_hours: 72, template_key: "aftercare_check_day_3", priority: 2 },
  { trigger: "session_completed", delay_hours: 168, template_key: "aftercare_check_day_7", priority: 3 },
  { trigger: "session_completed", delay_hours: 336, template_key: "healed_photo_request", priority: 4 },
  
  // Dormant lead re-engagement
  { trigger: "inquiry_dormant_30_days", delay_hours: 0, template_key: "reconnect_soft", priority: 1 },
  { trigger: "inquiry_dormant_60_days", delay_hours: 0, template_key: "guest_spot_announcement", priority: 2 },
  { trigger: "inquiry_dormant_90_days", delay_hours: 0, template_key: "final_reconnect", priority: 3 },
  
  // Celebrations
  { trigger: "booking_anniversary_1_year", delay_hours: 0, template_key: "anniversary_celebration", priority: 1 },
  { trigger: "healing_complete", delay_hours: 0, template_key: "healing_celebration", priority: 1 },
];

// Email templates
const EMAIL_TEMPLATES: Record<string, { subject: string; bodyTemplate: string }> = {
  gentle_check_in: {
    subject: "Still thinking about your tattoo? 🤔",
    bodyTemplate: `Hey {{firstName}},

Just checking in! I saw your inquiry about {{tattooDescription}} and wanted to make sure you didn't have any questions.

I'd love to help bring your vision to life. If you're still interested, just reply to this email and we can chat about next steps.

Looking forward to hearing from you!

– Fernando`
  },
  share_portfolio: {
    subject: "Some inspiration for your tattoo journey ✨",
    bodyTemplate: `Hey {{firstName}},

I thought you might enjoy seeing some of my recent work! I've been doing a lot of {{relevantStyle}} pieces lately that might give you some inspiration for your project.

Check out my latest work: https://ferunda.com/#gallery

If any of these spark ideas, let me know – I'd love to discuss how we can make your piece unique.

– Fernando`
  },
  limited_availability: {
    subject: "Heads up: My calendar is filling up 📅",
    bodyTemplate: `Hey {{firstName}},

Quick heads up – my {{nextMonth}} calendar is starting to fill up. If you're still thinking about that {{tattooDescription}} piece, now might be a good time to lock in a date.

No pressure at all, just wanted to give you first dibs since you reached out earlier.

Ready when you are!

– Fernando`
  },
  deposit_reminder_soft: {
    subject: "Quick reminder about your booking 📝",
    bodyTemplate: `Hey {{firstName}},

Just a friendly reminder that your tattoo session is waiting to be confirmed! 

All I need is your deposit to lock in {{preferredDate}} for your {{tattooDescription}} piece.

Here's your payment link: {{depositLink}}

Let me know if you have any questions!

– Fernando`
  },
  deposit_reminder_urgent: {
    subject: "Your spot is reserved for 24 more hours ⏰",
    bodyTemplate: `Hey {{firstName}},

I'm holding {{preferredDate}} for your session, but I can only hold it for another 24 hours before I need to open it up to my waitlist.

If you're ready to move forward, here's your deposit link: {{depositLink}}

If your plans changed, no worries – just let me know!

– Fernando`
  },
  prep_reminder_3_days: {
    subject: "3 days until your tattoo session! 🎨",
    bodyTemplate: `Hey {{firstName}},

Your session is coming up on {{appointmentDate}}! Here's what to do to prepare:

✓ Stay hydrated (seriously, it helps!)
✓ Get a good night's sleep
✓ Eat a solid meal before coming in
✓ Wear comfortable, loose clothing
✓ No alcohol 24 hours before

Address: {{studioAddress}}
Time: {{appointmentTime}}

See you soon!

– Fernando`
  },
  aftercare_day_0: {
    subject: "Aftercare instructions for your new tattoo 🩹",
    bodyTemplate: `Hey {{firstName}},

Congrats on your new piece! Here's how to take care of it:

FIRST 24 HOURS:
• Keep the bandage on for 2-4 hours
• Wash gently with lukewarm water and fragrance-free soap
• Pat dry (don't rub!)
• Apply a thin layer of aftercare balm

NEXT 2 WEEKS:
• Wash 2-3x daily
• Keep it moisturized
• NO swimming, sun, or scratching
• Wear loose clothing over it

Questions? Just reply to this email or send a photo if anything looks off.

– Fernando`
  },
  healed_photo_request: {
    subject: "How's your tattoo looking? 📸",
    bodyTemplate: `Hey {{firstName}},

It's been about 2 weeks since your session – your tattoo should be getting close to fully healed!

I'd love to see how it turned out. Would you mind sending a quick photo? 

It helps me track healing and (with your permission) I might feature it on my portfolio!

– Fernando`
  },
  reconnect_soft: {
    subject: "Hey {{firstName}}, still dreaming about ink?",
    bodyTemplate: `Hey {{firstName}},

It's been a while since we chatted about your tattoo ideas. I hope life has been treating you well!

I've been working on some amazing pieces lately and thought of you. If you're still interested in getting inked, my books are open for {{upcomingMonths}}.

No pressure – just wanted to say hi and let you know I'm here when you're ready.

– Fernando`
  },
  anniversary_celebration: {
    subject: "Happy tattoo anniversary! 🎉",
    bodyTemplate: `Hey {{firstName}},

Can you believe it's been a year since we did your {{originalTattoo}} piece?!

I hope it's holding up beautifully. If you've been thinking about adding to your collection or doing a touch-up, I'd love to see you again.

Here's to many more years of great ink!

– Fernando`
  },
  healing_celebration: {
    subject: "Your tattoo is officially healed! 🎊",
    bodyTemplate: `Hey {{firstName}},

Based on my records, your tattoo should be fully healed by now! 

How does it look? I'd love to see the final result if you want to share a photo.

Pro tip: Now that it's healed, SPF 50 is your tattoo's best friend!

– Fernando`
  }
};

async function generatePersonalizedContent(
  template: string,
  clientData: Record<string, unknown>,
  bookingData: Record<string, unknown>
): Promise<string> {
  let content = template;
  
  // Replace placeholders
  const replacements: Record<string, string> = {
    "{{firstName}}": String(clientData.name || "there").split(" ")[0],
    "{{name}}": String(clientData.name || "there"),
    "{{email}}": String(clientData.email || ""),
    "{{tattooDescription}}": String(bookingData.tattoo_description || "tattoo").substring(0, 50),
    "{{preferredDate}}": bookingData.preferred_date ? new Date(String(bookingData.preferred_date)).toLocaleDateString() : "your preferred date",
    "{{appointmentDate}}": bookingData.scheduled_date ? new Date(String(bookingData.scheduled_date)).toLocaleDateString() : "your appointment",
    "{{appointmentTime}}": bookingData.scheduled_time ? String(bookingData.scheduled_time) : "your scheduled time",
    "{{depositLink}}": String(bookingData.deposit_link || "https://ferunda.com/book"),
    "{{studioAddress}}": "123 Art Street, Austin, TX 78701",
    "{{relevantStyle}}": String(bookingData.detected_style || "micro-realism"),
    "{{nextMonth}}": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString("default", { month: "long" }),
    "{{upcomingMonths}}": `${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString("default", { month: "long" })} and ${new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleString("default", { month: "long" })}`,
    "{{originalTattoo}}": String(bookingData.tattoo_description || "tattoo").substring(0, 30),
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.replaceAll(placeholder, value);
  }

  return content;
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  resendApiKey: string
): Promise<boolean> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: "Fernando Unda <fernando@ferunda.com>",
        to: [to],
        reply_to: "fernando@ferunda.com",
        subject,
        text: body
      })
    });

    return response.ok;
  } catch (error) {
    console.error("[FOLLOW-UP] Email send error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const { action, booking_id, trigger } = await req.json();

    console.log(`[FOLLOW-UP v1.0] Action: ${action}`);

    let result: Record<string, unknown> = {};

    switch (action) {
      case "process_queue": {
        // Find all pending follow-ups that are due
        const now = new Date();
        
        const { data: pendingFollowUps } = await supabase
          .from("follow_up_queue")
          .select("*, bookings(*)")
          .eq("status", "pending")
          .lte("scheduled_at", now.toISOString())
          .order("priority", { ascending: true })
          .limit(50);

        if (!pendingFollowUps || pendingFollowUps.length === 0) {
          result = { success: true, message: "No pending follow-ups", processed: 0 };
          break;
        }

        let processed = 0;
        let sent = 0;

        for (const followUp of pendingFollowUps) {
          const booking = followUp.bookings;
          if (!booking || !booking.email) continue;

          const template = EMAIL_TEMPLATES[followUp.template_key];
          if (!template) {
            console.error(`[FOLLOW-UP] Unknown template: ${followUp.template_key}`);
            continue;
          }

          // Generate personalized content
          const subject = await generatePersonalizedContent(
            template.subject,
            { name: booking.name, email: booking.email },
            booking
          );
          
          const body = await generatePersonalizedContent(
            template.bodyTemplate,
            { name: booking.name, email: booking.email },
            booking
          );

          // Send email
          const emailSent = await sendEmail(booking.email, subject, body, RESEND_API_KEY);

          // Update follow-up status
          await supabase
            .from("follow_up_queue")
            .update({
              status: emailSent ? "sent" : "failed",
              sent_at: emailSent ? now.toISOString() : null,
              error: emailSent ? null : "Email send failed"
            })
            .eq("id", followUp.id);

          // Log the communication
          if (emailSent) {
            await supabase.from("customer_emails").insert({
              booking_id: booking.id,
              email_type: followUp.template_key,
              subject,
              body,
              sent_at: now.toISOString(),
              status: "sent"
            });
            sent++;
          }

          processed++;
        }

        result = { success: true, processed, sent };
        break;
      }

      case "schedule_follow_up": {
        if (!booking_id || !trigger) {
          throw new Error("booking_id and trigger required");
        }

        // Find applicable rules
        const rules = FOLLOW_UP_RULES.filter(r => r.trigger === trigger);
        if (rules.length === 0) {
          result = { success: false, error: "No rules found for trigger" };
          break;
        }

        // Get booking
        const { data: booking } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", booking_id)
          .single();

        if (!booking) {
          throw new Error("Booking not found");
        }

        // Schedule follow-ups
        const scheduled = [];
        for (const rule of rules) {
          const scheduledAt = new Date(Date.now() + rule.delay_hours * 60 * 60 * 1000);

          // Check if already scheduled
          const { data: existing } = await supabase
            .from("follow_up_queue")
            .select("id")
            .eq("booking_id", booking_id)
            .eq("template_key", rule.template_key)
            .eq("status", "pending")
            .single();

          if (existing) continue;

          const { data: created } = await supabase
            .from("follow_up_queue")
            .insert({
              booking_id,
              trigger,
              template_key: rule.template_key,
              scheduled_at: scheduledAt.toISOString(),
              priority: rule.priority,
              status: "pending"
            })
            .select()
            .single();

          if (created) scheduled.push(created);
        }

        result = { success: true, scheduled: scheduled.length };
        break;
      }

      case "cancel_follow_ups": {
        if (!booking_id) {
          throw new Error("booking_id required");
        }

        const { count } = await supabase
          .from("follow_up_queue")
          .update({ status: "cancelled" })
          .eq("booking_id", booking_id)
          .eq("status", "pending");

        result = { success: true, cancelled: count };
        break;
      }

      case "check_dormant_leads": {
        // Find leads that haven't responded in 30+ days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        // 30-day dormant leads
        const { data: dormant30 } = await supabase
          .from("bookings")
          .select("id")
          .in("pipeline_stage", ["new_inquiry", "contacted"])
          .lt("updated_at", thirtyDaysAgo.toISOString())
          .gte("updated_at", sixtyDaysAgo.toISOString());

        // Schedule reconnect emails
        let scheduled = 0;
        if (dormant30) {
          for (const lead of dormant30) {
            const { data: existing } = await supabase
              .from("follow_up_queue")
              .select("id")
              .eq("booking_id", lead.id)
              .eq("trigger", "inquiry_dormant_30_days")
              .single();

            if (!existing) {
              await supabase.from("follow_up_queue").insert({
                booking_id: lead.id,
                trigger: "inquiry_dormant_30_days",
                template_key: "reconnect_soft",
                scheduled_at: new Date().toISOString(),
                priority: 5,
                status: "pending"
              });
              scheduled++;
            }
          }
        }

        result = { success: true, dormant_leads_found: dormant30?.length || 0, scheduled };
        break;
      }

      default:
        result = { success: false, error: "Unknown action" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[FOLLOW-UP] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
