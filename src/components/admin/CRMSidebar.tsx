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
  Settings2
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export type CRMTab = "overview" | "bookings" | "availability" | "calendar-sync" | "cities" | "templates" | "conversations" | "gallery" | "ai-assistant" | "security" | "marketing" | "clients" | "waitlist" | "healing" | "inbox" | "design-studio" | "policies" | "services" | "workspace" | "team";

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
  inbox: ["owner", "admin", "manager", "artist", "assistant"],
  waitlist: ["owner", "admin", "manager"],
  healing: ["owner", "admin", "manager", "artist"],
  availability: ["owner", "admin", "manager", "artist"],
  "calendar-sync": ["owner", "admin", "manager", "artist"],
  cities: ["owner", "admin"],
  templates: ["owner", "admin", "manager"],
  policies: ["owner", "admin"],
  services: ["owner", "admin"],
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
    { id: "inbox" as CRMTab, label: "Inbox", icon: Inbox, badge: null },
    { id: "waitlist" as CRMTab, label: "Waitlist", icon: Clock, badge: null },
    { id: "healing" as CRMTab, label: "Healing", icon: Heart, badge: null },
    { id: "availability" as CRMTab, label: "Availability", icon: MapPin, badge: null },
    { id: "calendar-sync" as CRMTab, label: "Google Sync", icon: RefreshCw, badge: null },
    { id: "cities" as CRMTab, label: "Cities", icon: Building2, badge: null },
    { id: "templates" as CRMTab, label: "Templates", icon: Mail, badge: null },
    { id: "policies" as CRMTab, label: "Policies", icon: FileText, badge: null },
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
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo & Back */}
      <div className="p-6 border-b border-border">
        <Link 
          to="/" 
          className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <img src={logo} alt="Ferunda" className="w-6 h-6 invert opacity-80" />
          <span className="font-display text-lg">CRM</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
              activeTab === item.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:pl-5"
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span className="font-body text-sm">{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-2 py-0.5 bg-accent text-foreground text-xs font-body rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-body text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default CRMSidebar;
