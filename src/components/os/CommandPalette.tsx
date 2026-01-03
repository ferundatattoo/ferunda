import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  CalendarPlus,
  FileText,
  Send,
  Search,
  Sparkles,
  Clock,
  ArrowRight,
  UserPlus,
  Zap,
  Command as CommandIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  category: "navigation" | "actions" | "recent" | "ai";
  shortcut?: string;
}

export const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const navigationCommands: CommandAction[] = [
    {
      id: "nav-dashboard",
      label: "Command Center",
      description: "View dashboard",
      icon: LayoutDashboard,
      action: () => navigate("/os"),
      keywords: ["home", "dashboard", "overview"],
      category: "navigation",
      shortcut: "⌘D",
    },
    {
      id: "nav-inbox",
      label: "Inbox",
      description: "View messages",
      icon: Inbox,
      action: () => navigate("/os/inbox"),
      keywords: ["messages", "conversations", "dms"],
      category: "navigation",
      shortcut: "⌘I",
    },
    {
      id: "nav-pipeline",
      label: "Pipeline",
      description: "View bookings pipeline",
      icon: Kanban,
      action: () => navigate("/os/pipeline"),
      keywords: ["bookings", "leads", "deals"],
      category: "navigation",
      shortcut: "⌘P",
    },
    {
      id: "nav-calendar",
      label: "Calendar",
      description: "View schedule",
      icon: Calendar,
      action: () => navigate("/os/calendar"),
      keywords: ["schedule", "appointments"],
      category: "navigation",
    },
    {
      id: "nav-clients",
      label: "Clients",
      description: "View all clients",
      icon: Users,
      action: () => navigate("/os/clients"),
      keywords: ["customers", "contacts"],
      category: "navigation",
    },
    {
      id: "nav-money",
      label: "Money",
      description: "Finance & payments",
      icon: DollarSign,
      action: () => navigate("/os/money"),
      keywords: ["finance", "payments", "revenue"],
      category: "navigation",
    },
    {
      id: "nav-growth",
      label: "Growth",
      description: "Marketing & analytics",
      icon: TrendingUp,
      action: () => navigate("/os/growth"),
      keywords: ["marketing", "campaigns", "analytics"],
      category: "navigation",
    },
    {
      id: "nav-supply",
      label: "Supply",
      description: "Inventory management",
      icon: Package,
      action: () => navigate("/os/supply"),
      keywords: ["inventory", "stock", "orders"],
      category: "navigation",
    },
    {
      id: "nav-intelligence",
      label: "Intelligence",
      description: "AI insights & analytics",
      icon: Brain,
      action: () => navigate("/os/intelligence"),
      keywords: ["ai", "analytics", "insights"],
      category: "navigation",
    },
    {
      id: "nav-studio",
      label: "Studio",
      description: "Design & creative tools",
      icon: Palette,
      action: () => navigate("/os/studio"),
      keywords: ["design", "creative", "portfolio"],
      category: "navigation",
    },
    {
      id: "nav-settings",
      label: "Settings",
      description: "Configure your workspace",
      icon: Settings,
      action: () => navigate("/os/settings"),
      keywords: ["configuration", "preferences"],
      category: "navigation",
    },
  ];

  const actionCommands: CommandAction[] = [
    {
      id: "action-new-booking",
      label: "Create Booking",
      description: "Schedule a new appointment",
      icon: CalendarPlus,
      action: () => {
        window.dispatchEvent(new CustomEvent('create-booking'));
        onOpenChange(false);
      },
      keywords: ["new booking", "schedule", "appointment"],
      category: "actions",
      shortcut: "⌘B",
    },
    {
      id: "action-new-client",
      label: "Add Client",
      description: "Create a new client profile",
      icon: UserPlus,
      action: () => {
        window.dispatchEvent(new CustomEvent('create-client'));
        onOpenChange(false);
      },
      keywords: ["new client", "add customer"],
      category: "actions",
      shortcut: "⌘N",
    },
    {
      id: "action-send-deposit",
      label: "Send Deposit Link",
      description: "Request deposit payment",
      icon: Send,
      action: () => {
        window.dispatchEvent(new CustomEvent('send-deposit'));
        onOpenChange(false);
      },
      keywords: ["deposit", "payment", "invoice"],
      category: "actions",
    },
    {
      id: "action-new-quote",
      label: "Create Quote",
      description: "Generate a price quote",
      icon: FileText,
      action: () => {
        window.dispatchEvent(new CustomEvent('create-quote'));
        onOpenChange(false);
      },
      keywords: ["quote", "estimate", "price"],
      category: "actions",
    },
  ];

  const aiCommands: CommandAction[] = [
    {
      id: "ai-reply",
      label: "Generate Reply",
      description: "AI-powered message response",
      icon: Sparkles,
      action: () => {
        window.dispatchEvent(new CustomEvent('ai-generate-reply'));
        onOpenChange(false);
      },
      keywords: ["ai", "generate", "reply", "message"],
      category: "ai",
    },
    {
      id: "ai-suggest-slots",
      label: "Suggest Time Slots",
      description: "AI scheduling recommendations",
      icon: Clock,
      action: () => {
        window.dispatchEvent(new CustomEvent('ai-suggest-slots'));
        onOpenChange(false);
      },
      keywords: ["ai", "schedule", "slots", "availability"],
      category: "ai",
    },
  ];

  const allCommands = useMemo(() => [
    ...navigationCommands,
    ...actionCommands,
    ...aiCommands,
  ], []);

  const handleSelect = (command: CommandAction) => {
    command.action();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl max-w-[640px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {/* Header with gradient accent */}
          <div className="relative border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
            <div className="relative flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <CommandIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Command Palette</p>
                <p className="text-xs text-muted-foreground">Search commands, navigate, or take actions</p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-background/50 backdrop-blur-sm">
                <Zap className="h-3 w-3 mr-1" />
                AI Ready
              </Badge>
            </div>
          </div>

          <Command className="bg-transparent [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5">
            <div className="flex items-center border-b border-border/50 px-4 bg-muted/30">
              <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
              <CommandInput 
                placeholder="Type a command or search..." 
                value={search}
                onValueChange={setSearch}
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <CommandList className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent py-2">
              <CommandEmpty>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 py-8"
                >
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Search className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">No results found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Try searching for something else</p>
                  </div>
                </motion.div>
              </CommandEmpty>

              {/* AI Commands */}
              <CommandGroup heading="AI Actions">
                {aiCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.label + " " + (command.keywords?.join(" ") || "")}
                    onSelect={() => handleSelect(command)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 cursor-pointer transition-all hover:bg-accent/10 data-[selected=true]:bg-accent/15"
                  >
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center ring-1 ring-accent/20">
                      <command.icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2">
                        {command.label}
                        <Badge className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-accent/20 to-primary/20 text-accent border-accent/30">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                          AI
                        </Badge>
                      </p>
                      {command.description && (
                        <p className="text-xs text-muted-foreground truncate">{command.description}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator className="my-2 bg-border/50" />

              {/* Quick Actions */}
              <CommandGroup heading="Quick Actions">
                {actionCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.label + " " + (command.keywords?.join(" ") || "")}
                    onSelect={() => handleSelect(command)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 cursor-pointer transition-all hover:bg-primary/10 data-[selected=true]:bg-primary/15"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                      <command.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{command.label}</p>
                      {command.description && (
                        <p className="text-xs text-muted-foreground truncate">{command.description}</p>
                      )}
                    </div>
                    {command.shortcut && (
                      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {command.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator className="my-2 bg-border/50" />

              {/* Navigation */}
              <CommandGroup heading="Navigation">
                {navigationCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.label + " " + (command.keywords?.join(" ") || "")}
                    onSelect={() => handleSelect(command)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 cursor-pointer transition-all hover:bg-secondary data-[selected=true]:bg-secondary"
                  >
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                      <command.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{command.label}</p>
                      {command.description && (
                        <p className="text-xs text-muted-foreground truncate">{command.description}</p>
                      )}
                    </div>
                    {command.shortcut && (
                      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        {command.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>

            {/* Footer */}
            <div className="border-t border-border/50 px-4 py-2 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono">↵</kbd>
                  to select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono">esc</kbd>
                to close
              </span>
            </div>
          </Command>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
