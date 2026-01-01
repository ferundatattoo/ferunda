// Event Bus for cross-module communication in the CRM
// This enables real-time sync between different modules

type EventType =
  // Booking lifecycle
  | 'booking:created'
  | 'booking:confirmed'
  | 'booking:cancelled'
  | 'booking:deposit_paid'
  | 'booking:session_completed'
  | 'booking:scheduled'
  | 'booking:rescheduled'
  // Design workflow
  | 'design:created'
  | 'design:approved'
  | 'design:rejected'
  | 'design:revision_requested'
  | 'design:sketch_generated'
  // Healing journey
  | 'healing:started'
  | 'healing:checkin'
  | 'healing:photo_uploaded'
  | 'healing:completed'
  | 'healing:certificate_generated'
  // Payments
  | 'payment:received'
  | 'payment:refunded'
  | 'payment:failed'
  | 'payment:link_created'
  // Clients
  | 'client:created'
  | 'client:updated'
  | 'client:risk_flagged'
  // Messaging
  | 'message:received'
  | 'message:sent'
  | 'message:escalated'
  // Escalations
  | 'escalation:created'
  | 'escalation:resolved'
  | 'escalation:assigned'
  // Marketing & Campaigns
  | 'campaign:sent'
  | 'campaign:opened'
  | 'campaign:clicked'
  | 'marketing:trend_detected'
  | 'marketing:content_generated'
  // Avatar & Video
  | 'avatar:video_generated'
  | 'avatar:voice_cloned'
  | 'avatar:training_started'
  | 'avatar:training_completed'
  // Calendar & Availability
  | 'availability:updated'
  | 'calendar:synced'
  | 'calendar:event_created'
  | 'calendar:conflict_detected'
  // Concierge & Agent
  | 'concierge:session_started'
  | 'concierge:session_ended'
  | 'concierge:brief_created'
  | 'agent:decision_made'
  | 'agent:learning_updated'
  // Analytics
  | 'analytics:revenue_updated'
  | 'analytics:conversion_tracked'
  | 'analytics:forecast_generated';

type EventPayload = {
  'booking:created': { bookingId: string; clientEmail: string; clientName?: string };
  'booking:confirmed': { bookingId: string; clientId?: string; appointmentDate?: string };
  'booking:cancelled': { bookingId: string; reason?: string };
  'booking:deposit_paid': { bookingId: string; amount: number };
  'booking:session_completed': { bookingId: string; artistId?: string };
  'booking:scheduled': { bookingId: string; date: string; time?: string };
  'booking:rescheduled': { bookingId: string; oldDate: string; newDate: string };
  'design:created': { designId: string; bookingId?: string; conversationId?: string };
  'design:approved': { designId: string; bookingId?: string };
  'design:rejected': { designId: string; feedback?: string };
  'design:revision_requested': { designId: string; feedback: string };
  'design:sketch_generated': { designId: string; prompt: string; imageUrl?: string };
  'healing:started': { bookingId: string; clientEmail: string };
  'healing:checkin': { healingId: string; day: number; photoUrl?: string };
  'healing:photo_uploaded': { healingId: string; photoUrl: string; aiScore?: number };
  'healing:completed': { healingId: string; certificateUrl?: string };
  'healing:certificate_generated': { healingId: string; certificateNumber: string };
  'payment:received': { paymentId: string; amount: number; bookingId?: string };
  'payment:refunded': { paymentId: string; amount: number; reason?: string };
  'payment:failed': { paymentId: string; error: string; bookingId?: string };
  'payment:link_created': { linkUrl: string; amount: number; bookingId?: string };
  'client:created': { clientId: string; email: string; source?: string };
  'client:updated': { clientId: string; changes: Record<string, unknown> };
  'client:risk_flagged': { clientId: string; riskScore: number; flags: string[] };
  'message:received': { conversationId: string; channel: string; content: string };
  'message:sent': { conversationId: string; channel: string; content: string };
  'message:escalated': { conversationId: string; reason: string; priority: string };
  'escalation:created': { requestId: string; reason: string; priority?: string };
  'escalation:resolved': { requestId: string; resolution: string };
  'escalation:assigned': { requestId: string; assigneeId: string };
  'campaign:sent': { campaignId: string; recipientCount: number };
  'campaign:opened': { campaignId: string; recipientEmail: string };
  'campaign:clicked': { campaignId: string; recipientEmail: string; linkId: string };
  'marketing:trend_detected': { trend: string; platform: string; score: number };
  'marketing:content_generated': { contentType: string; platform: string };
  'avatar:video_generated': { videoId: string; avatarId: string; duration: number };
  'avatar:voice_cloned': { avatarId: string; voiceId: string };
  'avatar:training_started': { avatarId: string };
  'avatar:training_completed': { avatarId: string; progress: number };
  'availability:updated': { artistId?: string; dates: string[] };
  'calendar:synced': { eventCount: number; source: string };
  'calendar:event_created': { eventId: string; title: string; startTime: string };
  'calendar:conflict_detected': { eventId: string; conflictWith: string };
  'concierge:session_started': { sessionId: string; clientEmail?: string };
  'concierge:session_ended': { sessionId: string; outcome: string };
  'concierge:brief_created': { briefId: string; sessionId?: string };
  'agent:decision_made': { decisionId: string; type: string; confidence: number };
  'agent:learning_updated': { interactionCount: number; accuracy: number };
  'analytics:revenue_updated': { period: string; amount: number; delta: number };
  'analytics:conversion_tracked': { source: string; converted: boolean };
  'analytics:forecast_generated': { period: string; predicted: number; confidence: number };
};

