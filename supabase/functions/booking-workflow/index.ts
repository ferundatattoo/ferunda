import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Booking workflow activities with their compensations
const BOOKING_ACTIVITIES = [
  { name: 'validate_booking', compensation: null },
  { name: 'calculate_pricing', compensation: null },
  { name: 'create_payment_intent', compensation: 'cancel_payment_intent' },
  { name: 'await_payment', compensation: null, isAsync: true, signalType: 'payment_completed' },
  { name: 'reserve_calendar', compensation: 'release_calendar_slot' },
  { name: 'create_appointment', compensation: 'cancel_appointment' },
  { name: 'send_confirmation', compensation: 'send_cancellation_notice' },
  { name: 'schedule_reminders', compensation: 'cancel_reminders' },
];

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, bookingId, runId, signalData } = await req.json();
    console.log(`[booking-workflow] Action: ${action}, bookingId: ${bookingId}, runId: ${runId}`);

    let result: any;
    switch (action) {
      case 'start':
        result = await startBookingWorkflow(supabase, bookingId);
        break;
      case 'resume':
        result = await resumeWorkflow(supabase, runId, signalData);
        break;
      case 'compensate':
        result = await runCompensation(supabase, runId);
        break;
      case 'get_status':
        result = await getWorkflowStatus(supabase, runId || bookingId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[booking-workflow] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function startBookingWorkflow(supabase: any, bookingId: string) {
  console.log(`[booking-workflow] Starting workflow for booking: ${bookingId}`);

  // Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, studio_artists(display_name), city_configurations(city_name)')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  // Create workflow run
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: null, // This is a coded workflow, not a visual one
      workspace_id: booking.workspace_id,
      record_id: bookingId,
      record_type: 'booking',
      status: 'running',
      started_at: new Date().toISOString(),
      logs_json: {
        workflow_type: 'booking_flow',
        activities: BOOKING_ACTIVITIES.map(a => a.name),
        current_activity_index: 0,
        booking_snapshot: {
          id: booking.id,
          client_name: booking.client_name,
          artist_name: booking.studio_artists?.display_name,
          city: booking.city_configurations?.city_name,
        }
      },
      max_retries: 3,
      retry_policy: { backoff: 'exponential', initial_delay_ms: 2000 },
      compensations_needed: [],
    })
    .select()
    .single();

  if (runError) throw runError;

  // Execute activities sequentially
  const result = await executeActivities(supabase, run, booking);
  return result;
}

