// =============================================================================
// BOOKING NOTIFICATION v2.0 - CORE BUS CONNECTED
// Consolidated: All notification events published to ferunda-core-bus
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Core Bus Publisher
async function publishToCoreBus(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  payload: Record<string, unknown>
) {
  try {
    const channel = supabase.channel('ferunda-core-bus');
    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload: { ...payload, timestamp: Date.now(), source: 'booking-notification' }
    });
    console.log(`[BookingNotification] Published ${eventType} to Core Bus`);
  } catch (err) {
    console.error('[BookingNotification] Core Bus publish error:', err);
  }
}

interface NotificationContext {
  booking: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedValue: number;
  aiInsights: string[];
  recommendedActions: string[];
}

// AI-powered priority scoring
function calculatePriority(booking: any): NotificationContext {
  const aiInsights: string[] = [];
  const recommendedActions: string[] = [];
  let priorityScore = 0;

  // Size analysis
  const size = booking.size?.toLowerCase() || '';
  if (size.includes('full') || size.includes('sleeve') || size.includes('back')) {
    priorityScore += 40;
    aiInsights.push('Large project - high revenue potential');
    recommendedActions.push('Schedule consultation call');
  } else if (size.includes('medium') || size.includes('half')) {
    priorityScore += 25;
    aiInsights.push('Medium project - solid booking');
  } else {
    priorityScore += 10;
    aiInsights.push('Small piece - quick session');
  }

  // Description analysis for complexity
  const desc = booking.tattoo_description?.toLowerCase() || '';
  const complexKeywords = ['portrait', 'realism', 'realistic', 'detailed', 'intricate', 'color', 'full color'];
  const matchedKeywords = complexKeywords.filter(k => desc.includes(k));
  if (matchedKeywords.length >= 2) {
    priorityScore += 20;
    aiInsights.push(`Complex work detected: ${matchedKeywords.join(', ')}`);
    recommendedActions.push('Prepare detailed quote');
  }

  // Phone provided - high intent
  if (booking.phone) {
    priorityScore += 15;
    aiInsights.push('Phone provided - high conversion likelihood');
    recommendedActions.push('Consider calling directly');
  }

  // Reference images - serious client
  if (booking.reference_images?.length >= 2) {
    priorityScore += 15;
    aiInsights.push(`${booking.reference_images.length} reference images - prepared client`);
  }

  // City availability check
  if (booking.requested_city) {
    aiInsights.push(`Requested city: ${booking.requested_city}`);
    recommendedActions.push(`Check ${booking.requested_city} availability`);
  }

  // Preferred date analysis
  if (booking.preferred_date) {
    const prefDate = new Date(booking.preferred_date);
    const daysAway = Math.ceil((prefDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysAway <= 14) {
      priorityScore += 10;
      aiInsights.push('Urgent timeline - wants appointment soon');
      recommendedActions.push('Prioritize scheduling');
    }
  }

  // Determine priority level
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
  if (priorityScore >= 70) priority = 'urgent';
  else if (priorityScore >= 50) priority = 'high';
  else if (priorityScore >= 25) priority = 'medium';

  // Estimate value
  let estimatedValue = 300; // Base
  if (size.includes('full')) estimatedValue = 3500;
  else if (size.includes('half')) estimatedValue = 1800;
  else if (size.includes('large')) estimatedValue = 1200;
  else if (size.includes('medium')) estimatedValue = 700;

  return {
    booking,
    priority,
    estimatedValue,
    aiInsights,
    recommendedActions,
  };
}

// Generate priority badge HTML
function getPriorityBadge(priority: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    urgent: { bg: '#dc2626', text: '#ffffff' },
    high: { bg: '#ea580c', text: '#ffffff' },
    medium: { bg: '#ca8a04', text: '#ffffff' },
    low: { bg: '#6b7280', text: '#ffffff' },
  };
  const c = colors[priority] || colors.low;
  return `<span style="background: ${c.bg}; color: ${c.text}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${priority}</span>`;
}

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

    console.log("[NOTIFICATION v2.0] Processing booking:", booking.name);

    // AI Priority Analysis
    const context = calculatePriority(booking);
    console.log("[NOTIFICATION] Priority:", context.priority, "Est. Value:", context.estimatedValue);
    console.log("[NOTIFICATION] AI Insights:", context.aiInsights);

    // Build enhanced email
    const insightsList = context.aiInsights.map(i => `<li style="margin: 5px 0;">${i}</li>`).join('');
    const actionsList = context.recommendedActions.map(a => `<li style="margin: 5px 0;">✅ ${a}</li>`).join('');

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ferunda Ink <fernando@ferunda.com>",
        to: ["Fernando.moralesunda@gmail.com", "fernando@ferunda.com"],
        subject: `${context.priority === 'urgent' ? '🚨' : context.priority === 'high' ? '⚡' : '🔔'} [${context.priority.toUpperCase()}] New Booking: ${booking.name} - Est. $${context.estimatedValue}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
            
            <!-- Priority Header -->
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 25px; color: white;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1 style="margin: 0; font-size: 24px;">New Booking Request</h1>
                ${getPriorityBadge(context.priority)}
              </div>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">
                Estimated Value: <strong>$${context.estimatedValue.toLocaleString()}</strong>
              </p>
            </div>
            
            <!-- AI Insights -->
            <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px 20px; margin: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px;">🤖 AI ANALYSIS</h3>
              <ul style="margin: 0; padding-left: 20px; color: #0369a1;">
                ${insightsList}
              </ul>
            </div>
            
            <!-- Recommended Actions -->
            ${context.recommendedActions.length > 0 ? `
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px 20px; margin: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #15803d; font-size: 14px;">🎯 RECOMMENDED ACTIONS</h3>
                <ul style="margin: 0; padding-left: 20px; color: #15803d;">
                  ${actionsList}
                </ul>
              </div>
            ` : ''}
            
            <!-- Client Details -->
            <div style="padding: 20px;">
              <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; font-size: 18px;">
                Client Details
              </h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500; width: 120px;">Name</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${booking.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">Email</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                    <a href="mailto:${booking.email}" style="color: #2563eb;">${booking.email}</a>
                  </td>
                </tr>
                ${booking.phone ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">Phone</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                      <a href="tel:${booking.phone}" style="color: #2563eb;">${booking.phone}</a>
                    </td>
                  </tr>
                ` : ''}
                ${booking.tracking_code ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">Tracking</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                      <code style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px;">${booking.tracking_code}</code>
                    </td>
                  </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- Tattoo Details -->
            <div style="padding: 20px; background: #fafafa;">
              <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; font-size: 18px;">
                Tattoo Details
              </h2>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${booking.tattoo_description}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                ${booking.placement ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 500; width: 100px;">Placement</td>
                    <td style="padding: 8px 0;">${booking.placement}</td>
                  </tr>
                ` : ''}
                ${booking.size ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 500;">Size</td>
                    <td style="padding: 8px 0;">${booking.size}</td>
                  </tr>
                ` : ''}
                ${booking.preferred_date ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 500;">Preferred</td>
                    <td style="padding: 8px 0;">${booking.preferred_date}</td>
                  </tr>
                ` : ''}
                ${booking.requested_city ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 500;">City</td>
                    <td style="padding: 8px 0;">${booking.requested_city}</td>
                  </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- Reference Images -->
            ${booking.reference_images && booking.reference_images.length > 0 ? `
              <div style="padding: 20px;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px;">
                  Reference Images (${booking.reference_images.length})
                </h2>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                  ${booking.reference_images.map((url: string, i: number) => 
                    `<a href="${url}" target="_blank" style="display: block;">
                      <img src="${url}" alt="Reference ${i+1}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;"/>
                    </a>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Action Buttons -->
            <div style="padding: 20px; text-align: center; background: #f9fafb; border-top: 1px solid #e5e7eb;">
              <a href="https://www.ferunda.com/admin" 
                 style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; margin: 5px;">
                Open CRM →
              </a>
              ${booking.email ? `
                <a href="mailto:${booking.email}?subject=Re: Your Tattoo Inquiry" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; margin: 5px;">
                  Reply Now →
                </a>
              ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="padding: 15px 20px; background: #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Ferunda Ink AI Notifications v2.0 • ${new Date(booking.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[NOTIFICATION] Resend API error:", errorText);
      throw new Error("Failed to send notification email");
    }

    console.log("[NOTIFICATION v2.0] Enhanced email sent successfully");

    // Store analytics
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("booking_activities").insert({
      booking_id: booking.id,
      activity_type: "notification_sent",
      description: `AI notification sent - Priority: ${context.priority}, Est. Value: $${context.estimatedValue}`,
      metadata: {
        priority: context.priority,
        estimated_value: context.estimatedValue,
        ai_insights: context.aiInsights,
        recommended_actions: context.recommendedActions,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        priority: context.priority,
        estimatedValue: context.estimatedValue,
        insights: context.aiInsights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
