import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CRMSidebar, { CRMTab, UserProfile } from "@/components/admin/CRMSidebar";

// Hub Components - Consolidated views
import UnifiedDashboard from "@/components/admin/UnifiedDashboard";
import PipelineHub from "@/components/admin/PipelineHub";
import CalendarHub from "@/components/admin/CalendarHub";
import ClientHub from "@/components/admin/ClientHub";
import CreativeStudio from "@/components/admin/CreativeStudio";
import AICommandCenter from "@/components/admin/AICommandCenter";
import InboxUnified from "@/components/admin/InboxUnified";
import SettingsHub from "@/components/admin/SettingsHub";

import { IdentityGate, SoloArtistWizard, StudioOwnerWizard } from "@/components/onboarding";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, isAdmin, adminChecked, adminCheckError, recheckAdminRole, signOut } = useAuth();
  const workspace = useWorkspace(user?.id || null);

  const [activeTab, setActiveTab] = useState<CRMTab>("dashboard");
  const [escalationCount, setEscalationCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch counts when admin
  useEffect(() => {
    if (isAdmin && adminChecked) {
      fetchCounts();
    }
  }, [isAdmin, adminChecked]);

  // Fetch workspace name
  useEffect(() => {
    const fetchWorkspaceNameData = async () => {
      if (workspace.workspaceId) {
        const { data } = await supabase
          .from("workspace_settings")
          .select("workspace_name")
          .eq("id", workspace.workspaceId)
          .single();
        if (data) setWorkspaceName(data.workspace_name);
      }
    };
    fetchWorkspaceNameData();
  }, [workspace.workspaceId]);

  const fetchCounts = async () => {
    try {
      // Booking counts
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status");
      
      setBookingCount(bookings?.length || 0);
      setPendingCount(bookings?.filter((b: any) => b.status === "pending").length || 0);

      // Escalation count
      const { count } = await supabase
        .from("booking_requests")
        .select("*", { count: 'exact', head: true })
        .eq("status", "escalated")
        .eq("route", "concierge_escalation");
      setEscalationCount(count || 0);
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Loading state
  if (loading || (user && !adminChecked) || (user && workspace.loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="font-body text-sm text-muted-foreground">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Onboarding flows
  if (workspace.needsOnboarding && user) {
    if (workspace.wizardType === "identity") {
      return <IdentityGate userId={user.id} onComplete={() => workspace.refetch()} />;
    }
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

  // Access denied
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
            Acceso Denegado
          </h1>
          <p className="font-body text-muted-foreground mb-8">
            No tienes privilegios de administrador. Contacta al propietario para solicitar acceso.
          </p>
          {import.meta.env.DEV && (
            <div className="mb-6 rounded-md border border-border bg-muted/30 p-4 text-left space-y-2">
              <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">Debug Panel</p>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-foreground/80">user: {user.email}</p>
                <p className="text-foreground/80">adminChecked: {String(adminChecked)}</p>
                <p className="text-foreground/80">isAdmin: {String(isAdmin)}</p>
                {adminCheckError && <p className="text-destructive">error: {adminCheckError}</p>}
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
              Ir al Inicio
            </button>
            <button
              onClick={handleSignOut}
              className="px-6 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Build user profile for sidebar
  const userProfile: UserProfile = {
    isGlobalAdmin: isAdmin,
    workspaceName: workspaceName,
    workspaceType: workspace.workspaceType as "solo" | "studio" | null,
    role: workspace.role,
    userEmail: user?.email || null,
    displayName: null,
  };

  // Render the active hub component
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <UnifiedDashboard onNavigate={(tab) => setActiveTab(tab as CRMTab)} />;
      case "pipeline":
        return <PipelineHub onRefresh={fetchCounts} />;
      case "calendar":
        return <CalendarHub />;
      case "clients":
        return <ClientHub />;
      case "creative":
        return <CreativeStudio />;
      case "ai-center":
        return <AICommandCenter />;
      case "inbox":
        return <InboxUnified />;
      case "settings":
        return <SettingsHub />;
      default:
        return <UnifiedDashboard onNavigate={(tab) => setActiveTab(tab as CRMTab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <CRMSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSignOut={handleSignOut}
          bookingCount={bookingCount}
          pendingCount={pendingCount}
          escalationCount={escalationCount}
          userRole={workspace.role}
          userProfile={userProfile}
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
            <span className="font-body text-sm">Volver</span>
          </button>
          <h1 className="font-display text-lg">Studio OS</h1>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        
        {/* Mobile Tab Bar */}
        <div className="flex border-t border-border overflow-x-auto">
          {(["dashboard", "pipeline", "calendar", "clients", "creative", "ai-center", "inbox", "settings"] as CRMTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-3 font-body text-xs uppercase tracking-wider whitespace-nowrap ${
                activeTab === tab
                  ? "text-foreground border-b-2 border-gold"
                  : "text-muted-foreground"
              }`}
            >
              {tab === "dashboard" && "Home"}
              {tab === "pipeline" && "Pipeline"}
              {tab === "calendar" && "Cal"}
              {tab === "clients" && "Clients"}
              {tab === "creative" && "Design"}
              {tab === "ai-center" && "AI"}
              {tab === "inbox" && "Inbox"}
              {tab === "settings" && "Config"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-[105px]">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Admin;
