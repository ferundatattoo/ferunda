import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ConversionEvent = 
  | 'page_view'
  | 'chat_opened'
  | 'message_sent'
  | 'image_uploaded'
  | 'image_analyzed'
  | 'sketch_viewed'
  | 'sketch_generated'
  | 'ar_opened'
  | 'ar_interacted'
  | 'booking_started'
  | 'deposit_initiated'
  | 'deposit_paid'
  | 'booking_confirmed';

interface ConversionPrediction {
  probability: number;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
  recommendedActions: string[];
}

interface Nudge {
  id: string;
  message: string;
  type: 'info' | 'urgency' | 'social_proof' | 'value';
  cta?: string;
}

export function useConversionTracking(sessionId?: string) {
  const [prediction, setPrediction] = useState<ConversionPrediction | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [conversionScore, setConversionScore] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);

  // Track a conversion event
  const trackEvent = useCallback(async (
    eventName: ConversionEvent,
    metadata: Record<string, unknown> = {}
  ) => {
    if (!sessionId) return;
    
    setIsTracking(true);
    try {
      const { data, error } = await supabase.functions.invoke('conversion-engine', {
        body: {
          action: 'track_event',
          session_id: sessionId,
          event_name: eventName,
          event_value: 1,
          metadata
        }
      });

      if (error) throw error;
      
      // Update local conversion score
      if (data?.session_score) {
        setConversionScore(data.session_score);
      }

      console.log(`[Conversion] Tracked: ${eventName}`, metadata);
    } catch (err) {
      console.error('[useConversionTracking] Track error:', err);
    } finally {
      setIsTracking(false);
    }
  }, [sessionId]);

  // Get conversion prediction
  const getPrediction = useCallback(async (): Promise<ConversionPrediction | null> => {
    if (!sessionId) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('conversion-engine', {
        body: {
          action: 'predict_conversion',
          session_id: sessionId
        }
      });

      if (error) throw error;
      
      const pred: ConversionPrediction = {
        probability: data.probability || 0.5,
        confidence: data.confidence || 0.7,
        factors: data.factors || [],
        recommendedActions: data.recommended_actions || []
      };
      
      setPrediction(pred);
      return pred;
    } catch (err) {
      console.error('[useConversionTracking] Prediction error:', err);
      return null;
    }
  }, [sessionId]);

  // Get contextual nudge
  const getNudge = useCallback(async (): Promise<Nudge | null> => {
    if (!sessionId) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('conversion-engine', {
        body: {
          action: 'get_nudge',
          session_id: sessionId,
          context: 'chat'
        }
      });

      if (error) throw error;
      
      if (data?.nudge) {
        const nudgeData: Nudge = {
          id: data.nudge.id || crypto.randomUUID(),
          message: data.nudge.message || '',
          type: data.nudge.type || 'info',
          cta: data.nudge.cta
        };
        setNudge(nudgeData);
        return nudgeData;
      }
      return null;
    } catch (err) {
      console.error('[useConversionTracking] Nudge error:', err);
      return null;
    }
  }, [sessionId]);

  // Record A/B test outcome
  const recordOutcome = useCallback(async (
    testKey: string,
    outcome: 'success' | 'failure',
    value?: number
  ) => {
    if (!sessionId) return;
    
    try {
      await supabase.functions.invoke('conversion-engine', {
        body: {
          action: 'record_outcome',
          session_id: sessionId,
          test_key: testKey,
          outcome,
          value
        }
      });
    } catch (err) {
      console.error('[useConversionTracking] Outcome error:', err);
    }
  }, [sessionId]);

  // Get A/B test variant
  const getVariant = useCallback(async (testKey: string): Promise<string | null> => {
    if (!sessionId) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('conversion-engine', {
        body: {
          action: 'ab_test',
          session_id: sessionId,
          test_key: testKey
        }
      });

      if (error) throw error;
      return data?.variant || null;
    } catch (err) {
      console.error('[useConversionTracking] AB test error:', err);
      return null;
    }
  }, [sessionId]);

  // Auto-fetch prediction when sessionId changes
  useEffect(() => {
    if (sessionId) {
      getPrediction();
    }
  }, [sessionId, getPrediction]);

  return {
    // State
    prediction,
    nudge,
    conversionScore,
    isTracking,
    
    // Methods
    trackEvent,
    getPrediction,
    getNudge,
    recordOutcome,
    getVariant,
    
    // Convenience trackers
    trackChatOpened: () => trackEvent('chat_opened'),
    trackMessageSent: (messageLength: number) => trackEvent('message_sent', { length: messageLength }),
    trackImageUploaded: (count: number) => trackEvent('image_uploaded', { count }),
    trackSketchViewed: () => trackEvent('sketch_viewed'),
    trackAROpened: () => trackEvent('ar_opened'),
    trackBookingStarted: () => trackEvent('booking_started'),
    trackDepositPaid: (amount: number) => trackEvent('deposit_paid', { amount })
  };
}

export default useConversionTracking;
