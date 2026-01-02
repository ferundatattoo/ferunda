import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/lib/eventBus';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 
  | 'bookings' 
  | 'chat_conversations' 
  | 'booking_requests' 
  | 'client_profiles' 
  | 'healing_progress' 
  | 'customer_messages'
  | 'notifications'
  | 'concierge_sessions'
  | 'concierge_messages'
  | 'email_campaigns'
  | 'deposit_transactions'
  | 'customer_payments';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRealtimeOptions {
  tables: TableName[];
  onInsert?: (table: TableName, payload: any) => void;
  onUpdate?: (table: TableName, payload: any) => void;
  onDelete?: (table: TableName, payload: any) => void;
  enabled?: boolean;
  filter?: string;
}

// Map database changes to EventBus events
function emitEventForChange(table: TableName, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
  const record = payload.new || payload.old;
  
  switch (table) {
    case 'bookings':
      if (eventType === 'INSERT') {
        eventBus.emit('booking:created', {
          bookingId: record.id,
          clientEmail: record.email,
          clientName: record.name,
        });
      } else if (eventType === 'UPDATE') {
        const oldRecord = payload.old;
        const newRecord = payload.new;
        
        // Check for status changes
        if (oldRecord?.status !== newRecord?.status) {
          if (newRecord.status === 'confirmed') {
            eventBus.emit('booking:confirmed', {
              bookingId: newRecord.id,
              appointmentDate: newRecord.scheduled_date,
            });
          } else if (newRecord.status === 'cancelled') {
            eventBus.emit('booking:cancelled', {
              bookingId: newRecord.id,
            });
          } else if (newRecord.status === 'completed') {
            eventBus.emit('booking:session_completed', {
              bookingId: newRecord.id,
              artistId: newRecord.artist_id,
            });
          }
        }
        
        // Check for deposit payment
        if (!oldRecord?.deposit_paid && newRecord?.deposit_paid) {
          eventBus.emit('booking:deposit_paid', {
            bookingId: newRecord.id,
            amount: newRecord.deposit_amount || 0,
          });
        }
      }
      break;
      
    case 'client_profiles':
      if (eventType === 'INSERT') {
        eventBus.emit('client:created', {
          clientId: record.id,
          email: record.email,
          source: record.source,
        });
      } else if (eventType === 'UPDATE') {
        eventBus.emit('client:updated', {
          clientId: record.id,
          changes: payload.new,
        });
      }
      break;
      
    case 'healing_progress':
      if (eventType === 'INSERT') {
        eventBus.emit('healing:started', {
          bookingId: record.booking_id,
          clientEmail: '',
        });
      } else if (eventType === 'UPDATE' && record.photo_url) {
        eventBus.emit('healing:photo_uploaded', {
          healingId: record.id,
          photoUrl: record.photo_url,
          aiScore: record.ai_health_score,
        });
      }
      break;
      
    case 'customer_messages':
      if (eventType === 'INSERT') {
        if (record.sender_type === 'customer') {
          eventBus.emit('message:received', {
            conversationId: record.booking_id,
            channel: 'portal',
            content: record.content,
          });
        } else {
          eventBus.emit('message:sent', {
            conversationId: record.booking_id,
            channel: 'portal',
            content: record.content,
          });
        }
      }
      break;
      
    case 'booking_requests':
      if (eventType === 'UPDATE' && record.status === 'escalated') {
        eventBus.emit('escalation:created', {
          requestId: record.id,
          reason: record.urgency || 'Manual escalation',
          priority: record.urgency,
        });
      }
      break;
  }
}

interface UseRealtimeReturn {
  channel: RealtimeChannel | null;
  status: RealtimeConnectionStatus;
}

export function useRealtimeSubscription(options: UseRealtimeOptions): UseRealtimeReturn {
  const { tables, onInsert, onUpdate, onDelete, enabled = true, filter } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting');

  useEffect(() => {
    if (!enabled || tables.length === 0) {
      setStatus('disconnected');
      return;
    }

    const channelName = `realtime-sync-${tables.join('-')}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      const config: any = {
        event: '*',
        schema: 'public',
        table,
      };
      
      if (filter) {
        config.filter = filter;
      }

      channel.on(
        'postgres_changes',
        config,
        (payload: RealtimePostgresChangesPayload<any>) => {
          const eventType = payload.eventType;
          
          // Emit to EventBus
          emitEventForChange(table as any, eventType, payload);
          
          // Call callbacks
          if (eventType === 'INSERT' && onInsert) {
            onInsert(table, payload.new);
          } else if (eventType === 'UPDATE' && onUpdate) {
            onUpdate(table, payload.new);
          } else if (eventType === 'DELETE' && onDelete) {
            onDelete(table, payload.old);
          }
        }
      );
    });

    channel.subscribe((subscribeStatus) => {
      if (subscribeStatus === 'SUBSCRIBED') {
        console.log('[Realtime] Connected to tables:', tables.join(', '));
        setStatus('connected');
      } else if (subscribeStatus === 'CHANNEL_ERROR') {
        console.error('[Realtime] Connection error');
        setStatus('error');
      } else if (subscribeStatus === 'CLOSED') {
        setStatus('disconnected');
      } else {
        setStatus('connecting');
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tables.join(','), enabled, filter]);

  return { channel: channelRef.current, status };
}

// Convenience hook for dashboard
export function useDashboardRealtime(onUpdate: () => void) {
  return useRealtimeSubscription({
    tables: ['bookings', 'booking_requests', 'client_profiles', 'deposit_transactions'],
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
  });
}

// Convenience hook for inbox
export function useInboxRealtime(onMessage: (message: any) => void) {
  return useRealtimeSubscription({
    tables: ['customer_messages', 'chat_conversations', 'concierge_messages'],
    onInsert: (table, payload) => {
      if (table === 'customer_messages' || table === 'concierge_messages') {
        onMessage(payload);
      }
    },
  });
}

// Convenience hook for healing tracker
export function useHealingRealtime(onUpdate: () => void) {
  return useRealtimeSubscription({
    tables: ['healing_progress'],
    onInsert: onUpdate,
    onUpdate: onUpdate,
  });
}

// Convenience hook for finance
export function useFinanceRealtime(onUpdate: () => void) {
  return useRealtimeSubscription({
    tables: ['deposit_transactions', 'customer_payments'],
    onInsert: onUpdate,
    onUpdate: onUpdate,
  });
}

// Convenience hook for marketing
export function useMarketingRealtime(onUpdate: () => void) {
  return useRealtimeSubscription({
    tables: ['email_campaigns'],
    onInsert: onUpdate,
    onUpdate: onUpdate,
  });
}

// Convenience hook for concierge sessions
export function useConciergeRealtime(sessionId: string, onMessage: (message: any) => void) {
  return useRealtimeSubscription({
    tables: ['concierge_messages'],
    filter: `session_id=eq.${sessionId}`,
    onInsert: (table, payload) => {
      onMessage(payload);
    },
    enabled: !!sessionId,
  });
}
