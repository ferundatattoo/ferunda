import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Mail, 
  Phone, 
  User,
  Clock,
  Check,
  X,
  Trash2,
  Search,
  Loader2,
  ChevronDown,
  ExternalLink,
  DollarSign,
  MessageCircle,
  Image as ImageIcon,
  Copy,
  CalendarCheck,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Booking {
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
}

interface EnhancedBookingsManagerProps {
  bookings: Booking[];
  loading: boolean;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => void;
  onDelete: (id: string) => void;
}

const EnhancedBookingsManager = ({ 
  bookings, 
  loading, 
  updatingId,
  onUpdateStatus, 
  onUpdateBooking,
  onDelete 
}: EnhancedBookingsManagerProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = 
      booking.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.tattoo_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
    completed: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Tracking code copied to clipboard." });
  };

  const handleSaveNotes = (bookingId: string) => {
    onUpdateBooking(bookingId, { admin_notes: notesValue || null });
    setEditingNotes(null);
    setNotesValue("");
  };

  const handleSavePrice = (bookingId: string) => {
    onUpdateBooking(bookingId, { estimated_price: priceValue || null });
    setEditingPrice(null);
    setPriceValue("");
  };

  const handleSchedule = (bookingId: string) => {
    if (scheduleDate) {
      onUpdateBooking(bookingId, { scheduled_date: scheduleDate });
      setSchedulingId(null);
      setScheduleDate("");
    }
  };

  const handleToggleDeposit = (booking: Booking) => {
    onUpdateBooking(booking.id, { deposit_paid: !booking.deposit_paid });
  };

  const openWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(`Hi ${name}, this is Fernando regarding your tattoo inquiry.`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Booking Requests
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Manage and respond to tattoo inquiries
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, tracking code..."
            className="w-full pl-10 pr-4 py-3 bg-background border border-border text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 font-body text-sm transition-colors border ${
                statusFilter === status
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/50"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-20 border border-border">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground">
            {searchQuery || statusFilter !== "all" 
              ? "No bookings match your filters" 
              : "No booking requests yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-border hover:border-foreground/20 transition-colors"
            >
              {/* Header Row */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-body text-foreground font-medium">
                          {booking.name}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-body uppercase tracking-wider border ${statusColors[booking.status]}`}>
                          {booking.status}
                        </span>
                        {booking.deposit_paid && (
                          <span className="px-2 py-0.5 text-xs font-body uppercase tracking-wider border bg-green-500/10 text-green-400 border-green-500/30">
                            Deposit ✓
                          </span>
                        )}
                        {booking.reference_images && booking.reference_images.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ImageIcon className="w-3 h-3" />
                            {booking.reference_images.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm text-muted-foreground truncate">
                          {booking.email}
                        </p>
                        {booking.tracking_code && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyTrackingCode(booking.tracking_code!);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-accent/50 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {booking.tracking_code}
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {booking.scheduled_date && (
                      <span className="hidden md:flex items-center gap-1 px-2 py-1 bg-foreground/5 border border-foreground/20 text-xs text-foreground">
                        <CalendarCheck className="w-3 h-3" />
                        {format(new Date(booking.scheduled_date), "MMM d")}
                      </span>
                    )}
                    <span className="font-body text-xs text-muted-foreground hidden md:block">
                      {format(new Date(booking.created_at), "MMM d, yyyy")}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedId === booking.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedId === booking.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-6 space-y-6">
                      {/* Quick Actions Row */}
                      <div className="flex flex-wrap gap-3">
                        <a
                          href={`mailto:${booking.email}?subject=Re: Your Tattoo Inquiry`}
                          className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground font-body text-sm hover:bg-accent/80 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          Email
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {booking.phone && (
                          <>
                            <a
                              href={`tel:${booking.phone}`}
                              className="flex items-center gap-2 px-4 py-2 bg-accent text-foreground font-body text-sm hover:bg-accent/80 transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                              Call
                            </a>
                            <button
                              onClick={() => openWhatsApp(booking.phone!, booking.name)}
                              className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/20 text-[#25D366] font-body text-sm hover:bg-[#25D366]/30 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              WhatsApp
                            </button>
                          </>
                        )}
                      </div>

                      {/* Reference Images */}
                      {booking.reference_images && booking.reference_images.length > 0 && (
                        <div>
                          <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-3">
                            Reference Images
                          </h4>
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                            {booking.reference_images.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aspect-square border border-border hover:border-foreground/50 transition-colors overflow-hidden"
                              >
                                <img
                                  src={url}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tattoo Description */}
                      <div>
                        <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">
                          Tattoo Description
                        </h4>
                        <p className="font-body text-foreground/80 whitespace-pre-wrap">
                          {booking.tattoo_description}
                        </p>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {booking.preferred_date && (
                          <div>
                            <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1">
                              Preferred Date
                            </h4>
                            <p className="font-body text-foreground">
                              {format(new Date(booking.preferred_date), "MMM d, yyyy")}
                            </p>
                          </div>
                        )}
                        {booking.placement && (
                          <div>
                            <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1">
                              Placement
                            </h4>
                            <p className="font-body text-foreground">
                              {booking.placement}
                            </p>
                          </div>
                        )}
                        {booking.size && (
                          <div>
                            <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1">
                              Size
                            </h4>
                            <p className="font-body text-foreground capitalize">
                              {booking.size}
                            </p>
                          </div>
                        )}
                        <div>
                          <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Submitted
                          </h4>
                          <p className="font-body text-foreground">
                            {format(new Date(booking.created_at), "MMM d 'at' h:mm a")}
                          </p>
                        </div>
                      </div>

                      {/* Admin Controls */}
                      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border">
                        {/* Estimated Price */}
                        <div>
                          <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Estimated Price
                          </h4>
                          {editingPrice === booking.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={priceValue}
                                onChange={(e) => setPriceValue(e.target.value)}
                                placeholder="e.g., $500-700"
                                className="flex-1 px-3 py-2 bg-transparent border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground"
                              />
                              <button
                                onClick={() => handleSavePrice(booking.id)}
                                className="px-3 py-2 bg-foreground text-background text-sm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPrice(booking.id);
                                setPriceValue(booking.estimated_price || "");
                              }}
                              className="text-foreground font-body hover:text-foreground/80 transition-colors"
                            >
                              {booking.estimated_price || "Set price →"}
                            </button>
                          )}
                        </div>

                        {/* Schedule Date */}
                        <div>
                          <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                            <CalendarCheck className="w-3 h-3" /> Scheduled Date
                          </h4>
                          {schedulingId === booking.id ? (
                            <div className="flex gap-2">
                              <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="flex-1 px-3 py-2 bg-transparent border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground"
                              />
                              <button
                                onClick={() => handleSchedule(booking.id)}
                                className="px-3 py-2 bg-foreground text-background text-sm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSchedulingId(booking.id);
                                setScheduleDate(booking.scheduled_date || "");
                              }}
                              className="text-foreground font-body hover:text-foreground/80 transition-colors"
                            >
                              {booking.scheduled_date 
                                ? format(new Date(booking.scheduled_date), "MMM d, yyyy")
                                : "Schedule →"}
                            </button>
                          )}
                        </div>

                        {/* Deposit Paid */}
                        <div>
                          <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2">
                            Deposit Status
                          </h4>
                          <button
                            onClick={() => handleToggleDeposit(booking)}
                            className={`px-4 py-2 border font-body text-sm transition-colors ${
                              booking.deposit_paid
                                ? "bg-green-500/20 text-green-500 border-green-500/30"
                                : "bg-transparent text-muted-foreground border-border hover:border-foreground/50"
                            }`}
                          >
                            {booking.deposit_paid ? "✓ Deposit Paid" : "Mark as Paid"}
                          </button>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div>
                        <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Admin Notes
                        </h4>
                        {editingNotes === booking.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              rows={3}
                              placeholder="Add internal notes about this booking..."
                              className="w-full px-3 py-2 bg-transparent border border-border text-foreground font-body text-sm focus:outline-none focus:border-foreground resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveNotes(booking.id)}
                                className="px-4 py-2 bg-foreground text-background text-sm font-body"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNotes(null);
                                  setNotesValue("");
                                }}
                                className="px-4 py-2 border border-border text-muted-foreground text-sm font-body hover:text-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingNotes(booking.id);
                              setNotesValue(booking.admin_notes || "");
                            }}
                            className="text-left w-full p-3 border border-dashed border-border hover:border-foreground/50 transition-colors"
                          >
                            {booking.admin_notes ? (
                              <p className="font-body text-foreground/80 text-sm whitespace-pre-wrap">
                                {booking.admin_notes}
                              </p>
                            ) : (
                              <p className="font-body text-muted-foreground text-sm">
                                Click to add notes...
                              </p>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Status Actions */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                        {booking.status !== "confirmed" && (
                          <button
                            onClick={() => onUpdateStatus(booking.id, "confirmed")}
                            disabled={updatingId === booking.id}
                            className="flex items-center gap-2 px-4 py-2 text-sm border border-green-500/30 text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                          >
                            {updatingId === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Confirm
                          </button>
                        )}
                        {booking.status !== "completed" && booking.status === "confirmed" && (
                          <button
                            onClick={() => onUpdateStatus(booking.id, "completed")}
                            disabled={updatingId === booking.id}
                            className="flex items-center gap-2 px-4 py-2 text-sm border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            Mark Complete
                          </button>
                        )}
                        {booking.status !== "cancelled" && (
                          <button
                            onClick={() => onUpdateStatus(booking.id, "cancelled")}
                            disabled={updatingId === booking.id}
                            className="flex items-center gap-2 px-4 py-2 text-sm border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(booking.id)}
                          disabled={updatingId === booking.id}
                          className="flex items-center gap-2 px-4 py-2 text-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedBookingsManager;