import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DriftDetectionRequest {
  action: 'check_all' | 'check_single' | 'resolve' | 'calibrate';
  monitor_key?: string;
  event_id?: string;
  workspace_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, monitor_key, event_id, workspace_id } = 
      await req.json() as DriftDetectionRequest;

    switch (action) {
      case 'check_all': {
        // Get all monitors
        const { data: monitors, error: monitorsError } = await supabase
          .from('drift_monitors')
          .select('*')
          .or(`workspace_id.is.null,workspace_id.eq.${workspace_id || 'null'}`);

        if (monitorsError) throw monitorsError;

        const results = [];
        const newEvents = [];

        for (const monitor of monitors || []) {
          const result = await checkMonitorDrift(supabase, monitor, workspace_id);
          results.push(result);

          // Update monitor
          await supabase
            .from('drift_monitors')
            .update({
              baseline_value: result.baseline,
              current_value: result.current,
              drift_percentage: result.drift,
              status: result.status,
              last_checked_at: new Date().toISOString(),
            })
            .eq('id', monitor.id);

          // Create event if status changed to warning/critical
          if (result.status !== 'healthy' && monitor.status === 'healthy') {
            newEvents.push({
              workspace_id,
              monitor_id: monitor.id,
              monitor_key: monitor.monitor_key,
              severity: result.status,
              explanation: result.explanation,
              recommended_actions: result.recommendations,
            });
          }
        }

        // Insert new events
        if (newEvents.length > 0) {
          await supabase.from('drift_events').insert(newEvents);
        }

        return new Response(
          JSON.stringify({
            success: true,
            monitors_checked: results.length,
            new_events: newEvents.length,
            results,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'check_single': {
        if (!monitor_key) throw new Error('monitor_key required');

        const { data: monitor, error } = await supabase
          .from('drift_monitors')
          .select('*')
          .eq('monitor_key', monitor_key)
          .single();

        if (error) throw error;

        const result = await checkMonitorDrift(supabase, monitor, workspace_id);

        await supabase
          .from('drift_monitors')
          .update({
            baseline_value: result.baseline,
            current_value: result.current,
            drift_percentage: result.drift,
            status: result.status,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', monitor.id);

        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'resolve': {
        if (!event_id) throw new Error('event_id required');

        await supabase
          .from('drift_events')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', event_id);

        return new Response(
          JSON.stringify({ success: true, message: 'Event resolved' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'calibrate': {
        // Reset baselines using current values
        const { data: monitors, error } = await supabase
          .from('drift_monitors')
          .select('*')
          .or(`workspace_id.is.null,workspace_id.eq.${workspace_id || 'null'}`);

        if (error) throw error;

        for (const monitor of monitors || []) {
          const result = await checkMonitorDrift(supabase, monitor, workspace_id);
          
          await supabase
            .from('drift_monitors')
            .update({
              baseline_value: result.current,
              current_value: result.current,
              drift_percentage: 0,
              status: 'healthy',
              last_checked_at: new Date().toISOString(),
            })
            .eq('id', monitor.id);
        }

        // Resolve all active events
        await supabase
          .from('drift_events')
          .update({ resolved_at: new Date().toISOString() })
          .is('resolved_at', null);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Calibration complete',
            monitors_calibrated: monitors?.length || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Drift detector error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkMonitorDrift(
  supabase: any, 
  monitor: any,
  workspace_id?: string
): Promise<{
  baseline: number;
  current: number;
  drift: number;
  status: 'healthy' | 'warning' | 'critical';
  explanation: string;
  recommendations: string[];
}> {
  const thresholds = monitor.thresholds || { warning: 0.1, critical: 0.25 };
  
  // Calculate metrics based on monitor type
  let baseline = monitor.baseline_value || 0;
  let current = 0;

  switch (monitor.monitor_key) {
    case 'conversion_rate': {
      // Get conversion rate from bookings
      const now = new Date();
      const baselineStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { count: totalRecent } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart.toISOString());

      const { count: confirmedRecent } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart.toISOString())
        .eq('status', 'confirmed');

      current = totalRecent > 0 ? confirmedRecent / totalRecent : 0;
      
      if (!baseline) {
        const { count: totalBase } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', baselineStart.toISOString())
          .lt('created_at', currentStart.toISOString());

        const { count: confirmedBase } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', baselineStart.toISOString())
          .lt('created_at', currentStart.toISOString())
          .eq('status', 'confirmed');

        baseline = totalBase > 0 ? confirmedBase / totalBase : current;
      }
      break;
    }

    case 'no_show_rate': {
      const currentStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { count: total } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart.toISOString());

      const { count: noShows } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart.toISOString())
        .eq('status', 'no_show');

      current = total > 0 ? noShows / total : 0;
      baseline = baseline || 0.05; // Default 5% baseline
      break;
    }

    case 'response_time': {
      // Would calculate from chat_conversations response times
      current = 45; // Minutes (placeholder)
      baseline = baseline || 30;
      break;
    }

    case 'sentiment_score': {
      // Would aggregate from client_intelligence sentiment
      current = 0.72; // Placeholder
      baseline = baseline || 0.75;
      break;
    }

    default:
      current = baseline || 0.5;
  }

  // Calculate drift
  const drift = baseline > 0 ? Math.abs(current - baseline) / baseline : 0;

  // Determine status
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (drift >= thresholds.critical) {
    status = 'critical';
  } else if (drift >= thresholds.warning) {
    status = 'warning';
  }

  // Generate explanation and recommendations
  const direction = current > baseline ? 'increased' : 'decreased';
  const explanation = `${monitor.monitor_name || monitor.monitor_key} has ${direction} by ${(drift * 100).toFixed(1)}% from baseline`;

  const recommendations = [];
  if (status === 'critical') {
    recommendations.push('Run calibration wizard');
    recommendations.push('Consider pausing autopilot');
    recommendations.push('Review recent changes');
  } else if (status === 'warning') {
    recommendations.push('Monitor closely');
    recommendations.push('Increase exploration rate');
  }

  return {
    baseline,
    current,
    drift,
    status,
    explanation,
    recommendations,
  };
}
