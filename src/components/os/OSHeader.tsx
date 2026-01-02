import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, Command, HelpCircle, Sparkles, Zap, ChevronLeft, Home } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface OSHeaderProps {
  onOpenCommandPalette: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  isAI?: boolean;
}

export const OSHeader = ({ onOpenCommandPalette }: OSHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "1", title: "New booking request", message: "Sarah wants a sleeve consultation", time: "2m ago", unread: true },
    { id: "2", title: "Deposit received", message: "$150 from Mike Johnson", time: "1h ago", unread: true },
    { id: "3", title: "AI insight", message: "3 leads waiting for response", time: "2h ago", unread: false, isAI: true },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;
  const isCommandCenter = location.pathname === "/os" || location.pathname === "/os/";
  
  // Get current page name for breadcrumb
  const getPageName = () => {
    const path = location.pathname.replace("/os/", "").replace("/os", "");
    if (!path) return "Command Center";
    return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 relative z-20">
      {/* Left - Back button & Breadcrumb */}
      <div className="flex-1 lg:pl-0 pl-12 flex items-center gap-3">
        {!isCommandCenter && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/os")}
            className="rounded-xl hover:bg-secondary/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => navigate("/os")}
                className="cursor-pointer flex items-center gap-1 hover:text-foreground"
              >
                <Home className="h-3.5 w-3.5" />
                <span>OS</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {!isCommandCenter && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageName()}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 font-medium">System Online</span>
        </motion.div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick Search Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl px-3"
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search</span>
          <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded-md border border-border/50 bg-secondary/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>

        {/* Mobile Search */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenCommandPalette}
          className="sm:hidden rounded-xl hover:bg-secondary/50"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* AI Assistant Quick Access */}
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 group"
        >
          <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        </Button>

        {/* Quick Actions */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 hidden sm:flex"
        >
          <Zap className="h-5 w-5" />
        </Button>

        {/* Help */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 hidden sm:flex"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-secondary/50">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-semibold bg-destructive text-destructive-foreground border-2 border-background"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-card/95 backdrop-blur-xl border-border/50">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                onClick={markAllRead}
              >
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            {notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer rounded-lg mx-1 my-0.5",
                  notification.unread && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2 w-full">
                  {notification.isAI && (
                    <div className="p-1 rounded-md bg-primary/10">
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      notification.unread ? "font-medium" : "font-normal"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {notification.time}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="text-center justify-center text-sm text-primary rounded-lg mx-1 my-1">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default OSHeader;
