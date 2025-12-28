// Google Analytics 4 Tracking Utilities

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

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
};

// Track booking click
export const trackBookingClick = (source: string) => {
  trackEvent("booking_click", {
    event_category: "conversion",
    event_label: source,
    value: 1,
  });
};

// Track WhatsApp click
export const trackWhatsAppClick = (source: string) => {
  trackEvent("whatsapp_click", {
    event_category: "engagement",
    event_label: source,
  });
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
};
