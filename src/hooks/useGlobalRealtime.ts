// Global Realtime Manager - Unified subscription for all modules
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/lib/eventBus';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type GlobalRealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// All tables that should have realtime enabled
const REALTIME_TABLES = [
  'bookings',
  'booking_requests',
  'client_profiles',
  'chat_conversations',
  'concierge_sessions',
  'concierge_messages',
  'customer_messages',
  'notifications',
  'healing_progress',
  'email_campaigns',
  'deposit_transactions',
  'customer_payments',
  'ai_avatar_videos',
  'agent_learning_data',
  // Added for full system integration
  'workflow_runs',
  'ai_scheduling_suggestions',
  'design_revisions',
  'booking_activities',
  'escalation_events',
] as const;

type RealtimeTable = typeof REALTIME_TABLES[number];

interface GlobalRealtimeState {
  status: GlobalRealtimeStatus;
  connectedTables: RealtimeTable[];
  lastEventAt: Date | null;
  eventCount: number;
  provider: 'grok' | 'lovable' | 'none';
}

// Singleton manager for global realtime
let globalChannel: RealtimeChannel | null = null;
let globalStatus: GlobalRealtimeStatus = 'disconnected';
const listeners = new Set<(state: GlobalRealtimeState) => void>();

function notifyListeners(state: GlobalRealtimeState) {
  listeners.forEach(listener => listener(state));
}

function emitEventForTable(table: RealtimeTable, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
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
        if (record.status === 'confirmed') {
          eventBus.emit('booking:confirmed', { bookingId: record.id, appointmentDate: record.scheduled_date });
        } else if (record.status === 'cancelled') {
          eventBus.emit('booking:cancelled', { bookingId: record.id });
        }
        if (record.deposit_paid && !payload.old?.deposit_paid) {
          eventBus.emit('booking:deposit_paid', { bookingId: record.id, amount: record.deposit_amount || 0 });
        }
      }
      break;

    case 'client_profiles':
      if (eventType === 'INSERT') {
        eventBus.emit('client:created', { clientId: record.id, email: record.email, source: record.source });
      } else if (eventType === 'UPDATE') {
        eventBus.emit('client:updated', { clientId: record.id, changes: record });
      }
      break;

    case 'concierge_sessions':
      if (eventType === 'INSERT') {
        eventBus.emit('concierge:session_started', { sessionId: record.id, clientEmail: record.client_email });
      } else if (eventType === 'UPDATE' && record.status === 'completed') {
        eventBus.emit('concierge:session_ended', { sessionId: record.id, outcome: record.outcome || 'completed' });
      }
      break;

    case 'concierge_messages':
    case 'customer_messages':
      if (eventType === 'INSERT') {
        eventBus.emit('message:received', {
          conversationId: record.session_id || record.booking_id,
          channel: table === 'concierge_messages' ? 'concierge' : 'portal',
          content: record.content || record.message,
        });
      }
      break;

    case 'healing_progress':
      if (eventType === 'INSERT') {
        eventBus.emit('healing:started', { bookingId: record.booking_id, clientEmail: '' });
      } else if (eventType === 'UPDATE' && record.photo_url) {
        eventBus.emit('healing:photo_uploaded', {
          healingId: record.id,
          photoUrl: record.photo_url,
          aiScore: record.ai_health_score,
        });
      }
      break;

    case 'email_campaigns':
      if (eventType === 'UPDATE' && record.status === 'sent') {
        eventBus.emit('campaign:sent', { campaignId: record.id, recipientCount: record.recipient_count || 0 });
      }
      break;

    case 'deposit_transactions':
    case 'customer_payments':
      if (eventType === 'INSERT' && record.status === 'completed') {
        eventBus.emit('payment:received', {
          paymentId: record.id,
          amount: record.amount,
          bookingId: record.booking_id,
        });
      }
      break;

    case 'ai_avatar_videos':
      if (eventType === 'UPDATE' && record.status === 'completed') {
        eventBus.emit('avatar:video_generated', {
          videoId: record.id,
          avatarId: record.avatar_clone_id,
          duration: record.duration_seconds || 0,
        });
      }
      break;

    case 'agent_learning_data':
      if (eventType === 'INSERT') {
        eventBus.emit('agent:learning_updated', {
          interactionCount: 1,
          accuracy: record.feedback_score || 0,
        });
      }
      break;

    case 'workflow_runs':
      if (eventType === 'UPDATE') {
        if (record.status === 'completed') {
          console.log('[GlobalRealtime] Workflow completed:', record.id);
        } else if (record.status === 'failed') {
          console.log('[GlobalRealtime] Workflow failed:', record.id);
        }
      }
      break;

    case 'ai_scheduling_suggestions':
      if (eventType === 'INSERT') {
        eventBus.emit('calendar:conflict_detected', {
          eventId: record.id,
          conflictWith: record.conflicts?.[0] || 'unknown',
        });
      }
      break;
  }
}

