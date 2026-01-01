import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  booking_id: string | null;
  city_id: string | null;
  description: string | null;
  is_synced: boolean | null;
  external_id: string | null;
  state: string | null;
}

interface Availability {
  id: string;
  date: string;
  city: string;
  city_id: string | null;
  is_available: boolean;
  time_slots: Json | null;
  notes: string | null;
  artist_id: string | null;
}

export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      let query = supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time, event_type, booking_id, city_id, description, is_synced, external_id, state')
        .order('start_time', { ascending: true });

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('end_time', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          event_type: event.event_type,
          booking_id: event.booking_id,
          city_id: event.city_id,
          description: event.description
        })
        .select()
        .single();

      if (error) throw error;
      await fetchEvents();
      return data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchEvents();
      return data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  };

  return { events, loading, refetch: fetchEvents, createEvent, updateEvent, deleteEvent };
}

export function useAvailability(artistId?: string, month?: Date) {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAvailability = useCallback(async () => {
    try {
      let query = supabase
        .from('availability')
        .select('id, date, city, city_id, is_available, time_slots, notes, artist_id')
        .order('date', { ascending: true });

      if (artistId) {
        query = query.eq('artist_id', artistId);
      }

      if (month) {
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        query = query
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  }, [artistId, month]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const setDateAvailability = async (date: string, city: string, isAvailable: boolean, slots?: Json) => {
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('availability')
        .select('id')
        .eq('date', date)
        .eq('city', city)
        .single();

      if (existing) {
        await supabase
          .from('availability')
          .update({
            is_available: isAvailable,
            time_slots: slots
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('availability')
          .insert({
            date,
            city,
            is_available: isAvailable,
            time_slots: slots,
            artist_id: artistId
          });
      }
      
      await fetchAvailability();
    } catch (error) {
      console.error('Error setting availability:', error);
      throw error;
    }
  };

  return { availability, loading, refetch: fetchAvailability, setDateAvailability };
}

export function useGoogleCalendarSync() {
  const [syncStatus, setSyncStatus] = useState<{
    connected: boolean;
    lastSyncAt: string | null;
    calendarId: string | null;
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('calendar_sync_tokens')
        .select('calendar_id, last_sync_at, sync_errors, is_active')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setSyncStatus(data ? {
        connected: data.is_active || false,
        lastSyncAt: data.last_sync_at,
        calendarId: data.calendar_id,
        errors: data.sync_errors || []
      } : null);
    } catch (error) {
      console.error('Error checking sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    try {
      const response = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync' }
      });

      if (response.error) throw response.error;
      
      await checkSyncStatus();
      return response.data;
    } catch (error) {
      console.error('Error triggering sync:', error);
      throw error;
    }
  };

  return { syncStatus, loading, checkSyncStatus, triggerSync };
}
