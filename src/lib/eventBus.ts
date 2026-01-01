// Event Bus for cross-module communication in the CRM
// This enables real-time sync between different modules

type EventType =
  | 'booking:created'
  | 'booking:confirmed'
  | 'booking:cancelled'
  | 'booking:deposit_paid'
  | 'booking:session_completed'
  | 'design:created'
  | 'design:approved'
  | 'design:rejected'
  | 'healing:started'
  | 'healing:checkin'
  | 'healing:completed'
  | 'payment:received'
  | 'payment:refunded'
  | 'client:created'
  | 'client:updated'
  | 'message:received'
  | 'message:sent'
  | 'escalation:created'
  | 'escalation:resolved'
  | 'campaign:sent'
  | 'campaign:opened'
  | 'availability:updated'
  | 'calendar:synced';

type EventPayload = {
  'booking:created': { bookingId: string; clientEmail: string; clientName?: string };
  'booking:confirmed': { bookingId: string; clientId?: string; appointmentDate?: string };
  'booking:cancelled': { bookingId: string; reason?: string };
  'booking:deposit_paid': { bookingId: string; amount: number };
  'booking:session_completed': { bookingId: string; artistId?: string };
  'design:created': { designId: string; bookingId?: string; conversationId?: string };
  'design:approved': { designId: string; bookingId?: string };
  'design:rejected': { designId: string; feedback?: string };
  'healing:started': { bookingId: string; clientEmail: string };
  'healing:checkin': { healingId: string; day: number; photoUrl?: string };
  'healing:completed': { healingId: string; certificateUrl?: string };
  'payment:received': { paymentId: string; amount: number; bookingId?: string };
  'payment:refunded': { paymentId: string; amount: number; reason?: string };
  'client:created': { clientId: string; email: string; source?: string };
  'client:updated': { clientId: string; changes: Record<string, unknown> };
  'message:received': { conversationId: string; channel: string; content: string };
  'message:sent': { conversationId: string; channel: string; content: string };
  'escalation:created': { requestId: string; reason: string; priority?: string };
  'escalation:resolved': { requestId: string; resolution: string };
  'campaign:sent': { campaignId: string; recipientCount: number };
  'campaign:opened': { campaignId: string; recipientEmail: string };
  'availability:updated': { artistId?: string; dates: string[] };
  'calendar:synced': { eventCount: number; source: string };
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

  getHistory(filter?: EventType): Array<{ type: EventType; payload: any; timestamp: Date }> {
    if (filter) {
      return this.history.filter((e) => e.type === filter);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Helper hooks for React components
export function useEventBus() {
  return eventBus;
}

// Automatic workflow triggers
// When a booking is confirmed, auto-create healing progress entry
eventBus.on('booking:confirmed', async ({ bookingId, clientId }) => {
  console.log(`[Workflow] Booking ${bookingId} confirmed - preparing healing tracker`);
  // The actual DB insert would happen in the component that handles this
});

// When a design is approved, update booking status
eventBus.on('design:approved', async ({ designId, bookingId }) => {
  console.log(`[Workflow] Design ${designId} approved for booking ${bookingId}`);
});

// When a session is completed, trigger healing start
eventBus.on('booking:session_completed', async ({ bookingId }) => {
  console.log(`[Workflow] Session completed for ${bookingId} - starting healing journey`);
});

export default eventBus;
