// useAutoAudit - Automatic audit logging for important events
import { useEffect, useRef } from 'react';
import { eventBus, EventType } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';

interface AuditConfig {
  entityType: string;
  entityId?: string;
  userId?: string;
}

interface AuditableEvent {
  event: EventType;
  getAuditData: (payload: any) => {
    entityType: string;
    entityId: string;
    action: string;
    changes: Record<string, any>;
  };
}

const AUDITABLE_EVENTS: AuditableEvent[] = [
  {
    event: 'booking:created',
    getAuditData: (p) => ({
      entityType: 'booking',
      entityId: p.bookingId,
      action: 'created',
      changes: { clientEmail: p.clientEmail, clientName: p.clientName },
    }),
  },
  {
    event: 'booking:confirmed',
    getAuditData: (p) => ({
      entityType: 'booking',
      entityId: p.bookingId,
      action: 'confirmed',
      changes: { status: 'confirmed', appointmentDate: p.appointmentDate },
    }),
  },
  {
    event: 'booking:cancelled',
    getAuditData: (p) => ({
      entityType: 'booking',
      entityId: p.bookingId,
      action: 'cancelled',
      changes: { status: 'cancelled', reason: p.reason },
    }),
  },
  {
    event: 'booking:deposit_paid',
    getAuditData: (p) => ({
      entityType: 'booking',
      entityId: p.bookingId,
      action: 'deposit_paid',
      changes: { amount: p.amount },
    }),
  },
  {
    event: 'design:approved',
    getAuditData: (p) => ({
      entityType: 'design',
      entityId: p.designId,
      action: 'approved',
      changes: { bookingId: p.bookingId },
    }),
  },
  {
    event: 'design:rejected',
    getAuditData: (p) => ({
      entityType: 'design',
      entityId: p.designId,
      action: 'rejected',
      changes: { feedback: p.feedback },
    }),
  },
  {
    event: 'payment:received',
    getAuditData: (p) => ({
      entityType: 'payment',
      entityId: p.paymentId,
      action: 'received',
      changes: { amount: p.amount, bookingId: p.bookingId },
    }),
  },
  {
    event: 'payment:refunded',
    getAuditData: (p) => ({
      entityType: 'payment',
      entityId: p.paymentId,
      action: 'refunded',
      changes: { amount: p.amount, reason: p.reason },
    }),
  },
  {
    event: 'escalation:created',
    getAuditData: (p) => ({
      entityType: 'escalation',
      entityId: p.requestId,
      action: 'created',
      changes: { reason: p.reason, priority: p.priority },
    }),
  },
  {
    event: 'escalation:resolved',
    getAuditData: (p) => ({
      entityType: 'escalation',
      entityId: p.requestId,
      action: 'resolved',
      changes: { resolution: p.resolution },
    }),
  },
  {
    event: 'healing:started',
    getAuditData: (p) => ({
      entityType: 'healing',
      entityId: p.bookingId,
      action: 'started',
      changes: { clientEmail: p.clientEmail },
    }),
  },
  {
    event: 'healing:completed',
    getAuditData: (p) => ({
      entityType: 'healing',
      entityId: p.healingId,
      action: 'completed',
      changes: { certificateUrl: p.certificateUrl },
    }),
  },
];

async function logAuditEvent(
  auditData: {
    entityType: string;
    entityId: string;
    action: string;
    changes: Record<string, any>;
  },
  userId?: string
) {
  try {
    // Try booking_activities first if it's a booking
    if (auditData.entityType === 'booking') {
      await supabase.from('booking_activities').insert({
        booking_id: auditData.entityId,
        activity_type: auditData.action,
        description: `Booking ${auditData.action}`,
        metadata: auditData.changes,
        created_by: userId,
      });
    }

    // Also log to policy_audit_log for comprehensive tracking
    await supabase.from('policy_audit_log').insert({
      entity_type: auditData.entityType,
      entity_id: auditData.entityId,
      action: auditData.action,
      changes_diff: auditData.changes,
      changed_by: userId,
    });
  } catch (error) {
    console.error('[AutoAudit] Error logging event:', error);
  }
}

export function useAutoAudit(config?: AuditConfig) {
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const unsubscribes = AUDITABLE_EVENTS.map((auditable) => {
      return eventBus.on(auditable.event, async (payload) => {
        const auditData = auditable.getAuditData(payload);

        // Filter by entity if configured
        if (configRef.current?.entityType && auditData.entityType !== configRef.current.entityType) {
          return;
        }
        if (configRef.current?.entityId && auditData.entityId !== configRef.current.entityId) {
          return;
        }

        await logAuditEvent(auditData, configRef.current?.userId);
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);
}

// Get all auditable events
export function getAuditableEvents(): EventType[] {
  return AUDITABLE_EVENTS.map((a) => a.event);
}

// Manual audit log function
export async function createAuditEntry(
  entityType: string,
  entityId: string,
  action: string,
  changes: Record<string, any>,
  userId?: string
) {
  return logAuditEvent({ entityType, entityId, action, changes }, userId);
}
