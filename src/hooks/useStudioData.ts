import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StudioMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  activeBookings: number;
  conversionRate: number;
  newClients: number;
  revenueByMonth: { month: string; revenue: number; bookings: number }[];
  artistPerformance: { name: string; bookings: number; revenue: number }[];
}

interface HealingStats {
  totalCheckins: number;
  excellentHealing: number;
  needsAttention: number;
  responded: number;
}

interface AvatarStats {
  totalClones: number;
  readyClones: number;
  videosGenerated: number;
  avgEngagement: number;
}

export function useStudioMetrics() {
  const [metrics, setMetrics] = useState<StudioMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Fetch bookings data
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, deposit_amount, deposit_paid, created_at, status, artist_id');

      // Fetch client profiles
      const { data: clients } = await supabase
        .from('client_profiles')
        .select('id, created_at');

      // Fetch sessions for conversion tracking (using modern concierge_sessions)
      const { data: sessions } = await supabase
        .from('concierge_sessions')
        .select('id, stage');
      
      // Map to expected format
      const conversations = sessions?.map(s => ({
        id: s.id,
        converted: s.stage === 'confirmed',
      }));

      // Calculate metrics
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const monthlyBookings = bookings?.filter(b => {
        const d = new Date(b.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }) || [];

      const paidBookings = bookings?.filter(b => b.deposit_paid) || [];
      const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.deposit_amount || 0), 0);
      const monthlyRevenue = monthlyBookings
        .filter(b => b.deposit_paid)
        .reduce((sum, b) => sum + (b.deposit_amount || 0), 0);

      const activeBookings = bookings?.filter(b => 
        ['pending', 'confirmed', 'scheduled', 'deposit_requested'].includes(b.status)
      ).length || 0;

      const convertedConversations = conversations?.filter(c => c.converted === true).length || 0;
      const totalConversations = conversations?.length || 1;
      const conversionRate = Math.round((convertedConversations / totalConversations) * 100);

      const newClientsThisMonth = clients?.filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length || 0;

      // Revenue by month (last 6 months)
      const revenueByMonth: { month: string; revenue: number; bookings: number }[] = [];
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.getMonth();
        const year = d.getFullYear();
        
        const monthBookings = paidBookings.filter(b => {
          const bd = new Date(b.created_at);
          return bd.getMonth() === month && bd.getFullYear() === year;
        });

        revenueByMonth.push({
          month: monthNames[month],
          revenue: monthBookings.reduce((sum, b) => sum + (b.deposit_amount || 0), 0),
          bookings: monthBookings.length
        });
      }

      // Artist performance (group by artist_id)
      const artistMap = new Map<string, { bookings: number; revenue: number }>();
      paidBookings.forEach(b => {
        const artistId = b.artist_id || 'unassigned';
        const current = artistMap.get(artistId) || { bookings: 0, revenue: 0 };
        artistMap.set(artistId, {
          bookings: current.bookings + 1,
          revenue: current.revenue + (b.deposit_amount || 0)
        });
      });

      const artistPerformance = Array.from(artistMap.entries()).map(([id, data]) => ({
        name: id === 'unassigned' ? 'Sin Asignar' : `Artista ${id.slice(0, 4)}`,
        ...data
      }));

      setMetrics({
        totalRevenue,
        monthlyRevenue,
        activeBookings,
        conversionRate,
        newClients: newClientsThisMonth,
        revenueByMonth,
        artistPerformance
      });
    } catch (error) {
      console.error('Error fetching studio metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, refetch: fetchMetrics };
}

export function useHealingStats() {
  const [stats, setStats] = useState<HealingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await supabase
        .from('healing_progress')
        .select('id, ai_health_score, requires_attention, alert_acknowledged_at, artist_response');

      if (data) {
        setStats({
          totalCheckins: data.length,
          excellentHealing: data.filter(e => (e.ai_health_score || 0) >= 80).length,
          needsAttention: data.filter(e => e.requires_attention && !e.alert_acknowledged_at).length,
          responded: data.filter(e => e.artist_response).length
        });
      }
    } catch (error) {
      console.error('Error fetching healing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
}

export function useAvatarStats() {
  const [stats, setStats] = useState<AvatarStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: clones } = await supabase
        .from('ai_avatar_clones')
        .select('id, voice_clone_status');

      const { data: videos } = await supabase
        .from('ai_avatar_videos')
        .select('id, engagement_score');

      if (clones && videos) {
        const avgEngagement = videos.length > 0
          ? Math.round(videos.reduce((sum, v) => sum + (v.engagement_score || 0), 0) / videos.length)
          : 0;

        setStats({
          totalClones: clones.length,
          readyClones: clones.filter(c => c.voice_clone_status === 'ready').length,
          videosGenerated: videos.length,
          avgEngagement
        });
      }
    } catch (error) {
      console.error('Error fetching avatar stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
}

export function useOmnichannelStats() {
  const [stats, setStats] = useState<{
    total: number;
    whatsapp: number;
    instagram: number;
    web: number;
    escalated: number;
    aiProcessed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await supabase
        .from('omnichannel_messages')
        .select('id, channel, escalated_to_human, ai_processed, status');

      if (data) {
        setStats({
          total: data.length,
          whatsapp: data.filter(m => m.channel === 'whatsapp').length,
          instagram: data.filter(m => m.channel === 'instagram').length,
          web: data.filter(m => m.channel === 'web').length,
          escalated: data.filter(m => m.escalated_to_human && m.status !== 'resolved').length,
          aiProcessed: data.filter(m => m.ai_processed).length
        });
      }
    } catch (error) {
      console.error('Error fetching omnichannel stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, refetch: fetchEvents };
}
