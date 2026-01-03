// EventBridge - Hub Central de Comunicación Unificado
// Conecta EventBus, Notifications, Analytics, Audit Log, y Workflows

import { eventBus, EventType } from './eventBus';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent, trackFunnelStep } from './analytics';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Types
interface NotificationRule {
  event: EventType;
  title: (payload: any) => string;
  message?: (payload: any) => string;
  type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
  priority: NotificationPriority;
  link?: (payload: any) => string;
  targetRole?: 'admin' | 'artist' | 'all';
}

interface AuditRule {
  event: EventType;
  entityType: string;
  action: string;
  getEntityId: (payload: any) => string;
  getChanges: (payload: any) => Record<string, any>;
}

interface WorkflowTrigger {
  event: EventType;
  workflowName: string;
  condition?: (payload: any) => boolean;
  getInput: (payload: any) => Record<string, any>;
}

// ============= NOTIFICATION RULES =============
const NOTIFICATION_RULES: NotificationRule[] = [
  {
    event: 'booking:created',
    title: (p) => `New Booking Request`,
    message: (p) => `${p.clientName || p.clientEmail} submitted a booking request`,
    type: 'booking',
    priority: 'normal',
    link: () => '/os/pipeline',
    targetRole: 'admin',
  },
  {
    event: 'booking:deposit_paid',
    title: (p) => `Deposit Received`,
    message: (p) => `$${p.amount} deposit paid for booking`,
    type: 'payment',
    priority: 'high',
    link: () => '/os/pipeline',
    targetRole: 'admin',
  },
  {
    event: 'escalation:created',
    title: () => `Escalation Created`,
    message: (p) => `Priority: ${p.priority || 'normal'} - ${p.reason}`,
    type: 'escalation',
    priority: 'urgent',
    link: () => '/os/pipeline?tab=escalations',
    targetRole: 'admin',
  },
  {
    event: 'healing:photo_uploaded',
    title: () => `Healing Photo Received`,
    message: (p) => `AI Score: ${p.aiScore || 'Pending'}`,
    type: 'alert',
    priority: 'normal',
    link: () => '/os/healing',
    targetRole: 'artist',
  },
  {
    event: 'message:received',
    title: () => `New Message`,
    message: (p) => p.content?.substring(0, 50) + '...',
    type: 'message',
    priority: 'normal',
    link: () => '/os/inbox',
    targetRole: 'admin',
  },
  {
    event: 'design:approved',
    title: () => `Design Approved`,
    message: () => `Client approved the design`,
    type: 'booking',
    priority: 'high',
    link: (p) => `/os/pipeline?booking=${p.bookingId}`,
    targetRole: 'artist',
  },
  {
    event: 'payment:received',
    title: () => `Payment Received`,
    message: (p) => `$${p.amount} received`,
    type: 'payment',
    priority: 'high',
    link: () => '/os/finance',
    targetRole: 'admin',
  },
];

// ============= AUDIT RULES =============
const AUDIT_RULES: AuditRule[] = [
  {
    event: 'booking:confirmed',
    entityType: 'booking',
    action: 'confirmed',
    getEntityId: (p) => p.bookingId,
    getChanges: (p) => ({ status: 'confirmed', date: p.appointmentDate }),
  },
  {
    event: 'booking:cancelled',
    entityType: 'booking',
    action: 'cancelled',
    getEntityId: (p) => p.bookingId,
    getChanges: (p) => ({ status: 'cancelled', reason: p.reason }),
  },
  {
    event: 'design:approved',
    entityType: 'design',
    action: 'approved',
    getEntityId: (p) => p.designId,
    getChanges: () => ({ status: 'approved' }),
  },
  {
    event: 'design:rejected',
    entityType: 'design',
    action: 'rejected',
    getEntityId: (p) => p.designId,
    getChanges: (p) => ({ status: 'rejected', feedback: p.feedback }),
  },
  {
    event: 'payment:received',
    entityType: 'payment',
    action: 'received',
    getEntityId: (p) => p.paymentId,
    getChanges: (p) => ({ amount: p.amount, bookingId: p.bookingId }),
  },
  {
    event: 'escalation:resolved',
    entityType: 'escalation',
    action: 'resolved',
    getEntityId: (p) => p.requestId,
    getChanges: (p) => ({ resolution: p.resolution }),
  },
];

