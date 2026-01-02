import { useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Inbox, Briefcase, DollarSign, TrendingUp,
  Package, Shield, Settings, ChevronDown, ChevronRight,
  Search, Command, User, LogOut, Building2, Palette,
  Menu, X, Sparkles, Map, Zap, FileText, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type ViewMode = 'studio' | 'artist';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  isAI?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
  condition?: boolean;
}

export default function NewOSSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('studio');
  const [expandedSections, setExpandedSections] = useState<string[]>(['secondary']);

  // Mock data - replace with real data from hooks
  const isOwner = true; // Can toggle between views
  const hasSupply = true;
  const hasCompliance = false;

  const primaryNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Command Center', path: '/os' },
    { icon: Inbox, label: 'Inbox', path: '/os/inbox', badge: 12 },
    { icon: Briefcase, label: 'Work', path: '/os/work' },
    { icon: DollarSign, label: 'Money', path: '/os/money' },
    { icon: TrendingUp, label: 'Growth', path: '/os/growth' },
  ];

  const secondaryNav: NavSection[] = useMemo(() => [
    {
      title: 'Operations',
      items: [
        { icon: Package, label: 'Supply', path: '/os/supply' },
        { icon: Map, label: 'Process Map', path: '/os/process-map' },
      ],
      condition: hasSupply
    },
    {
      title: 'Compliance',
      items: [
        { icon: Shield, label: 'Compliance', path: '/os/compliance' },
        { icon: FileText, label: 'Policies', path: '/os/policies' },
      ],
      condition: hasCompliance
    },
    {
      title: 'Admin',
      items: [
        { icon: Settings, label: 'Settings', path: '/os/settings' },
        { icon: Zap, label: 'Actions Monitor', path: '/os/actions' },
        { icon: Users, label: 'Artists', path: '/os/artists' },
      ],
      condition: true
    }
  ], [hasSupply, hasCompliance]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const NavLinkItem = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.path || 
                     (item.path !== '/os' && location.pathname.startsWith(item.path));
    
    return (
      <NavLink
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          "hover:bg-muted/80",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setIsMobileOpen(false)}
      >
        <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-[10px] font-semibold",
                  isActive ? "bg-primary/20 text-primary" : ""
                )}
              >
                {item.badge}
              </Badge>
            )}
            {item.isAI && (
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            )}
          </>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">Ferunda OS</h1>
              <p className="text-[11px] text-muted-foreground capitalize">{viewMode} View</p>
            </div>
          )}
        </div>

        {/* View Toggle (Owner only) */}
        {isOwner && !isCollapsed && (
          <div className="mt-3 p-1 rounded-lg bg-muted/50 flex gap-1">
            <button
              onClick={() => setViewMode('studio')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === 'studio' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              Studio
            </button>
            <button
              onClick={() => setViewMode('artist')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === 'artist' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Palette className="h-3.5 w-3.5" />
              Artist
            </button>
          </div>
        )}
      </div>

      {/* Command Search */}
      {!isCollapsed && (
        <div className="px-3 py-2">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>
        </div>
      )}

      {/* Primary Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 py-2">
          {primaryNav.map((item) => (
            <NavLinkItem key={item.path} item={item} />
          ))}
        </nav>

        {/* Secondary Navigation */}
        {secondaryNav.filter(s => s.condition).map((section) => (
          <div key={section.title} className="py-2">
            {section.title && !isCollapsed && (
              <button
                onClick={() => toggleSection(section.title!)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                {section.title}
                {expandedSections.includes(section.title) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            <AnimatePresence>
              {(isCollapsed || expandedSections.includes(section.title || '')) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-1 overflow-hidden"
                >
                  {section.items.map((item) => (
                    <NavLinkItem key={item.path} item={item} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </ScrollArea>

      {/* User Menu */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-medium">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/os/settings')}>
              <User className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 rounded-lg bg-background border border-border shadow-md flex items-center justify-center"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isMobileOpen ? 0 : -280 }}
        className="lg:hidden fixed top-0 left-0 z-40 h-screen w-[280px] bg-sidebar-background border-r border-sidebar-border"
      >
        {sidebarContent}
      </motion.aside>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ width: 280 }}
        animate={{ width: isCollapsed ? 72 : 280 }}
        className="hidden lg:flex flex-col h-screen bg-sidebar-background border-r border-sidebar-border"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
