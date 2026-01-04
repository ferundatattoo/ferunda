import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, GitBranch, Clock, Users, Sparkles } from "lucide-react";
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
    <div className="space-y-8">
      {/* Header with CRM styling */}
      <motion.div 
        className="flex items-start gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20">
            <Sparkles className="w-6 h-6 text-gold" />
          </div>
          <div className="absolute inset-0 rounded-xl bg-gold/10 blur-xl" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-light tracking-tight text-foreground">
            Operations
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Pipeline, calendario y gestión de citas unificados
          </p>
        </div>
      </motion.div>

      {/* Decorative gradient line */}
      <motion.div 
        className="h-px bg-gradient-to-r from-gold/50 via-gold/20 to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-gradient-to-br from-card to-background border border-border/50 p-1.5 gap-1">
          <TabsTrigger 
            value="pipeline" 
            className="flex items-center gap-2 font-body text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold/20 data-[state=active]:to-gold/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30 data-[state=active]:shadow-none"
          >
            <GitBranch className="w-4 h-4" />
            <span>Pipeline</span>
            {counts?.pending ? (
              <Badge className="ml-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20">
                {counts.pending}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="calendar" 
            className="flex items-center gap-2 font-body text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold/20 data-[state=active]:to-gold/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30 data-[state=active]:shadow-none"
          >
            <Calendar className="w-4 h-4" />
            <span>Calendario</span>
          </TabsTrigger>
          <TabsTrigger 
            value="waitlist" 
            className="flex items-center gap-2 font-body text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold/20 data-[state=active]:to-gold/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30 data-[state=active]:shadow-none"
          >
            <Clock className="w-4 h-4" />
            <span>Waitlist</span>
            {counts?.waitlist ? (
              <Badge className="ml-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20">
                {counts.waitlist}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger 
            value="escalations" 
            className="flex items-center gap-2 font-body text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold/20 data-[state=active]:to-gold/10 data-[state=active]:text-gold data-[state=active]:border data-[state=active]:border-gold/30 data-[state=active]:shadow-none"
          >
            <Users className="w-4 h-4" />
            <span>Escalaciones</span>
            {counts?.escalations ? (
              <Badge className="ml-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
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
