import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CRMSidebar, { CRMTab, UserProfile } from "@/components/admin/CRMSidebar";
import CRMOverview from "@/components/admin/CRMOverview";
import BookingPipeline from "@/components/admin/BookingPipeline";
import AvailabilityManager from "@/components/admin/AvailabilityManager";
import ConversationsManager from "@/components/admin/ConversationsManager";
import GalleryManager from "@/components/admin/GalleryManager";
import CityConfigurationManager from "@/components/admin/CityConfigurationManager";
import EmailTemplateManager from "@/components/admin/EmailTemplateManager";
import GoogleCalendarSync from "@/components/admin/GoogleCalendarSync";
import { SecurityDashboard } from "@/components/admin/SecurityDashboard";
import NewsletterManager from "@/components/admin/NewsletterManager";
import ClientProfilesManager from "@/components/admin/ClientProfilesManager";
import WaitlistManager from "@/components/admin/WaitlistManager";
import HealingTrackerManager from "@/components/admin/HealingTrackerManager";
import OmnichannelInbox from "@/components/admin/OmnichannelInbox";
import DesignStudioAI from "@/components/admin/DesignStudioAI";
import UnifiedAIManager from "@/components/admin/UnifiedAIManager";
import PolicySettingsManager from "@/components/admin/PolicySettingsManager";
import ServiceCatalogManager from "@/components/admin/ServiceCatalogManager";
import WorkspaceSettingsManager from "@/components/admin/WorkspaceSettingsManager";
import AIStudioDashboard from "@/components/admin/AIStudioDashboard";
import ArtistPoliciesViewer from "@/components/admin/ArtistPoliciesViewer";
import { IdentityGate, SoloArtistWizard, StudioOwnerWizard } from "@/components/onboarding";
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

