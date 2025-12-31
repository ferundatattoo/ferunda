import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, Video, Layers, Bot,
  Settings, Sparkles, BarChart3, Users, Calendar,
  DollarSign, Zap, ArrowUpRight, ArrowDownRight,
  ChevronRight, Clock, Eye, Heart, MessageSquare,
  Bell, Search, Menu, Moon, Sun
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import TrendSpotterAI from "./trend-spotter/TrendSpotterAI";
import ContentWizardAI from "./content-wizard/ContentWizardAI";
import ARTattooPreview from "../client/ar-preview/ARTattooPreview";
import INKAIAssistant from "./ai-studio/INKAIAssistant";

type ActiveModule = "dashboard" | "trends" | "content" | "ar" | "analytics";

interface StatCard {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: any;
  gradient: string;
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
  { label: "Revenue This Month", value: "$24,500", change: 18, changeLabel: "vs last month", icon: DollarSign, gradient: "from-green-500 to-emerald-600" },
  { label: "Appointments", value: "12", change: 5, changeLabel: "this week", icon: Calendar, gradient: "from-blue-500 to-cyan-600" },
  { label: "Social Growth", value: "+2.4K", change: 32, changeLabel: "new followers", icon: Users, gradient: "from-pink-500 to-rose-600" },
  { label: "Engagement Rate", value: "12.5%", change: -2, changeLabel: "vs last week", icon: Heart, gradient: "from-purple-500 to-violet-600" },
];

const QUICK_INSIGHTS: QuickInsight[] = [
  { id: "1", type: "trend", title: "🔥 Hot Trend Alert", description: "POV format is going viral - perfect fit for your content", action: "Create Now", priority: "high" },
  { id: "2", type: "content", title: "📅 Content Gap", description: "You haven't posted in 2 days. Engagement dropping.", action: "Schedule Post", priority: "high" },
  { id: "3", type: "booking", title: "💰 Open Slot", description: "Thursday afternoon is available. 3 inquiries waiting.", action: "Review", priority: "medium" },
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "trends", label: "Trend Spotter", icon: TrendingUp },
  { id: "content", label: "Content Wizard", icon: Video },
  { id: "ar", label: "AR Preview", icon: Layers },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export function AIStudioDashboard() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
              <h3 className="text-xl font-semibold">Analytics Module</h3>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, Fernando 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your studio today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon">
            <Bell className="w-4 h-4" />
          </Button>
          <Button className="bg-gradient-to-r from-violet-600 to-purple-700">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Insights
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`} />
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
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
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Recommendations
            </CardTitle>
            <CardDescription>Smart insights from INK-AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {QUICK_INSIGHTS.map((insight, i) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-lg border ${
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
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: "10:00 AM", client: "Sarah M.", type: "Micro Rose", duration: "4h", status: "confirmed" },
              { time: "3:00 PM", client: "Virtual Consult", type: "New Client Review", duration: "30m", status: "pending" },
            ].map((appointment, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
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
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all z-40 ${
        sidebarCollapsed ? "w-16" : "w-64"
      }`}>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-foreground">FERUNDA</h1>
                <p className="text-xs text-muted-foreground">AI Studio</p>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id as ActiveModule)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  activeModule === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-4 left-0 right-0 px-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        <div className="p-6">
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
      </main>

      {/* Floating AI Assistant */}
      <INKAIAssistant />
    </div>
  );
}

export default AIStudioDashboard;
