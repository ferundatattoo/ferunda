import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Clock, ArrowRight, Settings, Play, Pause } from "lucide-react";

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  isActive: boolean;
  lastRun?: string;
  runsCount: number;
}

const mockAutomations: Automation[] = [
  {
    id: "1",
    name: "Welcome New Followers",
    description: "Send a welcome DM to new Instagram followers",
    trigger: "New Follower",
    actions: ["Wait 1 hour", "Send Welcome DM", "Add to CRM"],
    isActive: true,
    lastRun: "2 hours ago",
    runsCount: 156,
  },
  {
    id: "2",
    name: "Auto-Reply to Comments",
    description: "Thank users who comment on posts",
    trigger: "New Comment",
    actions: ["Check sentiment", "Send thank you reply"],
    isActive: true,
    lastRun: "30 minutes ago",
    runsCount: 892,
  },
  {
    id: "3",
    name: "Low Engagement Alert",
    description: "Notify when post engagement drops below threshold",
    trigger: "Engagement < 2%",
    actions: ["Send Slack notification", "Add to review queue"],
    isActive: false,
    lastRun: "3 days ago",
    runsCount: 12,
  },
  {
    id: "4",
    name: "Content Recycler",
    description: "Repost top-performing content after 90 days",
    trigger: "90 days after post",
    actions: ["Check if top performer", "Schedule repost", "Update captions"],
    isActive: true,
    lastRun: "1 day ago",
    runsCount: 24,
  },
];

const AutomationModule = () => {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);

  const toggleAutomation = (id: string) => {
    setAutomations(prev =>
      prev.map(a => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation</h1>
          <p className="text-muted-foreground">Set up automated marketing workflows</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {automations.filter(a => a.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {automations.reduce((sum, a) => sum + a.runsCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Pause className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {automations.filter(a => !a.isActive).length}
                </p>
                <p className="text-sm text-muted-foreground">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.map((automation) => (
          <Card key={automation.id} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{automation.name}</h3>
                    <Badge variant={automation.isActive ? "default" : "secondary"}>
                      {automation.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{automation.description}</p>

                  {/* Workflow visualization */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {automation.trigger}
                    </Badge>
                    {automation.actions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="secondary">{action}</Badge>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <span>Runs: {automation.runsCount}</span>
                    {automation.lastRun && <span>Last run: {automation.lastRun}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={automation.isActive}
                    onCheckedChange={() => toggleAutomation(automation.id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AutomationModule;