// ============= WORKFLOW TRIGGERS =============
const WORKFLOW_TRIGGERS: WorkflowTrigger[] = [
  {
    event: 'booking:created',
    workflowName: 'booking-follow-up',
    getInput: (p) => ({ bookingId: p.bookingId, clientEmail: p.clientEmail }),
  },
  {
    event: 'healing:started',
    workflowName: 'healing-reminders',
    getInput: (p) => ({ bookingId: p.bookingId, clientEmail: p.clientEmail }),
  },
  {
    event: 'escalation:created',
    workflowName: 'escalation-handler',
    condition: (p) => p.priority === 'urgent',
    getInput: (p) => ({ requestId: p.requestId, reason: p.reason }),
  },
];

// ============= ANALYTICS MAPPING =============
const ANALYTICS_EVENTS: Partial<Record<EventType, (payload: any) => void>> = {
  'booking:deposit_paid': (p) => {
    trackEvent('purchase', { value: p.amount, currency: 'USD', transaction_id: p.bookingId });
    trackFunnelStep('deposit_paid');
  },
  'design:approved': () => {
    trackEvent('design_approved');
    trackFunnelStep('design_approved');
  },
  'booking:session_completed': () => {
    trackEvent('session_complete');
    trackFunnelStep('session_complete');
  },
  'booking:created': (p) => {
    trackEvent('booking_created', { source: p.clientEmail });
    trackFunnelStep('form_complete');
  },
  'concierge:session_ended': (p) => {
    trackEvent('concierge_session', { outcome: p.outcome });
  },
};

// ============= BRIDGE STATE =============
interface BridgeState {
  initialized: boolean;
  notificationsSent: number;
  auditsLogged: number;
  workflowsTriggered: number;
  analyticsTracked: number;
  lastActivity: Date | null;
}

const bridgeState: BridgeState = {
  initialized: false,
  notificationsSent: 0,
  auditsLogged: 0,
  workflowsTriggered: 0,
  analyticsTracked: 0,
  lastActivity: null,
};

// ============= CORE FUNCTIONS =============

async function createNotificationForEvent(
  rule: NotificationRule,
  payload: Record<string, unknown>,
  userId?: string
): Promise<void> {
  // If userId provided, create notification for that user
  if (userId) {
    await createSingleNotification(rule, payload, userId);
  }
  // Otherwise, this will be handled by the calling code which should provide userId
}

async function createSingleNotification(
  rule: NotificationRule,
  payload: Record<string, unknown>,
  userId: string
): Promise<void> {
  try {
    const priority = rule.priority;
    
    await supabase.from('notifications').insert([{
      user_id: userId,
      type: rule.type,
      title: rule.title(payload),
      message: rule.message?.(payload) || '',
      link: rule.link?.(payload) || '',
      priority,
      metadata: { event: rule.event, payload: JSON.parse(JSON.stringify(payload)) },
    }]);
    
    bridgeState.notificationsSent++;
    bridgeState.lastActivity = new Date();
  } catch (error) {
    console.error('[EventBridge] Notification error:', error);
  }
}

async function logAuditForEvent(rule: AuditRule, payload: any): Promise<void> {
  try {
    await supabase.from('booking_activities').insert({
      booking_id: rule.entityType === 'booking' ? rule.getEntityId(payload) : null,
      activity_type: rule.action,
      description: `${rule.entityType} ${rule.action}`,
      metadata: rule.getChanges(payload),
    });
    
    bridgeState.auditsLogged++;
    bridgeState.lastActivity = new Date();
  } catch (error) {
    console.error('[EventBridge] Audit log error:', error);
  }
}

