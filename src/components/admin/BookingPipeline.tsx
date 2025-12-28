import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Phone, Calendar, Clock, DollarSign, 
  FileText, Image as ImageIcon, MessageCircle, Send,
  ChevronRight, ChevronDown, Check, X, Trash2, 
  ExternalLink, Copy, Loader2, AlertCircle, Star,
  ArrowRight, RefreshCw, Bell, Filter, Search,
  MoreVertical, Eye, Edit2, History, Zap
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BookingDetailPanel from "./BookingDetailPanel";

// Pipeline stages matching your actual workflow
const PIPELINE_STAGES = [
  { id: "new_inquiry", label: "New Inquiry", color: "bg-blue-500", description: "Just submitted" },
  { id: "references_requested", label: "Refs Requested", color: "bg-yellow-500", description: "Waiting for references" },
  { id: "references_received", label: "Refs Received", color: "bg-orange-500", description: "References in hand" },
  { id: "deposit_requested", label: "Deposit Requested", color: "bg-purple-500", description: "Awaiting payment" },
  { id: "deposit_paid", label: "Deposit Paid", color: "bg-green-500", description: "Secured" },
  { id: "scheduled", label: "Scheduled", color: "bg-emerald-500", description: "Date confirmed" },
  { id: "completed", label: "Completed", color: "bg-slate-500", description: "Session done" },
  { id: "cancelled", label: "Cancelled", color: "bg-red-500", description: "Not proceeding" },
];

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferred_date: string | null;
  placement: string | null;
  size: string | null;
  tattoo_description: string;
  status: string;
  created_at: string;
  tracking_code?: string;
  admin_notes?: string | null;
  estimated_price?: string | null;
  scheduled_date?: string | null;
  deposit_paid?: boolean;
  reference_images?: string[] | null;
  pipeline_stage?: string;
  references_requested_at?: string | null;
  references_received_at?: string | null;
  deposit_requested_at?: string | null;
  deposit_paid_at?: string | null;
  deposit_amount?: number;
  session_rate?: number;
  payment_method?: string | null;
  scheduled_time?: string;
  full_name?: string | null;
  customer_notes?: string | null;
  last_contacted_at?: string | null;
  follow_up_date?: string | null;
  priority?: string;
  source?: string;
}

interface BookingActivity {
  id: string;
  booking_id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_by: string;
  created_at: string;
}

interface BookingPipelineProps {
  bookings: Booking[];
  loading: boolean;
  onRefresh: () => void;
}

