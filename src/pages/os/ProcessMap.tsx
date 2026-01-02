import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Map, Users, MessageSquare, Calendar, CreditCard,
  FileText, Package, Sparkles, Cog, Bell, ChevronRight,
  CheckCircle, AlertCircle, Clock, ArrowRight, Zap,
  RefreshCw, Settings, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ProcessNode {
  id: string;
  label: string;
  description: string;
  module: string;
  automations: string[];
  dataRequired: string[];
  commonIssues: string[];
  status: 'healthy' | 'warning' | 'error';
  avgTime: string;
}

const processNodes: ProcessNode[] = [
  {
    id: 'lead',
    label: 'Lead',
    description: 'New inquiry received',
    module: 'Inbox',
    automations: ['AI Triage', 'Auto-response'],
    dataRequired: ['Contact info', 'Channel source'],
    commonIssues: ['Missing contact', 'Duplicate lead'],
    status: 'healthy',
    avgTime: 'Instant'
  },
  {
    id: 'intake',
    label: 'Intake',
    description: 'Gather requirements',
    module: 'Inbox',
    automations: ['AI Brief extraction', 'Reference analysis'],
    dataRequired: ['Design description', 'Placement', 'Size', 'References'],
    commonIssues: ['Incomplete brief', 'Vague requirements'],
    status: 'healthy',
    avgTime: '24h'
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Estimate and pricing',
    module: 'Work',
    automations: ['AI Session estimation', 'Price calculation'],
    dataRequired: ['Brief', 'Complexity', 'Artist rates'],
    commonIssues: ['Under-estimation', 'Scope creep'],
    status: 'warning',
    avgTime: '4h'
  },
  {
    id: 'deposit',
    label: 'Deposit',
    description: 'Secure booking',
    module: 'Money',
    automations: ['Payment link generation', 'Reminder sequence'],
    dataRequired: ['Quote amount', 'Payment method'],
    commonIssues: ['Abandoned payment', 'Payment failures'],
    status: 'healthy',
    avgTime: '48h'
  },
  {
    id: 'approval',
    label: 'Approval',
    description: 'Artist confirms',
    module: 'Work',
    automations: ['Artist notification', 'Calendar hold'],
    dataRequired: ['Brief', 'References', 'Deposit status'],
    commonIssues: ['Artist capacity', 'Style mismatch'],
    status: 'healthy',
    avgTime: '24h'
  },
  {
    id: 'confirm',
    label: 'Confirm',
    description: 'Booking confirmed',
    module: 'Work',
    automations: ['Confirmation email', 'Calendar sync'],
    dataRequired: ['Date/time', 'Artist', 'Location'],
    commonIssues: ['Double booking', 'Timezone issues'],
    status: 'healthy',
    avgTime: 'Instant'
  },
  {
    id: 'precheck',
    label: 'Precheck',
    description: '24h before session',
    module: 'Work',
    automations: ['24h reminder', 'Prep instructions'],
    dataRequired: ['Session details', 'Client contact'],
    commonIssues: ['No confirmation', 'Last-minute cancel'],
    status: 'healthy',
    avgTime: '24h before'
  },
  {
    id: 'session',
    label: 'Session',
    description: 'Tattoo appointment',
    module: 'Work',
    automations: ['Check-in', 'Time tracking'],
    dataRequired: ['Design files', 'Consent form'],
    commonIssues: ['No-show', 'Running late'],
    status: 'healthy',
    avgTime: '2-6h'
  },
  {
    id: 'aftercare',
    label: 'Aftercare',
    description: 'Post-session care',
    module: 'Work',
    automations: ['Aftercare email', 'Healing check-ins'],
    dataRequired: ['Session completed', 'Care instructions'],
    commonIssues: ['Healing issues', 'Touch-up needed'],
    status: 'healthy',
    avgTime: '2-4 weeks'
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Client feedback',
    module: 'Growth',
    automations: ['Review request', 'Referral prompt'],
    dataRequired: ['Healed result', 'Client satisfaction'],
    commonIssues: ['Low response rate'],
    status: 'warning',
    avgTime: '4 weeks'
  },
  {
    id: 'payout',
    label: 'Payout',
    description: 'Artist payment',
    module: 'Money',
    automations: ['Period close', 'Statement generation'],
    dataRequired: ['Completed sessions', 'Commission rates'],
    commonIssues: ['Missing data', 'Calculation errors'],
    status: 'healthy',
    avgTime: 'Bi-weekly'
  },
  {
    id: 'supply',
    label: 'Reorder',
    description: 'Inventory replenishment',
    module: 'Supply',
    automations: ['Low stock alert', 'PO generation'],
    dataRequired: ['Inventory levels', 'Usage rates'],
    commonIssues: ['Stockout', 'Over-ordering'],
    status: 'healthy',
    avgTime: 'As needed'
  }
];

