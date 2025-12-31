import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, Video,
  Sparkles, BarChart3, Calendar,
  Zap, ArrowUpRight, ArrowDownRight,
  ChevronRight, Clock, Heart, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TrendSpotterAI from "./trend-spotter/TrendSpotterAI";
import ContentWizardAI from "./content-wizard/ContentWizardAI";

type ActiveModule = "dashboard" | "trends" | "content" | "analytics";

interface StatCard {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface QuickInsight {
  id: string;
  type: "trend" | "content" | "booking" | "alert";
  title: string;
  description: string;
  action: string;
  priority: "high" | "medium" | "low";
}

const STATS: StatCard[] = [
  { label: "Content Posted", value: "—", change: 0, changeLabel: "this week", icon: Video, color: "text-sky-400", bgColor: "bg-sky-400/10", borderColor: "border-sky-400/20" },
  { label: "Trending Now", value: "—", change: 0, changeLabel: "topics", icon: TrendingUp, color: "text-rose-400", bgColor: "bg-rose-400/10", borderColor: "border-rose-400/20" },
  { label: "Social Growth", value: "—", change: 0, changeLabel: "followers", icon: Heart, color: "text-gold", bgColor: "bg-gold/10", borderColor: "border-gold/20" },
  { label: "Engagement Rate", value: "—", change: 0, changeLabel: "connect social", icon: BarChart3, color: "text-violet-400", bgColor: "bg-violet-400/10", borderColor: "border-violet-400/20" },
];

const QUICK_INSIGHTS: QuickInsight[] = [
  { id: "1", type: "trend", title: "Hot Trend Alert", description: "POV format is going viral - perfect fit for your content", action: "Create Now", priority: "high" },
  { id: "2", type: "content", title: "Content Gap", description: "You haven't posted in 2 days. Engagement dropping.", action: "Schedule Post", priority: "high" },
  { id: "3", type: "booking", title: "Open Slot", description: "Thursday afternoon is available. 3 inquiries waiting.", action: "Review", priority: "medium" },
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "trends", label: "Trend Spotter", icon: TrendingUp },
  { id: "content", label: "Content Wizard", icon: Video },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function AIStudioDashboard() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("dashboard");

  const renderContent = () => {
    switch (activeModule) {
      case "trends":
        return <TrendSpotterAI />;
      case "content":
        return <ContentWizardAI />;
      case "analytics":
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-display text-2xl text-foreground">Analytics Module</h3>
              <p className="text-muted-foreground text-sm mt-2">Coming soon...</p>
            </div>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative group overflow-hidden bg-gradient-to-br from-card to-background p-6 border ${stat.borderColor} hover:border-gold/40 transition-all duration-500`}
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gold/5 to-transparent" />
            
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-display text-foreground mt-2">{stat.value}</p>
                <div className="flex items-center gap-1.5 mt-3">
                  {stat.change >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-rose-400" />
                  )}
                  <span className={`text-xs ${stat.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {Math.abs(stat.change)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">{stat.changeLabel}</span>
                </div>
              </div>
              <div className={`w-10 h-10 ${stat.bgColor} border ${stat.borderColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2 relative bg-gradient-to-br from-card to-background border border-border/50 overflow-hidden">
          {/* Header glow */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
          
          <div className="relative p-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gold" />
              </div>
              <div>
                <h3 className="font-display text-lg text-foreground">AI Recommendations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Smart insights from INK-AI</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {QUICK_INSIGHTS.map((insight, i) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 border transition-all duration-300 hover:border-gold/30 ${
                  insight.priority === "high" 
                    ? "border-gold/30 bg-gradient-to-r from-gold/10 to-transparent" 
                    : "border-border/50 bg-secondary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-body font-medium text-foreground">{insight.title}</h4>
                      {insight.priority === "high" && (
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-border/50 hover:border-gold/50 hover:bg-gold/10 hover:text-gold text-xs uppercase tracking-wider"
                  >
                    {insight.action}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="relative bg-gradient-to-br from-card to-background border border-border/50 overflow-hidden">
          {/* Header glow */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
          
          <div className="relative p-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-display text-lg text-foreground">Quick Actions</h3>
            </div>
          </div>
          <div className="p-6 space-y-2">
            {[
              { label: "Scan for Trends", icon: TrendingUp, color: "text-rose-400", module: "trends" as ActiveModule },
              { label: "Create Content", icon: Video, color: "text-sky-400", module: "content" as ActiveModule },
              { label: "View Analytics", icon: BarChart3, color: "text-violet-400", module: "analytics" as ActiveModule },
              { label: "View Schedule", icon: Calendar, color: "text-emerald-400", module: null },
              { label: "Client Inquiries", icon: MessageSquare, color: "text-gold", module: null },
            ].map((action, index) => (
              <Button
                key={action.label}
                variant="outline"
                className="w-full justify-start border-border/30 hover:border-gold/30 hover:bg-gold/5 group transition-all duration-300"
                onClick={() => action.module && setActiveModule(action.module)}
              >
                <action.icon className={`w-4 h-4 mr-3 ${action.color} group-hover:text-gold transition-colors`} />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="relative bg-gradient-to-br from-card to-background border border-border/50 overflow-hidden">
        {/* Header glow */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        
        <div className="relative p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-gold" />
            </div>
            <h3 className="font-display text-lg text-foreground">Today's Schedule</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[
            { time: "10:00 AM", client: "Sarah M.", type: "Micro Rose", duration: "4h", status: "confirmed" },
            { time: "3:00 PM", client: "Virtual Consult", type: "New Client Review", duration: "30m", status: "pending" },
          ].map((appointment, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-4 bg-secondary/20 border border-border/30 hover:border-gold/30 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-body font-medium text-foreground group-hover:text-gold transition-colors">{appointment.client}</p>
                  <p className="text-sm text-muted-foreground">{appointment.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-foreground">{appointment.time}</p>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-muted-foreground">{appointment.duration}</span>
                  <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${
                    appointment.status === "confirmed" 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <div className="absolute inset-0 blur-xl bg-gold/20 -z-10" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground">AI Studio</h2>
            <p className="text-sm text-muted-foreground tracking-wide">
              Content creation & social media tools
            </p>
          </div>
        </div>
      </div>

      {/* Decorative line */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="h-px bg-gradient-to-r from-gold/50 via-border to-transparent origin-left"
      />

      {/* Module Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        {NAV_ITEMS.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setActiveModule(item.id as ActiveModule)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-all duration-300 whitespace-nowrap ${
              activeModule === item.id
                ? "bg-gradient-to-r from-gold/20 to-gold/10 text-gold border border-gold/30"
                : "border border-border/50 text-muted-foreground hover:text-foreground hover:border-gold/30"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AIStudioDashboard;