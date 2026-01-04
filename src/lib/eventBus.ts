// Event Bus for cross-module communication in the CRM
// This enables real-time sync between different modules

export type EventType =
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
  | 'concierge:image_uploaded'
  | 'concierge:ar_viewed'
  | 'concierge:stage_change'
  | 'agent:decision_made'
  | 'agent:learning_updated'
  // Analytics
  | 'analytics:revenue_updated'
  | 'analytics:conversion_tracked'
  | 'analytics:forecast_generated'
  // Supply module - VIVO SUPREMO
  | 'supply:inventory_changed'
  | 'supply:orders_changed'
  | 'supply:equipment_changed'
  | 'supply:suppliers_changed'
  // ============================================================================
  // CORE BUS EVENTS - Sistema Nervioso Central (bidireccional)
  // ============================================================================
  | 'bus:message_received'
  | 'bus:message_responded'
  | 'bus:image_uploaded'
  | 'bus:image_analyzed'
  | 'bus:booking_created'
  | 'bus:booking_confirmed'
  | 'bus:payment_received'
  | 'bus:webhook_instagram'
  | 'bus:webhook_tiktok'
  | 'bus:grok_reasoning'
  | 'bus:ai_response'
  | 'bus:marketing_triggered'
  | 'bus:system_health';

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
  'concierge:image_uploaded': { sessionId: string; imageUrl: string; timestamp: string };
  'concierge:ar_viewed': { sessionId: string; imageUrl: string; bodyPart?: string };
  'concierge:stage_change': { sessionId: string; stage: string; timestamp: string };
  'agent:decision_made': { decisionId: string; type: string; confidence: number };
  'agent:learning_updated': { interactionCount: number; accuracy: number };
  'analytics:revenue_updated': { period: string; amount: number; delta: number };
  'analytics:conversion_tracked': { source: string; converted: boolean };
  'analytics:forecast_generated': { period: string; predicted: number; confidence: number };
  // Supply module - VIVO SUPREMO
  'supply:inventory_changed': { itemId: string; eventType: string };
  'supply:orders_changed': { orderId: string; eventType: string };
  'supply:equipment_changed': { equipmentId: string; eventType: string };
  'supply:suppliers_changed': { supplierId: string; eventType: string };
  // ============================================================================
  // CORE BUS PAYLOADS - Sistema Nervioso Central
  // ============================================================================
  'bus:message_received': { sessionId: string; content: string; channel?: string };
  'bus:message_responded': { sessionId: string; content: string; provider: string };
  'bus:image_uploaded': { sessionId: string; imageUrl: string; timestamp: string };
  'bus:image_analyzed': { sessionId: string; analysis: Record<string, any> };
  'bus:booking_created': { bookingId: string; clientEmail: string; source: string };
  'bus:booking_confirmed': { bookingId: string; appointmentDate?: string };
  'bus:payment_received': { bookingId: string; amount: number; paymentType: string };
  'bus:webhook_instagram': { senderId: string; content: string; imageUrl?: string };
  'bus:webhook_tiktok': { senderId: string; content: string; eventType: string };
  'bus:grok_reasoning': { sessionId: string; intent: string; responsePreview: string };
  'bus:ai_response': { taskType: string; provider: string; success: boolean; tokensUsed: number };
  'bus:marketing_triggered': { triggerType: string; targetAudience?: string };
  'bus:system_health': { component: string; status: 'healthy' | 'degraded' | 'down' };
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

// ============================================================================
// AUTOMATIC WORKFLOW TRIGGERS - SISTEMA INTEGRADO VIVO SUPREMO
// Cross-module sync for marketing, finanzas, journeys
// ============================================================================

// When a booking is confirmed, prepare healing tracker
eventBus.on('booking:confirmed', async ({ bookingId, clientId }) => {
  console.log(`[Workflow Vivo] Booking ${bookingId} confirmed - preparing healing tracker`);
});

// When a design is approved, update booking status
eventBus.on('design:approved', async ({ designId, bookingId }) => {
  console.log(`[Workflow Vivo] Design ${designId} approved for booking ${bookingId}`);
});

// When a session is completed, trigger healing start
eventBus.on('booking:session_completed', async ({ bookingId }) => {
  console.log(`[Workflow Vivo] Session completed for ${bookingId} - starting healing journey`);
  eventBus.emit('healing:started', { bookingId, clientEmail: '' });
});

// 🔥 VIVO SUPREMO ETERNO: When payment is received, advance booking journey + trigger marketing + finanzas
eventBus.on('payment:received', async ({ bookingId, amount }) => {
  if (bookingId) {
    console.log(`[Workflow Vivo Eterno] 💰 Payment of ${amount} received for ${bookingId}`);
    eventBus.emit('booking:deposit_paid', { bookingId, amount });
    
    // Advance journey stage to confirmed
    eventBus.emit('concierge:stage_change', {
      sessionId: bookingId,
      stage: 'confirmed',
      timestamp: new Date().toISOString(),
    });
    
    // Trigger finanzas update
    eventBus.emit('analytics:revenue_updated', {
      period: 'live',
      amount,
      delta: amount,
    });
    
    // Trigger marketing confirmation
    eventBus.emit('marketing:content_generated', {
      contentType: 'payment_confirmation',
      platform: 'email',
    });
    
    console.log('[Workflow Vivo Eterno] 📍 Journey: confirmed + finanzas + marketing synced');
  }
});

