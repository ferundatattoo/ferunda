import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      retries_processed: 0,
      timers_processed: 0,
      signals_processed: 0,
      errors: [] as string[],
    };

    console.log('[workflow-scheduler] Starting scheduled run...');

    // 1. Process workflows ready for retry
    const retriesResult = await processRetries(supabase);
    results.retries_processed = retriesResult.count;
    results.errors.push(...retriesResult.errors);

    // 2. Process workflows with expired timers
    const timersResult = await processTimers(supabase);
    results.timers_processed = timersResult.count;
    results.errors.push(...timersResult.errors);

    // 3. Process pending signals
    const signalsResult = await processSignals(supabase);
    results.signals_processed = signalsResult.count;
    results.errors.push(...signalsResult.errors);

    console.log('[workflow-scheduler] Completed:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[workflow-scheduler] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processRetries(supabase: any): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];

  // Find workflows ready for retry
  const { data: retryRuns, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('status', 'retrying')
    .lte('next_retry_at', new Date().toISOString())
    .limit(10);

  if (error) {
    console.error('[workflow-scheduler] Error fetching retry runs:', error);
    return { count: 0, errors: [error.message] };
  }

  if (!retryRuns || retryRuns.length === 0) {
    return { count: 0, errors: [] };
  }

  console.log(`[workflow-scheduler] Processing ${retryRuns.length} retries`);

  for (const run of retryRuns) {
    try {
      // Update status to running before invoking
      await supabase.from('workflow_runs').update({
        status: 'running',
      }).eq('id', run.id);

      // Invoke the appropriate workflow executor
      const workflowType = run.logs_json?.workflow_type;
      
      if (workflowType === 'booking_flow') {
        // Call booking-workflow to resume
        const { error: invokeError } = await supabase.functions.invoke('booking-workflow', {
          body: { action: 'resume', runId: run.id },
        });
        if (invokeError) throw invokeError;
      } else {
        // Call generic workflow-executor
        const { error: invokeError } = await supabase.functions.invoke('workflow-executor', {
          body: { action: 'resume', runId: run.id },
        });
        if (invokeError) throw invokeError;
      }

      console.log(`[workflow-scheduler] Resumed retry for run ${run.id}`);
    } catch (err: any) {
      console.error(`[workflow-scheduler] Failed to retry run ${run.id}:`, err);
      errors.push(`Run ${run.id}: ${err.message}`);

      // Check if we've exceeded max retries
      const retryCount = (run.retry_count || 0) + 1;
      if (retryCount >= (run.max_retries || 3)) {
        // Move to dead letter queue
        await supabase.from('workflow_runs').update({
          status: 'failed',
          finished_at: new Date().toISOString(),
        }).eq('id', run.id);

        await supabase.from('workflow_dead_letters').insert({
          run_id: run.id,
          workflow_id: run.workflow_id,
          workspace_id: run.workspace_id,
          workflow_name: run.logs_json?.workflow_type || 'unknown',
          failure_reason: `Exceeded max retries (${run.max_retries})`,
          last_error: err.message,
          context: run.logs_json,
        });
      }
    }
  }

  return { count: retryRuns.length, errors };
}

async function processTimers(supabase: any): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];

  // Find workflows waiting for timer to expire
  const { data: timerRuns, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('status', 'awaiting_timer')
    .lte('next_retry_at', new Date().toISOString())
    .limit(10);

  if (error) {
    console.error('[workflow-scheduler] Error fetching timer runs:', error);
    return { count: 0, errors: [error.message] };
  }

  if (!timerRuns || timerRuns.length === 0) {
    return { count: 0, errors: [] };
  }

  console.log(`[workflow-scheduler] Processing ${timerRuns.length} timers`);

  for (const run of timerRuns) {
    try {
      // Update status to running
      await supabase.from('workflow_runs').update({
        status: 'running',
      }).eq('id', run.id);

      // Invoke the workflow executor to continue
      const workflowType = run.logs_json?.workflow_type;
      
      if (workflowType === 'booking_flow') {
        const { error: invokeError } = await supabase.functions.invoke('booking-workflow', {
          body: { action: 'resume', runId: run.id },
        });
        if (invokeError) throw invokeError;
      } else if (workflowType === 'client_lifecycle') {
        const { error: invokeError } = await supabase.functions.invoke('client-lifecycle', {
          body: { action: 'resume', runId: run.id },
        });
        if (invokeError) throw invokeError;
      } else {
        const { error: invokeError } = await supabase.functions.invoke('workflow-executor', {
          body: { action: 'resume', runId: run.id },
        });
        if (invokeError) throw invokeError;
      }

      console.log(`[workflow-scheduler] Resumed timer for run ${run.id}`);
    } catch (err: any) {
      console.error(`[workflow-scheduler] Failed to process timer for run ${run.id}:`, err);
      errors.push(`Run ${run.id}: ${err.message}`);
    }
  }

  return { count: timerRuns.length, errors };
}

async function processSignals(supabase: any): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];

  // Find unprocessed signals
  const { data: signals, error } = await supabase
    .from('workflow_signals')
    .select('*, workflow_runs(*)')
    .is('processed_at', null)
    .limit(20);

  if (error) {
    console.error('[workflow-scheduler] Error fetching signals:', error);
    return { count: 0, errors: [error.message] };
  }

  if (!signals || signals.length === 0) {
    return { count: 0, errors: [] };
  }

  console.log(`[workflow-scheduler] Processing ${signals.length} signals`);

  for (const signal of signals) {
    try {
      const run = signal.workflow_runs;
      
      // Only process if workflow is awaiting this signal type
      if (run?.status === 'awaiting_signal' && run?.awaiting_signal === signal.signal_type) {
        // Invoke the workflow to resume with signal data
        const workflowType = run.logs_json?.workflow_type;
        
        if (workflowType === 'booking_flow') {
          const { error: invokeError } = await supabase.functions.invoke('booking-workflow', {
            body: { 
              action: 'resume', 
              runId: run.id,
              signalData: signal.signal_data,
            },
          });
          if (invokeError) throw invokeError;
        } else {
          const { error: invokeError } = await supabase.functions.invoke('workflow-executor', {
            body: { 
              action: 'signal', 
              runId: run.id,
              signalType: signal.signal_type,
              signalData: signal.signal_data,
            },
          });
          if (invokeError) throw invokeError;
        }

        console.log(`[workflow-scheduler] Delivered signal ${signal.signal_type} to run ${run.id}`);
      }

      // Mark signal as processed
      await supabase.from('workflow_signals').update({
        processed_at: new Date().toISOString(),
      }).eq('id', signal.id);

    } catch (err: any) {
      console.error(`[workflow-scheduler] Failed to process signal ${signal.id}:`, err);
      errors.push(`Signal ${signal.id}: ${err.message}`);
    }
  }

  return { count: signals.length, errors };
}
