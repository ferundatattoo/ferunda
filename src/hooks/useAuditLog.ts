import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type AuditEntry = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_by: string | null;
  changes_diff: Json | null;
  occurred_at: string;
}

type SecurityAuditEntry = {
  id: string;
  timestamp: string;
  event_type: string;
  action: string;
  actor_type: string | null;
  actor_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  details: Json | null;
}

type BookingActivity = {
  id: string;
  booking_id: string;
  activity_type: string;
  description: string;
  metadata: Json | null;
  created_at: string;
  created_by: string | null;
}

type SecurityAnomaly = {
  anomaly_type: string;
  severity: string;
  description: string;
  affected_count: number;
  details: Json;
}

export function useAuditLog(limit = 50) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog();
  }, [limit]);

  const fetchAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from('policy_audit_log')
        .select('id, entity_type, entity_id, action, changed_by, changes_diff, occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  return { entries, loading, refetch: fetchAuditLog };
}

export function useSecurityAuditLog(limit = 50) {
  const [entries, setEntries] = useState<SecurityAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityLog();
  }, [limit]);

  const fetchSecurityLog = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('id, timestamp, event_type, action, actor_type, actor_id, resource_type, resource_id, ip_address, details')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching security audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  return { entries, loading, refetch: fetchSecurityLog };
}

export function useSecurityAnomalies() {
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectAnomalies();
  }, []);

  const detectAnomalies = async () => {
    try {
      const { data, error } = await supabase.rpc('detect_security_anomalies');
      if (error) throw error;
      setAnomalies((data as SecurityAnomaly[]) || []);
    } catch (error) {
      console.error('Error detecting anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  return { anomalies, loading, refetch: detectAnomalies };
}

export function useBookingActivities(bookingId?: string, limit = 20) {
  const [activities, setActivities] = useState<BookingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [bookingId, limit]);

  const fetchActivities = async () => {
    try {
      let query = supabase
        .from('booking_activities')
        .select('id, booking_id, activity_type, description, metadata, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching booking activities:', error);
    } finally {
      setLoading(false);
    }
  };

  return { activities, loading, refetch: fetchActivities };
}