async function executeActivities(supabase: any, run: any, booking: any) {
  const logs = run.logs_json;
  let currentIndex = logs.current_activity_index || 0;
  const compensationsNeeded: string[] = run.compensations_needed || [];

  for (let i = currentIndex; i < BOOKING_ACTIVITIES.length; i++) {
    const activity = BOOKING_ACTIVITIES[i];
    console.log(`[booking-workflow] Executing activity: ${activity.name} (${i + 1}/${BOOKING_ACTIVITIES.length})`);

    // Log step start
    await supabase.from('workflow_step_logs').insert({
      run_id: run.id,
      step_name: activity.name,
      step_type: activity.isAsync ? 'async_activity' : 'activity',
      started_at: new Date().toISOString(),
      input_json: { booking_id: booking.id, activity_index: i },
    });

    try {
      const result = await executeActivity(supabase, activity.name, booking, run);

      // Track compensation if activity has one
      if (activity.compensation) {
        compensationsNeeded.push(activity.compensation);
      }

      // Update run with progress
      await supabase.from('workflow_runs').update({
        logs_json: {
          ...logs,
          current_activity_index: i + 1,
          [`${activity.name}_result`]: result,
        },
        compensations_needed: compensationsNeeded,
      }).eq('id', run.id);

      // Log step completion
      await supabase.from('workflow_step_logs').update({
        finished_at: new Date().toISOString(),
        output_json: result,
        status: 'completed',
      }).eq('run_id', run.id).eq('step_name', activity.name);

      // If async activity, pause and wait for signal
      if (activity.isAsync) {
        await supabase.from('workflow_runs').update({
          status: 'awaiting_signal',
          awaiting_signal: activity.signalType,
        }).eq('id', run.id);

        return {
          status: 'awaiting_signal',
          run_id: run.id,
          awaiting: activity.signalType,
          message: `Workflow paused waiting for ${activity.signalType}`,
        };
      }
    } catch (error: any) {
      console.error(`[booking-workflow] Activity ${activity.name} failed:`, error);

      // Log failure
      await supabase.from('workflow_step_logs').update({
        finished_at: new Date().toISOString(),
        error_message: error.message,
        status: 'failed',
      }).eq('run_id', run.id).eq('step_name', activity.name);

      // Check if we should retry
      const retryCount = run.retry_count || 0;
      if (retryCount < run.max_retries) {
        const delay = calculateRetryDelay(retryCount, run.retry_policy);
        await supabase.from('workflow_runs').update({
          status: 'retrying',
          retry_count: retryCount + 1,
          next_retry_at: new Date(Date.now() + delay).toISOString(),
          logs_json: {
            ...logs,
            current_activity_index: i,
            last_error: error.message,
          },
        }).eq('id', run.id);

        return {
          status: 'retrying',
          run_id: run.id,
          retry_count: retryCount + 1,
          next_retry_at: new Date(Date.now() + delay).toISOString(),
        };
      }

      // Max retries exceeded - run compensation and move to dead letter
      await supabase.from('workflow_runs').update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        logs_json: {
          ...logs,
          final_error: error.message,
          failed_at_activity: activity.name,
        },
      }).eq('id', run.id);

      // Add to dead letter queue
      await supabase.from('workflow_dead_letters').insert({
        run_id: run.id,
        workflow_id: run.workflow_id,
        workspace_id: run.workspace_id,
        workflow_name: 'booking_flow',
        failure_reason: `Activity ${activity.name} failed after ${run.max_retries} retries`,
        last_error: error.message,
        context: { booking_id: booking.id, failed_activity: activity.name },
      });

      // Trigger compensation
      if (compensationsNeeded.length > 0) {
        await runCompensationActivities(supabase, run.id, compensationsNeeded, booking);
      }

      return {
        status: 'failed',
        run_id: run.id,
        error: error.message,
        compensations_run: compensationsNeeded,
      };
    }
  }

  // All activities completed successfully
  await supabase.from('workflow_runs').update({
    status: 'completed',
    finished_at: new Date().toISOString(),
  }).eq('id', run.id);

  // Update booking status
  await supabase.from('bookings').update({
    status: 'confirmed',
  }).eq('id', booking.id);

  return {
    status: 'completed',
    run_id: run.id,
    message: 'Booking workflow completed successfully',
  };
}

async function executeActivity(supabase: any, activityName: string, booking: any, run: any): Promise<any> {
  switch (activityName) {
    case 'validate_booking':
      return validateBooking(booking);

    case 'calculate_pricing':
      return calculatePricing(supabase, booking);

    case 'create_payment_intent':
      return createPaymentIntent(supabase, booking, run);

    case 'await_payment':
      // This is handled by signal - just return current state
      return { awaiting: true };

    case 'reserve_calendar':
      return reserveCalendar(supabase, booking);

    case 'create_appointment':
      return createAppointment(supabase, booking, run);

    case 'send_confirmation':
      return sendConfirmation(supabase, booking);

    case 'schedule_reminders':
      return scheduleReminders(supabase, booking);

    default:
      throw new Error(`Unknown activity: ${activityName}`);
  }
}

// Activity implementations
function validateBooking(booking: any) {
  const errors = [];

  if (!booking.client_name) errors.push('Client name is required');
  if (!booking.client_email) errors.push('Client email is required');
  if (!booking.artist_id) errors.push('Artist is required');

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return { valid: true, booking_id: booking.id };
}

async function calculatePricing(supabase: any, booking: any) {
  // Get artist pricing model
  const { data: pricing } = await supabase
    .from('artist_pricing_models')
    .select('*')
    .eq('artist_id', booking.artist_id)
    .eq('is_default', true)
    .single();

  const estimatedHours = booking.estimated_duration_minutes ? booking.estimated_duration_minutes / 60 : 2;
  const hourlyRate = pricing?.rate_amount || 150;
  const depositPercentage = pricing?.deposit_percentage || 20;

  const totalEstimate = estimatedHours * hourlyRate;
  const depositAmount = totalEstimate * (depositPercentage / 100);

  // Update booking with pricing
  await supabase.from('bookings').update({
    deposit_amount: depositAmount,
    estimated_total: totalEstimate,
  }).eq('id', booking.id);

  return {
    hourly_rate: hourlyRate,
    estimated_hours: estimatedHours,
    total_estimate: totalEstimate,
    deposit_amount: depositAmount,
  };
}