const BookingPipeline = ({ bookings, loading, onRefresh }: BookingPipelineProps) => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [activities, setActivities] = useState<BookingActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = 
      booking.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPriority = priorityFilter === "all" || booking.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  // Group bookings by pipeline stage
  const bookingsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredBookings.filter(b => 
      (b.pipeline_stage || "new_inquiry") === stage.id
    );
    return acc;
  }, {} as Record<string, Booking[]>);

  // Load activities when booking is selected
  useEffect(() => {
    if (selectedBooking) {
      loadActivities(selectedBooking.id);
    }
  }, [selectedBooking?.id]);

  const loadActivities = async (bookingId: string) => {
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from("booking_activities")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const updateBookingStage = async (bookingId: string, newStage: string) => {
    setUpdating(bookingId);
    try {
      const updates: Partial<Booking> = { pipeline_stage: newStage };
      
      // Auto-update related fields based on stage
      if (newStage === "references_requested") {
        updates.references_requested_at = new Date().toISOString();
      } else if (newStage === "references_received") {
        updates.references_received_at = new Date().toISOString();
      } else if (newStage === "deposit_requested") {
        updates.deposit_requested_at = new Date().toISOString();
      } else if (newStage === "deposit_paid") {
        updates.deposit_paid_at = new Date().toISOString();
        updates.deposit_paid = true;
      } else if (newStage === "completed") {
        updates.status = "completed";
      } else if (newStage === "cancelled") {
        updates.status = "cancelled";
      }

      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId);

      if (error) throw error;

      // Log activity
      await supabase.from("booking_activities").insert({
        booking_id: bookingId,
        activity_type: "stage_change",
        description: `Moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`,
        metadata: { from_stage: bookings.find(b => b.id === bookingId)?.pipeline_stage, to_stage: newStage }
      });

      toast({ title: "Updated", description: "Booking stage updated" });
      onRefresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update stage", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const updateBookingField = async (bookingId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ [field]: value })
        .eq("id", bookingId);

      if (error) throw error;

      // Log activity
      await supabase.from("booking_activities").insert({
        booking_id: bookingId,
        activity_type: "field_update",
        description: `Updated ${field.replace(/_/g, " ")}`,
        metadata: { field, value }
      });

      toast({ title: "Saved", description: "Changes saved" });
      onRefresh();
      
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, [field]: value });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;
      
      toast({ title: "Deleted", description: "Booking removed" });
      setSelectedBooking(null);
      onRefresh();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Tracking code copied" });
  };

  const getUrgencyIndicator = (booking: Booking) => {
    if (booking.follow_up_date) {
      const followUp = new Date(booking.follow_up_date);
      if (isPast(followUp)) return { color: "text-red-500", label: "Overdue" };
      if (isToday(followUp)) return { color: "text-orange-500", label: "Today" };
      if (isTomorrow(followUp)) return { color: "text-yellow-500", label: "Tomorrow" };
    }
    if (booking.priority === "high") return { color: "text-red-500", label: "High Priority" };
    return null;
  };

  const renderBookingCard = (booking: Booking, compact = false) => {
    const urgency = getUrgencyIndicator(booking);
    const stage = PIPELINE_STAGES.find(s => s.id === (booking.pipeline_stage || "new_inquiry"));
    
    return (
      <motion.div
        key={booking.id}
        layoutId={booking.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-background border border-border hover:border-foreground/30 transition-all cursor-pointer ${
          compact ? "p-3" : "p-4"
        } ${selectedBooking?.id === booking.id ? "ring-2 ring-foreground" : ""}`}
        onClick={() => setSelectedBooking(booking)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-body font-medium text-foreground truncate">
                {booking.name}
              </span>
              {booking.priority === "high" && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            {!compact && (
              <p className="font-body text-xs text-muted-foreground truncate">
                {booking.email}
              </p>
            )}
            <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-2">
              {booking.tattoo_description.substring(0, 60)}...
            </p>
          </div>
          {urgency && (
            <span className={`text-xs font-body ${urgency.color} flex-shrink-0`}>
              {urgency.label}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
          <span className="font-body text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-2">
            {booking.reference_images && booking.reference_images.length > 0 && (
              <ImageIcon className="w-3 h-3 text-muted-foreground" />
            )}
            {booking.deposit_paid && (
              <DollarSign className="w-3 h-3 text-green-500" />
            )}
            {booking.scheduled_date && (
              <Calendar className="w-3 h-3 text-blue-500" />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Booking Pipeline
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            {bookings.length} total • {bookingsByStage.new_inquiry?.length || 0} new inquiries
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex border border-border">
            <button
              onClick={() => setViewMode("pipeline")}
              className={`px-3 py-2 font-body text-sm ${
                viewMode === "pipeline" ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 font-body text-sm ${
                viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or tracking code..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-border text-foreground font-body text-sm focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Pipeline View */}
      {viewMode === "pipeline" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.slice(0, -1).map((stage) => (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="font-body text-sm font-medium text-foreground">
                    {stage.label}
                  </span>
                  <span className="font-body text-xs text-muted-foreground">
                    ({bookingsByStage[stage.id]?.length || 0})
                  </span>
                </div>
              </div>

              {/* Stage Cards */}
              <div className="space-y-3 min-h-[200px] p-2 bg-accent/30 border border-border">
                {bookingsByStage[stage.id]?.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <p className="font-body text-xs">No bookings</p>
                  </div>
                ) : (
                  bookingsByStage[stage.id]?.map((booking) => renderBookingCard(booking, true))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-20 border border-border">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="font-body text-muted-foreground">No bookings found</p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const stage = PIPELINE_STAGES.find(s => s.id === (booking.pipeline_stage || "new_inquiry"));
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 border border-border hover:border-foreground/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className={`w-2 h-full min-h-[60px] ${stage?.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-body font-medium text-foreground">
                        {booking.name}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-body ${stage?.color} bg-opacity-20 text-foreground`}>
                        {stage?.label}
                      </span>
                      {booking.priority === "high" && (
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="font-body text-sm text-muted-foreground">
                      {booking.email} • {format(new Date(booking.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {booking.reference_images && booking.reference_images.length > 0 && (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    {booking.deposit_paid && (
                      <DollarSign className="w-4 h-4 text-green-500" />
                    )}
                    {booking.scheduled_date && (
                      <span className="font-body text-xs">
                        {format(new Date(booking.scheduled_date), "MMM d")}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailPanel
            booking={selectedBooking}
            activities={activities}
            loadingActivities={loadingActivities}
            stages={PIPELINE_STAGES}
            updating={updating}
            onClose={() => setSelectedBooking(null)}
            onUpdateStage={updateBookingStage}
            onUpdateField={updateBookingField}
            onDelete={deleteBooking}
            onCopyCode={copyTrackingCode}
            onRefreshActivities={() => loadActivities(selectedBooking.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingPipeline;
