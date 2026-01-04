// ============================================================================
// CORE BUS - Sistema Nervioso Central Ferunda (SINGLETON)
// Conexión bidireccional frontend ↔ backend via Realtime
// FIX: evitar loop de reconexión creando UN SOLO canal global.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus, EventType } from '@/lib/eventBus';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Core Bus event types (from backend + frontend)
export type CoreBusEventType =
  // Message events
  | 'bus:message_received'
  | 'bus:message_responded'
  // Image/Design events
  | 'bus:image_uploaded'
  | 'bus:image_analyzed'
  | 'bus:design_created'
  | 'bus:design_approved'
  // Booking events
  | 'bus:booking_created'
  | 'bus:booking_confirmed'
  | 'bus:booking_cancelled'
  // Payment events
  | 'bus:payment_received'
  | 'bus:deposit_paid'
  // Webhook events
  | 'bus:webhook_instagram'
  | 'bus:webhook_tiktok'
  | 'bus:webhook_stripe'
  // AI events
  | 'bus:grok_reasoning'
  | 'bus:ai_response'
  | 'bus:ai_error'
  // Marketing events
  | 'bus:marketing_triggered'
  | 'bus:campaign_sent'
  // Journey events
  | 'bus:journey_advanced'
  | 'bus:stage_change'
  // Healing events
  | 'bus:healing_started'
  | 'bus:healing_checkin'
  // System events
  | 'bus:system_health'
  | 'bus:system_error';

export interface CoreBusEvent {
  type: CoreBusEventType;
  data: Record<string, any>;
  source: 'frontend' | 'edge-function' | 'webhook' | 'cron';
  correlationId?: string;
  timestamp: string;
}

export type CoreBusStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseCoreBusReturn {
  status: CoreBusStatus;
  publish: (type: CoreBusEventType, data: Record<string, any>, correlationId?: string) => Promise<void>;
  lastEvent: CoreBusEvent | null;
  eventCount: number;
  reconnect: () => void;
}

const CHANNEL_NAME = 'ferunda-core-bus';
const HEARTBEAT_INTERVAL_MS = 30000;
const RECONNECT_BASE_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

// ----------------------------------------------------------------------------
// Singleton state (global for the whole app)
// ----------------------------------------------------------------------------
let globalChannel: RealtimeChannel | null = null;
let globalStatus: CoreBusStatus = 'disconnected';
let globalLastEvent: CoreBusEvent | null = null;
let globalEventCount = 0;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let isConnecting = false;
let initRefCount = 0;

type CoreBusSnapshot = {
  status: CoreBusStatus;
  lastEvent: CoreBusEvent | null;
  eventCount: number;
};

const listeners = new Set<(s: CoreBusSnapshot) => void>();

function snapshot(): CoreBusSnapshot {
  return {
    status: globalStatus,
    lastEvent: globalLastEvent,
    eventCount: globalEventCount,
  };
}

function emitSnapshot() {
  const s = snapshot();
  listeners.forEach((fn) => {
    try {
      fn(s);
    } catch (e) {
      console.warn('[CoreBus] listener error:', e);
    }
  });
}

function setGlobalStatus(next: CoreBusStatus) {
  if (globalStatus === next) return;
  globalStatus = next;
  emitSnapshot();
}

