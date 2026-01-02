import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FlaskConical, Plus, Play, Pause, CheckCircle2, XCircle } from "lucide-react";

interface ABTest {
  id: string;
  name: string;
  hypothesis: string;
  status: "draft" | "running" | "completed" | "paused";
  metric: string;
  variants: {
    name: string;
    views: number;
    conversions: number;
    conversionRate: number;
  }[];
  confidence: number;
  winner?: string;
  startDate: string;
  endDate?: string;
}

const mockTests: ABTest[] = [
  {
    id: "1",
    name: "CTA Button Color",
    hypothesis: "Red CTA buttons will increase click-through rate",
    status: "running",
    metric: "Click-through Rate",
    variants: [
      { name: "Control (Blue)", views: 1234, conversions: 89, conversionRate: 7.2 },
      { name: "Variant A (Red)", views: 1198, conversions: 112, conversionRate: 9.3 },
    ],
    confidence: 87,
    startDate: "2024-01-15",
  },
  {
    id: "2",
    name: "Post Time Optimization",
    hypothesis: "Evening posts (6-8 PM) get more engagement",
    status: "completed",
    metric: "Engagement Rate",
    variants: [
      { name: "Morning (9 AM)", views: 2500, conversions: 125, conversionRate: 5.0 },
      { name: "Evening (7 PM)", views: 2480, conversions: 198, conversionRate: 8.0 },
    ],
    confidence: 95,
    winner: "Evening (7 PM)",
    startDate: "2024-01-01",
    endDate: "2024-01-14",
  },
  {
    id: "3",
    name: "Hashtag Strategy",
    hypothesis: "Niche hashtags outperform popular ones",
    status: "draft",
    metric: "Reach",
    variants: [
      { name: "Popular Tags", views: 0, conversions: 0, conversionRate: 0 },
      { name: "Niche Tags", views: 0, conversions: 0, conversionRate: 0 },
    ],
    confidence: 0,
    startDate: "2024-01-20",
  },
];

const statusConfig = {
  draft: { color: "bg-muted text-muted-foreground", icon: FlaskConical },
  running: { color: "bg-blue-500/20 text-blue-500", icon: Play },
  completed: { color: "bg-green-500/20 text-green-500", icon: CheckCircle2 },
  paused: { color: "bg-yellow-500/20 text-yellow-500", icon: Pause },
};

const ABTestManagerModule = () => {
  const [tests] = useState<ABTest[]>(mockTests);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">A/B Tests</h1>
          <p className="text-muted-foreground">Run experiments to optimize your marketing</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Test
        </Button>
      </div>

      {/* Tests List */}
      <div className="space-y-4">
        {tests.map((test) => {
          const StatusIcon = statusConfig[test.status].icon;
          
          return (
            <Card key={test.id} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusConfig[test.status].color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                      <CardDescription>{test.hypothesis}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusConfig[test.status].color}>
                    {test.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Variants */}
                <div className="space-y-3">
                  {test.variants.map((variant, index) => {
                    const isWinner = test.winner === variant.name;
                    const maxRate = Math.max(...test.variants.map(v => v.conversionRate));
                    const progressPercent = maxRate > 0 ? (variant.conversionRate / maxRate) * 100 : 0;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{variant.name}</span>
                            {isWinner && (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                Winner
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{variant.views.toLocaleString()} views</span>
                            <span>{variant.conversions} conversions</span>
                            <span className="font-medium text-foreground">{variant.conversionRate}%</span>
                          </div>
                        </div>
                        <Progress 
                          value={progressPercent} 
                          className={`h-2 ${isWinner ? "[&>div]:bg-green-500" : ""}`} 
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Confidence & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-sm font-medium">{test.confidence}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Metric</p>
                      <p className="text-sm font-medium">{test.metric}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Started</p>
                      <p className="text-sm font-medium">{test.startDate}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {test.status === "draft" && (
                      <Button size="sm" className="gap-1">
                        <Play className="h-3 w-3" />
                        Start
                      </Button>
                    )}
                    {test.status === "running" && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Pause className="h-3 w-3" />
                          Pause
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          End
                        </Button>
                      </>
                    )}
                    {test.status === "completed" && (
                      <Button variant="outline" size="sm">
                        View Report
                      </Button>
                    )}
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

export default ABTestManagerModule;
