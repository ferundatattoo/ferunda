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
import { useNotifications } from "@/hooks/useNotifications";
import { RealtimeStatusIndicator } from "@/components/RealtimeStatusIndicator";
import { RealtimeStatusBadge } from "@/components/RealtimeStatusBadge";
import { formatDistanceToNow } from "date-fns";

interface OSHeaderProps {
  onOpenCommandPalette: () => void;
}

export const OSHeader = ({ onOpenCommandPalette }: OSHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    notifications, 
    unreadCount, 
    connectionStatus, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  const isCommandCenter = location.pathname === "/os" || location.pathname === "/os/";
  
  // Get current page name for breadcrumb
  const getPageName = () => {
    const path = location.pathname.replace("/os/", "").replace("/os", "");
    if (!path) return "Command Center";
    return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type === 'system' || type === 'alert') return true;
    return false;
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
          className="hidden lg:flex"
        >
          <RealtimeStatusBadge variant="full" />
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
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                <RealtimeStatusIndicator status={connectionStatus} size="sm" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    if (notification.link) {
                      navigate(notification.link);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 cursor-pointer rounded-lg mx-1 my-0.5",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2 w-full">
                    {getNotificationIcon(notification.type) && (
                      <div className="p-1 rounded-md bg-primary/10">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <p className={cn(
                          "text-sm",
                          !notification.read ? "font-medium" : "font-normal"
                        )}>
                          {notification.title}
                        </p>
                      </div>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
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
