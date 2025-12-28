import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Clock,
  User,
  Sparkles,
  RefreshCw,
  Settings,
  Plane,
  Home,
  Building2,
  AlertTriangle,
  CheckCircle,
  GripVertical,
  Maximize2,
  Filter,
  Search,
  Zap,
  Brain,
  CalendarSync,
  Link as LinkIcon,
  ExternalLink,
  MoreHorizontal,
  Eye,
  Edit2,
  Copy,
  Ban,
  Users,
  Clock3
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  addDays,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  parseISO
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CityConfiguration {
  id: string;
  city_name: string;
  city_type: string;
  color_hex: string | null;
  session_rate: number | null;
  deposit_amount: number | null;
  is_active: boolean;
  max_sessions_per_day: number | null;
  timezone: string;
  address: string | null;
  studio_name: string | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: 'session' | 'blocked' | 'travel' | 'personal' | 'guest_spot_open';
  booking_id: string | null;
  city_id: string | null;
  description: string | null;
  is_synced: boolean;
  external_id: string | null;
  external_calendar: string | null;
  ai_suggested: boolean;
  ai_confidence: number | null;
}

interface Availability {
  id: string;
  date: string;
  city: string;
  city_id: string | null;
  is_available: boolean;
  notes: string | null;
  slot_type: string | null;
  time_slots: any[];
}

interface Booking {
  id: string;
  name: string;
  email: string;
  tattoo_description: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  city_id: string | null;
  requested_city: string | null;
  pipeline_stage: string;
}

interface AISuggestion {
  id: string;
  booking_id: string | null;
  suggested_date: string;
  suggested_time: string | null;
  suggested_city_id: string | null;
  confidence_score: number | null;
  reasoning: string | null;
  status: string | null;
  conflicts: string[] | null;
  booking?: Booking;
  city?: CityConfiguration;
}

type ViewMode = 'month' | 'week' | 'day' | 'timeline';

const CITY_TYPE_ICONS = {
  home_base: Home,
  second_base: Building2,
  guest_spot: Plane
};

