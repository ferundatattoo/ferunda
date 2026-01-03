import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  Zap,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Send,
  RefreshCw,
  Settings,
  BarChart3,
  Target,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  name: string;
  email: string;
  tattoo_description: string;
  scheduled_date: string | null;
  requested_city: string | null;
  pipeline_stage: string;
  priority: string;
  created_at: string;
}

interface CityConfiguration {
  id: string;
  city_name: string;
  city_type: string;
  color_hex: string;
  session_rate: number;
  is_active: boolean;
}

interface Availability {
  id: string;
  date: string;
  city: string;
  city_id: string | null;
  is_available: boolean;
}

interface AISuggestion {
  id: string;
  booking_id: string;
  suggested_date: string;
  suggested_time: string | null;
  suggested_city_id: string | null;
  confidence_score: number;
  reasoning: string | null;
  status: string;
  conflicts: string[] | null;
}

interface SchedulingInsight {
  type: 'optimization' | 'warning' | 'opportunity';
  title: string;
  description: string;
  action?: string;
  priority: number;
}

const AISchedulingAssistant = forwardRef<HTMLDivElement>((_, ref) => {
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cities, setCities] = useState<CityConfiguration[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<SchedulingInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'insights' | 'chat'>('suggestions');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, citiesRes, availRes, suggestionsRes] = await Promise.all([
        supabase.from("bookings").select("*")
          .in("pipeline_stage", ["new_inquiry", "references_received", "deposit_paid"])
          .is("scheduled_date", null),
        supabase.from("city_configurations").select("*").eq("is_active", true),
        supabase.from("availability").select("*").eq("is_available", true)
          .gte("date", format(new Date(), "yyyy-MM-dd")),
        supabase.from("ai_scheduling_suggestions").select("*").eq("status", "pending")
      ]);

      if (bookingsRes.data) setBookings(bookingsRes.data as Booking[]);
      if (citiesRes.data) setCities(citiesRes.data as CityConfiguration[]);
      if (availRes.data) setAvailability(availRes.data as Availability[]);
      if (suggestionsRes.data) setSuggestions(suggestionsRes.data as AISuggestion[]);

      // Generate insights
      generateInsights(
        bookingsRes.data as Booking[] || [],
        availRes.data as Availability[] || [],
        citiesRes.data as CityConfiguration[] || []
      );
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (bookings: Booking[], availability: Availability[], cities: CityConfiguration[]) => {
    const newInsights: SchedulingInsight[] = [];

    // Check for high-priority unscheduled bookings
    const urgentBookings = bookings.filter(b => 
      b.priority === "high" || differenceInDays(new Date(), new Date(b.created_at)) > 7
    );
    if (urgentBookings.length > 0) {
      newInsights.push({
        type: 'warning',
        title: `${urgentBookings.length} Urgent Bookings Need Scheduling`,
        description: 'These clients have been waiting or are marked as high priority',
        action: 'Review and schedule',
        priority: 1
      });
    }

    // Check for guest spot optimization
    const guestSpotCities = cities.filter(c => c.city_type === 'guest_spot');
    const guestSpotAvail = availability.filter(a => 
      guestSpotCities.some(c => c.city_name === a.city)
    );
    if (guestSpotAvail.length < 5) {
      newInsights.push({
        type: 'opportunity',
        title: 'Low Guest Spot Availability',
        description: 'Consider opening more dates for guest spots to maximize travel efficiency',
        action: 'Add availability',
        priority: 2
      });
    }

    // Check for clustering opportunities
    const availByCity: Record<string, number> = {};
    availability.forEach(a => {
      availByCity[a.city] = (availByCity[a.city] || 0) + 1;
    });
    
    Object.entries(availByCity).forEach(([city, count]) => {
      if (count >= 5) {
        const cityBookings = bookings.filter(b => b.requested_city === city);
        if (cityBookings.length >= 3) {
          newInsights.push({
            type: 'optimization',
            title: `Cluster Opportunity: ${city}`,
            description: `${cityBookings.length} clients want ${city} with ${count} slots available`,
            action: 'Schedule batch',
            priority: 3
          });
        }
      }
    });

    // Revenue optimization
    const scheduledThisMonth = bookings.filter(b => b.scheduled_date);
    if (scheduledThisMonth.length < 15) {
      newInsights.push({
        type: 'opportunity',
        title: 'Revenue Opportunity',
        description: 'Calendar has capacity for more sessions this month',
        priority: 4
      });
    }

    setInsights(newInsights.sort((a, b) => a.priority - b.priority));
  };

  const runFullAnalysis = async () => {
    setAnalyzing(true);
    try {
      // Clear old pending suggestions
      await supabase.from("ai_scheduling_suggestions")
        .delete()
        .eq("status", "pending");

      // Generate new suggestions for each unscheduled booking
      const newSuggestions: any[] = [];
      
      for (const booking of bookings) {
        // Find best available slot
        const preferredCity = cities.find(c => c.city_name === booking.requested_city);
        
        // Get available slots, preferring requested city
        let bestSlots = availability
          .filter(a => !preferredCity || a.city === preferredCity.city_name)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (bestSlots.length === 0) {
          bestSlots = availability.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        }

        if (bestSlots.length > 0) {
          const slot = bestSlots[0];
          const city = cities.find(c => c.city_name === slot.city);
          
          // Calculate confidence based on factors
          let confidence = 0.7;
          if (booking.requested_city === slot.city) confidence += 0.2;
          if (booking.priority === "high") confidence += 0.05;
          if (differenceInDays(new Date(slot.date), new Date()) <= 14) confidence += 0.05;

          newSuggestions.push({
            booking_id: booking.id,
            suggested_date: slot.date,
            suggested_time: "10:00 AM",
            suggested_city_id: city?.id || null,
            confidence_score: Math.min(confidence, 0.99),
            reasoning: `Best match: ${slot.city} on ${format(parseISO(slot.date), "MMM d")}. ${
              booking.requested_city === slot.city ? "Matches requested city." : ""
            } ${booking.priority === "high" ? "High priority client." : ""}`.trim(),
            status: "pending"
          });
        }
      }

      if (newSuggestions.length > 0) {
        const { error } = await supabase.from("ai_scheduling_suggestions").insert(newSuggestions);
        if (error) throw error;
        
        toast({
          title: "Analysis Complete",
          description: `Generated ${newSuggestions.length} scheduling suggestions`
        });
        fetchData();
      } else {
        toast({ title: "No Suggestions", description: "No optimal scheduling found" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  // CRITICAL FIX: Don't schedule directly - send proposal to client first
  const acceptSuggestion = async (suggestion: AISuggestion) => {
    const booking = bookings.find(b => b.id === suggestion.booking_id);
    const city = cities.find(c => c.id === suggestion.suggested_city_id);

    try {
      // Update suggestion status to "sent_to_client" - NOT directly scheduled
      await supabase.from("ai_scheduling_suggestions")
        .update({ status: "sent_to_client" })
        .eq("id", suggestion.id);

      // Send proposal email to client for confirmation
      const { error: emailError } = await supabase.functions.invoke("booking-notification", {
        body: {
          type: "scheduling_proposal",
          bookingId: suggestion.booking_id,
          clientEmail: booking?.email,
          clientName: booking?.name,
          proposedDate: suggestion.suggested_date,
          proposedTime: suggestion.suggested_time || "10:00 AM",
          cityName: city?.city_name,
          confirmationLink: `${window.location.origin}/booking-status?action=confirm_schedule&suggestion=${suggestion.id}`,
          declineLink: `${window.location.origin}/booking-status?action=decline_schedule&suggestion=${suggestion.id}`,
        },
      });

      if (emailError) {
        console.error("Failed to send proposal email:", emailError);
      }

      toast({
        title: "Proposal Sent",
        description: `Waiting for ${booking?.name} to confirm ${format(parseISO(suggestion.suggested_date), "MMM d")}${city ? ` in ${city.city_name}` : ""}`
      });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  // Confirm scheduling after client approval
  const confirmScheduling = async (suggestion: AISuggestion) => {
    const booking = bookings.find(b => b.id === suggestion.booking_id);
    const city = cities.find(c => c.id === suggestion.suggested_city_id);

    try {
      // Now actually schedule the booking
      await supabase.from("bookings").update({
        scheduled_date: suggestion.suggested_date,
        scheduled_time: suggestion.suggested_time,
        city_id: suggestion.suggested_city_id,
        pipeline_stage: "scheduled"
      }).eq("id", suggestion.booking_id);

      // Create calendar event
      await supabase.from("calendar_events").insert({
        title: `Session: ${booking?.name || "Client"}`,
        event_type: "session",
        booking_id: suggestion.booking_id,
        city_id: suggestion.suggested_city_id,
        start_time: `${suggestion.suggested_date}T10:00:00`,
        end_time: `${suggestion.suggested_date}T18:00:00`,
        ai_suggested: true,
        ai_confidence: suggestion.confidence_score
      });

      // Mark suggestion as confirmed
      await supabase.from("ai_scheduling_suggestions")
        .update({ status: "client_confirmed" })
        .eq("id", suggestion.id);

      toast({
        title: "Confirmed & Scheduled!",
        description: `${booking?.name} confirmed for ${format(parseISO(suggestion.suggested_date), "MMM d")}${city ? ` in ${city.city_name}` : ""}`
      });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const dismissSuggestion = async (suggestionId: string) => {
    await supabase.from("ai_scheduling_suggestions")
      .update({ status: "dismissed" })
      .eq("id", suggestionId);
    fetchData();
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);

    try {
      // Simulate AI response - in production this would call the AI edge function
      await new Promise(r => setTimeout(r, 1500));
      
      let response = "";
      
      if (userMessage.toLowerCase().includes("schedule") || userMessage.toLowerCase().includes("book")) {
        response = `Based on my analysis, you have ${bookings.length} unscheduled bookings and ${availability.length} available slots. I recommend running the full scheduling analysis to find optimal matches. Would you like me to do that?`;
      } else if (userMessage.toLowerCase().includes("availability") || userMessage.toLowerCase().includes("open")) {
        const nextWeek = availability.filter(a => differenceInDays(parseISO(a.date), new Date()) <= 7);
        response = `You have ${nextWeek.length} available slots in the next 7 days across ${new Set(nextWeek.map(a => a.city)).size} cities. ${nextWeek.length < 5 ? "Consider opening more availability for busier weeks." : "Looks like good coverage!"}`;
      } else if (userMessage.toLowerCase().includes("priority") || userMessage.toLowerCase().includes("urgent")) {
        const highPriority = bookings.filter(b => b.priority === "high");
        response = `There are ${highPriority.length} high-priority bookings waiting to be scheduled. ${highPriority.length > 0 ? "I suggest scheduling these first to maintain client satisfaction." : "Great job staying on top of urgent requests!"}`;
      } else {
        response = `I can help you with scheduling optimization, availability analysis, and booking recommendations. Try asking about:\n• Scheduling pending bookings\n• Current availability\n• Priority clients\n• Revenue optimization`;
      }
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsChatting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-light text-foreground">
              AI Scheduling Assistant
            </h1>
            <p className="font-body text-muted-foreground mt-1">
              Smart scheduling with conflict detection and optimization
            </p>
          </div>
        </div>

        <button
          onClick={runFullAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-body text-sm hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
        >
          {analyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {analyzing ? "Analyzing..." : "Run Full Analysis"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-body text-2xl font-light text-foreground">{bookings.length}</p>
              <p className="font-body text-xs text-muted-foreground">Pending Bookings</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-body text-2xl font-light text-foreground">{availability.length}</p>
              <p className="font-body text-xs text-muted-foreground">Open Slots</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-body text-2xl font-light text-foreground">{suggestions.length}</p>
              <p className="font-body text-xs text-muted-foreground">AI Suggestions</p>
            </div>
          </div>
        </div>

        <div className="p-4 border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="font-body text-2xl font-light text-foreground">{insights.length}</p>
              <p className="font-body text-xs text-muted-foreground">Active Insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'suggestions', label: 'Suggestions', icon: Sparkles },
          { id: 'insights', label: 'Insights', icon: Lightbulb },
          { id: 'chat', label: 'AI Chat', icon: MessageSquare }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 font-body text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'suggestions' && suggestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                {suggestions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'suggestions' && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {suggestions.length === 0 ? (
              <div className="text-center py-16 border border-border">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="font-body text-muted-foreground mb-4">No pending suggestions</p>
                <button
                  onClick={runFullAnalysis}
                  disabled={analyzing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Suggestions
                </button>
              </div>
            ) : (
              suggestions.map((suggestion, index) => {
                const booking = bookings.find(b => b.id === suggestion.booking_id);
                const city = cities.find(c => c.id === suggestion.suggested_city_id);
                
                return (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-purple-500/30 bg-purple-500/5 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-lg text-foreground">{booking?.name || "Unknown"}</h3>
                          <p className="font-body text-sm text-muted-foreground">{booking?.email}</p>
                          <p className="font-body text-sm text-muted-foreground/70 mt-1 line-clamp-1">
                            {booking?.tattoo_description}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-emerald-400" />
                              <span className="font-body text-sm text-foreground">
                                {format(parseISO(suggestion.suggested_date), "MMMM d, yyyy")}
                              </span>
                            </div>
                            {city && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" style={{ color: city.color_hex }} />
                                <span className="font-body text-sm" style={{ color: city.color_hex }}>
                                  {city.city_name}
                                </span>
                              </div>
                            )}
                            {suggestion.suggested_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-body text-sm text-muted-foreground">
                                  {suggestion.suggested_time}
                                </span>
                              </div>
                            )}
                          </div>

                          {suggestion.reasoning && (
                            <p className="font-body text-xs text-muted-foreground mt-3 italic">
                              {suggestion.reasoning}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="font-body text-sm text-amber-400">
                            {Math.round(suggestion.confidence_score * 100)}% confidence
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => acceptSuggestion(suggestion)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-body text-sm hover:bg-emerald-500/30 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => dismissSuggestion(suggestion.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 font-body text-sm hover:bg-red-500/30 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {insights.length === 0 ? (
              <div className="text-center py-16 border border-border">
                <Lightbulb className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="font-body text-muted-foreground">All caught up! No insights at the moment.</p>
              </div>
            ) : (
              insights.map((insight, index) => {
                const colors = {
                  optimization: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', icon: TrendingUp },
                  warning: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', icon: AlertTriangle },
                  opportunity: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', icon: Sparkles }
                };
                const style = colors[insight.type];
                const Icon = style.icon;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border ${style.border} ${style.bg} p-4`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${style.text}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-display text-foreground`}>{insight.title}</h4>
                        <p className="font-body text-sm text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                      {insight.action && (
                        <button className={`flex items-center gap-1 px-3 py-1.5 border ${style.border} ${style.text} font-body text-xs hover:opacity-80 transition-opacity`}>
                          {insight.action}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border"
          >
            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-16">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground mb-2">Ask me about scheduling</p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                    {["How can I optimize my schedule?", "Show pending bookings", "What's my availability?"].map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setChatInput(prompt);
                          handleChatSubmit();
                        }}
                        className="px-3 py-1.5 bg-accent text-foreground font-body text-xs hover:bg-accent/80 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-md px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-foreground text-background'
                        : 'bg-purple-500/20 text-foreground border border-purple-500/50'
                    }`}>
                      <p className="font-body text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-purple-500/20 border border-purple-500/50 px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                  placeholder="Ask about scheduling, availability, optimization..."
                  className="flex-1 px-4 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={isChatting || !chatInput.trim()}
                  className="px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AISchedulingAssistant.displayName = "AISchedulingAssistant";

export default AISchedulingAssistant;