export default function ProcessMap() {
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: ProcessNode['status']) => {
    switch (status) {
      case 'healthy': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-destructive';
    }
  };

  const getStatusIcon = (status: ProcessNode['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'Inbox': return <MessageSquare className="h-4 w-4" />;
      case 'Work': return <Calendar className="h-4 w-4" />;
      case 'Money': return <CreditCard className="h-4 w-4" />;
      case 'Growth': return <Sparkles className="h-4 w-4" />;
      case 'Supply': return <Package className="h-4 w-4" />;
      default: return <Cog className="h-4 w-4" />;
    }
  };

  const filteredNodes = processNodes.filter(node => 
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.module.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" />
            Process Map
          </h1>
          <p className="text-muted-foreground">Visualize the complete tattoo journey</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm w-48"
            />
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">
            {processNodes.filter(n => n.status === 'healthy').length} Healthy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-warning" />
          <span className="text-sm text-muted-foreground">
            {processNodes.filter(n => n.status === 'warning').length} Warning
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">
            {processNodes.filter(n => n.status === 'error').length} Error
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process Flow */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Journey Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="relative">
                {/* Connection Line */}
                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border" />

                {/* Nodes */}
                <div className="space-y-4">
                  {filteredNodes.map((node, index) => (
                    <motion.button
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={cn(
                        "relative w-full flex items-start gap-4 p-4 rounded-lg border text-left transition-all",
                        selectedNode?.id === node.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                      whileHover={{ x: 4 }}
                    >
                      {/* Status Indicator */}
                      <div className={cn(
                        "relative z-10 h-12 w-12 rounded-full flex items-center justify-center bg-background border-2",
                        node.status === 'healthy' && "border-success",
                        node.status === 'warning' && "border-warning",
                        node.status === 'error' && "border-destructive"
                      )}>
                        {getModuleIcon(node.module)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{node.label}</p>
                          <Badge variant="outline" className="text-[10px]">{node.module}</Badge>
                          {getStatusIcon(node.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{node.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {node.avgTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {node.automations.length} automations
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </motion.button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Stage Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center border-2",
                    selectedNode.status === 'healthy' && "border-success bg-success/10",
                    selectedNode.status === 'warning' && "border-warning bg-warning/10",
                    selectedNode.status === 'error' && "border-destructive bg-destructive/10"
                  )}>
                    {getModuleIcon(selectedNode.module)}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedNode.label}</p>
                    <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
                  </div>
                </div>

                {/* Module */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Module</p>
                  <Badge variant="secondary">{selectedNode.module}</Badge>
                </div>

                {/* Data Required */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Data Required</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.dataRequired.map((data) => (
                      <Badge key={data} variant="outline" className="text-[10px]">{data}</Badge>
                    ))}
                  </div>
                </div>

                {/* Automations */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Automations</p>
                  <div className="space-y-1">
                    {selectedNode.automations.map((auto) => (
                      <div key={auto} className="flex items-center gap-2 text-sm">
                        <Zap className="h-3 w-3 text-accent" />
                        {auto}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Issues */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Common Issues</p>
                  <div className="space-y-1">
                    {selectedNode.commonIssues.map((issue) => (
                      <div key={issue} className="flex items-center gap-2 text-sm text-warning">
                        <AlertCircle className="h-3 w-3" />
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  <Button className="w-full" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Stage
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    View Playbooks
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Map className="h-10 w-10 mb-3" />
                <p className="text-sm">Select a stage to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
