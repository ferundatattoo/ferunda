import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Loader2, 
  LogOut, 
  ArrowLeft, 
  Calendar, 
  Mail, 
  Phone, 
  User,
  Clock,
  Check,
  X,
  Trash2,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Users,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface ChatConversation {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  converted: boolean;
  conversion_type: string | null;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  conversions: number;
  conversionRate: number;
  commonQuestions: { question: string; count: number }[];
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"bookings" | "analytics">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Analytics state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch bookings when admin
  useEffect(() => {
    if (isAdmin) {
      fetchBookings();
    } else if (!loading && user && !isAdmin) {
      setLoadingBookings(false);
    }
  }, [isAdmin, loading, user]);

  // Fetch analytics when tab changes
  useEffect(() => {
    if (isAdmin && activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [isAdmin, activeTab]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load bookings.",
        variant: "destructive",
      });
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (convError) throw convError;
      setConversations(convData || []);

      // Fetch all messages for stats
      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(500);

      if (msgError) throw msgError;

      // Calculate stats
      const totalConversations = convData?.length || 0;
      const totalMessages = msgData?.length || 0;
      const conversions = convData?.filter(c => c.converted).length || 0;
      const conversionRate = totalConversations > 0 
        ? Math.round((conversions / totalConversations) * 100) 
        : 0;

      // Extract common questions (simple word frequency)
      const questionCounts: Record<string, number> = {};
      const keywords = ["price", "cost", "book", "appointment", "style", "pain", "healing", "time", "color", "size"];
      
      msgData?.forEach(msg => {
        const lowerContent = msg.content.toLowerCase();
        keywords.forEach(keyword => {
          if (lowerContent.includes(keyword)) {
            questionCounts[keyword] = (questionCounts[keyword] || 0) + 1;
          }
        });
      });

      const commonQuestions = Object.entries(questionCounts)
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setChatStats({
        totalConversations,
        totalMessages,
        conversions,
        conversionRate,
        commonQuestions,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to load analytics.",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setConversationMessages(data || []);
      setSelectedConversation(conversationId);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );

      toast({
        title: "Status Updated",
        description: `Booking marked as ${status}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;

    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBookings((prev) => prev.filter((b) => b.id !== id));

      toast({
        title: "Booking Deleted",
        description: "The booking has been removed.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete booking.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="font-display text-3xl font-light text-foreground mb-4">
            Access Denied
          </h1>
          <p className="font-body text-muted-foreground mb-8">
            You don't have admin privileges. Contact the site owner to request access.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 border border-border text-foreground font-body text-sm tracking-[0.2em] uppercase hover:bg-accent transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={handleSignOut}
              className="px-6 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
    completed: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-body text-sm">Back to site</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-display text-xl font-light text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-body text-sm">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4 border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${
              activeTab === "bookings"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Bookings
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${
              activeTab === "analytics"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Chat Analytics
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "bookings" ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-light text-foreground">
                  Booking Requests
                </h2>
                <p className="font-body text-muted-foreground mt-2">
                  {bookings.length} total requests
                </p>
              </div>
            </div>

            {loadingBookings ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="font-body text-muted-foreground">
                  No booking requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border p-6 hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Main Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-body text-foreground font-medium">
                                {booking.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs font-body uppercase tracking-wider border ${
                                  statusColors[booking.status] || statusColors.pending
                                }`}
                              >
                                {booking.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <a
                                href={`mailto:${booking.email}`}
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                              >
                                <Mail className="w-3 h-3" />
                                {booking.email}
                              </a>
                              {booking.phone && (
                                <a
                                  href={`tel:${booking.phone}`}
                                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                  {booking.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="font-body text-foreground/80 whitespace-pre-wrap">
                          {booking.tattoo_description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {booking.preferred_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(booking.preferred_date), "MMM d, yyyy")}
                            </div>
                          )}
                          {booking.placement && (
                            <div>
                              <span className="text-foreground/60">Placement:</span>{" "}
                              {booking.placement}
                            </div>
                          )}
                          {booking.size && (
                            <div>
                              <span className="text-foreground/60">Size:</span>{" "}
                              {booking.size}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(booking.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2">
                        <button
                          onClick={() => updateStatus(booking.id, "confirmed")}
                          disabled={updatingId === booking.id || booking.status === "confirmed"}
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-green-500/30 text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingId === booking.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, "cancelled")}
                          disabled={updatingId === booking.id || booking.status === "cancelled"}
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteBooking(booking.id)}
                          disabled={updatingId === booking.id}
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="font-display text-3xl font-light text-foreground">
                Chat Analytics
              </h2>
              <p className="font-body text-muted-foreground mt-2">
                Track assistant performance and common visitor questions
              </p>
            </div>

            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : chatStats ? (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border border-border p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="font-body text-sm text-muted-foreground">Conversations</span>
                    </div>
                    <p className="font-display text-3xl font-light text-foreground">
                      {chatStats.totalConversations}
                    </p>
                  </div>
                  <div className="border border-border p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      <span className="font-body text-sm text-muted-foreground">Messages</span>
                    </div>
                    <p className="font-display text-3xl font-light text-foreground">
                      {chatStats.totalMessages}
                    </p>
                  </div>
                  <div className="border border-border p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-muted-foreground" />
                      <span className="font-body text-sm text-muted-foreground">Conversions</span>
                    </div>
                    <p className="font-display text-3xl font-light text-foreground">
                      {chatStats.conversions}
                    </p>
                  </div>
                  <div className="border border-border p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                      <span className="font-body text-sm text-muted-foreground">Conversion Rate</span>
                    </div>
                    <p className="font-display text-3xl font-light text-foreground">
                      {chatStats.conversionRate}%
                    </p>
                  </div>
                </div>

                {/* Common Topics */}
                {chatStats.commonQuestions.length > 0 && (
                  <div className="border border-border p-6">
                    <h3 className="font-display text-xl font-light text-foreground mb-4">
                      Common Topics
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {chatStats.commonQuestions.map((q) => (
                        <div
                          key={q.question}
                          className="px-4 py-2 bg-accent text-foreground font-body text-sm flex items-center gap-2"
                        >
                          <span className="capitalize">{q.question}</span>
                          <span className="text-muted-foreground">({q.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Conversations */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="border border-border p-6">
                    <h3 className="font-display text-xl font-light text-foreground mb-4">
                      Recent Conversations
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => fetchConversationMessages(conv.id)}
                          className={`w-full text-left p-3 border transition-colors ${
                            selectedConversation === conv.id
                              ? "border-foreground bg-accent"
                              : "border-border hover:border-foreground/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-body text-xs text-muted-foreground">
                              {format(new Date(conv.started_at), "MMM d, h:mm a")}
                            </span>
                            {conv.converted && (
                              <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-500 border border-green-500/30">
                                Converted
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-3 h-3 text-muted-foreground" />
                            <span className="font-body text-sm text-foreground">
                              {conv.message_count} messages
                            </span>
                          </div>
                        </button>
                      ))}
                      {conversations.length === 0 && (
                        <p className="font-body text-sm text-muted-foreground text-center py-8">
                          No conversations yet
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Conversation Detail */}
                  <div className="border border-border p-6">
                    <h3 className="font-display text-xl font-light text-foreground mb-4">
                      Conversation Detail
                    </h3>
                    {selectedConversation ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {conversationMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.role === "user"
                                ? "bg-foreground/10 ml-8"
                                : "bg-accent mr-8"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-body text-xs text-muted-foreground capitalize">
                                {msg.role}
                              </span>
                              <span className="font-body text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), "h:mm a")}
                              </span>
                            </div>
                            <p className="font-body text-sm text-foreground">
                              {msg.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="font-body text-sm text-muted-foreground text-center py-8">
                        Select a conversation to view details
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="font-body text-muted-foreground">
                  No chat data available yet.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