// ----------------------------------------------------------------------------
// Event mapping / cross-module triggers (pure functions)
// ----------------------------------------------------------------------------
const mapping: Partial<Record<CoreBusEventType, { type: EventType; transform: (data: any) => any }>> = {
  'bus:booking_created': {
    type: 'booking:created',
    transform: (d) => ({ bookingId: d.bookingId, clientEmail: d.clientEmail || '', clientName: d.clientName }),
  },
  'bus:booking_confirmed': {
    type: 'booking:confirmed',
    transform: (d) => ({ bookingId: d.bookingId, clientId: d.clientId, appointmentDate: d.appointmentDate }),
  },
  'bus:payment_received': {
    type: 'payment:received',
    transform: (d) => ({ paymentId: d.paymentId || d.bookingId, amount: d.amount, bookingId: d.bookingId }),
  },
  'bus:message_received': {
    type: 'message:received',
    transform: (d) => ({ conversationId: d.sessionId || d.conversationId, channel: d.channel || 'chat', content: d.content }),
  },
  'bus:image_uploaded': {
    type: 'concierge:image_uploaded',
    transform: (d) => ({ sessionId: d.sessionId, imageUrl: d.imageUrl, timestamp: d.timestamp || new Date().toISOString() }),
  },
  'bus:webhook_instagram': {
    type: 'message:received',
    transform: (d) => ({ conversationId: d.senderId, channel: 'instagram', content: d.content }),
  },
  'bus:webhook_tiktok': {
    type: 'message:received',
    transform: (d) => ({ conversationId: d.senderId, channel: 'tiktok', content: d.content }),
  },
};

function mapToLocalEvent(busEvent: CoreBusEvent) {
  const mapped = mapping[busEvent.type];
  if (!mapped) return;

  try {
    const payload = mapped.transform(busEvent.data);
    eventBus.emit(mapped.type, payload);
    console.log(`[CoreBus] 🔄 Mapped ${busEvent.type} → ${mapped.type}`);
  } catch (err) {
    console.warn(`[CoreBus] Failed to map event ${busEvent.type}:`, err);
  }
}

function triggerCrossModule(busEvent: CoreBusEvent) {
  const timestamp = new Date().toISOString();

  switch (busEvent.type) {
    case 'bus:booking_created':
      eventBus.emit('marketing:content_generated', { contentType: 'upsell', platform: 'email' });
      eventBus.emit('analytics:revenue_updated', { period: 'live', amount: 0, delta: 0 });
      eventBus.emit('concierge:stage_change', {
        sessionId: busEvent.data.bookingId || busEvent.data.sessionId,
        stage: 'inquiry',
        timestamp,
      });
      console.log('[CoreBus Vivo] ⚡ booking_created → marketing + analytics + journey started');
      break;

    case 'bus:payment_received':
      if (busEvent.data.bookingId) {
        eventBus.emit('booking:deposit_paid', { bookingId: busEvent.data.bookingId, amount: busEvent.data.amount || 0 });
        eventBus.emit('booking:confirmed', { bookingId: busEvent.data.bookingId });
        eventBus.emit('concierge:stage_change', { sessionId: busEvent.data.bookingId, stage: 'confirmed', timestamp });
        eventBus.emit('analytics:revenue_updated', {
          period: 'live',
          amount: busEvent.data.amount || 0,
          delta: busEvent.data.amount || 0,
        });
      }
      console.log('[CoreBus Vivo] ⚡ payment_received → booking confirmed + finanzas updated + journey advanced');
      break;

    case 'bus:image_uploaded':
      eventBus.emit('design:created', { designId: `auto-${Date.now()}`, conversationId: busEvent.data.sessionId });
      eventBus.emit('concierge:image_uploaded', {
        sessionId: busEvent.data.sessionId,
        imageUrl: busEvent.data.imageUrl,
        timestamp,
      });
      eventBus.emit('concierge:stage_change', { sessionId: busEvent.data.sessionId, stage: 'design', timestamp });
      console.log('[CoreBus Vivo] ⚡ image_uploaded → design flow + journey advanced to design');
      break;

    case 'bus:message_received':
      eventBus.emit('message:received', {
        conversationId: busEvent.data.sessionId || busEvent.data.conversationId,
        channel: busEvent.data.channel || 'chat',
        content: busEvent.data.content || '',
      });
      eventBus.emit('concierge:session_started', { sessionId: busEvent.data.sessionId, clientEmail: busEvent.data.clientEmail });
      console.log('[CoreBus Vivo] ⚡ message_received → concierge activated');
      break;

    case 'bus:message_responded':
      eventBus.emit('agent:decision_made', { decisionId: `ai-${Date.now()}`, type: 'response', confidence: 0.85 });
      console.log('[CoreBus Vivo] ⚡ message_responded → agent decision tracked');
      break;

    case 'bus:ai_response':
      eventBus.emit('agent:learning_updated', { interactionCount: 1, accuracy: busEvent.data.success ? 1 : 0 });
      console.log('[CoreBus Vivo] ⚡ ai_response → learning updated');
      break;

    case 'bus:webhook_instagram':
    case 'bus:webhook_tiktok': {
      const channel = busEvent.type === 'bus:webhook_instagram' ? 'instagram' : 'tiktok';
      eventBus.emit('message:received', {
        conversationId: busEvent.data.senderId || 'unknown',
        channel,
        content: busEvent.data.content || '',
      });
      eventBus.emit('concierge:session_started', { sessionId: busEvent.data.senderId, clientEmail: undefined });
      console.log(`[CoreBus Vivo] ⚡ ${channel} webhook → concierge + message module`);
      break;
    }

    case 'bus:grok_reasoning':
      eventBus.emit('agent:decision_made', {
        decisionId: `grok-${Date.now()}`,
        type: busEvent.data.intent || 'reasoning',
        confidence: 0.9,
      });
      console.log('[CoreBus Vivo] ⚡ grok_reasoning → intent tracked');
      break;

    case 'bus:marketing_triggered':
      eventBus.emit('marketing:content_generated', { contentType: busEvent.data.triggerType || 'auto', platform: 'multi' });
      console.log('[CoreBus Vivo] ⚡ marketing_triggered → content generation started');
      break;

    case 'bus:system_health':
      console.log(`[CoreBus Vivo] 💓 System health: ${busEvent.data.component} = ${busEvent.data.status}`);
      break;
  }
}

