import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  Kanban,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Package,
  Brain,
  Palette,
  Settings,
  Search,
  Command,
  ChevronDown,
  Bell,
  LogOut,
  User,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Command Center", path: "/os" },
  { icon: Inbox, label: "Inbox", path: "/os/inbox", badge: 12 },
  { icon: Kanban, label: "Pipeline", path: "/os/pipeline" },
  { icon: Calendar, label: "Calendar", path: "/os/calendar" },
  { icon: Users, label: "Clients", path: "/os/clients" },
];

const businessNavItems: NavItem[] = [
  { icon: DollarSign, label: "Money", path: "/os/money" },
  { icon: TrendingUp, label: "Growth", path: "/os/growth" },
  { icon: Package, label: "Supply", path: "/os/supply" },
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
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        "hover:bg-secondary/80",
        isActive(item.path)
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", item.isAI && "text-accent")} />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <Badge 
              variant="secondary" 
              className={cn(
                "h-5 min-w-5 px-1.5 text-xs font-semibold",
                isActive(item.path) 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-primary/10 text-primary"
              )}
            >
              {item.badge}
            </Badge>
          )}
          {item.isAI && !isActive(item.path) && (
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          )}
        </>
      )}
    </Link>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">Ferunda OS</h1>
              <p className="text-xs text-muted-foreground truncate">
                {workspaceContext.workspaceType === "studio" ? "Studio" : "Solo Artist"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search / Command Palette Trigger */}
      {!collapsed && (
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-10 px-3 text-muted-foreground hover:text-foreground bg-secondary/50 border-border/50"
            onClick={() => {
              // Will dispatch command palette event
              window.dispatchEvent(new CustomEvent('open-command-palette'));
            }}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
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
              <Sparkles className="h-3 w-3 text-accent" />
              AI & Tools
            </p>
          )}
          {aiNavItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Settings */}
        <Link
          to="/os/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            "hover:bg-secondary/80",
            isActive("/os/settings")
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/os/settings/profile" className="flex items-center gap-2">
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
            <DropdownMenuSeparator />
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
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-background border shadow-sm"
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
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 lg:hidden backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-r border-white/20 shadow-2xl"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary/80"
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
          "hidden lg:flex flex-col h-screen backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-r border-slate-200/50 dark:border-slate-700/50 shadow-lg transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[280px]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default OSSidebar;