// Connection timeout to prevent infinite "Connecting..." state
const CONNECTION_TIMEOUT_MS = 10000;

export function initializeGlobalRealtime(): () => void {
  if (globalChannel) {
    console.log('[GlobalRealtime] Already initialized');
    return () => {};
  }

  console.log('[GlobalRealtime] Initializing subscriptions for', REALTIME_TABLES.length, 'tables');
  globalStatus = 'connecting';
  
  const channel = supabase.channel('global-realtime-sync');
  let eventCount = 0;
  let lastEventAt: Date | null = null;
  let connectionTimedOut = false;

  // Set timeout to fallback to offline mode if connection takes too long
  const connectionTimeout = setTimeout(() => {
    if (globalStatus === 'connecting') {
      console.warn('[GlobalRealtime] ⚠️ Connection timeout, switching to offline mode');
      connectionTimedOut = true;
      globalStatus = 'disconnected';
      notifyListeners({
        status: globalStatus,
        connectedTables: [],
        lastEventAt,
        eventCount,
        provider: 'none',
      });
    }
  }, CONNECTION_TIMEOUT_MS);

  REALTIME_TABLES.forEach((table) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        eventCount++;
        lastEventAt = new Date();
        
        const newRecord = payload.new as Record<string, any> | null;
        const oldRecord = payload.old as Record<string, any> | null;
        console.log(`[GlobalRealtime] ${payload.eventType} on ${table}:`, newRecord?.id || oldRecord?.id);
        emitEventForTable(table, payload.eventType as any, payload);
        
        notifyListeners({
          status: globalStatus,
          connectedTables: [...REALTIME_TABLES],
          lastEventAt,
          eventCount,
          provider: 'grok',
        });
      }
    );
  });

  channel.subscribe((status) => {
    clearTimeout(connectionTimeout);
    
    if (status === 'SUBSCRIBED') {
      console.log('[GlobalRealtime] ✅ Connected to all tables');
      globalStatus = 'connected';
    } else if (status === 'CHANNEL_ERROR') {
      // Graceful fallback - don't show error, just offline mode
      console.warn('[GlobalRealtime] ⚠️ Realtime unavailable, using offline mode');
      globalStatus = 'disconnected';
    } else if (status === 'CLOSED') {
      globalStatus = 'disconnected';
    } else if (status === 'TIMED_OUT') {
      console.warn('[GlobalRealtime] ⚠️ Connection timed out, using offline mode');
      globalStatus = 'disconnected';
    }
    
    notifyListeners({
      status: globalStatus,
      connectedTables: globalStatus === 'connected' ? [...REALTIME_TABLES] : [],
      lastEventAt,
      eventCount,
      provider: globalStatus === 'connected' ? 'grok' : 'none',
    });
  });

  globalChannel = channel;

  return () => {
    clearTimeout(connectionTimeout);
    if (globalChannel) {
      supabase.removeChannel(globalChannel);
      globalChannel = null;
      globalStatus = 'disconnected';
    }
  };
}

// Manual reconnection function
export function reconnectGlobalRealtime(): void {
  if (globalChannel) {
    supabase.removeChannel(globalChannel);
    globalChannel = null;
  }
  globalStatus = 'disconnected';
  initializeGlobalRealtime();
}

export function useGlobalRealtime(): GlobalRealtimeState {
  const [state, setState] = useState<GlobalRealtimeState>({
    status: globalStatus,
    connectedTables: globalChannel ? [...REALTIME_TABLES] : [],
    lastEventAt: null,
    eventCount: 0,
    provider: 'grok',
  });

  useEffect(() => {
    const cleanup = initializeGlobalRealtime();
    
    const listener = (newState: GlobalRealtimeState) => setState(newState);
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        cleanup();
      }
    };
  }, []);

  return state;
}

// Hook for specific module realtime with auto-refresh
export function useModuleRealtime(
  module: 'inbox' | 'finance' | 'marketing' | 'calendar' | 'healing' | 'concierge',
  onUpdate: () => void
) {
  const realtimeState = useGlobalRealtime();
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const moduleEventMap: Record<string, string[]> = {
      inbox: ['message:received', 'message:sent', 'concierge:session_started'],
      finance: ['payment:received', 'booking:deposit_paid'],
      marketing: ['campaign:sent', 'marketing:trend_detected'],
      calendar: ['booking:scheduled', 'booking:rescheduled', 'availability:updated'],
      healing: ['healing:started', 'healing:photo_uploaded', 'healing:completed'],
      concierge: ['concierge:session_started', 'concierge:session_ended', 'message:received'],
    };

    const events = moduleEventMap[module] || [];
    const unsubscribes = events.map(event => 
      eventBus.on(event as any, () => onUpdateRef.current())
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [module]);

  return realtimeState;
}
