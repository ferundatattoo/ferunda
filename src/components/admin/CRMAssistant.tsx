import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Loader2,
  Zap,
  Calendar,
  Users,
  Clock,
  FileText,
  Settings,
  MessageCircle,
  ChevronRight,
  Lightbulb,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CRMTab } from "./CRMSidebar";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  category: "booking" | "client" | "workflow" | "insight";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: QuickAction[];
}

interface ContextualSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  priority: "high" | "medium" | "low";
  action: () => void;
}

interface CRMAssistantProps {
  activeTab: CRMTab;
  onTabChange: (tab: CRMTab) => void;
  pendingCount: number;
  bookingsCount: number;
}

const TAB_CONTEXT: Record<CRMTab, { title: string; suggestions: string[] }> = {
  overview: {
    title: "Dashboard",
    suggestions: [
      "What needs my attention today?",
      "Show me performance insights",
      "Schedule a follow-up for pending bookings"
    ]
  },
  bookings: {
    title: "Bookings",
    suggestions: [
      "Approve all deposit-paid bookings",
      "Send reminders to pending clients",
      "Find clients needing follow-up"
    ]
  },
  clients: {
    title: "Clients",
    suggestions: [
      "Find VIP clients",
      "Who hasn't visited in 6 months?",
      "Export client list"
    ]
  },
  "design-studio": {
    title: "Design Studio",
    suggestions: [
      "Generate a neo-traditional design",
      "Create variations of last design",
      "Suggest placement for sleeve"
    ]
  },
  inbox: {
    title: "Inbox",
    suggestions: [
      "Summarize unread messages",
      "Draft reply for urgent inquiries",
      "Auto-respond to common questions"
    ]
  },
  waitlist: {
    title: "Waitlist",
    suggestions: [
      "Who's been waiting longest?",
      "Match waitlist to open slots",
      "Send batch notifications"
    ]
  },
  healing: {
    title: "Healing",
    suggestions: [
      "Check overdue healing updates",
      "Generate healing certificates",
      "Flag concerning photos"
    ]
  },
  availability: {
    title: "Availability",
    suggestions: [
      "Block next 2 weeks",
      "Add guest spot dates",
      "Sync with Google Calendar"
    ]
  },
  "calendar-sync": {
    title: "Calendar Sync",
    suggestions: [
      "Check sync status",
      "Fix calendar conflicts",
      "Re-sync all events"
    ]
  },
  cities: {
    title: "Cities",
    suggestions: [
      "Add new city",
      "Update city pricing",
      "Configure travel dates"
    ]
  },
  templates: {
    title: "Templates",
    suggestions: [
      "Create booking confirmation",
      "Edit reminder template",
      "Preview email template"
    ]
  },
  policies: {
    title: "Policies",
    suggestions: [
      "Update deposit policy",
      "Review cancellation terms",
      "Generate policy summary"
    ]
  },
  services: {
    title: "Services",
    suggestions: [
      "Add new service",
      "Update pricing",
      "Disable seasonal service"
    ]
  },
  workspace: {
    title: "Workspace",
    suggestions: [
      "Invite team member",
      "Update business hours",
      "Configure notifications"
    ]
  },
  team: {
    title: "Team",
    suggestions: [
      "View team performance",
      "Assign artist to booking",
      "Update permissions"
    ]
  },
  marketing: {
    title: "Marketing",
    suggestions: [
      "Send newsletter",
      "Create flash sale campaign",
      "View campaign analytics"
    ]
  },
  gallery: {
    title: "Gallery",
    suggestions: [
      "Upload new work",
      "Organize by style",
      "Feature top pieces"
    ]
  },
  conversations: {
    title: "Luna Chats",
    suggestions: [
      "Review unanswered chats",
      "Improve Luna's responses",
      "Export conversation data"
    ]
  },
  "ai-assistant": {
    title: "AI Settings",
    suggestions: [
      "Train on new FAQ",
      "Update voice profile",
      "Review AI accuracy"
    ]
  },
  security: {
    title: "Security",
    suggestions: [
      "Review access logs",
      "Update permissions",
      "Enable 2FA"
    ]
  }
};

