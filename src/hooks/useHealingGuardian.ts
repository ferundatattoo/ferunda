import { useState, useCallback } from 'react';
import { generateFingerprint } from './useDeviceFingerprint';

interface HealingEntry {
  id: string;
  day_number: number;
  photo_url: string | null;
  client_notes: string | null;
  ai_health_score: number | null;
  ai_healing_stage: string | null;
  ai_concerns: string[] | null;
  ai_recommendations: string | null;
  ai_confidence: number | null;
  requires_attention: boolean | null;
  artist_response: string | null;
  created_at: string;
}

interface HealingCertificate {
  id: string;
  certificate_number: string;
  final_health_score: number;
  total_photos: number;
  healing_duration_days: number;
  generated_at: string;
  download_url: string | null;
  certificate_data: any;
}

interface UseHealingGuardianResult {
  healingEntries: HealingEntry[];
  certificate: HealingCertificate | null;
  isLoading: boolean;
  error: string | null;
  fetchHealingData: (sessionToken: string) => Promise<void>;
  uploadHealingPhoto: (sessionToken: string, file: File, dayNumber: number, notes: string) => Promise<{ success: boolean; error?: string }>;
  analyzeHealingPhoto: (sessionToken: string, entryId: string) => Promise<{ success: boolean; error?: string }>;
  requestCertificate: (sessionToken: string) => Promise<{ success: boolean; error?: string }>;
}

let fingerprintRef: string | null = null;

export function useHealingGuardian(): UseHealingGuardianResult {
  const [healingEntries, setHealingEntries] = useState<HealingEntry[]>([]);
  const [certificate, setCertificate] = useState<HealingCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApiUrl = useCallback((action: string) => {
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/customer-portal?action=${action}`;
  }, []);

  const getHeaders = useCallback(async (sessionToken: string) => {
    if (!fingerprintRef) {
      fingerprintRef = await generateFingerprint();
    }
    
    return {
      'Content-Type': 'application/json',
      'x-fingerprint': fingerprintRef,
      'x-session-token': sessionToken,
      'apikey': (import.meta as any).env.VITE_SUPABASE_ANON_KEY,
    };
  }, []);

  const fetchHealingData = useCallback(async (sessionToken: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(getApiUrl('get-healing-entries'), {
        method: 'GET',
        headers: await getHeaders(sessionToken)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setHealingEntries(data.entries || []);
        setCertificate(data.certificate || null);
      } else {
        setError(data.error || 'Failed to fetch healing data');
      }
    } catch (err) {
      console.error('Fetch healing data error:', err);
      setError('Failed to fetch healing data');
    } finally {
      setIsLoading(false);
    }
  }, [getApiUrl, getHeaders]);

  const uploadHealingPhoto = useCallback(async (
    sessionToken: string, 
    file: File, 
    dayNumber: number, 
    notes: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!fingerprintRef) {
        fingerprintRef = await generateFingerprint();
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('day_number', dayNumber.toString());
      formData.append('client_notes', notes);
      
      const response = await fetch(getApiUrl('upload-healing-photo'), {
        method: 'POST',
        headers: {
          'x-session-token': sessionToken,
          'x-fingerprint': fingerprintRef,
          'apikey': (import.meta as any).env.VITE_SUPABASE_ANON_KEY,
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Upload healing photo error:', err);
      return { success: false, error: 'Upload failed' };
    }
  }, [getApiUrl]);

  const analyzeHealingPhoto = useCallback(async (
    sessionToken: string, 
    entryId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(getApiUrl('analyze-healing-photo-customer'), {
        method: 'POST',
        headers: await getHeaders(sessionToken),
        body: JSON.stringify({ entry_id: entryId })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Analyze healing photo error:', err);
      return { success: false, error: 'Analysis failed' };
    }
  }, [getApiUrl, getHeaders]);

  const requestCertificate = useCallback(async (
    sessionToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(getApiUrl('request-certificate'), {
        method: 'POST',
        headers: await getHeaders(sessionToken)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCertificate(data.certificate);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Request certificate error:', err);
      return { success: false, error: 'Certificate request failed' };
    }
  }, [getApiUrl, getHeaders]);

  return {
    healingEntries,
    certificate,
    isLoading,
    error,
    fetchHealingData,
    uploadHealingPhoto,
    analyzeHealingPhoto,
    requestCertificate
  };
}
