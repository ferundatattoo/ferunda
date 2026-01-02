import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Plus, Play, Pause, Settings, Activity, MessageSquare, Zap } from "lucide-react";

interface AIAgent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "active" | "paused" | "learning";
  tasksCompleted: number;
  accuracy: number;
  lastActive: string;
  capabilities: string[];
}

const mockAgents: AIAgent[] = [
  {
    id: "1",
    name: "Content Writer",
    type: "Creative",
    description: "Generates captions, hashtags, and post content",
    status: "active",
    tasksCompleted: 1234,
    accuracy: 94,
    lastActive: "Just now",
    capabilities: ["Captions", "Hashtags", "Stories", "Threads"],
  },
  {
    id: "2",
    name: "Engagement Responder",
    type: "Communication",
    description: "Responds to comments and DMs automatically",
    status: "active",
    tasksCompleted: 3567,
    accuracy: 89,
    lastActive: "5 min ago",
    capabilities: ["Comments", "DMs", "Replies", "Reactions"],
  },
  {
    id: "3",
    name: "Trend Analyzer",
    type: "Analytics",
    description: "Monitors trends and suggests content opportunities",
    status: "learning",
    tasksCompleted: 456,
    accuracy: 78,
    lastActive: "1 hour ago",
    capabilities: ["Trends", "Hashtags", "Topics", "Timing"],
  },
  {
    id: "4",
    name: "Scheduler Bot",
    type: "Operations",
    description: "Optimizes posting times based on engagement data",
    status: "paused",
    tasksCompleted: 890,
    accuracy: 92,
    lastActive: "2 days ago",
    capabilities: ["Scheduling", "Queue", "Timing", "Batching"],
  },
];

const statusConfig = {
  active: { color: "bg-green-500/20 text-green-500", icon: Play },
  paused: { color: "bg-yellow-500/20 text-yellow-500", icon: Pause },
  learning: { color: "bg-blue-500/20 text-blue-500", icon: Activity },
};

const AIAgentsModule = () => {
  const [agents] = useState<AIAgent[]>(mockAgents);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Agents</h1>
          <p className="text-muted-foreground">Manage your AI-powered marketing assistants</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Deploy Agent
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-sm text-muted-foreground">Total Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.filter(a => a.status === "active").length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {agents.reduce((sum, a) => sum + a.tasksCompleted, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(agents.reduce((sum, a) => sum + a.accuracy, 0) / agents.length)}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => {
          const StatusIcon = statusConfig[agent.status].icon;
          
          return (
            <Card key={agent.id} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription>{agent.type}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusConfig[agent.status].color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{agent.description}</p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tasks Completed</p>
                    <p className="text-lg font-semibold">{agent.tasksCompleted.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                    <div className="flex items-center gap-2">
                      <Progress value={agent.accuracy} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{agent.accuracy}%</span>
                    </div>
                  </div>
                </div>

                {/* Last Active & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Last active: {agent.lastActive}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AIAgentsModule;
