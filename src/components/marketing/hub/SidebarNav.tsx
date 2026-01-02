import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, FileText, Calendar, BarChart3, Megaphone, 
  Zap, Bot, TrendingUp, Users, FlaskConical, Hash, MessageSquare,
  ChevronLeft, ChevronRight, Command
} from "lucide-react";
import type { MarketingView } from "./CommandPalette";

interface SidebarNavProps {
  currentView: MarketingView;
  onNavigate: (view: MarketingView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandPalette: () => void;
}

const navItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "content" as const, label: "Content", icon: FileText },
  { id: "calendar" as const, label: "Calendar", icon: Calendar },
  { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
  { id: "campaigns" as const, label: "Campaigns", icon: Megaphone },
  { id: "automation" as const, label: "Automation", icon: Zap },
  { id: "agents" as const, label: "AI Agents", icon: Bot },
  { id: "trends" as const, label: "Trends", icon: TrendingUp },
  { id: "competitors" as const, label: "Competitors", icon: Users },
  { id: "ab-tests" as const, label: "A/B Tests", icon: FlaskConical },
  { id: "hashtags" as const, label: "Hashtags", icon: Hash },
  { id: "chat" as const, label: "AI Chat", icon: MessageSquare },
];

const SidebarNav = ({ 
  currentView, 
  onNavigate, 
  collapsed, 
  onToggleCollapse,
  onOpenCommandPalette 
}: SidebarNavProps) => {
  return (
    <div 
      className={cn(
        "flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground">Marketing</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Command Palette Trigger */}
      <div className="p-2">
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
          onClick={onOpenCommandPalette}
        >
          <Command className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm">Search...</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 transition-all",
                collapsed && "justify-center px-2",
                isActive && "bg-primary/10 text-primary hover:bg-primary/15"
              )}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Marketing Hub v2.0
          </p>
        </div>
      )}
    </div>
  );
};

export default SidebarNav;
