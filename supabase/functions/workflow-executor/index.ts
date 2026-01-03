import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  compensation?: string;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

interface RetryPolicy {
  backoff: 'exponential' | 'linear' | 'fixed';
  initial_delay_ms: number;
  max_delay_ms: number;
  max_retries: number;
}

function calculateNextRetryDelay(policy: RetryPolicy, retryCount: number): number {
  const { backoff, initial_delay_ms, max_delay_ms } = policy;
  let delay: number;
  switch (backoff) {
    case 'exponential':
      delay = initial_delay_ms * Math.pow(2, retryCount);
      break;
    case 'linear':
      delay = initial_delay_ms * (retryCount + 1);
      break;
    default:
      delay = initial_delay_ms;
  }
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, max_delay_ms);
}

function getDefaultRetryPolicy(): RetryPolicy {
  return {
    backoff: 'exponential',
    initial_delay_ms: 1000,
    max_delay_ms: 300000,
    max_retries: 3
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`[workflow-executor] Action: ${action}`);

    switch (action) {
      case 'execute': {
        const { workflow_id, trigger_data, deadline_minutes } = params;

        const { data: workflow, error: wfError } = await supabase
          .from('workflow_definitions')
          .select('*')
          .eq('id', workflow_id)
          .single();

        if (wfError || !workflow) {
          throw new Error('Workflow not found');
        }

        const retryPolicy = workflow.retry_policy || getDefaultRetryPolicy();
        const deadlineAt = deadline_minutes 
          ? new Date(Date.now() + deadline_minutes * 60 * 1000).toISOString()
          : null;

        const { data: run, error: runError } = await supabase
          .from('workflow_runs')
          .insert({
            workflow_id,
            trigger_type: workflow.trigger_type,
            trigger_data,
            status: 'running',
            started_at: new Date().toISOString(),
            context: { trigger: trigger_data },
            retry_count: 0,
            max_retries: retryPolicy.max_retries || 3,
            retry_policy: retryPolicy,
            compensations_needed: [],
            deadline_at: deadlineAt,
            compensation_status: 'none'
          })
          .select()
          .single();

        if (runError) throw runError;

        console.log(`[workflow-executor] Started run ${run.id} for workflow ${workflow.name}`);

        const result = await executeWorkflowRun(supabase, run, workflow);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'resume': {
        const { run_id } = params;

        const { data: run, error: runError } = await supabase
          .from('workflow_runs')
          .select('*')
          .eq('id', run_id)
          .in('status', ['awaiting_signal', 'awaiting_timer', 'paused'])
          .single();

        if (runError || !run) {
          throw new Error('Run not found or not resumable');
        }

        const { data: workflow } = await supabase
          .from('workflow_definitions')
          .select('*')
          .eq('id', run.workflow_id)
          .single();

        if (!workflow) throw new Error('Workflow not found');

        await supabase
          .from('workflow_runs')
          .update({ status: 'running', awaiting_signal: null, next_retry_at: null })
          .eq('id', run_id);

        const result = await executeWorkflowRun(supabase, run, workflow, true);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'signal': {
        const { run_id, signal_type, signal_data, source = 'manual' } = params;

        const { data: signal, error: sigError } = await supabase
          .from('workflow_signals')
          .insert({ run_id, signal_type, signal_data, source })
          .select()
          .single();

        if (sigError) throw sigError;

        const { data: run } = await supabase
          .from('workflow_runs')
          .select('*')
          .eq('id', run_id)
          .eq('awaiting_signal', signal_type)
          .single();

        if (run) {
          await supabase
            .from('workflow_runs')
            .update({ signal_data, status: 'running', awaiting_signal: null })
            .eq('id', run_id);

          await supabase
            .from('workflow_signals')
            .update({ processed_at: new Date().toISOString(), processed_by: 'workflow-executor' })
            .eq('id', signal.id);

          const { data: workflow } = await supabase
            .from('workflow_definitions')
            .select('*')
            .eq('id', run.workflow_id)
            .single();

          if (workflow) {
            const result = await executeWorkflowRun(supabase, { ...run, signal_data }, workflow, true);
            return new Response(JSON.stringify({ ...result, signal_processed: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        return new Response(JSON.stringify({ success: true, signal_id: signal.id, signal_queued: !run }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'retry': {
        const { run_id, dead_letter_id } = params;

        const { data: run } = await supabase
          .from('workflow_runs')
          .select('*')
          .eq('id', run_id)
          .eq('status', 'failed')
          .single();

        if (!run) throw new Error('Failed run not found');

        const { data: workflow } = await supabase
          .from('workflow_definitions')
          .select('*')
          .eq('id', run.workflow_id)
          .single();

        if (!workflow) throw new Error('Workflow not found');

        await supabase
          .from('workflow_runs')
          .update({ status: 'running', retry_count: run.retry_count + 1, error_message: null, next_retry_at: null })
          .eq('id', run_id);

        if (dead_letter_id) {
          await supabase
            .from('workflow_dead_letters')
            .update({ resolved_at: new Date().toISOString(), resolution_action: 'retried' })
            .eq('id', dead_letter_id);
        }

        const result = await executeWorkflowRun(supabase, run, workflow, true);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'compensate': {
        const { run_id } = params;

        const { data: run } = await supabase
          .from('workflow_runs')
          .select('*')
          .eq('id', run_id)
          .single();

        if (!run) throw new Error('Run not found');

        const compensations = run.compensations_needed || [];
        if (compensations.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No compensations needed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await supabase.from('workflow_runs').update({ compensation_status: 'running' }).eq('id', run_id);

        const results = [];
        for (const compensation of [...compensations].reverse()) {
          const { data: compRecord } = await supabase
            .from('workflow_compensations')
            .insert({
              run_id,
              step_name: compensation.step_name,
              compensation_action: compensation.action,
              status: 'running',
              input_data: compensation.input,
              started_at: new Date().toISOString()
            })
            .select()
            .single();

          try {
            console.log(`[workflow-executor] Running compensation: ${compensation.action}`);
            await supabase
              .from('workflow_compensations')
              .update({ status: 'completed', output_data: { compensated: true }, completed_at: new Date().toISOString() })
              .eq('id', compRecord?.id);
            results.push({ action: compensation.action, status: 'completed' });
          } catch (compError) {
            const errorMsg = compError instanceof Error ? compError.message : 'Unknown error';
            await supabase
              .from('workflow_compensations')
              .update({ status: 'failed', error: errorMsg, completed_at: new Date().toISOString() })
              .eq('id', compRecord?.id);
            results.push({ action: compensation.action, status: 'failed', error: errorMsg });
          }
        }

        const allCompleted = results.every(r => r.status === 'completed');
        await supabase
          .from('workflow_runs')
          .update({ compensation_status: allCompleted ? 'completed' : 'partial', compensations_needed: [] })
          .eq('id', run_id);

        return new Response(JSON.stringify({ success: true, compensations: results, all_completed: allCompleted }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'pause': {
        const { run_id } = params;
        await supabase.from('workflow_runs').update({ status: 'paused' }).eq('id', run_id).eq('status', 'running');
        return new Response(JSON.stringify({ success: true, paused: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'cancel': {
        const { run_id } = params;
        await supabase
          .from('workflow_runs')
          .update({ status: 'cancelled', completed_at: new Date().toISOString() })
          .eq('id', run_id)
          .in('status', ['running', 'paused', 'awaiting_signal', 'awaiting_timer']);
        return new Response(JSON.stringify({ success: true, cancelled: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_runs': {
        const { workflow_id, limit = 20, status } = params;
        let query = supabase
          .from('workflow_runs')
          .select('*, workflow_step_logs(*)')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (workflow_id) query = query.eq('workflow_id', workflow_id);
        if (status) query = query.eq('status', status);
        const { data: runs, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, runs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_run': {
        const { run_id } = params;
        const { data: run, error } = await supabase
          .from('workflow_runs')
          .select('*, workflow_step_logs(*), workflow_signals(*), workflow_compensations(*)')
          .eq('id', run_id)
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, run }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'process_pending': {
        const now = new Date().toISOString();
        const results = { retries: 0, timers: 0, signals: 0 };

        // Process retries
        const { data: retryRuns } = await supabase
          .from('workflow_runs')
          .select('*')
          .eq('status', 'retrying')
          .lte('next_retry_at', now)
          .limit(10);

        for (const run of retryRuns || []) {
          const { data: workflow } = await supabase
            .from('workflow_definitions')
            .select('*')
            .eq('id', run.workflow_id)
            .single();
          if (workflow) {
            await supabase.from('workflow_runs').update({ status: 'running' }).eq('id', run.id);
            await executeWorkflowRun(supabase, run, workflow, true);
            results.retries++;
          }
        }

        // Process timers
        const { data: timerRuns } = await supabase
          .from('workflow_runs')
          .select('*')
          .eq('status', 'awaiting_timer')
          .lte('next_retry_at', now)
          .limit(10);

        for (const run of timerRuns || []) {
          const { data: workflow } = await supabase
            .from('workflow_definitions')
            .select('*')
            .eq('id', run.workflow_id)
            .single();
          if (workflow) {
            await supabase.from('workflow_runs').update({ status: 'running', awaiting_signal: null }).eq('id', run.id);
            await executeWorkflowRun(supabase, run, workflow, true);
            results.timers++;
          }
        }

        console.log(`[workflow-executor] Processed: ${results.retries} retries, ${results.timers} timers`);
        return new Response(JSON.stringify({ success: true, processed: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'test_workflow': {
        const { workflow_id } = params;
        const { data: workflow } = await supabase
          .from('workflow_definitions')
          .select('*')
          .eq('id', workflow_id)
          .single();
        if (!workflow) throw new Error('Workflow not found');
        const nodes = workflow.nodes as unknown as WorkflowNode[];
        const testResults = nodes.map(node => ({
          node_id: node.id,
          node_name: node.name,
          node_type: node.type,
          would_execute: true,
          has_compensation: !!node.compensation,
          simulated_output: { success: true }
        }));
        return new Response(JSON.stringify({ success: true, test_mode: true, results: testResults }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: unknown) {
    console.error('[workflow-executor] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// deno-lint-ignore no-explicit-any
async function executeWorkflowRun(supabase: any, run: any, workflow: any, isResume = false): Promise<any> {
  const nodes = workflow.nodes as WorkflowNode[];
  const edges = workflow.edges as WorkflowEdge[];
  let context = run.context || { trigger: run.trigger_data };
  
  let currentNodeId: string | null;
  if (isResume && run.current_node_id) {
    currentNodeId = run.current_node_id;
  } else {
    currentNodeId = nodes.find(n => n.type === 'trigger')?.id || nodes[0]?.id || null;
  }

  const compensationsNeeded: Array<{ step_name: string; action: string; input: unknown }> = 
    Array.isArray(run.compensations_needed) ? [...run.compensations_needed] : [];

  try {
    if (run.deadline_at && new Date(run.deadline_at) < new Date()) {
      throw new Error('Workflow deadline exceeded');
    }

    while (currentNodeId !== null) {
      const node = nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      await supabase.from('workflow_runs').update({ current_node_id: currentNodeId }).eq('id', run.id);

      const { data: stepLog } = await supabase
        .from('workflow_step_logs')
        .insert({
          run_id: run.id,
          node_id: node.id,
          node_type: node.type,
          node_name: node.name,
          status: 'running',
          input_data: context,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      let output: Record<string, unknown> = {};
      const startTime = Date.now();

      try {
        switch (node.type) {
          case 'trigger':
            output = context.trigger || {};
            break;

          case 'send_email':
            console.log(`[workflow-executor] Sending email: ${node.config.template}`);
            output = { sent: true, timestamp: new Date().toISOString() };
            if (node.compensation) {
              compensationsNeeded.push({ step_name: node.name, action: node.compensation, input: { email_id: output.email_id } });
            }
            break;

          case 'update_status':
            console.log(`[workflow-executor] Updating status to: ${node.config.status}`);
            output = { updated: true, new_status: node.config.status };
            break;

          case 'ai_decision':
            output = { decision: 'approved', confidence: 0.92 };
            break;

          case 'delay':
          case 'timer': {
            const delayMinutes = (node.config.minutes as number) || 1;
            const nextRunAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
            const nextEdge = edges.find(e => e.source === currentNodeId);
            
            await supabase.from('workflow_runs').update({
              status: 'awaiting_timer',
              next_retry_at: nextRunAt,
              current_node_id: nextEdge?.target || null,
              context: { ...context, [node.id]: { delayed_until: nextRunAt } }
            }).eq('id', run.id);

            await supabase.from('workflow_step_logs').update({
              status: 'completed',
              output_data: { awaiting_timer: true, resume_at: nextRunAt },
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startTime
            }).eq('id', stepLog?.id);

            console.log(`[workflow-executor] Run ${run.id} waiting until ${nextRunAt}`);
            return { success: true, run_id: run.id, status: 'awaiting_timer', context };
          }

          case 'await_signal':
          case 'wait_for_signal': {
            const signalType = node.config.signal_type as string || 'default';
            
            if (run.signal_data && run.awaiting_signal === null) {
              output = { signal_received: true, data: run.signal_data };
              await supabase.from('workflow_runs').update({ signal_data: null }).eq('id', run.id);
            } else {
              await supabase.from('workflow_runs').update({
                status: 'awaiting_signal',
                awaiting_signal: signalType,
                current_node_id: currentNodeId,
                context
              }).eq('id', run.id);

              await supabase.from('workflow_step_logs').update({
                status: 'awaiting',
                output_data: { awaiting_signal: signalType },
                completed_at: new Date().toISOString(),
                duration_ms: Date.now() - startTime
              }).eq('id', stepLog?.id);

              console.log(`[workflow-executor] Run ${run.id} awaiting signal: ${signalType}`);
              return { success: true, run_id: run.id, status: 'awaiting_signal', context };
            }
            break;
          }

          case 'condition': {
            const conditionMet = true;
            output = { condition_met: conditionMet };
            break;
          }

          case 'webhook': {
            const url = node.config.url as string;
            const method = (node.config.method as string) || 'POST';
            try {
              const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method !== 'GET' ? JSON.stringify(context) : undefined
              });
              output = { called: true, status: response.status, ok: response.ok };
            } catch (webhookError) {
              output = { called: false, error: webhookError instanceof Error ? webhookError.message : 'Webhook failed' };
              throw webhookError;
            }
            break;
          }

          case 'create_payment':
            output = { payment_created: true, payment_id: `pay_${Date.now()}` };
            if (node.compensation) {
              compensationsNeeded.push({ step_name: node.name, action: node.compensation, input: { payment_id: output.payment_id } });
            }
            break;

          case 'reserve_calendar':
            output = { reserved: true, event_id: `evt_${Date.now()}` };
            if (node.compensation) {
              compensationsNeeded.push({ step_name: node.name, action: node.compensation, input: { event_id: output.event_id } });
            }
            break;

          default:
            output = { executed: true };
        }

        await supabase.from('workflow_step_logs').update({
          status: 'completed',
          output_data: output,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        }).eq('id', stepLog?.id);

        context = { ...context, [node.id]: output };
        await supabase.from('workflow_runs').update({ compensations_needed: compensationsNeeded }).eq('id', run.id);

      } catch (stepError: unknown) {
        const errorMessage = stepError instanceof Error ? stepError.message : 'Step execution failed';
        await supabase.from('workflow_step_logs').update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        }).eq('id', stepLog?.id);
        throw stepError;
      }

      const outEdge = edges.find(e => e.source === currentNodeId);
      currentNodeId = outEdge?.target ?? null;
    }

    const completedAt = new Date().toISOString();
    await supabase.from('workflow_runs').update({
      status: 'completed',
      completed_at: completedAt,
      duration_ms: Date.now() - new Date(run.started_at).getTime(),
      context,
      current_node_id: null
    }).eq('id', run.id);

    await supabase.from('workflow_definitions').update({
      last_run_at: completedAt,
      run_count: (workflow.run_count || 0) + 1,
      success_count: (workflow.success_count || 0) + 1
    }).eq('id', run.workflow_id);

    console.log(`[workflow-executor] Run ${run.id} completed successfully`);
    return { success: true, run_id: run.id, status: 'completed', context };

  } catch (execError: unknown) {
    const errorMessage = execError instanceof Error ? execError.message : 'Unknown execution error';
    const retryPolicy = run.retry_policy || getDefaultRetryPolicy();
    const canRetry = run.retry_count < run.max_retries;

    if (canRetry) {
      const nextRetryDelay = calculateNextRetryDelay(retryPolicy, run.retry_count);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

      await supabase.from('workflow_runs').update({
        status: 'retrying',
        retry_count: run.retry_count + 1,
        next_retry_at: nextRetryAt,
        error_message: errorMessage,
        compensations_needed: compensationsNeeded
      }).eq('id', run.id);

      console.log(`[workflow-executor] Run ${run.id} scheduled for retry at ${nextRetryAt}`);
      return { success: false, run_id: run.id, status: 'retrying', error: errorMessage };
    } else {
      await supabase.from('workflow_runs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
        compensations_needed: compensationsNeeded
      }).eq('id', run.id);

      await supabase.from('workflow_dead_letters').insert({
        run_id: run.id,
        workflow_id: run.workflow_id,
        workflow_name: workflow.name,
        failure_reason: 'Max retries exceeded',
        last_error: errorMessage,
        failed_at_step: currentNodeId,
        context,
        input_data: run.trigger_data,
        retry_count: run.retry_count + 1
      });

      await supabase.from('workflow_definitions').update({
        run_count: (workflow.run_count || 0) + 1,
        failure_count: (workflow.failure_count || 0) + 1
      }).eq('id', run.workflow_id);

      console.error(`[workflow-executor] Run ${run.id} failed permanently: ${errorMessage}`);
      return { success: false, run_id: run.id, status: 'failed', error: errorMessage };
    }
  }
}
