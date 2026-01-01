import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// CLIENT LIFECYCLE ENGINE v1.0
// AI-Powered Client Relationship Management
// ============================================================================

interface ClientProfile {
  email: string;
  name: string;
  total_bookings: number;
  total_revenue: number;
  avg_booking_value: number;
  first_booking_date: string;
  last_booking_date: string;
  preferred_styles: string[];
  preferred_placements: string[];
  lifecycle_stage: 'prospect' | 'first_timer' | 'returning' | 'loyal' | 'vip' | 'dormant' | 'churned';
  health_score: number;
  next_action: string;
  predicted_ltv: number;
}

interface LifecycleAction {
  action_type: string;
  client_email: string;
  client_name: string;
  priority: 'high' | 'medium' | 'low';
  message_template: string;
  trigger_reason: string;
  potential_value: number;
}

// Calculate client lifecycle stage
function calculateLifecycleStage(
  bookingCount: number,
  totalRevenue: number,
  daysSinceLastBooking: number,
  daysSinceFirstBooking: number
): ClientProfile['lifecycle_stage'] {
  // Churned: no activity in 12+ months
  if (daysSinceLastBooking > 365) return 'churned';
  
  // Dormant: no activity in 6-12 months
  if (daysSinceLastBooking > 180) return 'dormant';
  
  // VIP: 5+ bookings or $5000+ revenue
  if (bookingCount >= 5 || totalRevenue >= 5000) return 'vip';
  
  // Loyal: 3-4 bookings
  if (bookingCount >= 3) return 'loyal';
  
  // Returning: 2 bookings
  if (bookingCount === 2) return 'returning';
  
  // First-timer: 1 booking
  if (bookingCount === 1) return 'first_timer';
  
  // Prospect: inquiry but no booking
  return 'prospect';
}

// Calculate health score (0-100)
function calculateHealthScore(
  daysSinceLastContact: number,
  conversionRate: number,
  responsiveness: number,
  bookingCount: number
): number {
  let score = 50; // Base score
  
  // Recency factor (max +30)
  if (daysSinceLastContact <= 7) score += 30;
  else if (daysSinceLastContact <= 30) score += 20;
  else if (daysSinceLastContact <= 90) score += 10;
  else if (daysSinceLastContact > 180) score -= 20;
  
  // Engagement factor (max +20)
  if (bookingCount >= 3) score += 20;
  else if (bookingCount >= 1) score += 10;
  
  // Conversion factor
  score += Math.min(conversionRate * 10, 15);
  
  return Math.max(0, Math.min(100, score));
}

// Predict lifetime value
function predictLTV(
  currentRevenue: number,
  bookingCount: number,
  daysSinceFirst: number,
  lifecycleStage: string
): number {
  if (bookingCount === 0) return 0;
  
  const avgBookingValue = currentRevenue / bookingCount;
  const bookingsPerYear = daysSinceFirst > 0 
    ? (bookingCount / daysSinceFirst) * 365 
    : 2;
  
  // Retention multipliers by stage
  const retentionYears: Record<string, number> = {
    'vip': 5,
    'loyal': 4,
    'returning': 3,
    'first_timer': 2,
    'prospect': 1,
    'dormant': 1,
    'churned': 0.5
  };
  
  const years = retentionYears[lifecycleStage] || 2;
  return Math.round(avgBookingValue * bookingsPerYear * years);
}

