// useSmartNotifications - Auto-create notifications based on EventBus events
import { useEffect, useRef } from 'react';
import { eventBus, EventType } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';

interface NotificationConfig {
  events: EventType[];
  userId: string;
  workspaceId?: string;
}

interface SmartNotificationRule {
  event: EventType;
  getNotification: (payload: any) => {
    type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
    title: string;
    message?: string;
    link?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  } | null;
}

const SMART_RULES: SmartNotificationRule[] = [
  {
    event: 'booking:created',
    getNotification: (p) => ({
      type: 'booking',
      title: 'New Booking Request',
      message: `From ${p.clientName || p.clientEmail}`,
      link: '/os/pipeline',
      priority: 'normal',
    }),
  },
  {
    event: 'booking:deposit_paid',
    getNotification: (p) => ({
      type: 'payment',
      title: 'Deposit Received',
      message: `$${p.amount} deposit confirmed`,
      link: '/os/pipeline',
      priority: 'high',
    }),
  },
  {
    event: 'escalation:created',
    getNotification: (p) => ({
      type: 'escalation',
      title: 'New Escalation',
      message: p.reason,
      link: '/os/pipeline?tab=escalations',
      priority: 'urgent',
    }),
  },
  {
    event: 'healing:photo_uploaded',
    getNotification: (p) => {
      if (p.aiScore && p.aiScore < 60) {
        return {
          type: 'alert',
          title: 'Healing Alert',
          message: `Low AI score: ${p.aiScore}. Needs attention.`,
          link: '/os/healing',
          priority: 'high',
        };
      }
      return null; // No notification for normal scores
    },
  },
  {
    event: 'message:escalated',
    getNotification: (p) => ({
      type: 'escalation',
      title: 'Message Escalated',
      message: `Priority: ${p.priority}`,
      link: '/os/inbox',
      priority: p.priority === 'urgent' ? 'urgent' : 'high',
    }),
  },
  {
    event: 'design:revision_requested',
    getNotification: () => ({
      type: 'booking',
      title: 'Design Revision Requested',
      message: 'Client requested changes',
      link: '/os/designs',
      priority: 'normal',
    }),
  },
  {
    event: 'calendar:conflict_detected',
    getNotification: () => ({
      type: 'alert',
      title: 'Calendar Conflict',
      message: 'Overlapping appointments detected',
      link: '/os/calendar',
      priority: 'high',
    }),
  },
  {
    event: 'payment:failed',
    getNotification: (p) => ({
      type: 'alert',
      title: 'Payment Failed',
      message: p.error?.substring(0, 50),
      link: '/os/finance',
      priority: 'urgent',
    }),
  },
];

export function useSmartNotifications(config: NotificationConfig) {
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const { events, userId } = configRef.current;
    if (!userId || events.length === 0) return;

    const unsubscribes = events.map((event) => {
      const rule = SMART_RULES.find((r) => r.event === event);
      if (!rule) return () => {};

      return eventBus.on(event, async (payload) => {
        const notification = rule.getNotification(payload);
        if (!notification) return;

        try {
          await supabase.from('notifications').insert([{
            user_id: userId,
            workspace_id: configRef.current.workspaceId,
            type: notification.type,
            title: notification.title,
            message: notification.message || '',
            link: notification.link || '',
            priority: notification.priority,
            metadata: { event, payload: JSON.parse(JSON.stringify(payload)) },
          }]);
        } catch (error) {
          console.error('[SmartNotifications] Error:', error);
        }
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);
}

// Utility to get available smart events
export function getSmartNotificationEvents(): EventType[] {
  return SMART_RULES.map((r) => r.event);
}
