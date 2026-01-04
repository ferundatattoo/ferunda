import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Phone, Calendar, Clock, DollarSign, 
  FileText, Image as ImageIcon, MessageCircle, Send,
  ChevronRight, ChevronDown, Check, X, Trash2, 
  ExternalLink, Copy, Loader2, AlertCircle, Star,
  ArrowRight, RefreshCw, Bell, Filter, Search,
  MoreVertical, Eye, Edit2, History, Zap, Sparkles
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BookingDetailPanel from "./BookingDetailPanel";

// Pipeline stages matching your actual workflow
const PIPELINE_STAGES = [
  { id: "new_inquiry", label: "New Inquiry", color: "bg-sky-500", borderColor: "border-sky-500/30", textColor: "text-sky-400", description: "Just submitted" },
  { id: "references_requested", label: "Refs Requested", color: "bg-amber-500", borderColor: "border-amber-500/30", textColor: "text-amber-400", description: "Waiting for references" },
  { id: "references_received", label: "Refs Received", color: "bg-orange-500", borderColor: "border-orange-500/30", textColor: "text-orange-400", description: "References in hand" },
  { id: "deposit_requested", label: "Deposit Requested", color: "bg-violet-500", borderColor: "border-violet-500/30", textColor: "text-violet-400", description: "Awaiting payment" },
  { id: "deposit_paid", label: "Deposit Paid", color: "bg-emerald-500", borderColor: "border-emerald-500/30", textColor: "text-emerald-400", description: "Secured" },
  { id: "scheduled", label: "Scheduled", color: "bg-teal-500", borderColor: "border-teal-500/30", textColor: "text-teal-400", description: "Date confirmed" },
  { id: "completed", label: "Completed", color: "bg-slate-500", borderColor: "border-slate-500/30", textColor: "text-slate-400", description: "Session done" },
  { id: "cancelled", label: "Cancelled", color: "bg-red-500", borderColor: "border-red-500/30", textColor: "text-red-400", description: "Not proceeding" },
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

const BookingPipeline = forwardRef<HTMLDivElement, BookingPipelineProps>(
  ({ bookings, loading, onRefresh }, ref) => {
    const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [activities, setActivities] = useState<BookingActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Real-time subscription for bookings
  useEffect(() => {
    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Booking change detected:', payload.eventType);
          onRefresh();
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Booking!",
              description: `${(payload.new as any).name} just submitted a request`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh, toast]);

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

      const { error: updateError } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId);

      if (updateError) {
        console.error("Stage update error:", updateError);
        throw new Error(updateError.message || "Failed to update stage");
      }

      // Log activity (separate try/catch so it doesn't block the main update)
      try {
        await supabase.from("booking_activities").insert({
          booking_id: bookingId,
          activity_type: "stage_change",
          description: `Moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`,
          metadata: { from_stage: bookings.find(b => b.id === bookingId)?.pipeline_stage, to_stage: newStage }
        });
      } catch (activityError) {
        console.warn("Activity log failed (non-blocking):", activityError);
      }

      toast({ title: "✅ Actualizado", description: `Stage: ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}` });
      onRefresh();
    } catch (error: any) {
      console.error("updateBookingStage error:", error);
      toast({ 
        title: "Error al actualizar stage", 
        description: error.message || "No se pudo actualizar el estado", 
        variant: "destructive" 
      });
    } finally {
      setUpdating(null);
    }
  };

  const updateBookingField = async (bookingId: string, field: string, value: any) => {
    try {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ [field]: value })
        .eq("id", bookingId);

      if (updateError) {
        console.error("Field update error:", updateError);
        throw new Error(updateError.message || "Failed to update field");
      }

      // Log activity (non-blocking)
      try {
        await supabase.from("booking_activities").insert({
          booking_id: bookingId,
          activity_type: "field_update",
          description: `Updated ${field.replace(/_/g, " ")}`,
          metadata: { field, value }
        });
      } catch (activityError) {
        console.warn("Activity log failed (non-blocking):", activityError);
      }

      toast({ title: "✅ Guardado", description: "Cambios guardados" });
      onRefresh();
      
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, [field]: value });
      }
    } catch (error: any) {
      console.error("updateBookingField error:", error);
      toast({ 
        title: "Error al guardar", 
        description: error.message || "No se pudo guardar el cambio", 
        variant: "destructive" 
      });
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm("¿Eliminar esta reserva? No se puede deshacer.")) return;
    
    try {
      const { error: deleteError } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (deleteError) {
        console.error("Delete booking error:", deleteError);
        throw new Error(deleteError.message || "Failed to delete");
      }
      
      toast({ title: "✅ Eliminado", description: "Reserva eliminada" });
      setSelectedBooking(null);
      onRefresh();
    } catch (error: any) {
      console.error("deleteBooking error:", error);
      toast({ 
        title: "Error al eliminar", 
        description: error.message || "No se pudo eliminar la reserva", 
        variant: "destructive" 
      });
    }
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Tracking code copied" });
  };

  const getUrgencyIndicator = (booking: Booking) => {
    if (booking.follow_up_date) {
      const followUp = new Date(booking.follow_up_date);
      if (isPast(followUp)) return { color: "text-red-400", label: "Overdue" };
      if (isToday(followUp)) return { color: "text-orange-400", label: "Today" };
      if (isTomorrow(followUp)) return { color: "text-amber-400", label: "Tomorrow" };
    }
    if (booking.priority === "high") return { color: "text-gold", label: "High Priority" };
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
        className={`relative overflow-hidden bg-gradient-to-br from-card to-background border border-border/50 hover:border-gold/30 transition-all duration-300 cursor-pointer group ${
          compact ? "p-3" : "p-4"
        } ${selectedBooking?.id === booking.id ? "ring-1 ring-gold shadow-gold" : ""}`}
        onClick={() => setSelectedBooking(booking)}
      >
        {/* Hover glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-body font-medium text-foreground truncate group-hover:text-gold transition-colors">
                  {booking.name}
                </span>
                {booking.priority === "high" && (
                  <Star className="w-3 h-3 text-gold fill-gold flex-shrink-0" />
                )}
              </div>
              {!compact && (
                <p className="font-body text-xs text-muted-foreground truncate">
                  {booking.email}
                </p>
              )}
              <p className="font-body text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                {booking.tattoo_description.substring(0, 60)}...
              </p>
            </div>
            {urgency && (
              <span className={`text-[10px] uppercase tracking-wider font-body ${urgency.color} flex-shrink-0`}>
                {urgency.label}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
            <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
            </span>
            <div className="flex items-center gap-2">
              {booking.reference_images && booking.reference_images.length > 0 && (
                <div className="w-5 h-5 bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <ImageIcon className="w-3 h-3 text-violet-400" />
                </div>
              )}
              {booking.deposit_paid && (
                <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                </div>
              )}
              {booking.scheduled_date && (
                <div className="w-5 h-5 bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-sky-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20">
                <Calendar className="w-6 h-6 text-gold" />
              </div>
              <div className="absolute inset-0 blur-xl bg-gold/20 -z-10" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-light text-foreground tracking-tight">
                Booking Pipeline
              </h1>
              <p className="font-body text-sm text-muted-foreground mt-0.5">
                {bookings.length} total • {bookingsByStage.new_inquiry?.length || 0} new inquiries
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="p-2.5 border border-border/50 text-muted-foreground hover:text-gold hover:border-gold/30 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex border border-border/50 overflow-hidden">
              <button
                onClick={() => setViewMode("pipeline")}
                className={`px-4 py-2 font-body text-xs uppercase tracking-wider transition-all duration-300 ${
                  viewMode === "pipeline" 
                    ? "bg-gradient-to-r from-gold/20 to-gold/10 text-gold border-r border-gold/30" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 font-body text-xs uppercase tracking-wider transition-all duration-300 ${
                  viewMode === "list" 
                    ? "bg-gradient-to-r from-gold/20 to-gold/10 text-gold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative line */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-6 h-px bg-gradient-to-r from-gold/50 via-border to-transparent origin-left"
        />
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
            className="w-full pl-10 pr-4 py-2.5 bg-gradient-to-br from-card to-background border border-border/50 text-foreground font-body text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2.5 bg-gradient-to-br from-card to-background border border-border/50 text-foreground font-body text-sm focus:outline-none focus:border-gold/50 transition-colors"
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
          {PIPELINE_STAGES.slice(0, -1).map((stage, stageIndex) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stageIndex * 0.05 }}
              className="flex-shrink-0 w-72"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className={`font-body text-sm font-medium ${stage.textColor}`}>
                    {stage.label}
                  </span>
                  <span className="font-body text-xs text-muted-foreground/60">
                    ({bookingsByStage[stage.id]?.length || 0})
                  </span>
                </div>
              </div>

              {/* Stage Cards */}
              <div className={`space-y-3 min-h-[200px] p-3 bg-gradient-to-b from-secondary/30 to-transparent border ${stage.borderColor} rounded-sm`}>
                {bookingsByStage[stage.id]?.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-muted-foreground/40">
                    <p className="font-body text-xs">No bookings</p>
                  </div>
                ) : (
                  bookingsByStage[stage.id]?.map((booking) => renderBookingCard(booking, true))
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-20 border border-border/50 bg-gradient-to-br from-card to-background">
              <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-body text-muted-foreground">No bookings found</p>
            </div>
          ) : (
            filteredBookings.map((booking, index) => {
              const stage = PIPELINE_STAGES.find(s => s.id === (booking.pipeline_stage || "new_inquiry"));
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="relative flex items-center gap-4 p-4 bg-gradient-to-br from-card to-background border border-border/50 hover:border-gold/30 transition-all duration-300 cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedBooking(booking)}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className={`w-1 h-full min-h-[60px] ${stage?.color} absolute left-0 top-0`} />
                  <div className="relative z-10 flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-body font-medium text-foreground group-hover:text-gold transition-colors">
                        {booking.name}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-body border ${stage?.borderColor} ${stage?.textColor} bg-opacity-10`}>
                        {stage?.label}
                      </span>
                      {booking.priority === "high" && (
                        <Star className="w-3 h-3 text-gold fill-gold" />
                      )}
                    </div>
                    <p className="font-body text-sm text-muted-foreground truncate max-w-xl">
                      {booking.tattoo_description}
                    </p>
                  </div>
                  <div className="relative z-10 text-right">
                    <p className="font-body text-sm text-foreground">{booking.email}</p>
                    <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                    </p>
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
});

BookingPipeline.displayName = "BookingPipeline";

export default BookingPipeline;