// ----------------------------------------------------------------------------
// Connection management
// ----------------------------------------------------------------------------
function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function setupHeartbeat() {
  clearHeartbeat();

  heartbeatTimer = setInterval(() => {
    if (!globalChannel || globalStatus !== 'connected') return;

    globalChannel
      .send({
        type: 'broadcast',
        event: 'heartbeat',
        payload: { source: 'frontend', timestamp: new Date().toISOString() },
      })
      .catch((err) => {
        console.warn('[CoreBus] ⚠️ Heartbeat failed, marking disconnected...', err);
        setGlobalStatus('disconnected');
        scheduleReconnect();
      });
  }, HEARTBEAT_INTERVAL_MS);
}

function handleBroadcastEvent(payload: { type: string; event: string; payload: CoreBusEvent }) {
  const busEvent = payload.payload;

  console.log(`[CoreBus] 📥 Received: ${busEvent.type}`, busEvent.data);

  globalLastEvent = busEvent;
  globalEventCount += 1;
  emitSnapshot();

  mapToLocalEvent(busEvent);
  triggerCrossModule(busEvent);
}

function connect() {
  if (isConnecting) return;
  isConnecting = true;

  setGlobalStatus('connecting');
  console.log('[CoreBus] 🔌 Connecting to', CHANNEL_NAME);

  // Cleanup existing channel
  if (globalChannel) {
    try {
      supabase.removeChannel(globalChannel);
    } catch (e) {
      console.warn('[CoreBus] removeChannel failed (ignored):', e);
    }
    globalChannel = null;
  }

  const channel = supabase.channel(CHANNEL_NAME, {
    config: {
      broadcast: { self: false },
      presence: { key: `frontend-${Date.now()}` },
    },
  });

  channel
    .on('broadcast', { event: 'core_event' }, handleBroadcastEvent)
    .on('presence', { event: 'sync' }, () => {
      console.log('[CoreBus] 👥 Presence synced');
    })
    .subscribe((s) => {
      isConnecting = false;

      if (s === 'SUBSCRIBED') {
        console.log('[CoreBus] ✅ Connected to', CHANNEL_NAME);
        globalChannel = channel;
        reconnectAttempt = 0;
        setGlobalStatus('connected');
        setupHeartbeat();
        return;
      }

      if (s === 'CHANNEL_ERROR') {
        console.error('[CoreBus] ❌ Channel error');
        globalChannel = channel; // keep ref for potential cleanup
        setGlobalStatus('error');
        scheduleReconnect();
        return;
      }

      if (s === 'CLOSED') {
        console.log('[CoreBus] 🔌 Channel closed');
        globalChannel = channel;
        setGlobalStatus('disconnected');
        scheduleReconnect();
      }
    });

  // Keep reference immediately so publish() can see we have a channel object
  globalChannel = channel;
}

