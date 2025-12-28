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
  Filter,
  Loader2,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

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
}

interface BookingsManagerProps {
  bookings: Booking[];
  loading: boolean;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

const BookingsManager = ({ 
  bookings, 
  loading, 
  updatingId,
  onUpdateStatus, 
  onDelete 
}: BookingsManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = 
      booking.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.tattoo_description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
    completed: bookings.filter(b => b.status === "completed").length,
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
    completed: "bg-blue-500/20 text-blue-500 border-blue-500/30",
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
            placeholder="Search by name, email, or description..."
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
              {/* Header Row - Always Visible */}
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
                      </div>
                      <p className="font-body text-sm text-muted-foreground truncate">
                        {booking.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
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
                    <div className="p-6 space-y-4">
                      {/* Contact Info */}
                      <div className="flex flex-wrap gap-4">
                        <a
                          href={`mailto:${booking.email}`}
                          className="flex items-center gap-2 px-3 py-2 bg-accent text-foreground font-body text-sm hover:bg-accent/80 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          Email Client
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {booking.phone && (
                          <a
                            href={`tel:${booking.phone}`}
                            className="flex items-center gap-2 px-3 py-2 bg-accent text-foreground font-body text-sm hover:bg-accent/80 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            {booking.phone}
                          </a>
                        )}
                      </div>

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
                            <p className="font-body text-foreground">
                              {booking.size}
                            </p>
                          </div>
                        )}
                        <div>
                          <h4 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Submitted
                          </h4>
                          <p className="font-body text-foreground">
                            {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
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
                          className="flex items-center gap-2 px-4 py-2 text-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
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

export default BookingsManager;
