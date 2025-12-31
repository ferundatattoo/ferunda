import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, Video, Layers,
  Sparkles, BarChart3, Calendar,
  DollarSign, Zap, ArrowUpRight, ArrowDownRight,
  ChevronRight, Clock, Heart, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TrendSpotterAI from "./trend-spotter/TrendSpotterAI";
import ContentWizardAI from "./content-wizard/ContentWizardAI";
import ARTattooPreview from "../client/ar-preview/ARTattooPreview";

type ActiveModule = "dashboard" | "trends" | "content" | "ar" | "analytics";

interface StatCard {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
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
  { label: "Revenue This Month", value: "$24,500", change: 18, changeLabel: "vs last month", icon: DollarSign, color: "text-green-500", bgColor: "bg-green-500/10" },
  { label: "Appointments", value: "12", change: 5, changeLabel: "this week", icon: Calendar, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { label: "Social Growth", value: "+2.4K", change: 32, changeLabel: "new followers", icon: Heart, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  { label: "Engagement Rate", value: "12.5%", change: -2, changeLabel: "vs last week", icon: TrendingUp, color: "text-purple-500", bgColor: "bg-purple-500/10" },
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
  { id: "ar", label: "AR Preview", icon: Layers },
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
      case "ar":
        return <ARTattooPreview />;
      case "analytics":
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl">Analytics Module</h3>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Grid - Same style as CRMOverview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border border-border p-6 hover:border-foreground/20 transition-colors bg-card"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-display text-foreground mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.change >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs ${stat.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {Math.abs(stat.change)}%
                  </span>
                  <span className="text-xs text-muted-foreground">{stat.changeLabel}</span>
                </div>
              </div>
              <div className={`w-10 h-10 ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2 border border-border bg-card">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg text-foreground">AI Recommendations</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Smart insights from INK-AI</p>
          </div>
          <div className="p-6 space-y-4">
            {QUICK_INSIGHTS.map((insight, i) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 border ${
                  insight.priority === "high" 
                    ? "border-primary/30 bg-primary/5" 
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{insight.title}</h4>
                      {insight.priority === "high" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {insight.action}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border border-border bg-card">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h3 className="font-display text-lg text-foreground">Quick Actions</h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveModule("trends")}
            >
              <TrendingUp className="w-4 h-4 mr-3 text-pink-500" />
              Scan for Trends
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveModule("content")}
            >
              <Video className="w-4 h-4 mr-3 text-blue-500" />
              Create Content
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveModule("ar")}
            >
              <Layers className="w-4 h-4 mr-3 text-cyan-500" />
              AR Preview
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
            >
              <Calendar className="w-4 h-4 mr-3 text-green-500" />
              View Schedule
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
            >
              <MessageSquare className="w-4 h-4 mr-3 text-purple-500" />
              Client Inquiries
            </Button>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="border border-border bg-card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg text-foreground">Today's Schedule</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[
            { time: "10:00 AM", client: "Sarah M.", type: "Micro Rose", duration: "4h", status: "confirmed" },
            { time: "3:00 PM", client: "Virtual Consult", type: "New Client Review", duration: "30m", status: "pending" },
          ].map((appointment, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-muted/30 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{appointment.client}</p>
                  <p className="text-sm text-muted-foreground">{appointment.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">{appointment.time}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{appointment.duration}</span>
                  <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"} className="text-xs">
                    {appointment.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h2 className="font-display text-xl text-foreground">AI Studio</h2>
            <p className="text-sm text-muted-foreground">
              Content creation & social media tools
            </p>
          </div>
        </div>
      </div>

      {/* Module Navigation */}
      <div className="flex gap-2 border-b border-border pb-4">
        {NAV_ITEMS.map(item => (
          <Button
            key={item.id}
            variant={activeModule === item.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveModule(item.id as ActiveModule)}
            className="gap-2"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Button>
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
