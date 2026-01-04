import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, GitBranch, Clock, Users, RefreshCw } from "lucide-react";
import BookingPipeline from "@/components/admin/BookingPipeline";
import WaitlistManager from "@/components/admin/WaitlistManager";
import EscalationQueue from "@/components/admin/EscalationQueue";
import CalendarHub from "@/components/admin/CalendarHub";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Operations() {
  const [activeTab, setActiveTab] = useState("pipeline");

  // Fetch counts for badges
  const { data: counts } = useQuery({
    queryKey: ['operations-counts'],
    queryFn: async () => {
      const [bookings, waitlist, escalations] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('booking_waitlist').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
        supabase.from('booking_requests').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
      ]);
      return {
        pending: bookings.count || 0,
        waitlist: waitlist.count || 0,
        escalations: escalations.count || 0,
      };
    },
    refetchInterval: 30000,
  });

  // Fetch bookings for pipeline
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['operations-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 30000,
  });

  const handleRefresh = useCallback(() => {
    refetchBookings();
  }, [refetchBookings]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Operations</h1>
        <p className="font-body text-muted-foreground mt-1">
          Pipeline, calendario y gestión de citas unificados
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1">
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            <span>Pipeline</span>
            {counts?.pending ? (
              <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-500">
                {counts.pending}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Waitlist</span>
            {counts?.waitlist ? (
              <Badge variant="secondary" className="ml-1">
                {counts.waitlist}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="escalations" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Escalaciones</span>
            {counts?.escalations ? (
              <Badge variant="secondary" className="ml-1 bg-red-500/20 text-red-500">
                {counts.escalations}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6">
          <BookingPipeline bookings={bookings} loading={bookingsLoading} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarHub />
        </TabsContent>

        <TabsContent value="waitlist" className="mt-6">
          <WaitlistManager />
        </TabsContent>

        <TabsContent value="escalations" className="mt-6">
          <EscalationQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}
