import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  Plus,
  UserPlus,
  CalendarPlus,
  FileText,
  Send,
  Search,
  Sparkles,
  Clock,
  ArrowRight,
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
    },
    {
      id: "nav-inbox",
      label: "Inbox",
      description: "View messages",
      icon: Inbox,
      action: () => navigate("/os/inbox"),
      keywords: ["messages", "conversations", "dms"],
      category: "navigation",
    },
    {
      id: "nav-pipeline",
      label: "Pipeline",
      description: "View bookings pipeline",
      icon: Kanban,
      action: () => navigate("/os/pipeline"),
      keywords: ["bookings", "leads", "deals"],
      category: "navigation",
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
        // Will trigger booking modal
        window.dispatchEvent(new CustomEvent('create-booking'));
        onOpenChange(false);
      },
      keywords: ["new booking", "schedule", "appointment"],
      category: "actions",
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
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No results found.</p>
          </div>
        </CommandEmpty>

        {/* AI Commands */}
        <CommandGroup heading="AI Actions">
          {aiCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={command.label + " " + (command.keywords?.join(" ") || "")}
              onSelect={() => handleSelect(command)}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <command.icon className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  {command.label}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent">
                    AI
                  </Badge>
                </p>
                {command.description && (
                  <p className="text-xs text-muted-foreground">{command.description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {actionCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={command.label + " " + (command.keywords?.join(" ") || "")}
              onSelect={() => handleSelect(command)}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <command.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{command.label}</p>
                {command.description && (
                  <p className="text-xs text-muted-foreground">{command.description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navigationCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={command.label + " " + (command.keywords?.join(" ") || "")}
              onSelect={() => handleSelect(command)}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                <command.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{command.label}</p>
                {command.description && (
                  <p className="text-xs text-muted-foreground">{command.description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
