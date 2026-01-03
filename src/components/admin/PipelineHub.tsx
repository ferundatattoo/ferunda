import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, Clock, Filter, Zap, Play } from "lucide-react";
import BookingPipeline from "./BookingPipeline";
import WaitlistManager from "./WaitlistManager";
import EscalationQueue from "./EscalationQueue";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PipelineHubProps {
  onRefresh?: () => void;
}

const PipelineHub = ({ onRefresh }: PipelineHubProps) => {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState("bookings");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    pending: 0,
    escalations: 0,
    waitlist: 0,
  });
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [activeWorkflows, setActiveWorkflows] = useState(0);

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

      // Count active workflow runs
      const { count: workflowCount } = await supabase
        .from("workflow_runs")
        .select("*", { count: "exact", head: true })
        .in("status", ["running", "retrying", "awaiting_signal", "awaiting_timer"]);

      setCounts({
        pending,
        escalations: escalationCount || 0,
        waitlist: waitlistCount || 0,
      });
      setActiveWorkflows(workflowCount || 0);
    } catch (error) {
      console.error("Error fetching pipeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerFollowUpWorkflow = async () => {
    setRunningWorkflow(true);
    try {
      // Find the follow-up workflow
      const { data: workflow } = await supabase
        .from("workflows")
        .select("id")
        .eq("trigger_type", "manual")
        .ilike("name", "%follow%up%")
        .eq("enabled", true)
        .limit(1)
        .single();

      if (workflow) {
        const { error } = await supabase.functions.invoke("workflow-executor", {
          body: {
            action: "execute",
            workflow_id: workflow.id,
            input: {
              trigger: "pipeline_manual",
              pending_count: counts.pending,
              escalation_count: counts.escalations
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Workflow iniciado",
          description: "Follow-up workflow ejecutándose en background"
        });
      } else {
        toast({
          title: "Sin workflow",
          description: "No hay workflows de follow-up configurados",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error triggering workflow:", error);
      toast({
        title: "Error",
        description: "No se pudo iniciar el workflow",
        variant: "destructive"
      });
    } finally {
      setRunningWorkflow(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Pipeline</h1>
          <p className="font-body text-muted-foreground mt-1">
            Gestiona bookings, escalaciones y waitlist
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeWorkflows > 0 && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 animate-pulse">
              <Play className="w-3 h-3 mr-1" />
              {activeWorkflows} workflows activos
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerFollowUpWorkflow}
            disabled={runningWorkflow}
          >
            {runningWorkflow ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Auto Follow-up
          </Button>
        </div>
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