interface AvailabilityDate {
  id: string;
  date: string;
  city: string;
  is_available: boolean;
  notes: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, isAdmin, adminChecked, adminCheckError, recheckAdminRole, signOut } = useAuth();
  const workspace = useWorkspace(user?.id || null);

  const [activeTab, setActiveTab] = useState<CRMTab>("overview");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [availabilityDates, setAvailabilityDates] = useState<AvailabilityDate[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch bookings when admin (after admin check is complete)
  useEffect(() => {
    if (isAdmin && adminChecked) {
      fetchBookings();
      fetchAnalytics();
      fetchAvailability();
    } else if (!loading && adminChecked && user && !isAdmin) {
      setLoadingBookings(false);
    }
  }, [isAdmin, adminChecked, loading, user]);

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
      const { data: convData, error: convError } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (convError) throw convError;
      setConversations(convData || []);

      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(500);

      if (msgError) throw msgError;

      const totalConversations = convData?.length || 0;
      const totalMessages = msgData?.length || 0;
      const conversions = convData?.filter(c => c.converted).length || 0;
      const conversionRate = totalConversations > 0 
        ? Math.round((conversions / totalConversations) * 100) 
        : 0;

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

  const fetchAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      setAvailabilityDates(data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load availability.",
        variant: "destructive",
      });
    } finally {
      setLoadingAvailability(false);
    }
  };

  const loadConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch {
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
      return [];
    }
  };

  const addAvailability = async (date: string, city: string, notes: string) => {
    try {
      const { error } = await supabase.from("availability").insert({
        date,
        city,
        notes: notes || null,
        is_available: true,
      });

      if (error) throw error;

      toast({
        title: "Date Added",
        description: `Available date in ${city} added.`,
      });

      fetchAvailability();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message?.includes("duplicate") 
          ? "This date already exists." 
          : "Failed to add date.",
        variant: "destructive",
      });
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase.from("availability").delete().eq("id", id);
      if (error) throw error;
      setAvailabilityDates((prev) => prev.filter((d) => d.id !== id));
      toast({
        title: "Date Removed",
        description: "Availability date deleted.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete date.",
        variant: "destructive",
      });
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
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

  const updateBookingFields = async (id: string, updates: Partial<Booking>) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );

      toast({
        title: "Updated",
        description: "Booking details saved.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update booking.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Wait for auth + role verification before making an access decision
  if (loading || (user && !adminChecked) || (user && workspace.loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="font-body text-sm text-muted-foreground">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show onboarding if needed
  if (workspace.needsOnboarding && user) {
    // Identity gate - first time setup
    if (workspace.wizardType === "identity") {
      return (
        <IdentityGate
          userId={user.id}
          onComplete={() => workspace.refetch()}
        />
      );
    }

    // Solo artist wizard
    if (workspace.wizardType === "solo_setup" && workspace.workspaceId) {
      return (
        <SoloArtistWizard
          userId={user.id}
          workspaceId={workspace.workspaceId}
          initialStep={workspace.currentStep || undefined}
          onComplete={() => workspace.refetch()}
        />
      );
    }

    // Studio owner wizard
    if (workspace.wizardType === "studio_setup" && workspace.workspaceId) {
      return (
        <StudioOwnerWizard
          userId={user.id}
          workspaceId={workspace.workspaceId}
          initialStep={workspace.currentStep || undefined}
          onComplete={() => workspace.refetch()}
        />
      );
    }
  }

  if (!user) {
    return null;
  }

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
          {import.meta.env.DEV && (
            <div className="mb-6 rounded-md border border-border bg-muted/30 p-4 text-left space-y-2">
              <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">Role Debug Panel</p>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-foreground/80">user: {user.email}</p>
                <p className="text-foreground/80">user_id: {user.id}</p>
                <p className="text-foreground/80">adminChecked: {String(adminChecked)}</p>
                <p className="text-foreground/80">isAdmin: {String(isAdmin)}</p>
                {adminCheckError && (
                  <p className="text-destructive">error: {adminCheckError}</p>
                )}
              </div>
              <button
                onClick={recheckAdminRole}
                className="mt-3 px-4 py-2 bg-amber-600 text-white text-xs uppercase tracking-wide rounded hover:bg-amber-700 transition-colors"
              >
                Retry Admin Check
              </button>
            </div>
          )}
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

  const pendingCount = bookings.filter(b => b.status === "pending").length;

  // Build user profile for sidebar
  const userProfile: UserProfile = {
    isGlobalAdmin: isAdmin,
    workspaceName: workspace.workspaceId ? null : null, // Will be fetched from workspace context
    workspaceType: workspace.workspaceType as "solo" | "studio" | null,
    role: workspace.role,
    userEmail: user?.email || null,
    displayName: null, // Can be enhanced later
  };

  // Fetch workspace name if available
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchWorkspaceName = async () => {
      if (workspace.workspaceId) {
        const { data } = await supabase
          .from("workspace_settings")
          .select("workspace_name")
          .eq("id", workspace.workspaceId)
          .single();
        if (data) setWorkspaceName(data.workspace_name);
      }
    };
    fetchWorkspaceName();
  }, [workspace.workspaceId]);

  const fullUserProfile: UserProfile = {
    ...userProfile,
    workspaceName: workspaceName,
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <CRMSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSignOut={handleSignOut}
          bookingCount={bookings.length}
          pendingCount={pendingCount}
          userRole={workspace.role}
          userProfile={fullUserProfile}
        />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back</span>
          </button>
          <h1 className="font-display text-lg">CRM</h1>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        
        {/* Mobile Tab Bar */}
        <div className="flex border-t border-border overflow-x-auto">
          {(["overview", "bookings", "clients", "design-studio", "ai-studio", "inbox", "waitlist", "healing", "availability", "cities", "templates", "gallery", "conversations", "ai-assistant"] as CRMTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 font-body text-xs uppercase tracking-wider whitespace-nowrap ${
                activeTab === tab
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {tab === "overview" && "Overview"}
              {tab === "bookings" && `Bookings${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
              {tab === "clients" && "Clients"}
              {tab === "design-studio" && "AI Design"}
              {tab === "ai-studio" && "AI Studio"}
              {tab === "inbox" && "Inbox"}
              {tab === "waitlist" && "Waitlist"}
              {tab === "healing" && "Healing"}
              {tab === "availability" && "Dates"}
              {tab === "cities" && "Cities"}
              {tab === "templates" && "Templates"}
              {tab === "gallery" && "Gallery"}
              {tab === "conversations" && "Chats"}
              {tab === "ai-assistant" && "AI Assistant"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-[105px]">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {activeTab === "overview" && (
            <CRMOverview
              bookings={bookings}
              chatStats={chatStats}
              availabilityCount={availabilityDates.filter(d => new Date(d.date) >= new Date()).length}
              onViewBookings={() => setActiveTab("bookings")}
              onViewConversations={() => setActiveTab("conversations")}
            />
          )}
          
          {activeTab === "bookings" && (
            <BookingPipeline
              bookings={bookings as any}
              loading={loadingBookings}
              onRefresh={fetchBookings}
            />
          )}
          
          {activeTab === "availability" && (
            <AvailabilityManager
              dates={availabilityDates}
              loading={loadingAvailability}
              onAdd={addAvailability}
              onDelete={deleteAvailability}
            />
          )}

          {activeTab === "calendar-sync" && (
            <GoogleCalendarSync />
          )}
          
          {activeTab === "gallery" && (
            <GalleryManager />
          )}

          {activeTab === "cities" && (
            <CityConfigurationManager />
          )}

          {activeTab === "templates" && (
            <EmailTemplateManager />
          )}
          
          {activeTab === "conversations" && (
            <ConversationsManager
              conversations={conversations}
              stats={chatStats}
              loading={loadingAnalytics}
              onLoadMessages={loadConversationMessages}
            />
          )}
          
          {activeTab === "ai-assistant" && (
            <UnifiedAIManager />
          )}

          {activeTab === "security" && (
            <SecurityDashboard />
          )}

          {activeTab === "marketing" && (
            <NewsletterManager />
          )}

          {activeTab === "clients" && (
            <ClientProfilesManager />
          )}

          {activeTab === "waitlist" && (
            <WaitlistManager />
          )}

          {activeTab === "healing" && (
            <HealingTrackerManager />
          )}

          {activeTab === "inbox" && (
            <OmnichannelInbox />
          )}

          {activeTab === "design-studio" && (
            <DesignStudioAI />
          )}

          {activeTab === "policies" && (
            <PolicySettingsManager />
          )}

          {activeTab === "services" && (
            <ServiceCatalogManager />
          )}

          {activeTab === "artist-policies" && workspace.workspaceId && (
            <ArtistPoliciesViewer workspaceId={workspace.workspaceId} />
          )}

          {activeTab === "workspace" && (
            <WorkspaceSettingsManager />
          )}

          {activeTab === "ai-studio" && (
            <AIStudioDashboard />
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
