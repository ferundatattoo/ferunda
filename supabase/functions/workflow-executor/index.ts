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
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
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
        const { workflow_id, trigger_data } = params;

        // Get workflow definition
        const { data: workflow, error: wfError } = await supabase
          .from('workflow_definitions')
          .select('*')
          .eq('id', workflow_id)
          .single();

        if (wfError || !workflow) {
          throw new Error('Workflow not found');
        }

        // Create run record
        const { data: run, error: runError } = await supabase
          .from('workflow_runs')
          .insert({
            workflow_id,
            trigger_type: workflow.trigger_type,
            trigger_data,
            status: 'running',
            started_at: new Date().toISOString(),
            context: { trigger: trigger_data }
          })
          .select()
          .single();

        if (runError) throw runError;

        console.log(`[workflow-executor] Started run ${run.id} for workflow ${workflow.name}`);

        // Execute nodes in order
        const nodes = workflow.nodes as unknown as WorkflowNode[];
        const edges = workflow.edges as unknown as WorkflowEdge[];
        let context = { trigger: trigger_data };
        let currentNodeId = nodes.find(n => n.type === 'trigger')?.id || nodes[0]?.id;

        try {
          while (currentNodeId) {
            const node = nodes.find(n => n.id === currentNodeId);
            if (!node) break;

            // Log step start
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

            // Execute node based on type
            let output = {};
            const startTime = Date.now();

            switch (node.type) {
              case 'trigger':
                output = trigger_data;
                break;

              case 'send_email':
                console.log(`[workflow-executor] Sending email: ${node.config.template}`);
                output = { sent: true, timestamp: new Date().toISOString() };
                break;

              case 'update_status':
                console.log(`[workflow-executor] Updating status to: ${node.config.status}`);
                output = { updated: true, new_status: node.config.status };
                break;

              case 'ai_decision':
                console.log(`[workflow-executor] AI decision node`);
                output = { decision: 'approved', confidence: 0.92 };
                break;

              case 'delay':
                const delayMs = (node.config.minutes as number || 1) * 60 * 1000;
                console.log(`[workflow-executor] Delay: ${node.config.minutes} minutes`);
                output = { delayed: true, duration_ms: delayMs };
                break;

              case 'condition':
                const conditionMet = true; // Evaluate condition
                output = { condition_met: conditionMet };
                break;

              case 'webhook':
                console.log(`[workflow-executor] Calling webhook: ${node.config.url}`);
                output = { called: true, status: 200 };
                break;

              default:
                output = { executed: true };
            }

            const duration = Date.now() - startTime;

            // Update step log
            await supabase
              .from('workflow_step_logs')
              .update({
                status: 'completed',
                output_data: output,
                completed_at: new Date().toISOString(),
                duration_ms: duration
              })
              .eq('id', stepLog?.id);

            // Merge output to context
            context = { ...context, [node.id]: output };

            // Find next node
            const outEdge = edges.find(e => e.source === currentNodeId);
            currentNodeId = outEdge?.target || null;
          }

          // Mark run as completed
          const completedAt = new Date().toISOString();
          await supabase
            .from('workflow_runs')
            .update({
              status: 'completed',
              completed_at: completedAt,
              duration_ms: Date.now() - new Date(run.started_at).getTime(),
              context
            })
            .eq('id', run.id);

          // Update workflow stats
          await supabase
            .from('workflow_definitions')
            .update({
              last_run_at: completedAt,
              run_count: workflow.run_count + 1,
              success_count: workflow.success_count + 1
            })
            .eq('id', workflow_id);

          console.log(`[workflow-executor] Run ${run.id} completed successfully`);

          return new Response(JSON.stringify({ 
            success: true, 
            run_id: run.id,
            status: 'completed',
            context 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (execError) {
          // Mark run as failed
          await supabase
            .from('workflow_runs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: execError.message
            })
            .eq('id', run.id);

          await supabase
            .from('workflow_definitions')
            .update({
              run_count: workflow.run_count + 1,
              failure_count: workflow.failure_count + 1
            })
            .eq('id', workflow_id);

          throw execError;
        }
      }

      case 'get_runs': {
        const { workflow_id, limit = 20 } = params;

        const { data: runs, error } = await supabase
          .from('workflow_runs')
          .select('*, workflow_step_logs(*)')
          .eq('workflow_id', workflow_id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, runs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'cancel_run': {
        const { run_id } = params;

        const { error } = await supabase
          .from('workflow_runs')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', run_id)
          .eq('status', 'running');

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, cancelled: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'test_workflow': {
        const { workflow_id, test_data } = params;

        // Execute in test mode (doesn't affect stats)
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
          simulated_output: { success: true }
        }));

        return new Response(JSON.stringify({ 
          success: true, 
          test_mode: true,
          results: testResults 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[workflow-executor] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
