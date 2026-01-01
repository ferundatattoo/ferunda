import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Calendar, 
  MessageCircle, 
  LogOut,
  ChevronLeft,
  Sparkles,
  Building2,
  Users,
  Palette,
  Inbox,
  Bot,
  Settings2,
  Crown,
  User,
  ChevronDown,
  ArrowRightLeft,
  DollarSign,
  Check,
  Plus,
  Code2,
  Eye,
  EyeOff
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Simplified tab structure - 8 main sections
export type CRMTab = 
  | "dashboard" 
  | "pipeline" 
  | "calendar" 
  | "clients" 
  | "creative" 
  | "ai-center" 
  | "inbox" 
  | "settings";

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
  escalationCount?: number;
  userRole?: WorkspaceRole | null;
  userProfile?: UserProfile;
}

// Simplified permissions - all roles see most tabs, settings restricted
const TAB_PERMISSIONS: Record<CRMTab, WorkspaceRole[]> = {
  dashboard: ["owner", "admin", "manager", "artist", "assistant"],
  pipeline: ["owner", "admin", "manager", "artist", "assistant"],
  calendar: ["owner", "admin", "manager", "artist"],
  clients: ["owner", "admin", "manager"],
  creative: ["owner", "admin", "manager", "artist"],
  "ai-center": ["owner", "admin", "manager", "artist"],
  inbox: ["owner", "admin", "manager", "artist", "assistant"],
  settings: ["owner", "admin"],
};

const getProfileTypeLabel = (profile?: UserProfile): string => {
  if (!profile) return "Loading...";
  
  if (profile.isGlobalAdmin) {
    if (profile.workspaceType === "solo") return "Master · Solo Artist";
    if (profile.workspaceType === "studio") return "Master · Studio Owner";
    return "Master Admin";
  }
  
  if (profile.workspaceType === "solo") return "Solo Artist";
  
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
  escalationCount = 0,
  userRole = "owner",
  userProfile
}: CRMSidebarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  
  // Developer Mode - persisted in localStorage
  const [devMode, setDevMode] = useState(() => {
    return localStorage.getItem("ferunda_dev_mode") === "true";
  });

  const handleDevModeToggle = (enabled: boolean) => {
    setDevMode(enabled);
    localStorage.setItem("ferunda_dev_mode", String(enabled));
  };

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
    window.location.reload();
  };

  const currentWorkspaceId = localStorage.getItem("selectedWorkspaceId");

  // Simplified navigation - 8 main sections
  const allNavItems = [
    { 
      id: "dashboard" as CRMTab, 
      label: "Dashboard", 
      icon: LayoutDashboard, 
      badge: null,
      description: "Vista general"
    },
    { 
      id: "pipeline" as CRMTab, 
      label: "Pipeline", 
      icon: Calendar, 
      badge: pendingCount + escalationCount > 0 ? pendingCount + escalationCount : null,
      description: "Bookings, escalaciones, waitlist"
    },
    { 
      id: "calendar" as CRMTab, 
      label: "Calendario", 
      icon: Calendar, 
      badge: null,
      description: "Disponibilidad y sync"
    },
    { 
      id: "clients" as CRMTab, 
      label: "Clientes", 
      icon: Users, 
      badge: null,
      description: "Perfiles y healing"
    },
    { 
      id: "creative" as CRMTab, 
      label: "Design Studio", 
      icon: Palette, 
      badge: null,
      description: "AI design y galería"
    },
    { 
      id: "ai-center" as CRMTab, 
      label: "AI Center", 
      icon: Bot, 
      badge: null,
      description: "Centro de control AI"
    },
    { 
      id: "inbox" as CRMTab, 
      label: "Inbox", 
      icon: Inbox, 
      badge: null,
      description: "Comunicaciones"
    },
    { 
      id: "settings" as CRMTab, 
      label: "Configuración", 
      icon: Settings2, 
      badge: null,
      description: "Ajustes del workspace"
    },
  ];

  // Filter nav items based on user role - dev mode or global admin sees everything
  const navItems = allNavItems.filter(item => {
    if (devMode || userProfile?.isGlobalAdmin) return true;
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
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Studio OS</span>
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
              {(userProfile.isGlobalAdmin || devMode) && (
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
                    userProfile.isGlobalAdmin || devMode
                      ? "bg-gold/10 text-gold" 
                      : "bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  {devMode ? "Dev Mode" : getProfileTypeLabel(userProfile)}
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

          {/* Developer Mode Toggle - Only for global admins */}
          {userProfile.isGlobalAdmin && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-500 font-medium">Developer Mode</span>
              </div>
              <Switch
                checked={devMode}
                onCheckedChange={handleDevModeToggle}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          )}

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

      {/* Navigation - Simplified 8 sections */}
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
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-300 group relative ${
                isActive
                  ? "bg-gradient-to-r from-gold/15 to-gold/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {/* Active indicator line */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gold rounded-full"
                />
              )}
              
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 transition-colors ${
                  isActive ? "text-gold" : "group-hover:text-foreground"
                }`} />
                <div className="text-left">
                  <span className="font-body text-sm tracking-wide block">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground/70">{item.description}</span>
                </div>
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

      {/* Portal Quick Links */}
      <div className="relative px-4 py-3 border-t border-border/30">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Acceso Rápido</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/finance')}
            className="flex flex-col items-center p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs"
          >
            <DollarSign className="w-4 h-4 mb-1 text-green-500" />
            <span>Finance</span>
          </button>
          <button
            onClick={() => navigate('/marketing')}
            className="flex flex-col items-center p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs"
          >
            <Sparkles className="w-4 h-4 mb-1 text-purple-500" />
            <span>Marketing</span>
          </button>
          <button
            onClick={() => navigate('/studio')}
            className="flex flex-col items-center p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs"
          >
            <Building2 className="w-4 h-4 mb-1 text-blue-500" />
            <span>Studio</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="relative p-4 border-t border-border/30">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all duration-300 group"
        >
          <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
          <span className="font-body text-sm tracking-wide">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default CRMSidebar;