const CRMAssistant = ({
  activeTab,
  onTabChange,
  pendingCount,
  bookingsCount
}: CRMAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const context = TAB_CONTEXT[activeTab] || TAB_CONTEXT.overview;

  // Generate contextual suggestions based on current state
  const getContextualSuggestions = (): ContextualSuggestion[] => {
    const suggestions: ContextualSuggestion[] = [];

    if (pendingCount > 0) {
      suggestions.push({
        id: "pending-bookings",
        title: `${pendingCount} pending booking${pendingCount > 1 ? "s" : ""}`,
        description: "Review and respond to maintain response time",
        icon: Clock,
        priority: "high",
        action: () => onTabChange("bookings")
      });
    }

    if (activeTab === "overview") {
      suggestions.push({
        id: "daily-summary",
        title: "Start your day",
        description: "Get a quick summary of priorities",
        icon: Lightbulb,
        priority: "medium",
        action: () => handleSuggestionClick("What should I focus on today?")
      });
    }

    return suggestions;
  };

  const quickActions: QuickAction[] = [
    {
      id: "new-booking",
      label: "New Booking",
      description: "Create a booking manually",
      icon: Calendar,
      category: "booking",
      action: () => {
        onTabChange("bookings");
        handleAssistantMessage("I'll help you create a new booking. Let me open the booking wizard for you.");
      }
    },
    {
      id: "follow-up",
      label: "Quick Follow-up",
      description: "Send follow-up to pending clients",
      icon: MessageCircle,
      category: "workflow",
      action: () => {
        handleAssistantMessage("I can help you send follow-ups. Would you like to:\n\n1. Send to all pending bookings\n2. Select specific clients\n3. Use a custom template");
      }
    },
    {
      id: "check-calendar",
      label: "Today's Schedule",
      description: "View appointments for today",
      icon: Clock,
      category: "workflow",
      action: () => {
        handleAssistantMessage("Checking today's schedule... You have no appointments scheduled for today. Would you like me to help you fill open slots?");
      }
    },
    {
      id: "performance",
      label: "Weekly Insights",
      description: "Review this week's metrics",
      icon: TrendingUp,
      category: "insight",
      action: () => {
        handleAssistantMessage(`Here's your weekly snapshot:\n\n**Bookings:** ${bookingsCount} total\n**Pending:** ${pendingCount} require action\n\nWould you like me to generate a detailed report?`);
      }
    }
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowQuickActions(false);
    // Simulate sending
    setTimeout(() => {
      handleSend(suggestion);
    }, 100);
  };

  const handleAssistantMessage = (content: string, actions?: QuickAction[]) => {
    const message: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content,
      timestamp: new Date(),
      actions
    };
    setMessages(prev => [...prev, message]);
    setShowQuickActions(false);
  };

  const handleSend = async (customInput?: string) => {
    const messageText = customInput || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = getContextualResponse(messageText);
      handleAssistantMessage(responses.content, responses.actions);
      setIsTyping(false);
    }, 1000);
  };

  const getContextualResponse = (query: string): { content: string; actions?: QuickAction[] } => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes("pending") || lowerQuery.includes("attention")) {
      return {
        content: pendingCount > 0
          ? `You have **${pendingCount} pending bookings** that need your attention. I recommend:\n\n1. Review the oldest request first\n2. Send a quick acknowledgment if you need more time\n3. Use templates for faster responses\n\nWant me to open the bookings panel?`
          : "Great news! You're all caught up. No pending bookings require immediate attention.",
        actions: pendingCount > 0 ? [quickActions[0]] : undefined
      };
    }

    if (lowerQuery.includes("today") || lowerQuery.includes("schedule")) {
      return {
        content: "Today's priorities:\n\n1. **Check messages** - Stay responsive\n2. **Review pending** - Quick responses build trust\n3. **Update availability** - Keep calendar accurate\n\nWhat would you like to tackle first?"
      };
    }

    if (lowerQuery.includes("help") || lowerQuery.includes("how")) {
      return {
        content: `I can help you with:\n\n• **Bookings** - Create, manage, follow-up\n• **Clients** - Find, segment, communicate\n• **Calendar** - Availability, scheduling\n• **Insights** - Performance, trends\n\nJust ask naturally, like "Who needs a follow-up?" or "Block next week's calendar."`
      };
    }

    return {
      content: `I understand you're asking about "${query}". I'm here to help you manage your CRM efficiently.\n\nYou can ask me to:\n• Navigate to specific sections\n• Perform quick actions\n• Get insights and summaries\n\nWhat specifically would you like to do?`
    };
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset quick actions when tab changes
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setShowQuickActions(true);
    }
  }, [activeTab]);

  const suggestions = getContextualSuggestions();

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-foreground text-background rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Bot className="w-6 h-6" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[600px] bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-medium text-foreground">
                    CRM Assistant
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {context.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Priority Alerts */}
            {suggestions.length > 0 && messages.length === 0 && (
              <div className="p-3 border-b border-border bg-accent/10">
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion.id}
                    onClick={suggestion.action}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className={`p-1.5 rounded-lg ${
                      suggestion.priority === "high" 
                        ? "bg-destructive/20 text-destructive" 
                        : "bg-accent text-foreground"
                    }`}>
                      <suggestion.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {suggestion.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* Messages / Quick Actions */}
            <ScrollArea className="flex-1 p-4">
              {showQuickActions && messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Quick Actions Grid */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Quick Actions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map(action => (
                        <button
                          key={action.id}
                          onClick={action.action}
                          className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors text-left group"
                        >
                          <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground mb-2 transition-colors" />
                          <p className="text-sm font-medium text-foreground">
                            {action.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {action.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contextual Suggestions */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Suggestions for {context.title}
                    </p>
                    <div className="space-y-2">
                      {context.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors text-left"
                        >
                          <Zap className="w-3 h-3" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-lg ${
                          message.role === "user"
                            ? "bg-foreground text-background"
                            : "bg-accent text-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return <strong key={i}>{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                        {message.actions && (
                          <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
                            {message.actions.map(action => (
                              <button
                                key={action.id}
                                onClick={action.action}
                                className="w-full flex items-center gap-2 p-2 text-xs bg-background/10 hover:bg-background/20 rounded transition-colors"
                              >
                                <action.icon className="w-3 h-3" />
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-accent px-4 py-2 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-accent/30 border-border"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isTyping}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Press Enter to send
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CRMAssistant;