function scheduleReconnect() {
  if (globalStatus === 'connected' || isConnecting) return;
  if (reconnectAttempt >= 10) return;

  clearReconnectTimer();

  const delay = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY_MS);
  reconnectAttempt += 1;
  console.log(`[CoreBus] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);

  reconnectTimer = setTimeout(() => {
    connect();
  }, delay);
}

function teardownIfUnused() {
  if (initRefCount > 0) return;

  console.log('[CoreBus] 🧹 Teardown (no more initializers)');
  clearHeartbeat();
  clearReconnectTimer();

  if (globalChannel) {
    try {
      supabase.removeChannel(globalChannel);
    } catch (e) {
      console.warn('[CoreBus] removeChannel failed on teardown (ignored):', e);
    }
    globalChannel = null;
  }

  isConnecting = false;
  reconnectAttempt = 0;
  setGlobalStatus('disconnected');
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Inicializa el CoreBus UNA sola vez (llamar desde SystemProvider).
 * Devuelve cleanup; si se monta/desmonta varias veces, usa ref-count.
 */
export function initializeCoreBus(): () => void {
  initRefCount += 1;
  console.log('[CoreBus] 🧠 initializeCoreBus() refCount=', initRefCount);

  // Ensure connection
  if (globalStatus === 'disconnected' || globalStatus === 'error') {
    connect();
  } else if (globalStatus === 'connecting') {
    // no-op
  } else if (globalStatus === 'connected') {
    // already connected
  }

  return () => {
    initRefCount = Math.max(0, initRefCount - 1);
    console.log('[CoreBus] 🧠 cleanupCoreBus() refCount=', initRefCount);
    teardownIfUnused();
  };
}

export function useCoreBus(): UseCoreBusReturn {
  const [state, setState] = useState<CoreBusSnapshot>(() => snapshot());

  useEffect(() => {
    listeners.add(setState);
    // Sync immediately in case anything changed between render and effect
    setState(snapshot());

    return () => {
      listeners.delete(setState);
    };
  }, []);

  const api = useMemo<UseCoreBusReturn>(() => {
    const publish: UseCoreBusReturn['publish'] = async (type, data, correlationId) => {
      const event: CoreBusEvent = {
        type,
        data,
        source: 'frontend',
        correlationId: correlationId || `fe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
      };

      console.log(`[CoreBus] 📤 Publishing: ${type}`, data);

      if (globalChannel && globalStatus === 'connected') {
        try {
          await globalChannel.send({ type: 'broadcast', event: 'core_event', payload: event });
          console.log(`[CoreBus] ✅ Published: ${type}`);
        } catch (err) {
          console.error('[CoreBus] ❌ Publish failed:', err);
          throw err;
        }
      } else {
        console.warn('[CoreBus] ⚠️ Not connected, emitting locally');
        mapToLocalEvent(event);
      }

      try {
        await supabase.from('event_log').insert({
          event_type: type,
          payload: data,
          source: 'frontend',
          correlation_id: event.correlationId,
        });
      } catch (err) {
        console.warn('[CoreBus] Failed to persist event to event_log:', err);
      }
    };

    const reconnect = () => {
      if (globalStatus === 'connected') return;
      scheduleReconnect();
    };

    return {
      status: state.status,
      lastEvent: state.lastEvent,
      eventCount: state.eventCount,
      publish,
      reconnect,
    };
  }, [state.status, state.lastEvent, state.eventCount]);

  return api;
}

export default useCoreBus;
