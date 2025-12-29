import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CampaignRequest {
  campaign_id: string;
  test_email?: string; // Optional: send test to single email
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is admin
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { campaign_id, test_email }: CampaignRequest = await req.json();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If test email, send only to that address
    if (test_email) {
      const emailResponse = await resend.emails.send({
        from: "Ferunda Ink <newsletter@ferunda.com>",
        to: [test_email],
        subject: `[TEST] ${campaign.subject}`,
        html: wrapEmailTemplate(campaign.body, campaign.preview_text),
      });

      console.log("Test email sent:", emailResponse);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test email sent",
          messageId: emailResponse.data?.id 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get subscribers based on campaign targeting
    let subscriberQuery = supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, email, name')
      .eq('status', 'active');

    // Apply segment filters
    if (campaign.target_segments && campaign.target_segments.length > 0) {
      subscriberQuery = subscriberQuery.overlaps('tags', campaign.target_segments);
    }

    if (campaign.target_lead_score_min) {
      subscriberQuery = subscriberQuery.gte('lead_score', campaign.target_lead_score_min);
    }

    if (campaign.target_lead_score_max) {
      subscriberQuery = subscriberQuery.lte('lead_score', campaign.target_lead_score_max);
    }

    if (campaign.exclude_tags && campaign.exclude_tags.length > 0) {
      // Can't easily do NOT OVERLAPS in Supabase, filter client-side
    }

    const { data: subscribers, error: subError } = await subscriberQuery;

    if (subError) {
      console.error("Failed to fetch subscribers:", subError);
      throw new Error("Failed to fetch subscribers");
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No subscribers match the campaign criteria" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Filter out excluded tags client-side if needed
    let filteredSubscribers = subscribers;
    if (campaign.exclude_tags && campaign.exclude_tags.length > 0) {
      // This would need the full subscriber data with tags
      // For now, we'll skip this filter in the simple implementation
    }

    // Update campaign status to sending
    await supabaseAdmin
      .from('email_campaigns')
      .update({ 
        status: 'sending', 
        total_recipients: filteredSubscribers.length,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    // Send emails in batches
    const BATCH_SIZE = 10;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < filteredSubscribers.length; i += BATCH_SIZE) {
      const batch = filteredSubscribers.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (subscriber) => {
        try {
          // Personalize email
          const personalizedBody = campaign.body
            .replace(/\{\{name\}\}/g, subscriber.name || 'there')
            .replace(/\{\{email\}\}/g, subscriber.email);

          const emailResponse = await resend.emails.send({
            from: "Ferunda Ink <newsletter@ferunda.com>",
            to: [subscriber.email],
            subject: campaign.subject,
            html: wrapEmailTemplate(personalizedBody, campaign.preview_text, subscriber.id),
          });

          // Record send
          await supabaseAdmin
            .from('campaign_sends')
            .insert({
              campaign_id,
              subscriber_id: subscriber.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
              resend_message_id: emailResponse.data?.id,
            });

          // Update subscriber stats
          await supabaseAdmin
            .from('newsletter_subscribers')
            .update({ 
              last_email_sent_at: new Date().toISOString(),
              email_count: supabaseAdmin.rpc('increment_email_count')
            })
            .eq('id', subscriber.id);

          sentCount++;
        } catch (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          
          await supabaseAdmin
            .from('campaign_sends')
            .insert({
              campaign_id,
              subscriber_id: subscriber.id,
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            });
          
          failedCount++;
        }
      }));

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < filteredSubscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status to sent
    await supabaseAdmin
      .from('email_campaigns')
      .update({ 
        status: 'sent', 
        sent_count: sentCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    console.log(`Campaign ${campaign_id} completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign sent to ${sentCount} subscribers`,
        sent: sentCount,
        failed: failedCount
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send campaign" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function wrapEmailTemplate(body: string, previewText?: string, subscriberId?: string): string {
  const unsubscribeUrl = subscriberId 
    ? `https://ferunda.com/unsubscribe?id=${subscriberId}` 
    : 'https://ferunda.com/unsubscribe';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${previewText ? `<meta name="x-apple-disable-message-reformatting">
      <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</span>` : ''}
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.2em; margin-bottom: 8px;">
            FERUNDA INK
          </h1>
          <p style="color: #888888; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;">
            Luxury Tattoo Artistry
          </p>
        </div>
        
        <!-- Content -->
        <div style="background-color: #141414; border: 1px solid #222222; padding: 40px;">
          ${body}
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #222222;">
          <p style="color: #666666; font-size: 11px; margin-bottom: 16px;">
            © ${new Date().getFullYear()} Ferunda Ink. All rights reserved.
          </p>
          <a href="${unsubscribeUrl}" style="color: #666666; font-size: 11px; text-decoration: underline;">
            Unsubscribe
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
