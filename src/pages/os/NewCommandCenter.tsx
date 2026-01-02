import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Calendar, MessageSquare, Briefcase, 
  DollarSign, TrendingUp, Package, Clock, AlertCircle,
  CheckCircle, ChevronRight, Play, Undo, Sparkles,
  RefreshCw, ArrowUpRight, MoreHorizontal, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  type: 'session' | 'task' | 'approval';
  status: 'upcoming' | 'in_progress' | 'completed';
}

interface InboxItem {
  id: string;
  name: string;
  message: string;
  urgency: 'hot' | 'needs_info' | 'complaint' | 'normal';
  channel: string;
  time: string;
}

interface WorkItem {
  id: string;
  title: string;
  sla: string;
  slaUrgent: boolean;
  action: string;
}

interface MoneySnapshot {
  pendingDeposits: number;
  pendingCount: number;
  upcomingPayouts: number;
  disputes: number;
}

export default function NewCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [moneySnapshot, setMoneySnapshot] = useState<MoneySnapshot>({
    pendingDeposits: 0,
    pendingCount: 0,
    upcomingPayouts: 0,
    disputes: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch today's sessions
      const today = new Date();
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('preferred_date', format(today, 'yyyy-MM-dd'))
        .lte('preferred_date', format(today, 'yyyy-MM-dd'))
        .limit(10);

      // Transform to timeline
      const timelineData: TimelineEvent[] = (bookings || []).map((b, i) => ({
        id: b.id,
        time: `${9 + i}:00`,
        title: `Session with ${b.name || 'Client'}`,
        type: 'session' as const,
        status: 'upcoming' as const
      }));
      setTimeline(timelineData);

      // Fetch inbox conversations
      const { data: conversations } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const inboxData: InboxItem[] = (conversations || []).map(c => ({
        id: c.id,
        name: c.name || 'Unknown',
        message: c.tattoo_description?.substring(0, 60) || 'New inquiry',
        urgency: c.deposit_paid ? 'hot' : 'normal' as const,
        channel: 'web',
        time: format(new Date(c.created_at), 'h:mm a')
      }));
      setInboxItems(inboxData);

      // Fetch work items
      const { data: pendingWork } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['pending', 'quoted'])
        .order('created_at', { ascending: true })
        .limit(7);

      const workData: WorkItem[] = (pendingWork || []).map(w => {
        const hours = Math.floor((Date.now() - new Date(w.created_at).getTime()) / (1000 * 60 * 60));
        return {
          id: w.id,
          title: `${w.name || 'Client'} - ${w.status === 'pending' ? 'Quote needed' : 'Deposit pending'}`,
          sla: hours < 24 ? `${hours}h` : `${Math.floor(hours/24)}d`,
          slaUrgent: hours > 24,
          action: w.status === 'pending' ? 'Send Quote' : 'Request Deposit'
        };
      });
      setWorkItems(workData);

      // Money snapshot
      const { data: deposits } = await supabase
        .from('bookings')
        .select('deposit_amount')
        .eq('status', 'confirmed')
        .eq('deposit_paid', false);

      const pendingAmount = (deposits || []).reduce((sum, d) => sum + (d.deposit_amount || 0), 0);
      setMoneySnapshot({
        pendingDeposits: pendingAmount,
        pendingCount: deposits?.length || 0,
        upcomingPayouts: 2400, // Mock
        disputes: 0
      });

    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = () => {
    setPlanGenerated(true);
  };

  const getUrgencyBadge = (urgency: InboxItem['urgency']) => {
    switch (urgency) {
      case 'hot': return <Badge className="bg-destructive/10 text-destructive text-[10px]">Hot Lead</Badge>;
      case 'needs_info': return <Badge className="bg-warning/10 text-warning text-[10px]">Needs Info</Badge>;
      case 'complaint': return <Badge className="bg-destructive text-destructive-foreground text-[10px]">Complaint</Badge>;
      default: return null;
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting()}</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {planGenerated ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setPlanGenerated(false)}>
                <Undo className="h-4 w-4 mr-2" />
                Undo Plan
              </Button>
              <Button size="sm" className="gradient-primary text-white">
                <Play className="h-4 w-4 mr-2" />
                Apply Plan
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              className="gradient-ai text-white shadow-ai"
              onClick={generatePlan}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Today Plan
            </Button>
          )}
        </div>
      </div>

      {/* Generated Plan Alert */}
      {planGenerated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg border border-accent/30 bg-accent/5"
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg gradient-ai flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">Today's AI Plan Generated</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Focus on 3 hot leads first, confirm 4 sessions, then process 2 pending quotes. 
                Estimated time: 2.5 hours. Expected revenue impact: +$1,200.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Today Timeline
              </CardTitle>
              <Badge variant="secondary">{timeline.length} events</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2" />
                  <p className="text-sm">No sessions today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((event, i) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="text-xs text-muted-foreground w-12 pt-0.5">{event.time}</div>
                      <div className={cn(
                        "h-2 w-2 rounded-full mt-1.5",
                        event.status === 'completed' ? "bg-success" :
                        event.status === 'in_progress' ? "bg-primary animate-pulse" :
                        "bg-muted-foreground"
                      )} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{event.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Inbox Snapshot */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-warning" />
                Inbox
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {inboxItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm">Inbox zero! 🎉</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inboxItems.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        {getUrgencyBadge(item.urgency)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span className="capitalize">{item.channel}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Work Queue */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-info" />
                Work Queue
              </CardTitle>
              <Badge variant="secondary">{workItems.length} items</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {workItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
                    >
                      <div className={cn(
                        "w-1 h-8 rounded-full",
                        item.slaUrgent ? "bg-destructive" : "bg-warning"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Clock className={cn("h-3 w-3", item.slaUrgent && "text-destructive")} />
                          <span className={item.slaUrgent ? "text-destructive" : ""}>{item.sla} SLA</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {item.action}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Money Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Money
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">${moneySnapshot.pendingDeposits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{moneySnapshot.pendingCount} pending deposits</p>
                </div>
                <Button size="sm" variant="outline">
                  Request All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-lg font-semibold">${moneySnapshot.upcomingPayouts.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Upcoming payouts</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{moneySnapshot.disputes}</p>
                  <p className="text-xs text-muted-foreground">Active disputes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-xs text-muted-foreground">Content drafts ready</p>
                </div>
                <Button size="sm" variant="outline">
                  Review <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-medium">Top performing source</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm">Instagram Reels</span>
                  <Badge className="bg-success/10 text-success text-[10px]">+34%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supply Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Supply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-sm">2 items low stock</p>
                  <p className="text-xs text-muted-foreground">Black ink, 5RL needles</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending POs</span>
                <Badge variant="secondary">1 draft</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