type EventCallback<T extends EventType> = (payload: EventPayload[T]) => void;

class EventBus {
  private listeners: Map<EventType, Set<EventCallback<any>>> = new Map();
  private history: Array<{ type: EventType; payload: any; timestamp: Date }> = [];
  private maxHistorySize = 100;

  on<T extends EventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<T extends EventType>(event: T, payload: EventPayload[T]): void {
    // Add to history
    this.history.unshift({ type: event, payload, timestamp: new Date() });
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }

    // Notify listeners
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // Log for debugging in dev
    if (import.meta.env.DEV) {
      console.log(`[EventBus] ${event}`, payload);
    }
  }

  // Emit multiple events at once (for batch operations)
  emitBatch(events: Array<{ type: EventType; payload: any }>): void {
    events.forEach(({ type, payload }) => {
      this.emit(type as any, payload);
    });
  }

  getHistory(filter?: EventType): Array<{ type: EventType; payload: any; timestamp: Date }> {
    if (filter) {
      return this.history.filter((e) => e.type === filter);
    }
    return [...this.history];
  }

  getHistoryByCategory(category: string): Array<{ type: EventType; payload: any; timestamp: Date }> {
    return this.history.filter((e) => e.type.startsWith(category));
  }

  clearHistory(): void {
    this.history = [];
  }

  // Get count of events by type in last N minutes
  getRecentEventCount(event: EventType, minutes: number = 60): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.history.filter(
      (e) => e.type === event && e.timestamp >= cutoff
    ).length;
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Helper hooks for React components
export function useEventBus() {
  return eventBus;
}

// Automatic workflow triggers
// When a booking is confirmed, prepare healing tracker
eventBus.on('booking:confirmed', async ({ bookingId, clientId }) => {
  console.log(`[Workflow] Booking ${bookingId} confirmed - preparing healing tracker`);
});

// When a design is approved, update booking status
eventBus.on('design:approved', async ({ designId, bookingId }) => {
  console.log(`[Workflow] Design ${designId} approved for booking ${bookingId}`);
});

// When a session is completed, trigger healing start
eventBus.on('booking:session_completed', async ({ bookingId }) => {
  console.log(`[Workflow] Session completed for ${bookingId} - starting healing journey`);
  eventBus.emit('healing:started', { bookingId, clientEmail: '' });
});

// When payment is received, confirm booking
eventBus.on('payment:received', async ({ bookingId, amount }) => {
  if (bookingId) {
    console.log(`[Workflow] Payment of ${amount} received for ${bookingId}`);
    eventBus.emit('booking:deposit_paid', { bookingId, amount });
  }
});

// When an escalation is created, log for analytics
eventBus.on('escalation:created', async ({ requestId, reason, priority }) => {
  console.log(`[Workflow] Escalation created: ${reason} (${priority})`);
});

// When avatar video is generated, track analytics
eventBus.on('avatar:video_generated', async ({ videoId, duration }) => {
  console.log(`[Workflow] Avatar video ${videoId} generated (${duration}s)`);
});

// When concierge creates a brief, emit for tracking
eventBus.on('concierge:brief_created', async ({ briefId, sessionId }) => {
  console.log(`[Workflow] Tattoo brief ${briefId} created from session ${sessionId}`);
});

export default eventBus;