async function createPaymentIntent(supabase: any, booking: any, run: any) {
  // Get fresh booking data with deposit amount
  const { data: freshBooking } = await supabase
    .from('bookings')
    .select('deposit_amount')
    .eq('id', booking.id)
    .single();

  const depositAmount = freshBooking?.deposit_amount || booking.deposit_amount || 50;

  // Store payment intent info (actual Stripe integration would go here)
  const paymentIntentId = `pi_workflow_${run.id.slice(0, 8)}`;

  await supabase.from('bookings').update({
    payment_intent_id: paymentIntentId,
    payment_status: 'pending',
  }).eq('id', booking.id);

  console.log(`[booking-workflow] Created payment intent: ${paymentIntentId} for $${depositAmount}`);

  return {
    payment_intent_id: paymentIntentId,
    amount: depositAmount,
    status: 'pending',
  };
}

async function reserveCalendar(supabase: any, booking: any) {
  // Check for conflicts
  if (booking.proposed_datetime) {
    const proposedDate = new Date(booking.proposed_datetime);
    const endDate = new Date(proposedDate.getTime() + (booking.estimated_duration_minutes || 120) * 60000);

    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('artist_profile_id', booking.artist_id)
      .gte('start_at', proposedDate.toISOString())
      .lt('start_at', endDate.toISOString())
      .not('state', 'in', '("cancelled","no_show")');

    if (conflicts && conflicts.length > 0) {
      throw new Error('Calendar slot is no longer available');
    }
  }

  return { reserved: true, datetime: booking.proposed_datetime };
}

async function createAppointment(supabase: any, booking: any, run: any) {
  // Get artist profile
  const { data: artistProfile } = await supabase
    .from('artist_profiles')
    .select('id')
    .eq('user_id', booking.artist_id)
    .single();

  if (!artistProfile && !booking.artist_profile_id) {
    // Use artist_id directly if no profile
    console.log('[booking-workflow] No artist profile found, skipping appointment creation');
    return { skipped: true, reason: 'No artist profile' };
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      workspace_id: booking.workspace_id,
      artist_profile_id: artistProfile?.id || booking.artist_profile_id,
      request_id: booking.id,
      state: 'confirmed',
      deposit_status: 'paid',
      deposit_amount: booking.deposit_amount,
      deposit_paid_at: new Date().toISOString(),
      start_at: booking.proposed_datetime,
      duration_minutes: booking.estimated_duration_minutes || 120,
    })
    .select()
    .single();

  if (error) {
    console.error('[booking-workflow] Appointment creation error:', error);
    // Don't throw - appointment creation is optional
    return { created: false, error: error.message };
  }

  return { appointment_id: appointment.id, created: true };
}

async function sendConfirmation(supabase: any, booking: any) {
  // Queue confirmation notification
  await supabase.from('notification_queue').insert({
    workspace_id: booking.workspace_id,
    channel: 'email',
    template: 'booking_confirmed',
    recipient_email: booking.client_email,
    payload: {
      client_name: booking.client_name,
      booking_id: booking.id,
      artist_name: booking.studio_artists?.display_name,
      datetime: booking.proposed_datetime,
    },
    scheduled_for: new Date().toISOString(),
  });

  return { queued: true, channel: 'email' };
}

async function scheduleReminders(supabase: any, booking: any) {
  if (!booking.proposed_datetime) {
    return { skipped: true, reason: 'No datetime set' };
  }

  const appointmentDate = new Date(booking.proposed_datetime);
  const reminders = [
    { offset_hours: -24, template: 'reminder_24h' },
    { offset_hours: -2, template: 'reminder_2h' },
  ];

  for (const reminder of reminders) {
    const sendAt = new Date(appointmentDate.getTime() + reminder.offset_hours * 3600000);
    if (sendAt > new Date()) {
      await supabase.from('notification_queue').insert({
        workspace_id: booking.workspace_id,
        channel: 'email',
        template: reminder.template,
        recipient_email: booking.client_email,
        payload: { booking_id: booking.id, client_name: booking.client_name },
        scheduled_for: sendAt.toISOString(),
      });
    }
  }

  return { scheduled: reminders.length };
}

