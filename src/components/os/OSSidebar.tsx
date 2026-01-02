import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Inbox, Kanban, Calendar, Users, DollarSign,
  TrendingUp, Package, Brain, Palette, Settings, Search, Command,
  ChevronDown, LogOut, User, Sparkles, Menu, X, Zap, UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  isAI?: boolean;
  color?: string;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Command Center", path: "/os" },
  { icon: Inbox, label: "Inbox", path: "/os/inbox", badge: 12 },
  { icon: Kanban, label: "Pipeline", path: "/os/pipeline" },
  { icon: Calendar, label: "Calendar", path: "/os/calendar" },
  { icon: Users, label: "Clients", path: "/os/clients" },
  { icon: UsersRound, label: "Artistas", path: "/os/artists", color: "text-violet-500" },
];

const businessNavItems: NavItem[] = [
  { icon: DollarSign, label: "Money", path: "/os/money", color: "text-emerald-500" },
  { icon: TrendingUp, label: "Growth", path: "/os/growth", color: "text-pink-500" },
  { icon: Package, label: "Supply", path: "/os/supply", color: "text-amber-500" },
];

const aiNavItems: NavItem[] = [
  { icon: Brain, label: "Intelligence", path: "/os/intelligence", isAI: true },
  { icon: Palette, label: "Studio", path: "/os/studio", isAI: true },
];

export const OSSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const workspaceContext = useWorkspace(user?.id || null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/os") return location.pathname === "/os";
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      to={item.path}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
        isActive(item.path)
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      )}
    >
      {isActive(item.path) && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-primary rounded-xl"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <item.icon className={cn(
        "h-5 w-5 shrink-0 relative z-10 transition-transform group-hover:scale-110",
        item.isAI && !isActive(item.path) && "text-primary",
        item.color && !isActive(item.path) && item.color
      )} />
      {!collapsed && (
        <>
          <span className="flex-1 relative z-10">{item.label}</span>
          {item.badge && (
            <Badge 
              variant="secondary" 
              className={cn(
                "h-5 min-w-5 px-1.5 text-xs font-semibold relative z-10",
                isActive(item.path) 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-primary/10 text-primary"
              )}
            >
              {item.badge}
            </Badge>
          )}
          {item.isAI && !isActive(item.path) && (
            <Sparkles className="h-3.5 w-3.5 text-primary relative z-10" />
          )}
        </>
      )}
    </Link>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <span className="text-white font-bold text-lg">F</span>
          </motion.div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">Ferunda OS</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-xs text-muted-foreground truncate">
                  {workspaceContext.workspaceType === "studio" ? "Studio Mode" : "Solo Artist"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search / Command Palette Trigger */}
      {!collapsed && (
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-10 px-3 text-muted-foreground hover:text-foreground bg-secondary/30 border-border/50 hover:bg-secondary/50 hover:border-border rounded-xl"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded-md border border-border/50 bg-background/50 px-1.5 font-mono text-[10px] font-medium">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Main */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Main
            </p>
          )}
          {mainNavItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>

        {/* Business */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Business
            </p>
          )}
          {businessNavItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>

        {/* AI & Tools */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              AI & Tools
            </p>
          )}
          {aiNavItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-2">
        {/* Settings */}
        <Link
          to="/os/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            "hover:bg-secondary/60",
            isActive("/os/settings")
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/50">
            <DropdownMenuItem asChild>
              <Link to="/os/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/os/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 lg:hidden bg-card/95 backdrop-blur-xl border-r border-border/50 shadow-2xl"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary/60"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-card/50 backdrop-blur-xl border-r border-border/50 transition-all duration-300 relative z-20",
          collapsed ? "w-[72px]" : "w-[280px]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default OSSidebar;
