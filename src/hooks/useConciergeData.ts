import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface ConversationStats {
  total: number;
  converted: number;
  pending: number;
  conversionRate: number;
  avgMessagesPerConversation: number;
}

export function useConversationStats() {
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id, converted, message_count');

      if (conversations) {
        const total = conversations.length;
        const converted = conversations.filter(c => c.converted).length;
        const pending = conversations.filter(c => !c.converted).length;
        const avgMessages = total > 0 
          ? Math.round(conversations.reduce((sum, c) => sum + (c.message_count || 0), 0) / total)
          : 0;

        setStats({
          total,
          converted,
          pending,
          conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
          avgMessagesPerConversation: avgMessages
        });
      }
    } catch (error) {
      console.error('Error fetching conversation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
}

export function useTattooBriefs(limit = 20) {
  const [briefs, setBriefs] = useState<{
    id: string;
    conversation_id: string | null;
    style: string | null;
    placement: string | null;
    subject: string | null;
    color_type: string | null;
    size_estimate_inches_min: number | null;
    size_estimate_inches_max: number | null;
    created_at: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBriefs();
  }, [limit]);

  const fetchBriefs = async () => {
    try {
      const { data, error } = await supabase
        .from('tattoo_briefs')
        .select('id, conversation_id, style, placement, subject, color_type, size_estimate_inches_min, size_estimate_inches_max, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setBriefs(data || []);
    } catch (error) {
      console.error('Error fetching tattoo briefs:', error);
    } finally {
      setLoading(false);
    }
  };

  return { briefs, loading, refetch: fetchBriefs };
}

export function useArtistPublicFacts(artistId?: string) {
  const [facts, setFacts] = useState<{
    display_name: string;
    specialties: Json;
    languages: Json;
    booking_model: Json;
    brand_positioning: Json;
    public_links: Json;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (artistId) {
      fetchFacts();
    }
  }, [artistId]);

  const fetchFacts = async () => {
    if (!artistId) return;
    
    try {
      const { data, error } = await supabase
        .from('artist_public_facts')
        .select('display_name, specialties, languages, booking_model, brand_positioning, public_links')
        .eq('artist_id', artistId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setFacts(data);
    } catch (error) {
      console.error('Error fetching artist facts:', error);
    } finally {
      setLoading(false);
    }
  };

  return { facts, loading, refetch: fetchFacts };
}

export function useGuestSpots() {
  const [spots, setSpots] = useState<{
    id: string;
    city: string;
    country: string;
    date_range_start: string;
    date_range_end: string;
    booking_status: string;
    max_slots: number | null;
    booked_slots: number | null;
    notes: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuestSpots();
  }, []);

  const fetchGuestSpots = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_spot_events')
        .select('id, city, country, date_range_start, date_range_end, booking_status, max_slots, booked_slots, notes')
        .gte('date_range_end', new Date().toISOString().split('T')[0])
        .order('date_range_start', { ascending: true });

      if (error) throw error;
      setSpots(data || []);
    } catch (error) {
      console.error('Error fetching guest spots:', error);
    } finally {
      setLoading(false);
    }
  };

  return { spots, loading, refetch: fetchGuestSpots };
}
