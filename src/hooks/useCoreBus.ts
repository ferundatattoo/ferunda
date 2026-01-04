// ============================================================================
// CORE BUS HOOK - Sistema Nervioso Central Ferunda
// Conexión bidireccional frontend ↔ backend via Supabase Realtime
// VIVO SUPREMO ETERNO - Unified event bus for all modules
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
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

interface UseCoreBusReturn {
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

export function useCoreBus(): UseCoreBusReturn {
  const [status, setStatus] = useState<CoreBusStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<CoreBusEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isConnectingRef = useRef(false);

  // Map Core Bus events to local EventBus events
  const mapToLocalEvent = useCallback((busEvent: CoreBusEvent) => {
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

    const mapped = mapping[busEvent.type];
    if (mapped) {
      try {
        const payload = mapped.transform(busEvent.data);
        eventBus.emit(mapped.type, payload);
        console.log(`[CoreBus] 🔄 Mapped ${busEvent.type} → ${mapped.type}`);
      } catch (err) {
        console.warn(`[CoreBus] Failed to map event ${busEvent.type}:`, err);
      }
    }
  }, []);

  // Cross-module triggers based on received events - VIVO SUPREMO ETERNO
  const triggerCrossModule = useCallback((busEvent: CoreBusEvent) => {
    const timestamp = new Date().toISOString();
    
    switch (busEvent.type) {
      case 'bus:booking_created':
        // Trigger marketing upsell + analytics + finanzas calc
        eventBus.emit('marketing:content_generated', { contentType: 'upsell', platform: 'email' });
        eventBus.emit('analytics:revenue_updated', { period: 'live', amount: 0, delta: 0 });
        eventBus.emit('concierge:stage_change', { 
          sessionId: busEvent.data.bookingId || busEvent.data.sessionId, 
          stage: 'inquiry', 
          timestamp 
        });
        console.log('[CoreBus Vivo] ⚡ booking_created → marketing + analytics + journey started');
        break;

      case 'bus:payment_received':
        // Trigger booking confirmation + stage change + finanzas update
        if (busEvent.data.bookingId) {
          eventBus.emit('booking:deposit_paid', { bookingId: busEvent.data.bookingId, amount: busEvent.data.amount || 0 });
          eventBus.emit('booking:confirmed', { bookingId: busEvent.data.bookingId });
          eventBus.emit('concierge:stage_change', { 
            sessionId: busEvent.data.bookingId, 
            stage: 'confirmed', 
            timestamp 
          });
          eventBus.emit('analytics:revenue_updated', { 
            period: 'live', 
            amount: busEvent.data.amount || 0, 
            delta: busEvent.data.amount || 0 
          });
        }
        console.log('[CoreBus Vivo] ⚡ payment_received → booking confirmed + finanzas updated + journey advanced');
        break;

      case 'bus:image_uploaded':
        // Trigger design creation flow + concierge advance
        eventBus.emit('design:created', { 
          designId: `auto-${Date.now()}`, 
          conversationId: busEvent.data.sessionId 
        });
        eventBus.emit('concierge:image_uploaded', {
          sessionId: busEvent.data.sessionId,
          imageUrl: busEvent.data.imageUrl,
          timestamp
        });
        eventBus.emit('concierge:stage_change', {
          sessionId: busEvent.data.sessionId,
          stage: 'design',
          timestamp
        });
        console.log('[CoreBus Vivo] ⚡ image_uploaded → design flow + journey advanced to design');
        break;

      case 'bus:message_received':
        // Trigger concierge processing + session start if new
        eventBus.emit('message:received', {
          conversationId: busEvent.data.sessionId || busEvent.data.conversationId,
          channel: busEvent.data.channel || 'chat',
          content: busEvent.data.content || ''
        });
        eventBus.emit('concierge:session_started', {
          sessionId: busEvent.data.sessionId,
          clientEmail: busEvent.data.clientEmail
        });
        console.log('[CoreBus Vivo] ⚡ message_received → concierge activated');
        break;

      case 'bus:message_responded':
        // AI responded - track for analytics
        eventBus.emit('agent:decision_made', {
          decisionId: `ai-${Date.now()}`,
          type: 'response',
          confidence: 0.85
        });
        console.log('[CoreBus Vivo] ⚡ message_responded → agent decision tracked');
        break;

      case 'bus:ai_response':
        // AI task completed - track learning
        eventBus.emit('agent:learning_updated', {
          interactionCount: 1,
          accuracy: busEvent.data.success ? 1 : 0
        });
        console.log('[CoreBus Vivo] ⚡ ai_response → learning updated');
        break;

      case 'bus:webhook_instagram':
      case 'bus:webhook_tiktok':
        // Notify message module + trigger concierge
        const channel = busEvent.type === 'bus:webhook_instagram' ? 'instagram' : 'tiktok';
        eventBus.emit('message:received', {
          conversationId: busEvent.data.senderId || 'unknown',
          channel,
          content: busEvent.data.content || '',
        });
        eventBus.emit('concierge:session_started', {
          sessionId: busEvent.data.senderId,
          clientEmail: undefined
        });
        console.log(`[CoreBus Vivo] ⚡ ${channel} webhook → concierge + message module`);
        break;

      case 'bus:grok_reasoning':
        // Grok AI processing - track intent
        eventBus.emit('agent:decision_made', {
          decisionId: `grok-${Date.now()}`,
          type: busEvent.data.intent || 'reasoning',
          confidence: 0.9
        });
        console.log('[CoreBus Vivo] ⚡ grok_reasoning → intent tracked');
        break;

      case 'bus:marketing_triggered':
        // Marketing action triggered - emit content generated
        eventBus.emit('marketing:content_generated', {
          contentType: busEvent.data.triggerType || 'auto',
          platform: 'multi'
        });
        console.log('[CoreBus Vivo] ⚡ marketing_triggered → content generation started');
        break;

      case 'bus:system_health':
        // System health update - log for monitoring
        console.log(`[CoreBus Vivo] 💓 System health: ${busEvent.data.component} = ${busEvent.data.status}`);
        break;
    }
  }, []);

  // Handle incoming broadcast events
  const handleBroadcastEvent = useCallback((payload: { type: string; event: string; payload: CoreBusEvent }) => {
    const busEvent = payload.payload;
    
    console.log(`[CoreBus] 📥 Received: ${busEvent.type}`, busEvent.data);
    
    setLastEvent(busEvent);
    setEventCount((prev) => prev + 1);
    
    // Map to local EventBus
    mapToLocalEvent(busEvent);
    
    // Trigger cross-module actions
    triggerCrossModule(busEvent);
  }, [mapToLocalEvent, triggerCrossModule]);

  // Publish event to Core Bus
  const publish = useCallback(async (
    type: CoreBusEventType, 
    data: Record<string, any>, 
    correlationId?: string
  ): Promise<void> => {
    const event: CoreBusEvent = {
      type,
      data,
      source: 'frontend',
      correlationId: correlationId || `fe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    console.log(`[CoreBus] 📤 Publishing: ${type}`, data);

    // Send via Supabase Realtime broadcast
    if (channelRef.current && status === 'connected') {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'core_event',
          payload: event,
        });
        console.log(`[CoreBus] ✅ Published: ${type}`);
      } catch (err) {
        console.error('[CoreBus] ❌ Publish failed:', err);
        throw err;
      }
    } else {
      console.warn('[CoreBus] ⚠️ Not connected, storing event locally');
      // Still emit locally even if not connected
      mapToLocalEvent(event);
    }

    // Also log to event_log table for persistence
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
  }, [status, mapToLocalEvent]);

  // Setup heartbeat
  const setupHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      if (channelRef.current && status === 'connected') {
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { source: 'frontend', timestamp: new Date().toISOString() },
        }).catch((err) => {
          console.warn('[CoreBus] ⚠️ Heartbeat failed, reconnecting...', err);
          setStatus('disconnected');
        });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [status]);

  // Connect to Core Bus
  const connect = useCallback(() => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setStatus('connecting');

    console.log('[CoreBus] 🔌 Connecting to', CHANNEL_NAME);

    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: { self: false }, // Don't receive own broadcasts
        presence: { key: `frontend-${Date.now()}` },
      },
    });

    channel
      .on('broadcast', { event: 'core_event' }, handleBroadcastEvent)
      .on('presence', { event: 'sync' }, () => {
        console.log('[CoreBus] 👥 Presence synced');
      })
      .subscribe((status) => {
        isConnectingRef.current = false;
        
        if (status === 'SUBSCRIBED') {
          console.log('[CoreBus] ✅ Connected to', CHANNEL_NAME);
          setStatus('connected');
          reconnectAttemptRef.current = 0;
          setupHeartbeat();
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[CoreBus] ❌ Channel error');
          setStatus('error');
        } else if (status === 'CLOSED') {
          console.log('[CoreBus] 🔌 Channel closed');
          setStatus('disconnected');
        }
      });

    channelRef.current = channel;
  }, [handleBroadcastEvent, setupHeartbeat]);

  // Reconnect with exponential backoff
  const reconnect = useCallback(() => {
    if (status === 'connected' || isConnectingRef.current) return;

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
      MAX_RECONNECT_DELAY_MS
    );
    
    reconnectAttemptRef.current += 1;
    console.log(`[CoreBus] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);

    setTimeout(() => {
      connect();
    }, delay);
  }, [status, connect]);

  // Auto-reconnect on disconnect
  useEffect(() => {
    if (status === 'disconnected' && reconnectAttemptRef.current < 10) {
      reconnect();
    }
  }, [status, reconnect]);

  // Initial connection
  useEffect(() => {
    connect();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    publish,
    lastEvent,
    eventCount,
    reconnect,
  };
}

export default useCoreBus;
