import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  MessageSquare,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Revenue", value: "$12,450", change: "+12%", up: true, icon: DollarSign },
  { label: "Bookings", value: "48", change: "+8%", up: true, icon: Calendar },
  { label: "New Clients", value: "23", change: "+15%", up: true, icon: Users },
  { label: "Messages", value: "156", change: "-3%", up: false, icon: MessageSquare },
];

const aiInsights = [
  "3 leads waiting for response over 2 hours",
  "Deposit pending from Sarah M. ($200)",
  "Next appointment in 45 minutes with Mike J.",
];

const recentActivity = [
  { type: "booking", message: "New booking request from Emma W.", time: "5m ago" },
  { type: "payment", message: "Deposit received: $150", time: "1h ago" },
  { type: "message", message: "New message from returning client", time: "2h ago" },
];

export const CommandCenter = () => {
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground">Here's what's happening today</p>
        </div>
        <Button className="gradient-primary text-white shadow-sm">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Assistant
        </Button>
      </motion.div>

      {/* AI Insights Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="ai-highlight overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl gradient-ai flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">AI Insights</h3>
                  <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">Live</Badge>
                </div>
                <ul className="space-y-1">
                  {aiInsights.map((insight, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => (
          <Card key={stat.label} className="premium-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    stat.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {stat.up ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {stat.change}
                </Badge>
              </div>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="premium-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full mt-2">
                View all activity
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="premium-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">New Booking</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm">Add Client</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm">Send Deposit</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm">View Inbox</span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CommandCenter;
