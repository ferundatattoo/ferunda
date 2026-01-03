import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEventBus } from '@/lib/eventBus';

interface FinanceMetrics {
  totalDepositsReceived: number;
  totalDepositAmount: number;
  totalRevenue: number;
  pendingDeposits: number;
  pendingDepositAmount: number;
  confirmedBookings: number;
  pendingBookings: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
}

interface PayrollArtist {
  id: string;
  name: string;
  sessions: number;
  revenue: number;
  commission: number;
  commissionRate: number;
}

export function useFinanceData() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [payroll, setPayroll] = useState<PayrollArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventBusRef = useRef(useEventBus());
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('[useFinanceData] Fetching bookings...');
      
      // Fetch bookings data for metrics with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[useFinanceData] Request timeout - aborting');
        controller.abort();
      }, 10000);
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, deposit_paid, deposit_amount, total_paid, created_at, artist_id')
        .order('created_at', { ascending: false })
        .limit(1000)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      if (bookingsError) {
        console.error('[useFinanceData] Bookings error:', bookingsError);
        const errorMsg = bookingsError.code === 'PGRST301' 
          ? 'Sin permisos para ver bookings (RLS)'
          : bookingsError.code === '42501'
          ? 'Acceso denegado a bookings'
          : `Error ${bookingsError.code}: ${bookingsError.message}`;
        setError(errorMsg);
        setLoading(false);
        return;
      }

      console.log('[useFinanceData] Fetched bookings:', bookings?.length || 0);

      // Handle empty data gracefully
      if (!bookings || bookings.length === 0) {
        console.log('[useFinanceData] No bookings found - could be RLS or empty table');
        setMetrics({
          totalDepositsReceived: 0,
          totalDepositAmount: 0,
          totalRevenue: 0,
          pendingDeposits: 0,
          pendingDepositAmount: 0,
          confirmedBookings: 0,
          pendingBookings: 0,
          monthlyRevenue: [],
        });
        setPayroll([]);
        setLoading(false);
        return;
      }

      // Calculate metrics
      const depositsReceived = bookings.filter(b => b.deposit_paid) || [];
      const pendingDeposits = bookings.filter(b => !b.deposit_paid && !['cancelled', 'rejected'].includes(b.status || '')) || [];
      const confirmed = bookings.filter(b => b.status === 'confirmed') || [];
      const pending = bookings.filter(b => b.status === 'pending') || [];

      // Group by month for chart
      const monthlyData: Record<string, { revenue: number; bookings: number }> = {};
      bookings.forEach(b => {
        const month = new Date(b.created_at).toLocaleDateString('es', { month: 'short', year: '2-digit' });
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, bookings: 0 };
        }
        if (b.deposit_paid && b.deposit_amount) {
          monthlyData[month].revenue += Number(b.deposit_amount);
        }
        monthlyData[month].bookings += 1;
      });

      const monthlyRevenue = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data,
      })).slice(-7);

      if (!isMountedRef.current) return;

      setMetrics({
        totalDepositsReceived: depositsReceived.length,
        totalDepositAmount: depositsReceived.reduce((sum, b) => sum + (Number(b.deposit_amount) || 0), 0),
        totalRevenue: bookings.reduce((sum, b) => sum + (Number(b.total_paid) || 0), 0) || 0,
        pendingDeposits: pendingDeposits.length,
        pendingDepositAmount: pendingDeposits.reduce((sum, b) => sum + (Number(b.deposit_amount) || 0), 0),
        confirmedBookings: confirmed.length,
        pendingBookings: pending.length,
        monthlyRevenue,
      });

      // Fetch artists for payroll
      const { data: artists } = await supabase
        .from('studio_artists')
        .select('id, display_name');

      if (!isMountedRef.current) return;

      if (artists && bookings) {
        const artistPayroll = artists.map(artist => {
          const artistBookings = bookings.filter(b => b.artist_id === artist.id && b.deposit_paid);
          const revenue = artistBookings.reduce((sum, b) => sum + (Number(b.deposit_amount) || 0), 0);
          const commissionRate = 0.6; // 60% default
          
          return {
            id: artist.id,
            name: artist.display_name || 'Artist',
            sessions: artistBookings.length,
            revenue,
            commission: revenue * commissionRate,
            commissionRate,
          };
        }).filter(a => a.sessions > 0);
        
        setPayroll(artistPayroll);
      }

    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('[useFinanceData] Error:', err);
      const msg = err?.name === 'AbortError' 
        ? 'Timeout cargando datos financieros'
        : err?.message || 'Error cargando datos financieros';
      setError(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    // Subscribe to relevant events using ref to avoid stale closures
    const eventBus = eventBusRef.current;
    const unsubs = [
      eventBus.on('booking:deposit_paid', fetchData),
      eventBus.on('payment:received', fetchData),
      eventBus.on('payment:refunded', fetchData),
    ];

    return () => {
      isMountedRef.current = false;
      unsubs.forEach(unsub => unsub());
    };
  }, [fetchData]);

  return { metrics, payroll, loading, error, refetch: fetchData };
}

export function useStudioAnalytics() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, status, deposit_paid, deposit_amount, email, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by month
        const monthlyData: Record<string, any> = {};
        data?.forEach(b => {
          const month = new Date(b.created_at).toLocaleDateString('es', { month: 'short' });
          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              total_bookings: 0,
              confirmed: 0,
              completed: 0,
              cancelled: 0,
              revenue: 0,
              unique_clients: new Set(),
            };
          }
          monthlyData[month].total_bookings += 1;
          if (b.status === 'confirmed') monthlyData[month].confirmed += 1;
          if (b.status === 'completed') monthlyData[month].completed += 1;
          if (b.status === 'cancelled') monthlyData[month].cancelled += 1;
          if (b.deposit_paid) monthlyData[month].revenue += Number(b.deposit_amount) || 0;
          monthlyData[month].unique_clients.add(b.email);
        });

        const result = Object.values(monthlyData).map((m: any) => ({
          ...m,
          unique_clients: m.unique_clients.size,
          deposit_conversion_rate: m.total_bookings > 0 
            ? Math.round((m.confirmed + m.completed) / m.total_bookings * 100) 
            : 0,
        }));

        setAnalytics(result.slice(-6));
      } catch (err) {
        console.error('Error fetching studio analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return { analytics, loading };
}