// 🔥 VIVO SUPREMO ETERNO: When booking is created, trigger full cross-module sync
eventBus.on('booking:created', async ({ bookingId, clientEmail, clientName }) => {
  console.log(`[Workflow Vivo Eterno] 📅 New booking ${bookingId} - full cross-module sync`);
  
  // Start journey tracking
  eventBus.emit('concierge:session_started', {
    sessionId: bookingId,
    clientEmail,
  });
  
  // Trigger marketing module for upsell opportunities
  eventBus.emit('marketing:content_generated', {
    contentType: 'new_inquiry',
    platform: 'email',
  });
  
  // Trigger finance module for revenue tracking
  eventBus.emit('analytics:revenue_updated', {
    period: 'live',
    amount: 0,
    delta: 0,
  });
  
  // Trigger conversion tracking
  eventBus.emit('analytics:conversion_tracked', {
    source: 'booking',
    converted: false,
  });
  
  console.log('[Workflow Vivo Eterno] ✅ Booking → Concierge + Marketing + Finanzas + Analytics synced');
});

// 🔥 VIVO SUPREMO ETERNO: When message is received, activate full concierge flow
eventBus.on('message:received', async ({ conversationId, channel, content }) => {
  console.log(`[Workflow Vivo Eterno] 💬 Message on ${channel}: ${content.slice(0, 50)}...`);
  
  // This triggers the concierge to process the message
  // Cross-module sync handled by Core Bus
});

// 🔥 VIVO SUPREMO ETERNO: When image is uploaded, notify all modules for design flow
eventBus.on('concierge:image_uploaded', async ({ sessionId, imageUrl }) => {
  console.log(`[Workflow Vivo Eterno] 📷 Image uploaded in session ${sessionId}`);
  
  // Trigger design analysis flow
  eventBus.emit('design:created', {
    designId: `auto-${Date.now()}`,
    conversationId: sessionId,
  });
  
  // Advance journey to design phase
  eventBus.emit('concierge:stage_change', {
    sessionId,
    stage: 'design',
    timestamp: new Date().toISOString(),
  });
  
  console.log('[Workflow Vivo Eterno] ✅ Image → Design + Journey advanced');
});

// 🔥 VIVO SUPREMO ETERNO: When design is approved, advance to booking stage
eventBus.on('design:approved', async ({ designId, bookingId }) => {
  console.log(`[Workflow Vivo Eterno] ✅ Design ${designId} approved`);
  
  if (bookingId) {
    eventBus.emit('concierge:stage_change', {
      sessionId: bookingId,
      stage: 'booking',
      timestamp: new Date().toISOString(),
    });
    
    eventBus.emit('marketing:content_generated', {
      contentType: 'design_approved',
      platform: 'email',
    });
  }
  
  console.log('[Workflow Vivo Eterno] ✅ Design approved → Journey advanced to booking');
});

// When an escalation is created, log for analytics + notify
eventBus.on('escalation:created', async ({ requestId, reason, priority }) => {
  console.log(`[Workflow Vivo Eterno] ⚠️ Escalation created: ${reason} (${priority})`);
  
  // Trigger alert in dashboard
  eventBus.emit('analytics:conversion_tracked', {
    source: 'escalation',
    converted: false,
  });
});

// When avatar video is generated, track analytics
eventBus.on('avatar:video_generated', async ({ videoId, duration }) => {
  console.log(`[Workflow Vivo Eterno] 🎬 Avatar video ${videoId} generated (${duration}s)`);
  
  eventBus.emit('marketing:content_generated', {
    contentType: 'avatar_video',
    platform: 'video',
  });
});

// When concierge creates a brief, emit for tracking + advance journey
eventBus.on('concierge:brief_created', async ({ briefId, sessionId }) => {
  console.log(`[Workflow Vivo Eterno] 📝 Tattoo brief ${briefId} created from session ${sessionId}`);
  
  if (sessionId) {
    eventBus.emit('concierge:stage_change', {
      sessionId,
      stage: 'brief_complete',
      timestamp: new Date().toISOString(),
    });
  }
});

// 🔥 VIVO SUPREMO ETERNO: When stage changes, sync with all modules
eventBus.on('concierge:stage_change', async ({ sessionId, stage }) => {
  console.log(`[Workflow Vivo Eterno] 📍 Session ${sessionId} moved to stage: ${stage}`);
  
  // Stage-specific marketing triggers
  const stageMarketingMap: Record<string, string> = {
    'inquiry': 'welcome_follow_up',
    'design': 'design_in_progress',
    'booking': 'booking_reminder',
    'confirmed': 'booking_confirmation',
    'completed': 'healing_journey_start',
  };
  
  if (stageMarketingMap[stage]) {
    eventBus.emit('marketing:content_generated', {
      contentType: stageMarketingMap[stage],
      platform: 'email',
    });
  }
  
  // Track conversion for analytics
  if (stage === 'confirmed' || stage === 'completed') {
    eventBus.emit('analytics:conversion_tracked', {
      source: 'journey',
      converted: true,
    });
  }
});

// 🔥 VIVO SUPREMO ETERNO: When healing starts, trigger full healing flow
eventBus.on('healing:started', async ({ bookingId, clientEmail }) => {
  console.log(`[Workflow Vivo Eterno] 💚 Healing journey started for ${bookingId}`);
  
  eventBus.emit('marketing:content_generated', {
    contentType: 'healing_day_1',
    platform: 'email',
  });
});

// 🔥 VIVO SUPREMO ETERNO: When healing checkin, trigger follow-up
eventBus.on('healing:checkin', async ({ healingId, day }) => {
  console.log(`[Workflow Vivo Eterno] 💚 Healing checkin day ${day} for ${healingId}`);
  
  eventBus.emit('marketing:content_generated', {
    contentType: `healing_day_${day}`,
    platform: 'email',
  });
});

export default eventBus;
