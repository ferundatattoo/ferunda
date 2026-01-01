// Google Analytics 4 + Advanced A/B Testing & Prediction Engine
// Version 2.0 - ULTRA Analytics System

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// ============= A/B TESTING ENGINE =============
interface ABTest {
  id: string;
  name: string;
  variants: string[];
  weights?: number[];
  startDate: Date;
  endDate?: Date;
}

interface ABTestResult {
  testId: string;
  variant: string;
  conversions: number;
  impressions: number;
  conversionRate: number;
}

// Active A/B tests
const activeTests: ABTest[] = [
  {
    id: 'hero_cta_v2',
    name: 'Hero CTA Button Text',
    variants: ['Book Consultation', 'Start Your Journey', 'Get Tattooed'],
    weights: [0.34, 0.33, 0.33],
    startDate: new Date('2025-01-01'),
  },
  {
    id: 'pricing_display_v1',
    name: 'Pricing Display Style',
    variants: ['range', 'starting_from', 'hourly_rate'],
    weights: [0.34, 0.33, 0.33],
    startDate: new Date('2025-01-01'),
  },
  {
    id: 'booking_flow_v3',
    name: 'Booking Flow Variant',
    variants: ['wizard', 'single_page', 'concierge'],
    weights: [0.34, 0.33, 0.33],
    startDate: new Date('2025-01-01'),
  },
];