// Compensation activities
async function runCompensationActivities(supabase: any, runId: string, compensations: string[], booking: any) {
  console.log(`[booking-workflow] Running ${compensations.length} compensation activities`);

  for (const comp of compensations.reverse()) { // Run in reverse order
    try {
      await executeCompensation(supabase, comp, booking);
      await supabase.from('workflow_compensations').insert({
        run_id: runId,
        activity_name: comp,
        status: 'completed',
        executed_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`[booking-workflow] Compensation ${comp} failed:`, error);
      await supabase.from('workflow_compensations').insert({
        run_id: runId,
        activity_name: comp,
        status: 'failed',
        error_message: error.message,
        executed_at: new Date().toISOString(),
      });
    }
  }
}

async function executeCompensation(supabase: any, compName: string, booking: any) {
  switch (compName) {
    case 'cancel_payment_intent':
      await supabase.from('bookings').update({
        payment_status: 'cancelled',
      }).eq('id', booking.id);
      break;

    case 'release_calendar_slot':
      // Calendar slot is automatically released when appointment is cancelled
      break;

    case 'cancel_appointment':
      await supabase.from('appointments')
        .update({ state: 'cancelled' })
        .eq('request_id', booking.id);
      break;

    case 'send_cancellation_notice':
      await supabase.from('notification_queue').insert({
        workspace_id: booking.workspace_id,
        channel: 'email',
        template: 'booking_cancelled',
        recipient_email: booking.client_email,
        payload: { booking_id: booking.id, reason: 'Workflow failed' },
        scheduled_for: new Date().toISOString(),
      });
      break;

    case 'cancel_reminders':
      await supabase.from('notification_queue')
        .delete()
        .eq('payload->>booking_id', booking.id)
        .gte('scheduled_for', new Date().toISOString());
      break;
  }
}

async function resumeWorkflow(supabase: any, runId: string, signalData: any) {
  const { data: run, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error || !run) {
    throw new Error(`Workflow run not found: ${runId}`);
  }

  if (run.status !== 'awaiting_signal') {
    throw new Error(`Workflow is not awaiting signal, current status: ${run.status}`);
  }

  // Get booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, studio_artists(display_name)')
    .eq('id', run.record_id)
    .single();

  // Update payment status if this is payment signal
  if (run.awaiting_signal === 'payment_completed') {
    await supabase.from('bookings').update({
      payment_status: 'paid',
      deposit_paid_at: new Date().toISOString(),
    }).eq('id', booking.id);
  }

  // Clear signal state and continue
  await supabase.from('workflow_runs').update({
    status: 'running',
    awaiting_signal: null,
    signal_data: signalData,
  }).eq('id', runId);

  // Continue execution from next activity
  return await executeActivities(supabase, { ...run, status: 'running' }, booking);
}

async function runCompensation(supabase: any, runId: string) {
  const { data: run } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (!run) throw new Error('Run not found');

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', run.record_id)
    .single();

  const compensations = run.compensations_needed || [];
  await runCompensationActivities(supabase, runId, compensations, booking);

  return { status: 'compensated', compensations_run: compensations };
}

async function getWorkflowStatus(supabase: any, identifier: string) {
  // Try by run_id first, then by booking_id
  let { data: run } = await supabase
    .from('workflow_runs')
    .select('*, workflow_step_logs(*)')
    .eq('id', identifier)
    .single();

  if (!run) {
    const { data: runs } = await supabase
      .from('workflow_runs')
      .select('*, workflow_step_logs(*)')
      .eq('record_id', identifier)
      .order('started_at', { ascending: false })
      .limit(1);

    run = runs?.[0];
  }

  if (!run) {
    throw new Error('Workflow not found');
  }

  return run;
}

function calculateRetryDelay(retryCount: number, policy: any): number {
  const initialDelay = policy?.initial_delay_ms || 2000;
  if (policy?.backoff === 'exponential') {
    return initialDelay * Math.pow(2, retryCount);
  }
  return initialDelay;
}