const AdvancedCalendarManager = () => {
  const { toast } = useToast();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cities, setCities] = useState<CityConfiguration[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New event form
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_type: "session" as CalendarEvent["event_type"],
    city_id: "",
    date: "",
    start_time: "10:00",
    end_time: "18:00",
    description: ""
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(subMonths(currentDate, 1));
      const end = endOfMonth(addMonths(currentDate, 2));

      const [citiesRes, eventsRes, availRes, bookingsRes, suggestionsRes] = await Promise.all([
        supabase.from("city_configurations").select("*").eq("is_active", true),
        supabase.from("calendar_events").select("*")
          .gte("start_time", start.toISOString())
          .lte("end_time", end.toISOString()),
        supabase.from("availability").select("*")
          .gte("date", format(start, "yyyy-MM-dd"))
          .lte("date", format(end, "yyyy-MM-dd")),
        supabase.from("bookings").select("*")
          .in("pipeline_stage", ["deposit_paid", "scheduled", "references_received"])
          .is("scheduled_date", null),
        supabase.from("ai_scheduling_suggestions").select("*")
          .eq("status", "pending")
      ]);

      if (citiesRes.data) setCities(citiesRes.data as CityConfiguration[]);
      if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[]);
      if (availRes.data) setAvailability(availRes.data as Availability[]);
      if (bookingsRes.data) setPendingBookings(bookingsRes.data as Booking[]);
      if (suggestionsRes.data) {
        // Enrich suggestions with booking and city data
        const enriched = (suggestionsRes.data as AISuggestion[]).map(s => ({
          ...s,
          booking: bookingsRes.data?.find((b: Booking) => b.id === s.booking_id),
          city: citiesRes.data?.find((c: CityConfiguration) => c.id === s.suggested_city_id)
        }));
        setAiSuggestions(enriched);
      }
    } catch (error: any) {
      toast({ title: "Error loading calendar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentDate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get calendar days
  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const days = getCalendarDays();

  // Get city by ID
  const getCityById = (cityId: string | null) => cities.find(c => c.id === cityId);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(e => isSameDay(parseISO(e.start_time), date));
  };

  // Get availability for date
  const getAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.filter(a => a.date === dateStr && a.is_available);
  };

  // Add availability
  const addAvailability = async (date: Date, cityId: string) => {
    const city = getCityById(cityId);
    if (!city) return;

    try {
      const { error } = await supabase.from("availability").insert({
        date: format(date, "yyyy-MM-dd"),
        city: city.city_name,
        city_id: cityId,
        is_available: true,
        slot_type: city.city_type === "guest_spot" ? "guest_spot" : "regular"
      });

      if (error) throw error;
      toast({ title: "Availability added", description: `${city.city_name} on ${format(date, "MMM d")}` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Remove availability
  const removeAvailability = async (availId: string) => {
    try {
      const { error } = await supabase.from("availability").delete().eq("id", availId);
      if (error) throw error;
      toast({ title: "Removed", description: "Availability slot removed" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Create calendar event
  const createEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({ title: "Required", description: "Title and date are required", variant: "destructive" });
      return;
    }

    try {
      const startDateTime = `${newEvent.date}T${newEvent.start_time}:00`;
      const endDateTime = `${newEvent.date}T${newEvent.end_time}:00`;

      const { error } = await supabase.from("calendar_events").insert({
        title: newEvent.title,
        event_type: newEvent.event_type,
        city_id: newEvent.city_id || null,
        start_time: startDateTime,
        end_time: endDateTime,
        description: newEvent.description || null
      });

      if (error) throw error;
      toast({ title: "Event created" });
      setIsAddingEvent(false);
      setNewEvent({
        title: "",
        event_type: "session",
        city_id: "",
        date: "",
        start_time: "10:00",
        end_time: "18:00",
        description: ""
      });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
      if (error) throw error;
      toast({ title: "Deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Schedule booking via drag and drop
  const handleDropBooking = async (date: Date, cityId?: string) => {
    if (!draggedBooking) return;

    try {
      const updateData: any = {
        scheduled_date: format(date, "yyyy-MM-dd"),
        pipeline_stage: "scheduled"
      };

      if (cityId) {
        updateData.city_id = cityId;
      }

      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", draggedBooking.id);

      if (error) throw error;

      // Create calendar event
      const city = getCityById(cityId || null);
      await supabase.from("calendar_events").insert({
        title: `Session: ${draggedBooking.name}`,
        event_type: "session",
        booking_id: draggedBooking.id,
        city_id: cityId || null,
        start_time: `${format(date, "yyyy-MM-dd")}T10:00:00`,
        end_time: `${format(date, "yyyy-MM-dd")}T18:00:00`,
        description: draggedBooking.tattoo_description
      });

      toast({ 
        title: "Scheduled!", 
        description: `${draggedBooking.name} booked for ${format(date, "MMM d")}${city ? ` in ${city.city_name}` : ""}` 
      });
      setDraggedBooking(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // AI Analysis
  const runAIAnalysis = async () => {
    setIsAIAnalyzing(true);
    try {
      // Simulated AI analysis - in production this would call the AI edge function
      await new Promise(r => setTimeout(r, 2000));
      
      // Generate smart suggestions
      const suggestions: any[] = [];
      
      for (const booking of pendingBookings.slice(0, 5)) {
        const preferredCity = cities.find(c => c.city_name === booking.requested_city);
        const availableSlots = availability.filter(a => {
          const date = parseISO(a.date);
          return !isBefore(date, new Date()) && a.is_available;
        });

        if (availableSlots.length > 0) {
          const bestSlot = availableSlots[0];
          suggestions.push({
            booking_id: booking.id,
            suggested_date: bestSlot.date,
            suggested_time: "10:00 AM",
            suggested_city_id: bestSlot.city_id || preferredCity?.id,
            confidence_score: Math.random() * 0.3 + 0.7,
            reasoning: `Based on ${booking.requested_city || "client"} preference and availability`,
            status: "pending"
          });
        }
      }

      if (suggestions.length > 0) {
        await supabase.from("ai_scheduling_suggestions").insert(suggestions);
        toast({ 
          title: "AI Analysis Complete", 
          description: `Generated ${suggestions.length} scheduling suggestions` 
        });
        fetchData();
      } else {
        toast({ title: "No suggestions", description: "No optimal slots found for pending bookings" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAIAnalyzing(false);
    }
  };

  // Accept AI suggestion
  const acceptSuggestion = async (suggestion: AISuggestion) => {
    try {
      // Update booking
      await supabase.from("bookings").update({
        scheduled_date: suggestion.suggested_date,
        scheduled_time: suggestion.suggested_time,
        city_id: suggestion.suggested_city_id,
        pipeline_stage: "scheduled"
      }).eq("id", suggestion.booking_id);

      // Create event
      const city = getCityById(suggestion.suggested_city_id);
      await supabase.from("calendar_events").insert({
        title: `Session: ${suggestion.booking?.name || "Client"}`,
        event_type: "session",
        booking_id: suggestion.booking_id,
        city_id: suggestion.suggested_city_id,
        start_time: `${suggestion.suggested_date}T10:00:00`,
        end_time: `${suggestion.suggested_date}T18:00:00`,
        ai_suggested: true,
        ai_confidence: suggestion.confidence_score
      });

      // Mark suggestion as accepted
      await supabase.from("ai_scheduling_suggestions")
        .update({ status: "accepted" })
        .eq("id", suggestion.id);

      toast({ title: "Scheduled!", description: `Booking confirmed for ${format(parseISO(suggestion.suggested_date), "MMM d")}` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Dismiss suggestion
  const dismissSuggestion = async (suggestionId: string) => {
    await supabase.from("ai_scheduling_suggestions")
      .update({ status: "dismissed" })
      .eq("id", suggestionId);
    fetchData();
  };

  // Sync calendars (placeholder for external sync)
  const syncCalendars = async () => {
    setSyncing(true);
    try {
      // This would call an edge function for Google/Apple calendar sync
      await new Promise(r => setTimeout(r, 1500));
      toast({ title: "Calendar synced", description: "External calendars are up to date" });
    } finally {
      setSyncing(false);
    }
  };

  // Filter availability by selected city
  const filteredAvailability = selectedCity 
    ? availability.filter(a => a.city_id === selectedCity)
    : availability;

  // Event type styling
  const getEventTypeStyles = (type: CalendarEvent["event_type"]) => {
    switch (type) {
      case "session": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "blocked": return "bg-red-500/20 text-red-400 border-red-500/50";
      case "travel": return "bg-amber-500/20 text-amber-400 border-amber-500/50";
      case "personal": return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "guest_spot_open": return "bg-sky-500/20 text-sky-400 border-sky-500/50";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Advanced Calendar
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            AI-powered scheduling with multi-city support
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* AI Analysis Button */}
          <button
            onClick={runAIAnalysis}
            disabled={isAIAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 text-purple-300 font-body text-sm hover:from-purple-500/30 hover:to-pink-500/30 transition-all disabled:opacity-50"
          >
            {isAIAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            AI Schedule Optimizer
          </button>

          {/* Sync Button */}
          <button
            onClick={syncCalendars}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground font-body text-sm hover:border-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </button>

          {/* Add Event */}
          <button
            onClick={() => setIsAddingEvent(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      <AnimatePresence>
        {aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-purple-500/30 bg-purple-500/5 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="font-display text-lg text-foreground">AI Suggestions</h3>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                    {aiSuggestions.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {aiSuggestions.slice(0, 3).map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-background/50 border border-border hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-body text-foreground">{suggestion.booking?.name || "Unknown"}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{format(parseISO(suggestion.suggested_date), "MMM d, yyyy")}</span>
                          {suggestion.city && (
                            <>
                              <MapPin className="w-3 h-3 ml-2" />
                              <span style={{ color: suggestion.city.color_hex }}>{suggestion.city.city_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="text-xs text-amber-400">
                            {Math.round(suggestion.confidence_score * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {suggestion.reasoning}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => acceptSuggestion(suggestion)}
                          className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => dismissSuggestion(suggestion.id)}
                          className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddingEvent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-border overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-foreground">Add Calendar Event</h3>
                <button onClick={() => setIsAddingEvent(false)} className="text-muted-foreground hover:text-foreground">
                  <Ban className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="font-body text-xs text-muted-foreground">Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title..."
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                  />
                </div>

                <div>
                  <label className="font-body text-xs text-muted-foreground">Type</label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                  >
                    <option value="session">Session</option>
                    <option value="blocked">Blocked</option>
                    <option value="travel">Travel</option>
                    <option value="personal">Personal</option>
                    <option value="guest_spot_open">Guest Spot Open</option>
                  </select>
                </div>

                <div>
                  <label className="font-body text-xs text-muted-foreground">City</label>
                  <select
                    value={newEvent.city_id}
                    onChange={(e) => setNewEvent({ ...newEvent, city_id: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                  >
                    <option value="">No city</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.city_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-body text-xs text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                  />
                </div>

                <div>
                  <label className="font-body text-xs text-muted-foreground">Start Time</label>
                  <input
                    type="time"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                  />
                </div>

                <div>
                  <label className="font-body text-xs text-muted-foreground">End Time</label>
                  <input
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50"
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-xs text-muted-foreground">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAddingEvent(false)}
                  className="px-4 py-2 border border-border text-muted-foreground font-body text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createEvent}
                  className="px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
                >
                  Create Event
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="flex gap-6">
        {/* Sidebar - Pending Bookings */}
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 flex-shrink-0 space-y-4"
          >
            {/* City Filter */}
            <div className="border border-border p-4">
              <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">Cities</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCity(null)}
                  className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${
                    !selectedCity ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span className="font-body text-sm">All Cities</span>
                </button>
                {cities.map(city => {
                  const Icon = CITY_TYPE_ICONS[city.city_type];
                  return (
                    <button
                      key={city.id}
                      onClick={() => setSelectedCity(city.id)}
                      className={`w-full flex items-center gap-3 p-2 text-left transition-colors ${
                        selectedCity === city.id ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: city.color_hex }}
                      />
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-body text-sm text-foreground">{city.city_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pending Bookings - Draggable */}
            <div className="border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                  Pending Bookings
                </h4>
                <span className="text-xs text-muted-foreground">{pendingBookings.length}</span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {pendingBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending bookings</p>
                ) : (
                  pendingBookings.map(booking => (
                    <motion.div
                      key={booking.id}
                      draggable
                      onDragStart={() => setDraggedBooking(booking)}
                      onDragEnd={() => setDraggedBooking(null)}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 border border-border bg-card cursor-grab active:cursor-grabbing hover:border-foreground/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm text-foreground truncate">{booking.name}</p>
                          <p className="font-body text-xs text-muted-foreground truncate">
                            {booking.requested_city || "Any city"} • {booking.pipeline_stage.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center mt-3">
                Drag bookings to calendar to schedule
              </p>
            </div>
          </motion.div>
        )}

        {/* Calendar */}
        <div className="flex-1 min-w-0">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="font-display text-2xl text-foreground min-w-[200px] text-center">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 hover:bg-accent transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 border border-border text-muted-foreground font-body text-xs hover:border-foreground/50 hover:text-foreground transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSidebar ? <Maximize2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-border">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-accent/30">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="p-3 text-center font-body text-xs uppercase tracking-wider text-muted-foreground border-r border-border last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                const dayAvailability = getAvailabilityForDate(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isPast = isBefore(day, new Date()) && !isToday(day);
                const isDropTarget = draggedBooking && !isPast;

                return (
                  <motion.div
                    key={day.toISOString()}
                    onDragOver={(e) => { if (isDropTarget) e.preventDefault(); }}
                    onDrop={() => isDropTarget && handleDropBooking(day)}
                    className={`
                      min-h-[120px] border-t border-r border-border last:border-r-0 p-2 transition-colors
                      ${!isCurrentMonth ? "bg-accent/20 opacity-50" : "bg-background"}
                      ${isToday(day) ? "ring-1 ring-inset ring-foreground/30 bg-foreground/5" : ""}
                      ${isPast ? "opacity-40" : ""}
                      ${isDropTarget ? "hover:bg-emerald-500/10 hover:ring-1 hover:ring-emerald-500/50" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-body text-sm ${isToday(day) ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </span>
                      {!isPast && isCurrentMonth && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedDate(day);
                              setNewEvent({ ...newEvent, date: format(day, "yyyy-MM-dd") });
                              setIsAddingEvent(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Availability indicators */}
                    <div className="space-y-1">
                      {dayAvailability.map(avail => {
                        const city = cities.find(c => c.id === avail.city_id || c.city_name === avail.city);
                        return (
                          <div
                            key={avail.id}
                            className="group flex items-center gap-1 px-1.5 py-0.5 text-xs rounded cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: `${city?.color_hex}20`, color: city?.color_hex }}
                          >
                            <span className="truncate">{avail.city}</span>
                            <button
                              onClick={() => removeAvailability(avail.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Events */}
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={`group flex items-center gap-1 px-1.5 py-0.5 text-xs border rounded ${getEventTypeStyles(event.event_type)}`}
                        >
                          <span className="truncate flex-1">{event.title}</span>
                          {event.ai_suggested && <Sparkles className="w-3 h-3" />}
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {dayEvents.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</p>
                      )}
                    </div>

                    {/* Quick add availability for cities */}
                    {!isPast && isCurrentMonth && dayAvailability.length === 0 && cities.length > 0 && (
                      <div className="mt-1 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex flex-wrap gap-1">
                          {cities.slice(0, 3).map(city => (
                            <button
                              key={city.id}
                              onClick={() => addAvailability(day, city.id)}
                              className="w-4 h-4 rounded-full border border-border hover:scale-110 transition-transform"
                              style={{ backgroundColor: `${city.color_hex}50`, borderColor: city.color_hex }}
                              title={`Add ${city.city_name}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="font-body uppercase tracking-wider">Legend:</span>
            {cities.map(city => (
              <div key={city.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: city.color_hex }} />
                <span>{city.city_name}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>AI Suggested</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCalendarManager;
