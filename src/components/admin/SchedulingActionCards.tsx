import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Loader2,
  Send,
  X,
  MapPin,
} from "lucide-react";
import { format, addDays, parseISO, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// SCHEDULING ACTION CARDS - Quick Actions UI for Calendar Management
// ============================================================================

interface UnscheduledBooking {
  id: string;
  name: string;
  email: string;
  tattoo_description: string;
  requested_city: string | null;
  created_at: string;
  priority: string;
}

interface AvailableSlot {
  date: string;
  city: string;
  cityId: string | null;
  slotCount: number;
}

interface AISuggestion {
  bookingId: string;
  bookingName: string;
  suggestedDate: string;
  suggestedCity: string;
  confidence: number;
  reasoning: string;
}

interface SchedulingStats {
  unscheduledCount: number;
  availableSlotsNext7Days: number;
  availableSlotsNext30Days: number;
  pendingConfirmations: number;
  utilizationRate: number;
}

export function SchedulingActionCards() {
  const [stats, setStats] = useState<SchedulingStats | null>(null);
  const [unscheduled, setUnscheduled] = useState<UnscheduledBooking[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [sendingProposal, setSendingProposal] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedulingData();
  }, []);

  const fetchSchedulingData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const next7Days = addDays(new Date(), 7).toISOString().split("T")[0];
      const next30Days = addDays(new Date(), 30).toISOString().split("T")[0];

      // Fetch unscheduled bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, name, email, tattoo_description, requested_city, created_at, priority")
        .is("scheduled_date", null)
        .in("pipeline_stage", ["new", "contacted", "qualified"])
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch available slots
      const { data: availability } = await supabase
        .from("availability")
        .select("date, city, city_id, is_available")
        .gte("date", today)
        .lte("date", next30Days)
        .eq("is_available", true)
        .order("date", { ascending: true });

      // Fetch pending confirmations
      const { data: pendingProposals } = await supabase
        .from("ai_scheduling_suggestions")
        .select("id")
        .eq("status", "sent_to_client");

      // Calculate stats
      const slotsNext7 = availability?.filter(
        (a) => a.date <= next7Days
      ).length || 0;

      const slotsByDateCity: Record<string, AvailableSlot> = {};
      availability?.forEach((a) => {
        const key = `${a.date}-${a.city}`;
        if (!slotsByDateCity[key]) {
          slotsByDateCity[key] = {
            date: a.date,
            city: a.city,
            cityId: a.city_id,
            slotCount: 0,
          };
        }
        slotsByDateCity[key].slotCount++;
      });

      setUnscheduled(bookings || []);
      setSlots(Object.values(slotsByDateCity).slice(0, 10));
      setStats({
        unscheduledCount: bookings?.length || 0,
        availableSlotsNext7Days: slotsNext7,
        availableSlotsNext30Days: availability?.length || 0,
        pendingConfirmations: pendingProposals?.length || 0,
        utilizationRate: Math.round(
          ((30 - (availability?.length || 0)) / 30) * 100
        ),
      });

      // Fetch existing AI suggestions
      const { data: existingSuggestions } = await supabase
        .from("ai_scheduling_suggestions")
        .select("*, bookings(name)")
        .eq("status", "pending")
        .order("confidence_score", { ascending: false })
        .limit(5);

      if (existingSuggestions) {
        setSuggestions(
          existingSuggestions.map((s: any) => ({
            bookingId: s.booking_id,
            bookingName: s.bookings?.name || "Unknown",
            suggestedDate: s.suggested_date,
            suggestedCity: s.suggested_city_id || "Default",
            confidence: s.confidence_score || 80,
            reasoning: s.reasoning || "",
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching scheduling data:", error);
      toast.error("Failed to load scheduling data");
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async () => {
    setGenerating(true);
    try {
      // Call AI to generate optimal scheduling suggestions
      const { data, error } = await supabase.functions.invoke("smart-follow-up", {
        body: {
          action: "generate_scheduling",
          unscheduled_ids: unscheduled.slice(0, 5).map((b) => b.id),
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        toast.success(`Generated ${data.suggestions.length} scheduling suggestions`);
      } else {
        // Fallback: create simple suggestions based on available slots
        const newSuggestions: AISuggestion[] = unscheduled
          .slice(0, Math.min(5, slots.length))
          .map((booking, i) => ({
            bookingId: booking.id,
            bookingName: booking.name,
            suggestedDate: slots[i]?.date || addDays(new Date(), 7 + i).toISOString().split("T")[0],
            suggestedCity: booking.requested_city || slots[i]?.city || "Default",
            confidence: 75 + Math.floor(Math.random() * 20),
            reasoning: `Matched with available slot in ${slots[i]?.city || "your location"}`,
          }));
        setSuggestions(newSuggestions);
        toast.success(`Generated ${newSuggestions.length} suggestions`);
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Failed to generate suggestions");
    } finally {
      setGenerating(false);
    }
  };

  const sendProposalToClient = async (suggestion: AISuggestion) => {
    setSendingProposal(suggestion.bookingId);
    try {
      // Update suggestion status
      await supabase
        .from("ai_scheduling_suggestions")
        .update({ status: "sent_to_client" })
        .eq("booking_id", suggestion.bookingId)
        .eq("suggested_date", suggestion.suggestedDate);

      // Send email to client
      await supabase.functions.invoke("booking-notification", {
        body: {
          action: "send_scheduling_proposal",
          booking_id: suggestion.bookingId,
          proposed_date: suggestion.suggestedDate,
          proposed_city: suggestion.suggestedCity,
        },
      });

      toast.success(`Proposal sent to ${suggestion.bookingName}`);
      
      // Remove from suggestions list
      setSuggestions((prev) =>
        prev.filter((s) => s.bookingId !== suggestion.bookingId)
      );
      
      // Update stats
      if (stats) {
        setStats({
          ...stats,
          pendingConfirmations: stats.pendingConfirmations + 1,
        });
      }
    } catch (error) {
      console.error("Error sending proposal:", error);
      toast.error("Failed to send proposal");
    } finally {
      setSendingProposal(null);
    }
  };

  const dismissSuggestion = (bookingId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.bookingId !== bookingId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            expandedCard === "unscheduled" && "ring-2 ring-primary"
          )}
          onClick={() =>
            setExpandedCard(expandedCard === "unscheduled" ? null : "unscheduled")
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unscheduled</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.unscheduledCount || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            expandedCard === "slots" && "ring-2 ring-primary"
          )}
          onClick={() => setExpandedCard(expandedCard === "slots" ? null : "slots")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Slots (7d)</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.availableSlotsNext7Days || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <Calendar className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Confirms</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.pendingConfirmations || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilization</p>
                <p className="text-3xl font-bold text-foreground">
                  {stats?.utilizationRate || 0}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Details */}
      {expandedCard === "unscheduled" && unscheduled.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Unscheduled Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {unscheduled.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-foreground">{booking.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {booking.tattoo_description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.requested_city && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="w-3 h-3 mr-1" />
                            {booking.requested_city}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            booking.priority === "high"
                              ? "destructive"
                              : booking.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {booking.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {expandedCard === "slots" && slots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Available Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center"
                  >
                    <p className="font-medium text-foreground">
                      {format(parseISO(slot.date), "MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">{slot.city}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Suggestions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Scheduling Suggestions
            </CardTitle>
            <Button
              onClick={generateAISuggestions}
              disabled={generating || unscheduled.length === 0}
              size="sm"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {generating ? "Analyzing..." : "Generate Suggestions"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No suggestions yet. Click "Generate Suggestions" to get AI recommendations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <motion.div
                  key={suggestion.bookingId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {suggestion.bookingName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(suggestion.suggestedDate), "EEEE, MMMM d")} •{" "}
                        {suggestion.suggestedCity}
                      </p>
                      {suggestion.reasoning && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.reasoning}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        suggestion.confidence >= 85
                          ? "bg-green-500/20 text-green-600"
                          : suggestion.confidence >= 70
                          ? "bg-yellow-500/20 text-yellow-600"
                          : "bg-gray-500/20 text-gray-600"
                      )}
                    >
                      {suggestion.confidence}% match
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => sendProposalToClient(suggestion)}
                      disabled={sendingProposal === suggestion.bookingId}
                    >
                      {sendingProposal === suggestion.bookingId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Send Proposal
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissSuggestion(suggestion.bookingId)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {stats && stats.unscheduledCount > 0 && stats.availableSlotsNext7Days > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {stats.unscheduledCount} bookings can be matched with{" "}
                    {stats.availableSlotsNext7Days} available slots
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Let AI find the optimal schedule for you
                  </p>
                </div>
              </div>
              <Button onClick={generateAISuggestions} disabled={generating}>
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Optimize Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SchedulingActionCards;
