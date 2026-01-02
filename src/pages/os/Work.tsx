import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, ClipboardList, Calendar, Heart, CheckSquare, 
  PlayCircle, Filter, Plus, Clock, AlertCircle, ChevronRight,
  MoreHorizontal, Sparkles, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type WorkTab = 'requests' | 'bookings' | 'aftercare' | 'approvals' | 'playbooks';

interface WorkItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  sla?: string;
  slaUrgent?: boolean;
  nextAction?: string;
  type: WorkTab;
  priority: 'high' | 'medium' | 'low';
}

const tabConfig = [
  { id: 'requests', label: 'Requests', icon: ClipboardList, count: 8 },
  { id: 'bookings', label: 'Bookings', icon: Calendar, count: 12 },
  { id: 'aftercare', label: 'Aftercare', icon: Heart, count: 3 },
  { id: 'approvals', label: 'Approvals', icon: CheckSquare, count: 2 },
  { id: 'playbooks', label: 'Playbooks', icon: PlayCircle, count: 1 },
];

export default function Work() {
  const [activeTab, setActiveTab] = useState<WorkTab>('requests');
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkItems();
  }, [activeTab]);

  const fetchWorkItems = async () => {
    setLoading(true);
    try {
      // Fetch from bookings as primary source
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const items: WorkItem[] = (bookings || []).map(b => ({
        id: b.id,
        title: b.name || 'Unknown Client',
        subtitle: b.tattoo_description?.substring(0, 50) || 'No description',
        status: b.status || 'pending',
        sla: getSLA(b.created_at),
        slaUrgent: isUrgent(b.created_at),
        nextAction: getNextAction(b.status || 'pending'),
        type: mapStatusToTab(b.status || 'pending'),
        priority: b.deposit_paid ? 'high' : 'medium'
      }));

      setWorkItems(items);
    } catch (error) {
      console.error('Error fetching work items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSLA = (createdAt: string) => {
    const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const isUrgent = (createdAt: string) => {
    const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return hours > 24;
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'pending': return 'Review & Quote';
      case 'quoted': return 'Send Deposit';
      case 'confirmed': return 'Schedule Session';
      case 'completed': return 'Send Aftercare';
      default: return 'Review';
    }
  };

  const mapStatusToTab = (status: string): WorkTab => {
    switch (status) {
      case 'pending':
      case 'quoted':
        return 'requests';
      case 'confirmed':
      case 'scheduled':
        return 'bookings';
      case 'completed':
        return 'aftercare';
      default:
        return 'requests';
    }
  };

  const filteredItems = workItems.filter(item => {
    if (activeTab === 'requests') return ['pending', 'quoted'].includes(item.status);
    if (activeTab === 'bookings') return ['confirmed', 'scheduled'].includes(item.status);
    if (activeTab === 'aftercare') return item.status === 'completed';
    return true;
  });

  const getPriorityColor = (priority: WorkItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'quoted': return 'bg-info/10 text-info';
      case 'confirmed': return 'bg-success/10 text-success';
      case 'completed': return 'bg-primary/10 text-primary';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Work
          </h1>
          <p className="text-muted-foreground">Unified pipeline for all tattoo operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWorkItems}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" className="gradient-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {tabConfig.map((tab) => (
          <Card 
            key={tab.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              activeTab === tab.id && "ring-2 ring-primary"
            )}
            onClick={() => setActiveTab(tab.id as WorkTab)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <tab.icon className={cn(
                  "h-5 w-5",
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground"
                )} />
                <Badge variant="secondary" className="text-xs">{tab.count}</Badge>
              </div>
              <p className="mt-2 font-medium text-sm">{tab.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Work Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {tabConfig.find(t => t.id === activeTab)?.label} Pipeline
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-accent">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Options
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkTab)}>
            <TabsList className="w-full grid grid-cols-5 mb-4">
              {tabConfig.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="h-5 w-5 p-0 text-[10px]">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabConfig.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <tab.icon className="h-10 w-10 mb-2" />
                      <p>No items in {tab.label}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                            {/* Priority Indicator */}
                            <div className={cn(
                              "w-1 h-12 rounded-full",
                              item.priority === 'high' && "bg-destructive",
                              item.priority === 'medium' && "bg-warning",
                              item.priority === 'low' && "bg-muted-foreground"
                            )} />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{item.title}</p>
                                <Badge className={cn("text-[10px]", getStatusColor(item.status))}>
                                  {item.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>
                            </div>

                            {/* SLA */}
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className={cn(
                                "h-4 w-4",
                                item.slaUrgent ? "text-destructive" : "text-muted-foreground"
                              )} />
                              <span className={item.slaUrgent ? "text-destructive font-medium" : "text-muted-foreground"}>
                                {item.sla}
                              </span>
                            </div>

                            {/* Next Action */}
                            <Button variant="outline" size="sm" className="hidden sm:flex">
                              {item.nextAction}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>

                            {/* More Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Options
                                </DropdownMenuItem>
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
