// useWorkflowTrigger - Easy workflow invocation from any component
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/lib/eventBus';
import { useToast } from '@/hooks/use-toast';

type WorkflowName =
  | 'smart-follow-up'
  | 'booking-follow-up'
  | 'client-lifecycle'
  | 'healing-reminders'
  | 'send-waitlist-offer'
  | 'escalation-handler'
  | 'calendar-optimization'
  | 'revenue-intelligence'
  | 'drift-detector'
  | 'marketing-campaign'
  | 'custom';

interface WorkflowResult {
  success: boolean;
  runId?: string;
  error?: string;
}

interface UseWorkflowTriggerReturn {
  triggerWorkflow: (name: WorkflowName, input?: Record<string, any>, customFunctionName?: string) => Promise<WorkflowResult>;
  isRunning: boolean;
  lastRunId: string | null;
  error: string | null;
}

export function useWorkflowTrigger(): UseWorkflowTriggerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const triggerWorkflow = useCallback(
    async (
      name: WorkflowName,
      input: Record<string, any> = {},
      customFunctionName?: string
    ): Promise<WorkflowResult> => {
      setIsRunning(true);
      setError(null);

      try {
        // Map workflow names to edge functions
        const functionMap: Record<WorkflowName, string> = {
          'smart-follow-up': 'smart-follow-up',
          'booking-follow-up': 'smart-follow-up',
          'client-lifecycle': 'client-lifecycle',
          'healing-reminders': 'healing-tracker',
          'send-waitlist-offer': 'send-waitlist-offer',
          'escalation-handler': 'workflow-executor',
          'calendar-optimization': 'ai-scheduler',
          'revenue-intelligence': 'revenue-intelligence',
          'drift-detector': 'drift-detector',
          'marketing-campaign': 'ai-marketing-studio',
          'custom': customFunctionName || 'workflow-executor',
        };

        const functionName = functionMap[name];

        // Create workflow run record
        const { data: runData, error: runError } = await supabase
          .from('workflow_runs')
          .insert({
            workflow_name: name,
            status: 'running',
            input,
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (runError) throw runError;

        const runId = runData.id;
        setLastRunId(runId);

        // Invoke the edge function
        const { data, error: funcError } = await supabase.functions.invoke(functionName, {
          body: {
            workflowRunId: runId,
            workflowName: name,
            ...input,
          },
        });

        if (funcError) {
          // Update run as failed
          await supabase
            .from('workflow_runs')
            .update({
              status: 'failed',
              error_message: funcError.message,
              ended_at: new Date().toISOString(),
            })
            .eq('id', runId);

          throw funcError;
        }

        // Update run as completed
        await supabase
          .from('workflow_runs')
          .update({
            status: 'completed',
            output: data,
            ended_at: new Date().toISOString(),
          })
          .eq('id', runId);

        // Emit event
        eventBus.emit('analytics:forecast_generated', {
          period: name,
          predicted: 0,
          confidence: 1,
        });

        toast({
          title: 'Workflow Started',
          description: `${name} is running`,
        });

        return { success: true, runId };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Workflow failed';
        setError(errorMessage);

        toast({
          title: 'Workflow Error',
          description: errorMessage,
          variant: 'destructive',
        });

        return { success: false, error: errorMessage };
      } finally {
        setIsRunning(false);
      }
    },
    [toast]
  );

  return {
    triggerWorkflow,
    isRunning,
    lastRunId,
    error,
  };
}

// Quick workflow triggers for common actions
export function useQuickWorkflows() {
  const { triggerWorkflow, isRunning } = useWorkflowTrigger();

  return {
    triggerFollowUp: (bookingId: string) =>
      triggerWorkflow('booking-follow-up', { bookingId }),

    triggerClientLifecycle: (clientId: string) =>
      triggerWorkflow('client-lifecycle', { clientId }),

    triggerHealingReminders: (bookingId: string) =>
      triggerWorkflow('healing-reminders', { bookingId }),

    triggerWaitlistOffer: (clientId: string, slotDate: string) =>
      triggerWorkflow('send-waitlist-offer', { clientId, slotDate }),

    triggerCalendarOptimization: () =>
      triggerWorkflow('calendar-optimization', {}),

    triggerMarketingCampaign: (campaignType: string, targetAudience?: string) =>
      triggerWorkflow('marketing-campaign', { campaignType, targetAudience }),

    isRunning,
  };
}
