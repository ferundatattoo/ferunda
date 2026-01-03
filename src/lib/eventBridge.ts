// EventBridge - Hub Central de Comunicación Unificado
// Phase 4: Now with workspace context and notifications-dispatcher integration
// Connects EventBus, Notifications, Analytics, Audit Log, and Workflows

import { eventBus, EventType } from './eventBus';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent, trackFunnelStep } from './analytics';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
type TargetRole = 'studio' | 'artist' | 'assistant' | 'all';

// Types
interface NotificationRule {
  event: EventType;
  title: (payload: any) => string;
  message?: (payload: any) => string;
  type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
  priority: NotificationPriority;
  link?: (payload: any) => string;
  targetRole: TargetRole;
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

// Phase 4: Bridge context for workspace-aware notifications
interface BridgeContext {
  workspaceId: string | null;
  currentUserId: string | null;
}

let bridgeContext: BridgeContext = {
  workspaceId: null,
  currentUserId: null,
};

// ============= NOTIFICATION RULES =============
const NOTIFICATION_RULES: NotificationRule[] = [
  {
    event: 'booking:created',
    title: (p) => `Nueva Solicitud de Booking`,
    message: (p) => `${p.clientName || p.clientEmail} envió una solicitud`,
    type: 'booking',
    priority: 'normal',
    link: () => '/studio/pipeline',
    targetRole: 'studio',
  },
  {
    event: 'booking:deposit_paid',
    title: () => `Depósito Recibido`,
    message: (p) => `$${p.amount} pagado para booking`,
    type: 'payment',
    priority: 'high',
    link: () => '/studio/pipeline',
    targetRole: 'studio',
  },
  {
    event: 'escalation:created',
    title: () => `Escalación Creada`,
    message: (p) => `Prioridad: ${p.priority || 'normal'} - ${p.reason}`,
    type: 'escalation',
    priority: 'urgent',
    link: () => '/studio/pipeline?tab=escalations',
    targetRole: 'studio',
  },
  {
    event: 'healing:photo_uploaded',
    title: () => `Foto de Healing Recibida`,
    message: (p) => `AI Score: ${p.aiScore || 'Pendiente'}`,
    type: 'alert',
    priority: 'normal',
    link: () => '/artist/healing',
    targetRole: 'artist',
  },
  {
    event: 'message:received',
    title: () => `Nuevo Mensaje`,
    message: (p) => p.content?.substring(0, 50) + '...',
    type: 'message',
    priority: 'normal',
    link: () => '/studio/inbox',
    targetRole: 'studio',
  },
  {
    event: 'design:approved',
    title: () => `Diseño Aprobado`,
    message: () => `El cliente aprobó el diseño`,
    type: 'booking',
    priority: 'high',
    link: (p) => `/artist/pipeline?booking=${p.bookingId}`,
    targetRole: 'artist',
  },
  {
    event: 'payment:received',
    title: () => `Pago Recibido`,
    message: (p) => `$${p.amount} recibido`,
    type: 'payment',
    priority: 'high',
    link: () => '/studio/finance',
    targetRole: 'studio',
  },
  {
    event: 'booking:scheduled',
    title: () => `Cita Programada`,
    message: (p) => `Nueva cita para ${p.date}`,
    type: 'booking',
    priority: 'normal',
    link: () => '/artist/calendar',
    targetRole: 'artist',
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
  lastError: string | null;
}

const bridgeState: BridgeState = {
  initialized: false,
  notificationsSent: 0,
  auditsLogged: 0,
  workflowsTriggered: 0,
  analyticsTracked: 0,
  lastActivity: null,
  lastError: null,
};

// ============= CORE FUNCTIONS =============

// Phase 4: Use notifications-dispatcher edge function
async function dispatchNotification(
  rule: NotificationRule,
  payload: Record<string, unknown>
): Promise<void> {
  if (!bridgeContext.workspaceId) {
    console.warn('[EventBridge] No workspace context - skipping notification dispatch');
    return;
  }

  try {
    const { error } = await supabase.functions.invoke('notifications-dispatcher', {
      body: {
        workspaceId: bridgeContext.workspaceId,
        eventType: rule.event,
        title: rule.title(payload),
        message: rule.message?.(payload) || '',
        type: rule.type,
        priority: rule.priority,
        link: rule.link?.(payload) || '',
        targetRole: rule.targetRole,
        payload,
      },
    });

    if (error) {
      console.error('[EventBridge] Notification dispatch error:', error);
      bridgeState.lastError = `Notification: ${error.message}`;
    } else {
      bridgeState.notificationsSent++;
      bridgeState.lastActivity = new Date();
      console.log(`[EventBridge] ✅ Notification dispatched for ${rule.event}`);
    }
  } catch (error) {
    console.error('[EventBridge] Notification error:', error);
    bridgeState.lastError = String(error);
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
    bridgeState.lastError = `Audit: ${String(error)}`;
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
        workspaceId: bridgeContext.workspaceId,
      },
    });
    
    if (!error) {
      bridgeState.workflowsTriggered++;
      bridgeState.lastActivity = new Date();
    } else {
      bridgeState.lastError = `Workflow: ${error.message}`;
    }
  } catch (error) {
    console.error('[EventBridge] Workflow trigger error:', error);
    bridgeState.lastError = `Workflow: ${String(error)}`;
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

// Phase 4: Accept context parameter for workspace-aware operation
export function initializeEventBridge(context?: { workspaceId: string | null; currentUserId: string | null }): () => void {
  if (bridgeState.initialized) {
    // Update context if provided
    if (context) {
      bridgeContext = context;
      console.log('[EventBridge] Context updated:', context.workspaceId);
    }
    return () => {};
  }
  
  // Store context
  if (context) {
    bridgeContext = context;
  }
  
  console.log('[EventBridge] Initializing unified communication hub...');
  console.log('[EventBridge] Workspace context:', bridgeContext.workspaceId);
  
  const unsubscribes: (() => void)[] = [];
  
  // Subscribe to all notification rules - now uses dispatcher
  NOTIFICATION_RULES.forEach((rule) => {
    const unsub = eventBus.on(rule.event, (payload: Record<string, unknown>) => {
      dispatchNotification(rule, payload);
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

// Update context without reinitializing
export function updateBridgeContext(context: { workspaceId: string | null; currentUserId: string | null }): void {
  bridgeContext = context;
  console.log('[EventBridge] Context updated:', context.workspaceId);
}

// ============= PUBLIC API =============

export function getBridgeState(): BridgeState {
  return { ...bridgeState };
}

export function getBridgeContext(): BridgeContext {
  return { ...bridgeContext };
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

// Manual notification creation via dispatcher
export async function createManualNotification(params: {
  workspaceId: string;
  type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
  title: string;
  message?: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  targetRole?: TargetRole;
  specificUserIds?: string[];
}) {
  const { error } = await supabase.functions.invoke('notifications-dispatcher', {
    body: {
      workspaceId: params.workspaceId,
      eventType: 'manual',
      title: params.title,
      message: params.message || '',
      type: params.type,
      priority: params.priority || 'normal',
      link: params.link || '',
      targetRole: params.targetRole || 'all',
      specificUserIds: params.specificUserIds,
    },
  });
  
  if (!error) {
    bridgeState.notificationsSent++;
  }
  
  return { error };
}

// Direct notification to specific user (bypasses dispatcher for simplicity)
export async function notifyUser(userId: string, params: {
  type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
  title: string;
  message?: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
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
export type { NotificationRule, AuditRule, WorkflowTrigger, BridgeState, BridgeContext };
