import { useEffect, useState, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  LayoutDashboard, FileText, Calendar, BarChart3, Megaphone, 
  Zap, Bot, TrendingUp, Users, FlaskConical, Hash, MessageSquare,
  Search
} from "lucide-react";

export type MarketingView = 
  | "dashboard" 
  | "content" 
  | "calendar" 
  | "analytics" 
  | "campaigns" 
  | "automation" 
  | "agents" 
  | "trends" 
  | "competitors" 
  | "ab-tests" 
  | "hashtags" 
  | "chat";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: MarketingView) => void;
}

const commands = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: ["home", "overview"] },
  { id: "content", label: "Content Studio", icon: FileText, keywords: ["posts", "create", "write"] },
  { id: "calendar", label: "Content Calendar", icon: Calendar, keywords: ["schedule", "plan"] },
  { id: "analytics", label: "Analytics", icon: BarChart3, keywords: ["metrics", "stats", "performance"] },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, keywords: ["marketing", "ads"] },
  { id: "automation", label: "Automation", icon: Zap, keywords: ["workflows", "auto"] },
  { id: "agents", label: "AI Agents", icon: Bot, keywords: ["ai", "assistant", "bots"] },
  { id: "trends", label: "Trend Analysis", icon: TrendingUp, keywords: ["viral", "trending"] },
  { id: "competitors", label: "Competitor Analysis", icon: Users, keywords: ["competition", "spy"] },
  { id: "ab-tests", label: "A/B Tests", icon: FlaskConical, keywords: ["experiments", "testing"] },
  { id: "hashtags", label: "Hashtag Generator", icon: Hash, keywords: ["tags", "keywords"] },
  { id: "chat", label: "AI Chat", icon: MessageSquare, keywords: ["help", "ask", "question"] },
] as const;

const CommandPalette = ({ open, onOpenChange, onNavigate }: CommandPaletteProps) => {
  const [search, setSearch] = useState("");

  const handleSelect = useCallback((id: MarketingView) => {
    onNavigate(id);
    onOpenChange(false);
    setSearch("");
  }, [onNavigate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b border-border/50 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput 
              placeholder="Search marketing tools..." 
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-[400px]">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </CommandEmpty>
            <CommandGroup heading="Navigation">
              {commands.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    value={`${command.label} ${command.keywords.join(" ")}`}
                    onSelect={() => handleSelect(command.id as MarketingView)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{command.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {command.keywords.join(", ")}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd> to navigate
            <span className="mx-2">·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd> to select
            <span className="mx-2">·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd> to close
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
