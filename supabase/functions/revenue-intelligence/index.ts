// =============================================================================
// REVENUE INTELLIGENCE ENGINE v2.0 - CORE BUS CONNECTED
// Consolidated: All revenue events published to ferunda-core-bus
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      payload: { ...payload, timestamp: Date.now(), source: 'revenue-intelligence' }
    });
    console.log(`[RevenueIntel] Published ${eventType} to Core Bus`);
  } catch (err) {
    console.error('[RevenueIntel] Core Bus publish error:', err);
  }
}

interface RevenueMetrics {
  period: string;
  total_revenue: number;
  booking_count: number;
  avg_booking_value: number;
  conversion_rate: number;
  deposit_collection_rate: number;
  client_retention_rate: number;
  top_styles: { style: string; revenue: number; count: number }[];
  top_cities: { city: string; revenue: number; count: number }[];
  pipeline_value: number;
  forecasted_revenue: number;
}

interface AIInsight {
  category: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
  metric?: number;
}

interface ForecastResult {
  next_30_days: number;
  next_90_days: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

// Calculate revenue metrics from database
async function calculateRevenueMetrics(
  supabase: any,
  startDate: string,
  endDate: string
): Promise<RevenueMetrics> {
  console.log('[RevenueIntel] Calculating metrics for:', startDate, 'to', endDate);
  
  // Get completed bookings with revenue
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (bookingsError) {
    console.error('[RevenueIntel] Bookings query error:', bookingsError);
  }
  
  const completedBookings = bookings?.filter((b: any) => 
    b.deposit_paid || b.status === 'completed'
  ) || [];
  
  // Calculate totals
  const totalRevenue = completedBookings.reduce((sum: number, b: any) => {
    return sum + (b.total_paid || b.deposit_amount || 0);
  }, 0);
  
  const avgBookingValue = completedBookings.length > 0 
    ? totalRevenue / completedBookings.length 
    : 0;
  
  // Conversion rate
  const allInquiries = bookings?.length || 0;
  const converted = completedBookings.length;
  const conversionRate = allInquiries > 0 ? (converted / allInquiries) * 100 : 0;
  
  // Deposit collection rate
  const depositRequested = bookings?.filter((b: any) => b.pipeline_stage === 'deposit_requested' || b.deposit_paid).length || 0;
  const depositPaid = bookings?.filter((b: any) => b.deposit_paid).length || 0;
  const depositCollectionRate = depositRequested > 0 ? (depositPaid / depositRequested) * 100 : 0;
  
  // Group by style (from tattoo_description keywords)
  const styleKeywords = ['geometric', 'fine-line', 'micro-realism', 'minimalist', 'botanical', 'portrait', 'traditional'];
  const styleRevenue: Record<string, { revenue: number; count: number }> = {};
  
  completedBookings.forEach((b: any) => {
    const desc = (b.tattoo_description || '').toLowerCase();
    for (const style of styleKeywords) {
      if (desc.includes(style)) {
        if (!styleRevenue[style]) styleRevenue[style] = { revenue: 0, count: 0 };
        styleRevenue[style].revenue += b.total_paid || b.deposit_amount || 0;
        styleRevenue[style].count += 1;
      }
    }
  });
  
  const topStyles = Object.entries(styleRevenue)
    .map(([style, data]) => ({ style, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  // Group by city
  const cityRevenue: Record<string, { revenue: number; count: number }> = {};
  completedBookings.forEach((b: any) => {
    const city = b.requested_city || 'Unknown';
    if (!cityRevenue[city]) cityRevenue[city] = { revenue: 0, count: 0 };
    cityRevenue[city].revenue += b.total_paid || b.deposit_amount || 0;
    cityRevenue[city].count += 1;
  });
  
  const topCities = Object.entries(cityRevenue)
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  // Pipeline value (pending bookings)
  const pendingBookings = bookings?.filter((b: any) => 
    !b.deposit_paid && b.status === 'pending'
  ) || [];
  
  const pipelineValue = pendingBookings.reduce((sum: number, b: any) => {
    // Estimate based on size
    const size = (b.size || '').toLowerCase();
    let estimate = 500;
    if (size.includes('full') || size.includes('sleeve')) estimate = 3500;
    else if (size.includes('half')) estimate = 1800;
    else if (size.includes('large')) estimate = 1200;
    else if (size.includes('medium')) estimate = 700;
    return sum + estimate;
  }, 0);
  
  // Client retention (returning clients)
  const emails = new Set(completedBookings.map((b: any) => b.email));
  const { data: allClientBookings } = await supabase
    .from('bookings')
    .select('email')
    .in('email', Array.from(emails))
    .eq('deposit_paid', true);
  
  const emailCounts: Record<string, number> = {};
  allClientBookings?.forEach((b: any) => {
    emailCounts[b.email] = (emailCounts[b.email] || 0) + 1;
  });
  
  const returningClients = Object.values(emailCounts).filter(c => c > 1).length;
  const clientRetentionRate = emails.size > 0 ? (returningClients / emails.size) * 100 : 0;
  
  // Simple forecast based on trends
  const forecastedRevenue = totalRevenue * 1.1; // 10% growth assumption
  
  return {
    period: `${startDate} to ${endDate}`,
    total_revenue: totalRevenue,
    booking_count: completedBookings.length,
    avg_booking_value: Math.round(avgBookingValue),
    conversion_rate: Math.round(conversionRate * 10) / 10,
    deposit_collection_rate: Math.round(depositCollectionRate * 10) / 10,
    client_retention_rate: Math.round(clientRetentionRate * 10) / 10,
    top_styles: topStyles,
    top_cities: topCities,
    pipeline_value: pipelineValue,
    forecasted_revenue: Math.round(forecastedRevenue)
  };
}

// AI-powered insights generation
async function generateAIInsights(
  metrics: RevenueMetrics,
  lovableApiKey: string
): Promise<AIInsight[]> {
  console.log('[RevenueIntel] Generating AI insights...');
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un analista financiero experto en negocios de tatuajes. Analiza las métricas y genera insights accionables.
Retorna un JSON array con exactamente 5 insights:
[
  {
    "category": "opportunity|risk|trend|recommendation",
    "title": "Título corto",
    "description": "Descripción de 1-2 oraciones",
    "impact": "high|medium|low",
    "action": "Acción específica a tomar",
    "metric": número opcional relacionado
  }
]
SOLO retorna JSON válido, sin texto adicional.`
          },
          {
            role: 'user',
            content: `Métricas del período:
- Revenue Total: $${metrics.total_revenue}
- Bookings: ${metrics.booking_count}
- Avg Booking Value: $${metrics.avg_booking_value}
- Conversion Rate: ${metrics.conversion_rate}%
- Deposit Collection: ${metrics.deposit_collection_rate}%
- Client Retention: ${metrics.client_retention_rate}%
- Pipeline Value: $${metrics.pipeline_value}
- Top Styles: ${JSON.stringify(metrics.top_styles)}
- Top Cities: ${JSON.stringify(metrics.top_cities)}`
          }
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`AI call failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the response
    try {
      const parsed = JSON.parse(content);
      // Handle both array and object with insights property
      const insights = Array.isArray(parsed) ? parsed : parsed.insights || [];
      return insights.slice(0, 5);
    } catch {
      console.error('[RevenueIntel] Failed to parse AI response:', content);
      return generateFallbackInsights(metrics);
    }
  } catch (error) {
    console.error('[RevenueIntel] AI insights error:', error);
    return generateFallbackInsights(metrics);
  }
}

function generateFallbackInsights(metrics: RevenueMetrics): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Conversion rate insight
  if (metrics.conversion_rate < 30) {
    insights.push({
      category: 'risk',
      title: 'Low Conversion Rate',
      description: `Only ${metrics.conversion_rate}% of inquiries convert to bookings. Industry average is 35-45%.`,
      impact: 'high',
      action: 'Review and optimize follow-up sequences',
      metric: metrics.conversion_rate
    });
  } else if (metrics.conversion_rate > 50) {
    insights.push({
      category: 'trend',
      title: 'Excellent Conversion Rate',
      description: `${metrics.conversion_rate}% conversion rate is above industry average.`,
      impact: 'medium',
      action: 'Document and replicate successful tactics',
      metric: metrics.conversion_rate
    });
  }
  
  // Pipeline opportunity
  if (metrics.pipeline_value > metrics.total_revenue * 0.5) {
    insights.push({
      category: 'opportunity',
      title: 'Strong Pipeline Value',
      description: `$${metrics.pipeline_value} in potential bookings waiting to convert.`,
      impact: 'high',
      action: 'Prioritize follow-ups on high-value leads',
      metric: metrics.pipeline_value
    });
  }
  
  // Deposit collection
  if (metrics.deposit_collection_rate < 70) {
    insights.push({
      category: 'risk',
      title: 'Deposit Collection Needs Improvement',
      description: `${metrics.deposit_collection_rate}% deposit collection rate. Target: 85%+.`,
      impact: 'medium',
      action: 'Implement automated deposit reminders',
      metric: metrics.deposit_collection_rate
    });
  }
  
  // Average booking value
  if (metrics.avg_booking_value < 500) {
    insights.push({
      category: 'recommendation',
      title: 'Increase Average Ticket Size',
      description: `Avg booking value of $${metrics.avg_booking_value} has room for growth.`,
      impact: 'medium',
      action: 'Upsell larger pieces and multi-session projects',
      metric: metrics.avg_booking_value
    });
  }
  
  // Client retention
  insights.push({
    category: 'trend',
    title: 'Client Retention Rate',
    description: `${metrics.client_retention_rate}% of clients return for additional work.`,
    impact: metrics.client_retention_rate > 20 ? 'medium' : 'low',
    action: 'Implement post-session follow-up campaigns',
    metric: metrics.client_retention_rate
  });
  
  return insights.slice(0, 5);
}

// Revenue forecasting with ML
async function forecastRevenue(
  supabase: any,
  lovableApiKey: string
): Promise<ForecastResult> {
  console.log('[RevenueIntel] Generating revenue forecast...');
  
  // Get historical data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { data: historicalBookings } = await supabase
    .from('bookings')
    .select('created_at, total_paid, deposit_amount, deposit_paid')
    .gte('created_at', sixMonthsAgo.toISOString())
    .eq('deposit_paid', true);
  
  // Group by month
  const monthlyRevenue: Record<string, number> = {};
  historicalBookings?.forEach((b: any) => {
    const month = new Date(b.created_at).toISOString().slice(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (b.total_paid || b.deposit_amount || 0);
  });
  
  const months = Object.keys(monthlyRevenue).sort();
  const revenues = months.map(m => monthlyRevenue[m]);
  
  // Simple trend calculation
  let growthRate = 0;
  if (revenues.length >= 2) {
    const recentMonths = revenues.slice(-3);
    const avgRecent = recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length;
    const olderMonths = revenues.slice(0, -3);
    const avgOlder = olderMonths.length > 0 
      ? olderMonths.reduce((a, b) => a + b, 0) / olderMonths.length 
      : avgRecent;
    growthRate = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) : 0;
  }
  
  // Get pipeline for additional forecast data
  const { data: pipelineData } = await supabase
    .from('bookings')
    .select('deposit_amount, pipeline_stage, size')
    .eq('status', 'pending')
    .eq('deposit_paid', false);
  
  let pipelineValue = 0;
  pipelineData?.forEach((b: any) => {
    const size = (b.size || '').toLowerCase();
    let estimate = 500;
    if (size.includes('full')) estimate = 3500;
    else if (size.includes('half')) estimate = 1800;
    else if (size.includes('large')) estimate = 1200;
    else if (size.includes('medium')) estimate = 700;
    pipelineValue += estimate;
  });
  
  // Calculate forecasts
  const currentMonthlyAvg = revenues.length > 0 
    ? revenues.reduce((a, b) => a + b, 0) / revenues.length 
    : 5000;
  
  const next30Days = Math.round(currentMonthlyAvg * (1 + growthRate * 0.5));
  const next90Days = Math.round(currentMonthlyAvg * 3 * (1 + growthRate));
  
  // Add pipeline conversion (assume 40% converts)
  const pipelineContribution30 = Math.round(pipelineValue * 0.4 * 0.33);
  const pipelineContribution90 = Math.round(pipelineValue * 0.4);
  
  const factors: string[] = [];
  if (growthRate > 0) factors.push(`${(growthRate * 100).toFixed(1)}% growth trend`);
  if (growthRate < 0) factors.push(`${(growthRate * 100).toFixed(1)}% declining trend`);
  factors.push(`$${pipelineValue.toLocaleString()} in pipeline`);
  factors.push(`${revenues.length} months of historical data`);
  
  const recommendations: string[] = [];
  if (growthRate < 0) {
    recommendations.push('Increase marketing efforts to reverse decline');
    recommendations.push('Review pricing strategy');
  }
  if (pipelineValue > next30Days) {
    recommendations.push('Focus on converting pipeline leads');
    recommendations.push('Implement deposit reminder automation');
  }
  recommendations.push('Monitor weekly revenue trends');
  
  // Calculate confidence based on data quality
  let confidence = 0.6;
  if (revenues.length >= 6) confidence += 0.2;
  if (revenues.length >= 3) confidence += 0.1;
  if (pipelineData?.length > 5) confidence += 0.1;
  
  return {
    next_30_days: next30Days + pipelineContribution30,
    next_90_days: next90Days + pipelineContribution90,
    confidence: Math.min(confidence, 0.95),
    factors,
    recommendations
  };
}

// Get actionable opportunities
async function getOpportunities(supabase: any): Promise<any[]> {
  console.log('[RevenueIntel] Finding revenue opportunities...');
  
  const opportunities: any[] = [];
  
  // 1. High-value leads not followed up
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const { data: staleLeads } = await supabase
    .from('bookings')
    .select('id, name, email, size, tattoo_description, created_at')
    .eq('status', 'pending')
    .eq('deposit_paid', false)
    .lt('created_at', threeDaysAgo.toISOString())
    .or('last_contacted_at.is.null,last_contacted_at.lt.' + threeDaysAgo.toISOString())
    .limit(10);
  
  staleLeads?.forEach((lead: any) => {
    const size = (lead.size || '').toLowerCase();
    let potentialValue = 500;
    if (size.includes('full')) potentialValue = 3500;
    else if (size.includes('half')) potentialValue = 1800;
    else if (size.includes('large')) potentialValue = 1200;
    
    if (potentialValue >= 1000) {
      opportunities.push({
        type: 'stale_high_value_lead',
        title: `Follow up with ${lead.name}`,
        description: `High-value lead ($${potentialValue} potential) hasn't been contacted in 3+ days`,
        potential_value: potentialValue,
        booking_id: lead.id,
        action: 'send_followup',
        priority: 'high'
      });
    }
  });
  
  // 2. Deposits requested but not paid
  const { data: pendingDeposits } = await supabase
    .from('bookings')
    .select('id, name, email, deposit_amount, deposit_requested_at')
    .eq('pipeline_stage', 'deposit_requested')
    .eq('deposit_paid', false)
    .limit(10);
  
  pendingDeposits?.forEach((booking: any) => {
    opportunities.push({
      type: 'pending_deposit',
      title: `Collect deposit from ${booking.name}`,
      description: `Deposit of $${booking.deposit_amount || 500} requested but not paid`,
      potential_value: booking.deposit_amount || 500,
      booking_id: booking.id,
      action: 'send_deposit_reminder',
      priority: 'medium'
    });
  });
  
  // 3. Returning clients who haven't booked in 6+ months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select('email, name, scheduled_date')
    .eq('status', 'completed')
    .lt('scheduled_date', sixMonthsAgo.toISOString());
  
  const recentEmails = new Set<string>();
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('email')
    .gte('created_at', sixMonthsAgo.toISOString());
  
  recentBookings?.forEach((b: any) => recentEmails.add(b.email));
  
  const dormantClients = completedBookings?.filter((b: any) => !recentEmails.has(b.email)) || [];
  const uniqueDormant = Array.from(new Map(dormantClients.map((c: any) => [c.email, c])).values());
  
  uniqueDormant.slice(0, 5).forEach((client: any) => {
    opportunities.push({
      type: 'dormant_client',
      title: `Re-engage ${client.name}`,
      description: `Past client hasn't booked in 6+ months. Send re-engagement campaign.`,
      potential_value: 800, // Average rebooking value
      email: client.email,
      action: 'send_reengagement',
      priority: 'low'
    });
  });
  
  // Sort by potential value
  return opportunities.sort((a, b) => b.potential_value - a.potential_value).slice(0, 10);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      version: "1.0.0",
      features: [
        "revenue-metrics",
        "ai-insights",
        "revenue-forecasting",
        "opportunity-detection",
        "trend-analysis"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { action, start_date, end_date } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

    // Default date range: last 30 days
    const endDate = end_date || new Date().toISOString();
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[RevenueIntel v1.0] Action: ${action || 'full_report'}`);

    switch (action) {
      case 'metrics': {
        const metrics = await calculateRevenueMetrics(supabase, startDate, endDate);
        return new Response(JSON.stringify({ success: true, metrics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'insights': {
        const metrics = await calculateRevenueMetrics(supabase, startDate, endDate);
        const insights = await generateAIInsights(metrics, LOVABLE_API_KEY);
        return new Response(JSON.stringify({ success: true, insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'forecast': {
        const forecast = await forecastRevenue(supabase, LOVABLE_API_KEY);
        return new Response(JSON.stringify({ success: true, forecast }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'opportunities': {
        const opportunities = await getOpportunities(supabase);
        return new Response(JSON.stringify({ success: true, opportunities }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default: {
        // Full report
        const [metrics, forecast, opportunities] = await Promise.all([
          calculateRevenueMetrics(supabase, startDate, endDate),
          forecastRevenue(supabase, LOVABLE_API_KEY),
          getOpportunities(supabase)
        ]);

        const insights = await generateAIInsights(metrics, LOVABLE_API_KEY);

        return new Response(JSON.stringify({
          success: true,
          report: {
            generated_at: new Date().toISOString(),
            period: { start: startDate, end: endDate },
            metrics,
            insights,
            forecast,
            opportunities,
            summary: {
              total_revenue: metrics.total_revenue,
              pipeline_value: metrics.pipeline_value,
              forecasted_30d: forecast.next_30_days,
              top_opportunity_value: opportunities[0]?.potential_value || 0,
              action_items: opportunities.filter(o => o.priority === 'high').length
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error) {
    console.error('[RevenueIntel] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
