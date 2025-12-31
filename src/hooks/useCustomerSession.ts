import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateFingerprint } from './useDeviceFingerprint';

interface CustomerSession {
  token: string;
  expiresAt: number;
  bookingId: string;
  permissions: CustomerPermissions;
}

interface CustomerPermissions {
  can_view: boolean;
  can_message: boolean;
  can_upload: boolean;
  can_pay: boolean;
  can_reschedule: boolean;
}

interface BookingData {
  id: string;
  name: string;
  email?: string;
  status: string;
  pipeline_stage: string;
  tattoo_description: string;
  size: string;
  placement: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  deposit_amount: number;
  deposit_paid: boolean;
  total_paid: number;
  session_rate: number;
  reference_images: string[];
  reference_images_customer: any[];
  requested_city: string;
  created_at: string;
}

interface CustomerMessage {
  id: string;
  sender_type: 'customer' | 'artist';
  content: string;
  is_read: boolean;
  created_at: string;
}

interface CustomerPayment {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface UseCustomerSessionResult {
  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  booking: BookingData | null;
  permissions: CustomerPermissions | null;
  messages: CustomerMessage[];
  payments: CustomerPayment[];
  unreadMessages: number;
  sessionExpiresAt: number | null;
  
  // Actions
  validateMagicLink: (token: string) => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchBooking: () => Promise<void>;
  fetchMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<boolean>;
  uploadReference: (file: File) => Promise<{ success: boolean; error?: string; remaining?: number }>;
  requestPayment: (amount: number, paymentType?: string) => Promise<{ success: boolean; payment_url?: string; error?: string }>;
  requestReschedule: (requestedDate: string, requestedTime: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  fetchPayments: () => Promise<void>;
}

// Session stored in memory only (more secure than localStorage)
let sessionRef: CustomerSession | null = null;
let fingerprintRef: string | null = null;

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REFRESH_THRESHOLD = 60 * 60 * 1000; // Refresh if less than 1 hour left

export function useCustomerSession(): UseCustomerSessionResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [sessionState, setSessionState] = useState<CustomerSession | null>(null);
  
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get base URL for backend function (customer portal)
  const getApiUrl = useCallback((action: string) => {
    const backendUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    return `${backendUrl}/functions/v1/customer-portal?action=${action}`;
  }, []);

  // Get headers with session token and fingerprint
  const getHeaders = useCallback(async () => {
    if (!fingerprintRef) {
      fingerprintRef = await generateFingerprint();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-fingerprint': fingerprintRef,
      // Lovable Cloud uses VITE_SUPABASE_PUBLISHABLE_KEY (not ANON_KEY)
      'apikey': (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };

    if (sessionRef?.token) {
      headers['x-session-token'] = sessionRef.token;
    }

    return headers;
  }, []);
  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    if (sessionRef) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('Session expired due to inactivity');
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  }, []);

  // Setup activity listeners
  useEffect(() => {
    const handleActivity = () => resetInactivityTimer();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Validate magic link and create session
  const validateMagicLink = useCallback(async (token: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate fingerprint
      fingerprintRef = await generateFingerprint();
      
      const response = await fetch(getApiUrl('validate-magic-link'), {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Invalid magic link');
        return false;
      }
      
      // Store session in memory
      sessionRef = {
        token: data.sessionToken,
        expiresAt: data.expiresAt,
        bookingId: data.booking.id,
        permissions: data.permissions
      };
      
      setSessionState(sessionRef);
      setBooking(data.booking);
      resetInactivityTimer();
      
      // Setup auto-refresh
      const timeUntilExpiry = (data.expiresAt * 1000) - Date.now();
      const refreshTime = timeUntilExpiry - REFRESH_THRESHOLD;
      
      if (refreshTime > 0) {
        refreshTimerRef.current = setTimeout(() => {
          refreshSession();
        }, refreshTime);
      }
      
      return true;
    } catch (err) {
      console.error('Magic link validation error:', err);
      setError('Failed to validate magic link');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getApiUrl, getHeaders, resetInactivityTimer]);

  // Refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!sessionRef) return false;
    
    try {
      const response = await fetch(getApiUrl('refresh-session'), {
        method: 'POST',
        headers: await getHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Session refresh failed:', data.error);
        await logout();
        return false;
      }
      
      sessionRef = {
        ...sessionRef,
        token: data.sessionToken,
        expiresAt: data.expiresAt,
        permissions: data.permissions
      };
      
      setSessionState(sessionRef);
      
      // Setup next refresh
      const timeUntilExpiry = (data.expiresAt * 1000) - Date.now();
      const refreshTime = timeUntilExpiry - REFRESH_THRESHOLD;
      
      if (refreshTime > 0) {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          refreshSession();
        }, refreshTime);
      }
      
      return true;
    } catch (err) {
      console.error('Session refresh error:', err);
      return false;
    }
  }, [getApiUrl, getHeaders]);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (sessionRef) {
        await fetch(getApiUrl('logout'), {
          method: 'POST',
          headers: await getHeaders()
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      sessionRef = null;
      fingerprintRef = null;
      setSessionState(null);
      setBooking(null);
      setMessages([]);
      setPayments([]);
      setUnreadMessages(0);
      
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    }
  }, [getApiUrl, getHeaders]);

