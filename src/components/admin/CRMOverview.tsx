import { motion } from "framer-motion";
import { 
  Calendar, 
  MessageCircle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  Send,
  CalendarPlus,
  UserPlus,
  Sparkles,
  AlertTriangle,
  Target
} from "lucide-react";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";

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
  onQuickAction?: (action: string) => void;
}

const CRMOverview = ({ 
  bookings, 
  chatStats, 
  availabilityCount,
  onViewBookings,
  onViewConversations,
  onQuickAction
}: CRMOverviewProps) => {
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const recentBookings = bookings.slice(0, 5);

  // AI-generated insights
  const generateInsights = () => {
    const insights: { type: "warning" | "success" | "tip"; message: string; action?: string }[] = [];
    
    if (pendingBookings.length > 3) {
      insights.push({
        type: "warning",
        message: `${pendingBookings.length} bookings awaiting response. Quick action available.`,
        action: "review-pending"
      });
    }
    
    if (chatStats && chatStats.conversionRate < 30) {
      insights.push({
        type: "tip",
        message: "Conversion rate is below average. Consider reviewing chat responses.",
        action: "view-conversations"
      });
    }
    
    if (availabilityCount < 3) {
      insights.push({
        type: "warning",
        message: "Low availability. Add more dates to accept new bookings.",
        action: "add-availability"
      });
    }
    
    if (confirmedBookings.length > 0) {
      const upcomingToday = confirmedBookings.filter(b => 
        b.preferred_date && isToday(new Date(b.preferred_date))
      );
      if (upcomingToday.length > 0) {
        insights.push({
          type: "success",
          message: `${upcomingToday.length} session${upcomingToday.length > 1 ? 's' : ''} scheduled for today!`
        });
      }
    }
    
    return insights;
  };

  const insights = generateInsights();

  const quickActions = [
    { id: "new-booking", label: "New Booking", icon: CalendarPlus, color: "bg-green-500/10 text-green-500 hover:bg-green-500/20" },
    { id: "send-reminder", label: "Send Reminders", icon: Send, color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
    { id: "add-client", label: "Add Client", icon: UserPlus, color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
    { id: "ai-suggest", label: "AI Suggestions", icon: Sparkles, color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" },
  ];

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
      {/* Header with Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Welcome back
          </h1>
          <p className="font-body text-muted-foreground mt-2">
            Here's what's happening with your tattoo business
          </p>
        </div>
        
        {/* Quick Actions Bar */}
        <div className="flex gap-2 flex-wrap">
          {quickActions.map((action) => (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onQuickAction?.(action.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm transition-colors ${action.color}`}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* AI Insights Banner */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border bg-accent/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-body text-sm font-medium text-foreground">AI Insights</span>
          </div>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {insight.type === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                {insight.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                {insight.type === "tip" && <Target className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                <span className="font-body text-sm text-muted-foreground">{insight.message}</span>
                {insight.action && (
                  <button
                    onClick={() => onQuickAction?.(insight.action!)}
                    className="ml-auto text-xs text-foreground hover:underline"
                  >
                    Take action →
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-border p-6 hover:border-foreground/20 transition-colors cursor-pointer group"
            onClick={() => {
              if (stat.label === "Pending") onViewBookings();
              if (stat.label === "Confirmed") onViewBookings();
            }}
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
