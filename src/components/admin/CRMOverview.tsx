import { motion } from "framer-motion";
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles
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
      color: "text-gold",
      bgColor: "bg-gold/10",
      borderColor: "border-gold/20",
    },
    {
      label: "Pending",
      value: pendingBookings.length,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/20",
    },
    {
      label: "Confirmed",
      value: confirmedBookings.length,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
      borderColor: "border-emerald-400/20",
    },
    {
      label: "Available Dates",
      value: availabilityCount,
      icon: TrendingUp,
      color: "text-sky-400",
      bgColor: "bg-sky-400/10",
      borderColor: "border-sky-400/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with decorative elements */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
        >
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <div className="absolute inset-0 blur-xl bg-gold/20 -z-10" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-light text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="font-body text-muted-foreground mt-1 text-sm tracking-wide">
              Here's what's happening with your tattoo business
            </p>
          </div>
        </motion.div>
        
        {/* Decorative line */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-6 h-px bg-gradient-to-r from-gold/50 via-border to-transparent origin-left"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative group overflow-hidden bg-gradient-to-br from-card to-background p-6 border ${stat.borderColor} hover:border-gold/40 transition-all duration-500`}
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gold/5 to-transparent" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${stat.bgColor} border ${stat.borderColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="font-display text-4xl font-light text-foreground">
                {stat.value}
              </p>
              <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground mt-2">
                {stat.label}
              </p>
            </div>
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
          className="relative bg-gradient-to-br from-card to-background border border-border/50 overflow-hidden"
        >
          {/* Header glow */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-between p-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gold/10 flex items-center justify-center border border-gold/20">
                <Calendar className="w-4 h-4 text-gold" />
              </div>
              <h2 className="font-display text-xl font-light text-foreground">
                Recent Bookings
              </h2>
            </div>
            <button
              onClick={onViewBookings}
              className="flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-gold transition-colors group"
            >
              View all
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
          <div className="divide-y divide-border/30">
            {recentBookings.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="font-body text-sm text-muted-foreground">
                  No bookings yet
                </p>
              </div>
            ) : (
              recentBookings.map((booking, index) => (
                <motion.div 
                  key={booking.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="p-4 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-body text-foreground font-medium group-hover:text-gold transition-colors">
                        {booking.name}
                      </p>
                      <p className="font-body text-sm text-muted-foreground">
                        {booking.email}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="font-body text-[11px] uppercase tracking-[0.1em] text-muted-foreground/60 mt-2">
                    {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Chat Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative bg-gradient-to-br from-card to-background border border-border/50 overflow-hidden"
        >
          {/* Header glow */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-between p-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gold/10 flex items-center justify-center border border-gold/20">
                <MessageCircle className="w-4 h-4 text-gold" />
              </div>
              <h2 className="font-display text-xl font-light text-foreground">
                Chat Performance
              </h2>
            </div>
            <button
              onClick={onViewConversations}
              className="flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-gold transition-colors group"
            >
              View all
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
          <div className="p-6">
            {chatStats ? (
              <div className="grid grid-cols-2 gap-6">
                <StatItem value={chatStats.totalConversations} label="Conversations" />
                <StatItem value={chatStats.totalMessages} label="Messages" />
                <StatItem value={chatStats.conversions} label="Conversions" />
                <StatItem value={`${chatStats.conversionRate}%`} label="Conversion Rate" highlight />
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
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
          className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-6"
        >
          {/* Animated glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />
          
          <div className="relative flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 border border-amber-500/30">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl text-foreground">
                {pendingBookings.length} pending booking{pendingBookings.length > 1 ? 's' : ''} require attention
              </h3>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Review and respond to booking requests to maintain a great customer experience.
              </p>
              <button
                onClick={onViewBookings}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-gold to-amber-500 text-primary-foreground font-body text-xs uppercase tracking-[0.2em] hover:shadow-gold transition-all duration-300"
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

const StatItem = ({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) => (
  <div className="group">
    <p className={`font-display text-3xl font-light ${highlight ? 'text-gold' : 'text-foreground'} group-hover:text-gold transition-colors`}>
      {value}
    </p>
    <p className="font-body text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
      {label}
    </p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    completed: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  };

  return (
    <span className={`px-2.5 py-1 text-[10px] font-body uppercase tracking-[0.15em] border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

export default CRMOverview;