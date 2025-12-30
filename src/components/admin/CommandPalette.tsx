import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  Users,
  Settings,
  FileText,
  Image,
  MessageCircle,
  Clock,
  Heart,
  MapPin,
  Mail,
  Shield,
  Megaphone,
  Palette,
  Bot,
  Package,
  Inbox,
  RefreshCw,
  Building2,
  ArrowRight,
  Command,
  Zap,
  Plus,
  Send,
  TrendingUp,
  CornerDownLeft
} from "lucide-react";
import { CRMTab } from "./CRMSidebar";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  category: "navigation" | "action" | "quick";
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  activeTab: CRMTab;
  onTabChange: (tab: CRMTab) => void;
  onAction: (actionId: string) => void;
}

const CommandPalette = ({ activeTab, onTabChange, onAction }: CommandPaletteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // All available commands
  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: "nav-overview", title: "Go to Overview", icon: TrendingUp, category: "navigation", keywords: ["dashboard", "home", "overview"], action: () => onTabChange("overview") },
    { id: "nav-bookings", title: "Go to Bookings", icon: Calendar, category: "navigation", keywords: ["bookings", "appointments", "schedule"], action: () => onTabChange("bookings") },
    { id: "nav-clients", title: "Go to Clients", icon: Users, category: "navigation", keywords: ["clients", "customers", "contacts"], action: () => onTabChange("clients") },
    { id: "nav-inbox", title: "Go to Inbox", icon: Inbox, category: "navigation", keywords: ["inbox", "messages", "unread"], action: () => onTabChange("inbox") },
    { id: "nav-design", title: "Go to Design Studio", icon: Palette, category: "navigation", keywords: ["design", "ai", "generate", "studio"], action: () => onTabChange("design-studio") },
    { id: "nav-waitlist", title: "Go to Waitlist", icon: Clock, category: "navigation", keywords: ["waitlist", "waiting", "queue"], action: () => onTabChange("waitlist") },
    { id: "nav-healing", title: "Go to Healing", icon: Heart, category: "navigation", keywords: ["healing", "aftercare", "photos"], action: () => onTabChange("healing") },
    { id: "nav-availability", title: "Go to Availability", icon: MapPin, category: "navigation", keywords: ["availability", "dates", "calendar"], action: () => onTabChange("availability") },
    { id: "nav-calendar-sync", title: "Go to Google Sync", icon: RefreshCw, category: "navigation", keywords: ["google", "sync", "calendar"], action: () => onTabChange("calendar-sync") },
    { id: "nav-cities", title: "Go to Cities", icon: Building2, category: "navigation", keywords: ["cities", "locations", "travel"], action: () => onTabChange("cities") },
    { id: "nav-templates", title: "Go to Templates", icon: Mail, category: "navigation", keywords: ["templates", "email", "messages"], action: () => onTabChange("templates") },
    { id: "nav-policies", title: "Go to Policies", icon: FileText, category: "navigation", keywords: ["policies", "rules", "terms"], action: () => onTabChange("policies") },
    { id: "nav-services", title: "Go to Services", icon: Package, category: "navigation", keywords: ["services", "pricing", "catalog"], action: () => onTabChange("services") },
    { id: "nav-workspace", title: "Go to Workspace", icon: Settings, category: "navigation", keywords: ["workspace", "settings", "config"], action: () => onTabChange("workspace") },
    { id: "nav-marketing", title: "Go to Marketing", icon: Megaphone, category: "navigation", keywords: ["marketing", "newsletter", "campaigns"], action: () => onTabChange("marketing") },
    { id: "nav-gallery", title: "Go to Gallery", icon: Image, category: "navigation", keywords: ["gallery", "photos", "portfolio"], action: () => onTabChange("gallery") },
    { id: "nav-conversations", title: "Go to Luna Chats", icon: MessageCircle, category: "navigation", keywords: ["luna", "chats", "ai", "conversations"], action: () => onTabChange("conversations") },
    { id: "nav-ai", title: "Go to AI Assistant", icon: Bot, category: "navigation", keywords: ["ai", "assistant", "luna", "settings"], action: () => onTabChange("ai-assistant") },
    { id: "nav-security", title: "Go to Security", icon: Shield, category: "navigation", keywords: ["security", "audit", "logs"], action: () => onTabChange("security") },

    // Quick Actions
    { id: "action-new-booking", title: "Create New Booking", description: "Start a new booking manually", icon: Plus, category: "action", keywords: ["new", "create", "booking", "add"], action: () => onAction("new-booking"), shortcut: "N" },
    { id: "action-send-reminder", title: "Send Reminders", description: "Notify pending clients", icon: Send, category: "action", keywords: ["send", "reminder", "notify", "email"], action: () => onAction("send-reminders") },
    { id: "action-block-dates", title: "Block Dates", description: "Mark dates as unavailable", icon: Calendar, category: "action", keywords: ["block", "dates", "unavailable", "off"], action: () => onAction("block-dates") },
    { id: "action-generate-design", title: "Generate Design", description: "Create AI tattoo design", icon: Sparkles, category: "action", keywords: ["generate", "design", "ai", "create"], action: () => { onTabChange("design-studio"); onAction("generate-design"); } },
  ], [onTabChange, onAction]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return commands.slice(0, 10); // Show first 10 by default
    }

    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(lowerQuery) ||
      cmd.keywords.some(kw => kw.includes(lowerQuery)) ||
      cmd.description?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }, [query, commands]);

  // Keyboard handling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open with Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setIsOpen(prev => !prev);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case "Escape":
        setIsOpen(false);
        setQuery("");
        break;
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
          setQuery("");
        }
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    quick: "Quick Actions",
    action: "Actions",
    navigation: "Navigation"
  };

  return (
    <>
      {/* Keyboard hint */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent/50 transition-colors"
      >
        <Search className="w-3 h-3" />
        <span>Quick actions</span>
        <kbd className="px-1.5 py-0.5 bg-accent rounded text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />

            {/* Command Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
            >
              <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search commands, navigate, or take action..."
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-body"
                    autoFocus
                  />
                  <kbd className="px-2 py-1 bg-accent text-muted-foreground rounded text-xs font-mono">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto p-2">
                  {filteredCommands.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground text-sm">
                        No results found for "{query}"
                      </p>
                    </div>
                  ) : (
                    Object.entries(groupedCommands).map(([category, items]) => (
                      <div key={category} className="mb-2">
                        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {categoryLabels[category] || category}
                        </p>
                        {items.map((cmd, idx) => {
                          const globalIndex = filteredCommands.indexOf(cmd);
                          return (
                            <button
                              key={cmd.id}
                              onClick={() => {
                                cmd.action();
                                setIsOpen(false);
                                setQuery("");
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                globalIndex === selectedIndex
                                  ? "bg-accent text-foreground"
                                  : "text-muted-foreground hover:bg-accent/50"
                              }`}
                            >
                              <cmd.icon className="w-4 h-4" />
                              <div className="flex-1 text-left">
                                <p className="text-sm font-medium">{cmd.title}</p>
                                {cmd.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {cmd.description}
                                  </p>
                                )}
                              </div>
                              {cmd.shortcut && (
                                <kbd className="px-1.5 py-0.5 bg-background/50 rounded text-[10px] font-mono text-muted-foreground">
                                  {cmd.shortcut}
                                </kbd>
                              )}
                              {globalIndex === selectedIndex && (
                                <CornerDownLeft className="w-3 h-3 text-muted-foreground" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 bg-accent rounded">↑↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 bg-accent rounded">↵</kbd>
                      select
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Command className="w-3 h-3" />
                    <span>Command Palette</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Missing import
const Sparkles = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export default CommandPalette;