// Build client profile
async function buildClientProfile(
  supabase: any,
  email: string
): Promise<ClientProfile | null> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: true });
  
  if (error || !bookings || bookings.length === 0) {
    return null;
  }
  
  const completedBookings = bookings.filter((b: any) => 
    b.deposit_paid || b.status === 'completed'
  );
  
  const totalRevenue = completedBookings.reduce((sum: number, b: any) => 
    sum + (b.total_paid || b.deposit_amount || 0), 0
  );
  
  const firstBooking = bookings[0];
  const lastBooking = bookings[bookings.length - 1];
  
  const daysSinceFirst = Math.floor(
    (Date.now() - new Date(firstBooking.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysSinceLast = Math.floor(
    (Date.now() - new Date(lastBooking.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Extract preferences
  const styles: string[] = [];
  const placements: string[] = [];
  
  bookings.forEach((b: any) => {
    if (b.placement) placements.push(b.placement);
    const desc = (b.tattoo_description || '').toLowerCase();
    ['geometric', 'fine-line', 'micro-realism', 'minimalist', 'botanical', 'portrait'].forEach(style => {
      if (desc.includes(style) && !styles.includes(style)) styles.push(style);
    });
  });
  
  const lifecycleStage = calculateLifecycleStage(
    completedBookings.length,
    totalRevenue,
    daysSinceLast,
    daysSinceFirst
  );
  
  const healthScore = calculateHealthScore(
    daysSinceLast,
    completedBookings.length / bookings.length,
    1, // Placeholder for responsiveness
    completedBookings.length
  );
  
  const predictedLtv = predictLTV(
    totalRevenue,
    completedBookings.length,
    daysSinceFirst,
    lifecycleStage
  );
  
  // Determine next action
  let nextAction = 'Monitor';
  if (lifecycleStage === 'dormant') nextAction = 'Send re-engagement campaign';
  else if (lifecycleStage === 'first_timer' && daysSinceLast > 60) nextAction = 'Follow up for second booking';
  else if (lifecycleStage === 'vip') nextAction = 'Send VIP appreciation';
  else if (lifecycleStage === 'prospect') nextAction = 'Convert to first booking';
  
  return {
    email,
    name: lastBooking.name,
    total_bookings: completedBookings.length,
    total_revenue: totalRevenue,
    avg_booking_value: completedBookings.length > 0 ? Math.round(totalRevenue / completedBookings.length) : 0,
    first_booking_date: firstBooking.created_at,
    last_booking_date: lastBooking.created_at,
    preferred_styles: styles,
    preferred_placements: [...new Set(placements)],
    lifecycle_stage: lifecycleStage,
    health_score: healthScore,
    next_action: nextAction,
    predicted_ltv: predictedLtv
  };
}

// Get all clients with profiles
async function getAllClientProfiles(supabase: any): Promise<ClientProfile[]> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('email')
    .not('email', 'is', null);
  
  const uniqueEmails = [...new Set(bookings?.map((b: any) => b.email) || [])];
  
  const profiles: ClientProfile[] = [];
  
  for (const email of uniqueEmails.slice(0, 100)) { // Limit to 100 for performance
    const profile = await buildClientProfile(supabase, email as string);
    if (profile) profiles.push(profile);
  }
  
  return profiles;
}

// Generate lifecycle actions
async function generateLifecycleActions(
  supabase: any,
  lovableApiKey: string
): Promise<LifecycleAction[]> {
  console.log('[ClientLifecycle] Generating lifecycle actions...');
  
  const actions: LifecycleAction[] = [];
  
  // 1. First-timers needing follow-up (30-60 days after first booking)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const { data: firstTimerBookings } = await supabase
    .from('bookings')
    .select('email, name')
    .eq('status', 'completed')
    .gte('scheduled_date', sixtyDaysAgo.toISOString())
    .lte('scheduled_date', thirtyDaysAgo.toISOString());
  
  // Filter to actual first-timers
  for (const booking of firstTimerBookings || []) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('email', booking.email)
      .eq('status', 'completed');
    
    if (count === 1) {
      actions.push({
        action_type: 'first_timer_followup',
        client_email: booking.email,
        client_name: booking.name,
        priority: 'medium',
        message_template: `Hey {{name}}! It's been about a month since your tattoo - how's it healing? I loved working on that piece and would love to create more art with you. Any new ideas brewing?`,
        trigger_reason: 'First-time client 30-60 days post-session',
        potential_value: 800
      });
    }
  }
  
  // 2. Dormant clients (6+ months no activity)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { data: dormantClients } = await supabase
    .from('bookings')
    .select('email, name')
    .eq('status', 'completed')
    .lt('scheduled_date', sixMonthsAgo.toISOString());
  
  const recentEmails = new Set<string>();
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('email')
    .gte('created_at', sixMonthsAgo.toISOString());
  
  recentBookings?.forEach((b: any) => recentEmails.add(b.email));
  
  const uniqueDormant = new Map<string, any>();
  dormantClients?.forEach((c: any) => {
    if (!recentEmails.has(c.email) && !uniqueDormant.has(c.email)) {
      uniqueDormant.set(c.email, c);
    }
  });
  
  Array.from(uniqueDormant.values()).slice(0, 10).forEach((client: any) => {
    actions.push({
      action_type: 'dormant_reengagement',
      client_email: client.email,
      client_name: client.name,
      priority: 'low',
      message_template: `Hey {{name}}! It's been a while since we created that piece together. I've been developing some new techniques I think you'd love. Any chance you're thinking about your next tattoo?`,
      trigger_reason: 'No booking in 6+ months',
      potential_value: 600
    });
  });
  
  // 3. VIP appreciation (5+ bookings)
  const { data: vipClients } = await supabase
    .from('bookings')
    .select('email, name')
    .eq('status', 'completed');
  
  const emailCounts: Record<string, { count: number; name: string }> = {};
  vipClients?.forEach((b: any) => {
    if (!emailCounts[b.email]) emailCounts[b.email] = { count: 0, name: b.name };
    emailCounts[b.email].count++;
  });
  
  Object.entries(emailCounts)
    .filter(([_, data]) => data.count >= 5)
    .slice(0, 5)
    .forEach(([email, data]) => {
      actions.push({
        action_type: 'vip_appreciation',
        client_email: email,
        client_name: data.name,
        priority: 'high',
        message_template: `Hey {{name}}! You've been one of my most valued clients with ${data.count} pieces together. I wanted to personally thank you and offer you priority booking for my next available dates. Also, enjoy 15% off your next session as a thank you!`,
        trigger_reason: `VIP status: ${data.count} completed bookings`,
        potential_value: 1500
      });
    });
  
  // 4. Birthday/anniversary messages (if we had dates)
  // Placeholder for future enhancement
  
  // Sort by priority and potential value
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potential_value - a.potential_value;
  });
}

// Get lifecycle analytics
async function getLifecycleAnalytics(supabase: any): Promise<any> {
  const profiles = await getAllClientProfiles(supabase);
  
  // Stage distribution
  const stageDistribution: Record<string, number> = {
    prospect: 0,
    first_timer: 0,
    returning: 0,
    loyal: 0,
    vip: 0,
    dormant: 0,
    churned: 0
  };
  
  profiles.forEach(p => {
    stageDistribution[p.lifecycle_stage]++;
  });
  
  // Calculate totals
  const totalClients = profiles.length;
  const totalLTV = profiles.reduce((sum, p) => sum + p.predicted_ltv, 0);
  const avgHealthScore = profiles.reduce((sum, p) => sum + p.health_score, 0) / totalClients || 0;
  const avgLTV = totalLTV / totalClients || 0;
  
  // At-risk clients (health score < 40)
  const atRiskClients = profiles.filter(p => p.health_score < 40);
  
  // Top clients by LTV
  const topClients = [...profiles]
    .sort((a, b) => b.predicted_ltv - a.predicted_ltv)
    .slice(0, 10);
  
  return {
    total_clients: totalClients,
    stage_distribution: stageDistribution,
    avg_health_score: Math.round(avgHealthScore),
    avg_ltv: Math.round(avgLTV),
    total_predicted_ltv: totalLTV,
    at_risk_count: atRiskClients.length,
    at_risk_clients: atRiskClients.slice(0, 5).map(c => ({
      name: c.name,
      email: c.email,
      health_score: c.health_score,
      last_booking: c.last_booking_date
    })),
    top_clients: topClients.map(c => ({
      name: c.name,
      email: c.email,
      total_revenue: c.total_revenue,
      predicted_ltv: c.predicted_ltv,
      lifecycle_stage: c.lifecycle_stage
    }))
  };
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
        "client-profiling",
        "lifecycle-staging",
        "health-scoring",
        "ltv-prediction",
        "automated-actions",
        "lifecycle-analytics"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { action, email } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

    console.log(`[ClientLifecycle v1.0] Action: ${action || 'analytics'}`);

    switch (action) {
      case 'profile': {
        if (!email) {
          return new Response(JSON.stringify({ error: 'Email required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const profile = await buildClientProfile(supabase, email);
        return new Response(JSON.stringify({ success: true, profile }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'all_profiles': {
        const profiles = await getAllClientProfiles(supabase);
        return new Response(JSON.stringify({ success: true, profiles }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'actions': {
        const actions = await generateLifecycleActions(supabase, LOVABLE_API_KEY || '');
        return new Response(JSON.stringify({ success: true, actions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default: {
        // Analytics by default
        const analytics = await getLifecycleAnalytics(supabase);
        return new Response(JSON.stringify({ success: true, analytics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error) {
    console.error('[ClientLifecycle] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
