import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Calendar, 
  MapPin, 
  MessageCircle, 
  LogOut,
  Settings,
  ChevronLeft,
  Image
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export type CRMTab = "overview" | "bookings" | "availability" | "conversations" | "gallery";

interface CRMSidebarProps {
  activeTab: CRMTab;
  onTabChange: (tab: CRMTab) => void;
  onSignOut: () => void;
  bookingCount: number;
  pendingCount: number;
}

const CRMSidebar = ({ 
  activeTab, 
  onTabChange, 
  onSignOut,
  bookingCount,
  pendingCount 
}: CRMSidebarProps) => {
  const navItems = [
    { 
      id: "overview" as CRMTab, 
      label: "Overview", 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      id: "bookings" as CRMTab, 
      label: "Bookings", 
      icon: Calendar,
      badge: pendingCount > 0 ? pendingCount : null
    },
    { 
      id: "availability" as CRMTab, 
      label: "Availability", 
      icon: MapPin,
      badge: null
    },
    { 
      id: "gallery" as CRMTab, 
      label: "Gallery", 
      icon: Image,
      badge: null
    },
    { 
      id: "conversations" as CRMTab, 
      label: "Conversations", 
      icon: MessageCircle,
      badge: null
    },
  ];

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
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              activeTab === item.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
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
          </motion.button>
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
