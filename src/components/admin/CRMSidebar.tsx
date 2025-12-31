import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Calendar, 
  MapPin, 
  MessageCircle, 
  LogOut,
  ChevronLeft,
  Image,
  Sparkles,
  Building2,
  Mail,
  RefreshCw,
  Shield,
  Megaphone,
  Palette,
  Users,
  Clock,
  Heart,
  Inbox,
  Bot,
  FileText,
  Package,
  Settings2,
  Wand2,
  Crown,
  User,
  ChevronDown,
  ArrowRightLeft,
  Check,
  Plus
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CRMTab = "overview" | "bookings" | "availability" | "calendar-sync" | "cities" | "templates" | "conversations" | "gallery" | "ai-assistant" | "security" | "marketing" | "clients" | "waitlist" | "healing" | "inbox" | "design-studio" | "policies" | "services" | "workspace" | "team" | "ai-studio" | "artist-policies";

export type WorkspaceRole = "owner" | "admin" | "manager" | "artist" | "assistant";

export interface UserProfile {
  isGlobalAdmin: boolean;
  workspaceName: string | null;
  workspaceType: "solo" | "studio" | null;
  role: WorkspaceRole | null;
  userEmail: string | null;
  displayName: string | null;
}

interface WorkspaceMembership {
  workspace_id: string;
  role: string;
  workspace_name: string | null;
  workspace_type: string;
}

interface CRMSidebarProps {
  activeTab: CRMTab;
  onTabChange: (tab: CRMTab) => void;
  onSignOut: () => void;
  bookingCount: number;
  pendingCount: number;
  userRole?: WorkspaceRole | null;
  userProfile?: UserProfile;
}

// Define which roles can access which tabs
const TAB_PERMISSIONS: Record<CRMTab, WorkspaceRole[]> = {
  overview: ["owner", "admin", "manager", "artist", "assistant"],
  bookings: ["owner", "admin", "manager", "artist", "assistant"],
  clients: ["owner", "admin", "manager"],
  "design-studio": ["owner", "admin", "manager", "artist"],
  "ai-studio": ["owner", "admin", "manager", "artist"],
  inbox: ["owner", "admin", "manager", "artist", "assistant"],
  waitlist: ["owner", "admin", "manager"],
  healing: ["owner", "admin", "manager", "artist"],
  availability: ["owner", "admin", "manager", "artist"],
  "calendar-sync": ["owner", "admin", "manager", "artist"],
  cities: ["owner", "admin"],
  templates: ["owner", "admin", "manager"],
  policies: ["owner", "admin"],
  services: ["owner", "admin"],
  "artist-policies": ["owner", "admin", "manager"],
  workspace: ["owner", "admin"],
  team: ["owner", "admin"],
  marketing: ["owner", "admin"],
  gallery: ["owner", "admin", "manager"],
  conversations: ["owner", "admin", "manager"],
  "ai-assistant": ["owner", "admin"],
  security: ["owner", "admin"],
};

// Helper to get profile type label
const getProfileTypeLabel = (profile?: UserProfile): string => {
  if (!profile) return "Loading...";
  
  if (profile.isGlobalAdmin) {
    if (profile.workspaceType === "solo") return "Master · Solo Artist";
    if (profile.workspaceType === "studio") return "Master · Studio Owner";
    return "Master Admin";
  }
  
  if (profile.workspaceType === "solo") {
    return "Solo Artist";
  }
  
  if (profile.workspaceType === "studio") {
    switch (profile.role) {
      case "owner": return "Studio Owner";
      case "admin": return "Studio Admin";
      case "manager": return "Studio Manager";
      case "artist": return "Studio Artist";
      case "assistant": return "Studio Assistant";
      default: return "Studio Member";
    }
  }
  
  return "User";
};