// Get user's assigned variant (consistent per user)
export const getABTestVariant = (testId: string): string | null => {
  const test = activeTests.find(t => t.id === testId);
  if (!test) return null;

  // Check localStorage for existing assignment
  const storageKey = `ab_test_${testId}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (test.variants.includes(parsed.variant)) {
        return parsed.variant;
      }
    } catch {}
  }

  // Assign new variant based on weights
  const random = Math.random();
  const weights = test.weights || test.variants.map(() => 1 / test.variants.length);
  let cumulative = 0;
  let assignedVariant = test.variants[0];

  for (let i = 0; i < test.variants.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      assignedVariant = test.variants[i];
      break;
    }
  }

  // Store assignment
  localStorage.setItem(storageKey, JSON.stringify({
    variant: assignedVariant,
    assignedAt: new Date().toISOString(),
  }));

  // Track impression
  trackABTestImpression(testId, assignedVariant);

  return assignedVariant;
};

// Track A/B test impression
export const trackABTestImpression = (testId: string, variant: string) => {
  trackEvent('ab_test_impression', {
    test_id: testId,
    variant: variant,
    timestamp: new Date().toISOString(),
  });
};

// Track A/B test conversion
export const trackABTestConversion = (testId: string, conversionType: string) => {
  const storageKey = `ab_test_${testId}`;
  const stored = localStorage.getItem(storageKey);
  if (!stored) return;

  try {
    const parsed = JSON.parse(stored);
    trackEvent('ab_test_conversion', {
      test_id: testId,
      variant: parsed.variant,
      conversion_type: conversionType,
      timestamp: new Date().toISOString(),
    });
  } catch {}
};

// ============= PREDICTIVE ANALYTICS ENGINE =============
interface UserBehaviorSignal {
  timestamp: Date;
  action: string;
  value?: number;
  metadata?: Record<string, any>;
}

interface PredictionResult {
  willBook: number; // 0-1 probability
  estimatedValue: number;
  recommendedAction: string;
  confidence: number;
  factors: string[];
}

// Collect behavior signals
const behaviorSignals: UserBehaviorSignal[] = [];

export const recordBehaviorSignal = (action: string, value?: number, metadata?: Record<string, any>) => {
  const signal: UserBehaviorSignal = {
    timestamp: new Date(),
    action,
    value,
    metadata,
  };
  behaviorSignals.push(signal);

  // Limit stored signals
  if (behaviorSignals.length > 100) {
    behaviorSignals.shift();
  }

  // Store in sessionStorage for persistence
  try {
    sessionStorage.setItem('behavior_signals', JSON.stringify(behaviorSignals.slice(-50)));
  } catch {}

  // Auto-predict after significant signals
  if (['gallery_view', 'booking_start', 'pricing_view', 'style_select'].includes(action)) {
    const prediction = predictBookingProbability();
    if (prediction.willBook > 0.7) {
      triggerHighIntentAction(prediction);
    }
  }
};

// Calculate booking probability based on behavior
export const predictBookingProbability = (): PredictionResult => {
  const factors: string[] = [];
  let score = 0.1; // Base probability

  // Time on site factor
  const firstSignal = behaviorSignals[0];
  if (firstSignal) {
    const timeOnSite = (Date.now() - firstSignal.timestamp.getTime()) / 1000 / 60; // minutes
    if (timeOnSite > 3) {
      score += 0.15;
      factors.push('extended_engagement');
    }
    if (timeOnSite > 7) {
      score += 0.1;
      factors.push('deep_engagement');
    }
  }

  // Gallery engagement
  const galleryViews = behaviorSignals.filter(s => s.action === 'gallery_view').length;
  if (galleryViews >= 3) {
    score += 0.15;
    factors.push('gallery_interest');
  }
  if (galleryViews >= 6) {
    score += 0.1;
    factors.push('high_gallery_engagement');
  }

  // Pricing interaction
  const pricingViews = behaviorSignals.filter(s => s.action === 'pricing_view').length;
  if (pricingViews > 0) {
    score += 0.2;
    factors.push('pricing_research');
  }

  // Booking flow started
  const bookingStart = behaviorSignals.find(s => s.action === 'booking_start');
  if (bookingStart) {
    score += 0.25;
    factors.push('booking_initiated');
  }

  // Style preference selected
  const styleSelect = behaviorSignals.find(s => s.action === 'style_select');
  if (styleSelect) {
    score += 0.1;
    factors.push('style_preference');
  }

  // Contact form partial
  const formPartial = behaviorSignals.find(s => s.action === 'form_field_focus');
  if (formPartial) {
    score += 0.15;
    factors.push('form_engagement');
  }

  // Return visit
  const isReturn = localStorage.getItem('ferunda_visited') === 'true';
  if (isReturn) {
    score += 0.15;
    factors.push('returning_visitor');
  } else {
    localStorage.setItem('ferunda_visited', 'true');
  }

  // Mobile user
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (isMobile && galleryViews >= 2) {
    score += 0.05;
    factors.push('mobile_engaged');
  }

  // Scroll depth
  const deepScroll = behaviorSignals.find(s => s.action === 'scroll_depth' && (s.value || 0) > 75);
  if (deepScroll) {
    score += 0.1;
    factors.push('deep_scroll');
  }

  // Cap at 0.95
  score = Math.min(score, 0.95);

  // Determine recommended action
  let recommendedAction = 'show_exit_popup';
  if (score > 0.7) {
    recommendedAction = 'show_booking_assistant';
  } else if (score > 0.5) {
    recommendedAction = 'highlight_gallery';
  } else if (score > 0.3) {
    recommendedAction = 'show_testimonials';
  }

  // Estimated booking value based on style preference
  const styleMetadata = styleSelect?.metadata as Record<string, any> | undefined;
  let estimatedValue = 500;
  if (styleMetadata?.style === 'full_sleeve') {
    estimatedValue = 3500;
  } else if (styleMetadata?.style === 'large_piece') {
    estimatedValue = 1500;
  } else if (styleMetadata?.style === 'medium') {
    estimatedValue = 800;
  }

  return {
    willBook: score,
    estimatedValue,
    recommendedAction,
    confidence: Math.min(0.9, factors.length * 0.15),
    factors,
  };
};

// Trigger action for high-intent users
const triggerHighIntentAction = (prediction: PredictionResult) => {
  // Emit custom event for components to react
  window.dispatchEvent(new CustomEvent('high_intent_detected', {
    detail: prediction
  }));

  // Track this moment
  trackEvent('high_intent_detected', {
    probability: prediction.willBook,
    recommended_action: prediction.recommendedAction,
    factors: prediction.factors.join(','),
  });
};

// ============= DEMAND PREDICTION =============
interface DemandPrediction {
  date: string;
  predictedBookings: number;
  confidence: number;
  factors: string[];
  recommendedActions: string[];
}

export const predictDemand = async (daysAhead: number = 30): Promise<DemandPrediction[]> => {
  const predictions: DemandPrediction[] = [];
  const baseDate = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + i);
    
    const dayOfWeek = targetDate.getDay();
    const month = targetDate.getMonth();
    const factors: string[] = [];
    let baseScore = 2; // Average daily bookings

    // Weekend boost
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      baseScore *= 0.7; // Lower on weekends (people browse, book later)
      factors.push('weekend_slowdown');
    }

    // Friday/Thursday boost (people plan weekends)
    if (dayOfWeek === 4 || dayOfWeek === 5) {
      baseScore *= 1.3;
      factors.push('end_of_week_boost');
    }

    // Seasonal adjustments
    if (month >= 3 && month <= 5) { // Spring
      baseScore *= 1.2;
      factors.push('spring_season');
    } else if (month >= 6 && month <= 8) { // Summer
      baseScore *= 1.4;
      factors.push('summer_peak');
    } else if (month === 11) { // December
      baseScore *= 0.8;
      factors.push('holiday_slowdown');
    }

    // First of month boost (people get paid)
    if (targetDate.getDate() <= 5) {
      baseScore *= 1.15;
      factors.push('payday_period');
    }

    // Recommended actions based on prediction
    const recommendedActions: string[] = [];
    if (baseScore < 1.5) {
      recommendedActions.push('run_flash_sale');
      recommendedActions.push('increase_social_posts');
      recommendedActions.push('send_waitlist_offers');
    } else if (baseScore > 3) {
      recommendedActions.push('extend_hours');
      recommendedActions.push('pause_promotions');
    }

    predictions.push({
      date: targetDate.toISOString().split('T')[0],
      predictedBookings: Math.round(baseScore * 10) / 10,
      confidence: 0.7 + (Math.random() * 0.2), // 70-90% confidence
      factors,
      recommendedActions,
    });
  }

  return predictions;
};

// ============= CONVERSION FUNNEL TRACKING =============
export const trackFunnelStep = (step: string, metadata?: Record<string, any>) => {
  const funnelSteps = [
    'visit',
    'gallery_view',
    'style_explore',
    'pricing_view',
    'booking_click',
    'form_start',
    'form_complete',
    'deposit_view',
    'deposit_paid',
    'session_complete',
  ];

  const stepIndex = funnelSteps.indexOf(step);
  
  recordBehaviorSignal(step, stepIndex, metadata);
  
  trackEvent('funnel_step', {
    step_name: step,
    step_index: stepIndex,
    ...metadata,
  });

  // Track drop-off potential
  if (stepIndex >= 4 && stepIndex <= 7) {
    const prediction = predictBookingProbability();
    if (prediction.willBook < 0.4) {
      trackEvent('potential_drop_off', {
        step: step,
        probability: prediction.willBook,
      });
    }
  }
};

// ============= SCROLL TRACKING =============
let maxScrollDepth = 0;

export const initScrollTracking = () => {
  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentDepth = Math.round((window.scrollY / scrollHeight) * 100);
    
    if (currentDepth > maxScrollDepth) {
      maxScrollDepth = currentDepth;
      
      // Track milestones
      if ([25, 50, 75, 90].includes(currentDepth)) {
        recordBehaviorSignal('scroll_depth', currentDepth);
        trackEvent('scroll_depth', {
          depth: currentDepth,
        });
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
};

// ============= SESSION RECORDING MARKERS =============
export const markSessionMoment = (label: string, important: boolean = false) => {
  const timestamp = Date.now();
  trackEvent('session_marker', {
    label,
    important,
    timestamp,
    scroll_position: window.scrollY,
    viewport_height: window.innerHeight,
  });
};

// ============= STANDARD GA4 TRACKING (PRESERVED) =============

// Track custom events
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, parameters);
    console.log("GA Event:", eventName, parameters);
  }
};

// Track contact form submission
export const trackContactFormSubmission = (formData: {
  hasPhone: boolean;
  hasPrefill: boolean;
}) => {
  trackEvent("contact_form_submit", {
    event_category: "engagement",
    event_label: "Contact Form",
    has_phone: formData.hasPhone,
    has_prefill: formData.hasPrefill,
  });
  
  trackFunnelStep('form_complete');
  trackABTestConversion('booking_flow_v3', 'form_submit');
};

// Track booking click
export const trackBookingClick = (source: string) => {
  trackEvent("booking_click", {
    event_category: "conversion",
    event_label: source,
    value: 1,
  });
  
  trackFunnelStep('booking_click', { source });
  recordBehaviorSignal('booking_start', 1, { source });
};

// Track WhatsApp click
export const trackWhatsAppClick = (source: string) => {
  trackEvent("whatsapp_click", {
    event_category: "engagement",
    event_label: source,
  });
  
  recordBehaviorSignal('whatsapp_contact', 1, { source });
};

// Track navigation clicks
export const trackNavigationClick = (destination: string) => {
  trackEvent("navigation_click", {
    event_category: "navigation",
    event_label: destination,
  });
};

// Track modal open
export const trackModalOpen = (modalName: string) => {
  trackEvent("modal_open", {
    event_category: "engagement",
    event_label: modalName,
  });
  
  recordBehaviorSignal('modal_view', 1, { modal: modalName });
};

// Track gallery interactions
export const trackGalleryView = (imageId: string, style?: string) => {
  recordBehaviorSignal('gallery_view', 1, { imageId, style });
  trackFunnelStep('gallery_view');
  trackEvent('gallery_image_view', {
    image_id: imageId,
    style: style,
  });
};

// Track style selection
export const trackStyleSelect = (style: string) => {
  recordBehaviorSignal('style_select', 1, { style });
  trackFunnelStep('style_explore', { style });
  trackEvent('style_selected', {
    style: style,
  });
};

// Track pricing view
export const trackPricingView = (section?: string) => {
  recordBehaviorSignal('pricing_view', 1, { section });
  trackFunnelStep('pricing_view');
  trackEvent('pricing_viewed', {
    section: section,
  });
};

// Initialize all tracking
export const initializeAnalytics = () => {
  // Start scroll tracking
  initScrollTracking();
  
  // Record initial visit
  trackFunnelStep('visit');
  recordBehaviorSignal('page_load', 1, {
    referrer: document.referrer,
    url: window.location.href,
  });

  // Listen for high intent events
  window.addEventListener('high_intent_detected', (e: CustomEvent) => {
    console.log('🎯 High Intent Detected:', e.detail);
  });

  console.log('📊 Advanced Analytics v2.0 initialized');
};
