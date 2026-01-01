import { Bell, Search, Command, HelpCircle, Sparkles } from "lucide-react";
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

interface OSHeaderProps {
  onOpenCommandPalette: () => void;
}

const notifications = [
  {
    id: 1,
    title: "New booking request",
    message: "Sarah wants a sleeve consultation",
    time: "2m ago",
    unread: true,
  },
  {
    id: 2,
    title: "Deposit received",
    message: "$150 from Mike Johnson",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    title: "AI insight",
    message: "3 leads waiting for response",
    time: "2h ago",
    unread: false,
    isAI: true,
  },
];

export const OSHeader = ({ onOpenCommandPalette }: OSHeaderProps) => {
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6">
      {/* Left - Breadcrumb / Page title will go here via context */}
      <div className="flex-1 lg:pl-0 pl-12">
        {/* Placeholder for page title/breadcrumb */}
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Search Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search</span>
          <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>

        {/* Mobile Search */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenCommandPalette}
          className="sm:hidden"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* AI Assistant Quick Access */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-accent"
        >
          <Sparkles className="h-5 w-5" />
        </Button>

        {/* Help */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
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
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:text-primary/80">
                Mark all read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer",
                  notification.unread && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2 w-full">
                  {notification.isAI && (
                    <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
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
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center text-sm text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default OSHeader;
