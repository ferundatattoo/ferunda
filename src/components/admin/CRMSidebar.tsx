import { motion } from "framer-motion";
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
  Wand2
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export type CRMTab = "overview" | "bookings" | "availability" | "calendar-sync" | "cities" | "templates" | "conversations" | "gallery" | "ai-assistant" | "security" | "marketing" | "clients" | "waitlist" | "healing" | "inbox" | "design-studio" | "policies" | "services" | "workspace" | "team" | "ai-studio" | "artist-policies";

export type WorkspaceRole = "owner" | "admin" | "manager" | "artist" | "assistant";

interface CRMSidebarProps {
  activeTab: CRMTab;
  onTabChange: (tab: CRMTab) => void;
  onSignOut: () => void;
  bookingCount: number;
  pendingCount: number;
  userRole?: WorkspaceRole | null;
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

const CRMSidebar = ({ 
  activeTab, 
  onTabChange, 
  onSignOut,
  bookingCount,
  pendingCount,
  userRole = "owner"
}: CRMSidebarProps) => {
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

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => 
    !userRole || TAB_PERMISSIONS[item.id]?.includes(userRole)
  );

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