const CRMSidebar = ({ 
  activeTab, 
  onTabChange, 
  onSignOut,
  bookingCount,
  pendingCount,
  userRole = "owner",
  userProfile
}: CRMSidebarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  // Fetch user's workspaces when switcher is opened
  useEffect(() => {
    if (showWorkspaceSwitcher && user?.id) {
      fetchWorkspaces();
    }
  }, [showWorkspaceSwitcher, user?.id]);

  const fetchWorkspaces = async () => {
    if (!user?.id) return;
    setLoadingWorkspaces(true);

    try {
      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          workspace_id,
          role,
          workspace_settings!inner (
            id,
            workspace_type,
            workspace_name
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (data) {
        const mapped = data.map((item: any) => ({
          workspace_id: item.workspace_id,
          role: item.role,
          workspace_name: item.workspace_settings?.workspace_name || null,
          workspace_type: item.workspace_settings?.workspace_type || "solo",
        }));
        setWorkspaces(mapped);
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    localStorage.setItem("selectedWorkspaceId", workspaceId);
    setShowWorkspaceSwitcher(false);
    // Reload to apply workspace change
    window.location.reload();
  };

  const currentWorkspaceId = localStorage.getItem("selectedWorkspaceId");

  const allNavItems = [
    { id: "overview" as CRMTab, label: "Overview", icon: LayoutDashboard, badge: null },
    { id: "bookings" as CRMTab, label: "Bookings", icon: Calendar, badge: pendingCount > 0 ? pendingCount : null },
    { id: "clients" as CRMTab, label: "Clients", icon: Users, badge: null },
    { id: "design-studio" as CRMTab, label: "Design Studio", icon: Palette, badge: null },
    { id: "ai-studio" as CRMTab, label: "AI Studio", icon: Wand2, badge: null },
    { id: "inbox" as CRMTab, label: "Inbox", icon: Inbox, badge: null },
    { id: "waitlist" as CRMTab, label: "Waitlist", icon: Clock, badge: null },
    { id: "healing" as CRMTab, label: "Healing", icon: Heart, badge: null },
    { id: "availability" as CRMTab, label: "Availability", icon: MapPin, badge: null },
    { id: "calendar-sync" as CRMTab, label: "Google Sync", icon: RefreshCw, badge: null },
    { id: "cities" as CRMTab, label: "Cities", icon: Building2, badge: null },
    { id: "templates" as CRMTab, label: "Templates", icon: Mail, badge: null },
    { id: "policies" as CRMTab, label: "Studio Policies", icon: FileText, badge: null },
    { id: "artist-policies" as CRMTab, label: "Artist Config", icon: Users, badge: null },
    { id: "services" as CRMTab, label: "Services", icon: Package, badge: null },
    { id: "workspace" as CRMTab, label: "Workspace", icon: Settings2, badge: null },
    { id: "marketing" as CRMTab, label: "Marketing", icon: Megaphone, badge: null },
    { id: "gallery" as CRMTab, label: "Gallery", icon: Image, badge: null },
    { id: "conversations" as CRMTab, label: "Luna Chats", icon: MessageCircle, badge: null },
    { id: "ai-assistant" as CRMTab, label: "AI Assistant", icon: Bot, badge: null },
    { id: "security" as CRMTab, label: "Security", icon: Shield, badge: null },
  ];

  // Filter nav items based on user role - global admins see everything
  const navItems = allNavItems.filter(item => {
    // Global admin sees all tabs
    if (userProfile?.isGlobalAdmin) return true;
    // Otherwise filter by workspace role permissions
    return !userRole || TAB_PERMISSIONS[item.id]?.includes(userRole);
  });

  return (
    <aside className="w-72 bg-gradient-to-b from-card to-background border-r border-border/50 flex flex-col h-screen sticky top-0 relative overflow-hidden">
      {/* Subtle gold glow at top */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
      
      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />

      {/* Logo & Back */}
      <div className="relative p-6 border-b border-border/30">
        <Link 
          to="/" 
          className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all duration-300 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <div className="relative">
            <img src={logo} alt="Ferunda" className="w-8 h-8 invert opacity-90" />
            <div className="absolute inset-0 blur-lg bg-foreground/10 -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl tracking-wide text-foreground">FERUNDA</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Studio CRM</span>
          </div>
        </Link>
      </div>

      {/* User Profile Section */}
      {userProfile && (
        <div className="relative px-4 py-4 border-b border-border/30">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center">
                {userProfile.isGlobalAdmin ? (
                  <Crown className="w-5 h-5 text-gold" />
                ) : (
                  <User className="w-5 h-5 text-gold/70" />
                )}
              </div>
              {userProfile.isGlobalAdmin && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-background" />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-body text-sm font-medium text-foreground truncate">
                  {userProfile.displayName || userProfile.workspaceName || "User"}
                </span>
              </div>
              
              {/* Profile Type Badge */}
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-2 py-0.5 uppercase tracking-wider border-gold/30 ${
                    userProfile.isGlobalAdmin 
                      ? "bg-gold/10 text-gold" 
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {getProfileTypeLabel(userProfile)}
                </Badge>
              </div>
              
              {/* Workspace Name */}
              {userProfile.workspaceName && (
                <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                  {userProfile.workspaceName}
                </p>
              )}
            </div>
          </div>

          {/* Switch Workspace Button */}
          <button
            onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
            className="w-full mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-border/50 transition-all text-sm group"
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                Cambiar perfil
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showWorkspaceSwitcher ? "rotate-180" : ""}`} />
          </button>

          {/* Workspace Switcher Dropdown */}
          <AnimatePresence>
            {showWorkspaceSwitcher && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1">
                  {loadingWorkspaces ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : workspaces.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No hay otros espacios
                    </p>
                  ) : (
                    <>
                      {workspaces.map((ws) => (
                        <button
                          key={ws.workspace_id}
                          onClick={() => handleSwitchWorkspace(ws.workspace_id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm ${
                            currentWorkspaceId === ws.workspace_id
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {ws.workspace_type === "studio" ? (
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Palette className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <div className="font-medium truncate max-w-[140px]">
                                {ws.workspace_name || "Sin nombre"}
                              </div>
                              <div className="text-[10px] text-muted-foreground capitalize">
                                {ws.role} · {ws.workspace_type}
                              </div>
                            </div>
                          </div>
                          {currentWorkspaceId === ws.workspace_id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}

                      {/* Create New Workspace */}
                      <button
                        onClick={() => navigate("/onboarding")}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-all text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Crear nuevo espacio</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto relative z-10">
        {navItems.map((item, index) => {
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-sm transition-all duration-300 group relative ${
                isActive
                  ? "bg-gradient-to-r from-gold/15 to-gold/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {/* Active indicator line */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gold rounded-full"
                />
              )}
              
              <div className="flex items-center gap-3">
                <item.icon className={`w-[18px] h-[18px] transition-colors ${
                  isActive ? "text-gold" : "group-hover:text-foreground"
                }`} />
                <span className="font-body text-sm tracking-wide">{item.label}</span>
              </div>
              
              {item.badge && (
                <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs font-body rounded-full border border-gold/30">
                  {item.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-border/30">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-sm transition-all duration-300 group"
        >
          <LogOut className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" />
          <span className="font-body text-sm tracking-wide">Sign Out</span>
        </button>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute bottom-4 right-4 w-12 h-12 border-r border-b border-border/20 pointer-events-none" />
    </aside>
  );
};

export default CRMSidebar;