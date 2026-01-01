import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Clock, Filter } from "lucide-react";
import BookingPipeline from "./BookingPipeline";
import WaitlistManager from "./WaitlistManager";
import EscalationQueue from "./EscalationQueue";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface PipelineHubProps {
  onRefresh?: () => void;
}

const PipelineHub = ({ onRefresh }: PipelineHubProps) => {
  const [activeSubTab, setActiveSubTab] = useState("bookings");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    pending: 0,
    escalations: 0,
    waitlist: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      setBookings(bookingsData || []);

      // Count pending
      const pending = bookingsData?.filter((b) => b.status === "pending").length || 0;

      // Count escalations
      const { count: escalationCount } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "escalated");

      // Count waitlist
      const { count: waitlistCount } = await supabase
        .from("booking_waitlist")
        .select("*", { count: "exact", head: true })
        .eq("status", "waiting");

      setCounts({
        pending,
        escalations: escalationCount || 0,
        waitlist: waitlistCount || 0,
      });
    } catch (error) {
      console.error("Error fetching pipeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-foreground">Pipeline</h1>
        <p className="font-body text-muted-foreground mt-1">
          Gestiona bookings, escalaciones y waitlist
        </p>
      </div>

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Bookings</span>
            {counts.pending > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-500">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalations" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Escalaciones</span>
            {counts.escalations > 0 && (
              <Badge variant="secondary" className="ml-1 bg-red-500/20 text-red-500">
                {counts.escalations}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Waitlist</span>
            {counts.waitlist > 0 && (
              <Badge variant="secondary" className="ml-1">
                {counts.waitlist}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-6">
          <BookingPipeline
            bookings={bookings}
            loading={loading}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="escalations" className="mt-6">
          <EscalationQueue />
        </TabsContent>

        <TabsContent value="waitlist" className="mt-6">
          <WaitlistManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PipelineHub;