async function triggerWorkflowForEvent(trigger: WorkflowTrigger, payload: any): Promise<void> {
  if (trigger.condition && !trigger.condition(payload)) return;
  
  try {
    const { error } = await supabase.functions.invoke('workflow-executor', {
      body: {
        workflowName: trigger.workflowName,
        input: trigger.getInput(payload),
        triggeredBy: 'eventbridge',
      },
    });
    
    if (!error) {
      bridgeState.workflowsTriggered++;
      bridgeState.lastActivity = new Date();
    }
  } catch (error) {
    console.error('[EventBridge] Workflow trigger error:', error);
  }
}

function trackAnalyticsForEvent(event: EventType, payload: Record<string, unknown>): void {
  const tracker = ANALYTICS_EVENTS[event as keyof typeof ANALYTICS_EVENTS];
  if (tracker) {
    try {
      tracker(payload);
      bridgeState.analyticsTracked++;
      bridgeState.lastActivity = new Date();
    } catch (error) {
      console.error('[EventBridge] Analytics error:', error);
    }
  }
}

// ============= INITIALIZATION =============

export function initializeEventBridge(): () => void {
  if (bridgeState.initialized) {
    console.log('[EventBridge] Already initialized');
    return () => {};
  }
  
  console.log('[EventBridge] Initializing unified communication hub...');
  const unsubscribes: (() => void)[] = [];
  
  // Subscribe to all notification rules
  NOTIFICATION_RULES.forEach((rule) => {
    const unsub = eventBus.on(rule.event, (payload: Record<string, unknown>) => {
      createNotificationForEvent(rule, payload);
    });
    unsubscribes.push(unsub);
  });
  
  // Subscribe to all audit rules
  AUDIT_RULES.forEach((rule) => {
    const unsub = eventBus.on(rule.event, (payload: Record<string, unknown>) => {
      logAuditForEvent(rule, payload);
    });
    unsubscribes.push(unsub);
  });
  
  // Subscribe to all workflow triggers
  WORKFLOW_TRIGGERS.forEach((trigger) => {
    const unsub = eventBus.on(trigger.event, (payload: Record<string, unknown>) => {
      triggerWorkflowForEvent(trigger, payload);
    });
    unsubscribes.push(unsub);
  });
  
  // Subscribe to analytics events
  (Object.keys(ANALYTICS_EVENTS) as EventType[]).forEach((event) => {
    const unsub = eventBus.on(event, (payload: Record<string, unknown>) => {
      trackAnalyticsForEvent(event, payload);
    });
    unsubscribes.push(unsub);
  });
  
  bridgeState.initialized = true;
  console.log('[EventBridge] ✅ Initialized with', 
    NOTIFICATION_RULES.length, 'notification rules,',
    AUDIT_RULES.length, 'audit rules,',
    WORKFLOW_TRIGGERS.length, 'workflow triggers,',
    Object.keys(ANALYTICS_EVENTS).length, 'analytics mappings'
  );
  
  return () => {
    unsubscribes.forEach(unsub => unsub());
    bridgeState.initialized = false;
    console.log('[EventBridge] Cleanup complete');
  };
}

// ============= PUBLIC API =============

export function getBridgeState(): BridgeState {
  return { ...bridgeState };
}

export function getBridgeStats() {
  return {
    notificationRules: NOTIFICATION_RULES.length,
    auditRules: AUDIT_RULES.length,
    workflowTriggers: WORKFLOW_TRIGGERS.length,
    analyticsEvents: Object.keys(ANALYTICS_EVENTS).length,
    ...bridgeState,
  };
}

// Manual notification creation
export async function createManualNotification(params: {
  userId: string;
  type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
  title: string;
  message?: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    priority: params.priority || 'normal',
  });
  
  if (!error) {
    bridgeState.notificationsSent++;
  }
  
  return { error };
}

// Export types
export type { NotificationRule, AuditRule, WorkflowTrigger, BridgeState };
