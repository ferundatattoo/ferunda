import { motion } from "framer-motion";
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  preferred_date: string | null;
}

interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  conversions: number;
  conversionRate: number;
}

interface CRMOverviewProps {
  bookings: Booking[];
  chatStats: ChatStats | null;
  availabilityCount: number;
  onViewBookings: () => void;
  onViewConversations: () => void;
}

const CRMOverview = ({ 
  bookings, 
  chatStats, 
  availabilityCount,
  onViewBookings,
  onViewConversations
}: CRMOverviewProps) => {
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const recentBookings = bookings.slice(0, 5);

  const stats = [
    {
      label: "Total Bookings",
      value: bookings.length,
      icon: Calendar,
      color: "text-foreground",
      bgColor: "bg-accent",
    },
    {
      label: "Pending",
      value: pendingBookings.length,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Confirmed",
      value: confirmedBookings.length,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Available Dates",
      value: availabilityCount,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-light text-foreground">
          Welcome back
        </h1>
        <p className="font-body text-muted-foreground mt-2">
          Here's what's happening with your tattoo business
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-border p-6 hover:border-foreground/20 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="font-display text-3xl font-light text-foreground">
              {stat.value}
            </p>
            <p className="font-body text-sm text-muted-foreground mt-1">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="border border-border"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-display text-xl font-light text-foreground">
              Recent Bookings
            </h2>
            <button
              onClick={onViewBookings}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentBookings.length === 0 ? (
              <div className="p-6 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="font-body text-sm text-muted-foreground">
                  No bookings yet
                </p>
              </div>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-body text-foreground font-medium">
                        {booking.name}
                      </p>
                      <p className="font-body text-sm text-muted-foreground">
                        {booking.email}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-2">
                    {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Chat Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="border border-border"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-display text-xl font-light text-foreground">
              Chat Performance
            </h2>
            <button
              onClick={onViewConversations}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6">
            {chatStats ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="font-display text-3xl font-light text-foreground">
                    {chatStats.totalConversations}
                  </p>
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Total Conversations
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl font-light text-foreground">
                    {chatStats.totalMessages}
                  </p>
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Total Messages
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl font-light text-foreground">
                    {chatStats.conversions}
                  </p>
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Conversions
                  </p>
                </div>
                <div>
                  <p className="font-display text-3xl font-light text-green-500">
                    {chatStats.conversionRate}%
                  </p>
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Conversion Rate
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="font-body text-sm text-muted-foreground">
                  Loading chat stats...
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Pending Actions Alert */}
      {pendingBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="border border-yellow-500/30 bg-yellow-500/5 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg text-foreground">
                {pendingBookings.length} pending booking{pendingBookings.length > 1 ? 's' : ''} require attention
              </h3>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Review and respond to booking requests to maintain a great customer experience.
              </p>
              <button
                onClick={onViewBookings}
                className="mt-4 px-4 py-2 bg-foreground text-background font-body text-sm tracking-wider uppercase hover:bg-foreground/90 transition-colors"
              >
                Review Bookings
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
    completed: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-body uppercase tracking-wider border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

export default CRMOverview;