  // Fetch booking details
  const fetchBooking = useCallback(async (): Promise<void> => {
    if (!sessionRef) return;
    
    try {
      const response = await fetch(getApiUrl('get-booking'), {
        method: 'GET',
        headers: await getHeaders()
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBooking(data.booking);
        setPayments(data.payments || []);
        setUnreadMessages(data.unreadMessages || 0);
        
        // Update permissions
        if (data.permissions && sessionRef) {
          sessionRef.permissions = data.permissions;
          setSessionState({ ...sessionRef });
        }
      }
    } catch (err) {
      console.error('Fetch booking error:', err);
    }
  }, [getApiUrl, getHeaders]);

  // Fetch messages
  const fetchMessages = useCallback(async (): Promise<void> => {
    if (!sessionRef) return;
    
    try {
      const response = await fetch(getApiUrl('get-messages'), {
        method: 'GET',
        headers: await getHeaders()
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
        setUnreadMessages(0); // Messages marked as read when fetched
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  }, [getApiUrl, getHeaders]);

  // Send message
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!sessionRef) return false;
    
    try {
      const response = await fetch(getApiUrl('send-message'), {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ content })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Add message to local state
        setMessages(prev => [...prev, data.message]);
        resetInactivityTimer();
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch (err) {
      console.error('Send message error:', err);
      return false;
    }
  }, [getApiUrl, getHeaders, resetInactivityTimer]);

  // Upload reference
  const uploadReference = useCallback(async (file: File): Promise<{ success: boolean; error?: string; remaining?: number }> => {
    if (!sessionRef) return { success: false, error: 'Not authenticated' };
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Get fingerprint
      if (!fingerprintRef) {
        fingerprintRef = await generateFingerprint();
      }
      
      const response = await fetch(getApiUrl('upload-reference'), {
        method: 'POST',
        headers: {
          'x-session-token': sessionRef.token,
          'x-fingerprint': fingerprintRef,
          'apikey': (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: formData
      });

      
      const data = await response.json();
      
      if (response.ok) {
        // Refresh booking to get updated references
        await fetchBooking();
        resetInactivityTimer();
        return { success: true, remaining: data.remaining };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Upload reference error:', err);
      return { success: false, error: 'Upload failed' };
    }
  }, [getApiUrl, fetchBooking, resetInactivityTimer]);

  // Request payment
  const requestPayment = useCallback(async (amount: number, paymentType?: string): Promise<{ success: boolean; payment_url?: string; error?: string }> => {
    if (!sessionRef) return { success: false, error: 'Not authenticated' };
    
    try {
      const response = await fetch(getApiUrl('request-payment'), {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ amount, payment_type: paymentType })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        resetInactivityTimer();
        return { success: true, payment_url: data.payment_url };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Request payment error:', err);
      return { success: false, error: 'Payment request failed' };
    }
  }, [getApiUrl, getHeaders, resetInactivityTimer]);

  // Request reschedule
  const requestReschedule = useCallback(async (requestedDate: string, requestedTime: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!sessionRef) return { success: false, error: 'Not authenticated' };
    
    try {
      const response = await fetch(getApiUrl('request-reschedule'), {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ requested_date: requestedDate, requested_time: requestedTime, reason })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        resetInactivityTimer();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Request reschedule error:', err);
      return { success: false, error: 'Reschedule request failed' };
    }
  }, [getApiUrl, getHeaders, resetInactivityTimer]);

  // Fetch payments
  const fetchPayments = useCallback(async (): Promise<void> => {
    if (!sessionRef) return;
    
    try {
      const response = await fetch(getApiUrl('get-payments'), {
        method: 'GET',
        headers: await getHeaders()
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Fetch payments error:', err);
    }
  }, [getApiUrl, getHeaders]);

  // Initial load - check for existing session
  useEffect(() => {
    if (sessionRef) {
      setSessionState(sessionRef);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    isAuthenticated: !!sessionState,
    error,
    booking,
    permissions: sessionState?.permissions || null,
    messages,
    payments,
    unreadMessages,
    sessionExpiresAt: sessionState?.expiresAt || null,
    
    validateMagicLink,
    refreshSession,
    logout,
    fetchBooking,
    fetchMessages,
    sendMessage,
    uploadReference,
    requestPayment,
    requestReschedule,
    fetchPayments
  };
}
