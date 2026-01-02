import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FlaskConical, Plus, Play, Pause, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";

interface ABTestVariant {
  name: string;
  views?: number;
  conversions?: number;
  conversionRate?: number;
}

interface ABTest {
  id: string;
  name: string;
  hypothesis: string | null;
  status: string | null;
  metric_to_optimize: string;
  variants: Json;
  confidence_score: number | null;
  winner_variant: string | null;
  start_date: string | null;
  end_date: string | null;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  draft: { color: "bg-muted text-muted-foreground", icon: FlaskConical },
  running: { color: "bg-blue-500/20 text-blue-500", icon: Play },
  completed: { color: "bg-green-500/20 text-green-500", icon: CheckCircle2 },
  paused: { color: "bg-yellow-500/20 text-yellow-500", icon: Pause },
};

const ABTestManagerModule = () => {
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['marketing-ab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_ab_tests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as ABTest[];
    },
  });

  const parseVariants = (variants: Json): ABTestVariant[] => {
    if (Array.isArray(variants)) {
      return variants.map(v => ({
        name: (v as Record<string, unknown>).name as string || 'Unnamed',
        views: (v as Record<string, unknown>).views as number || 0,
        conversions: (v as Record<string, unknown>).conversions as number || 0,
        conversionRate: (v as Record<string, unknown>).conversionRate as number || 0,
      }));
    }
    return [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      {tests.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No A/B tests yet</h3>
            <p className="text-muted-foreground mb-4">Create your first experiment to optimize your marketing</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const status = test.status || 'draft';
            const config = statusConfig[status] || statusConfig.draft;
            const StatusIcon = config.icon;
            const variants = parseVariants(test.variants);
            
            return (
              <Card key={test.id} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        <CardDescription>{test.hypothesis || 'No hypothesis defined'}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={config.color}>
                      {status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Variants */}
                  <div className="space-y-3">
                    {variants.map((variant, index) => {
                      const isWinner = test.winner_variant === variant.name;
                      const maxRate = Math.max(...variants.map(v => v.conversionRate || 0));
                      const progressPercent = maxRate > 0 ? ((variant.conversionRate || 0) / maxRate) * 100 : 0;
                      
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
                              <span>{(variant.views || 0).toLocaleString()} views</span>
                              <span>{variant.conversions || 0} conversions</span>
                              <span className="font-medium text-foreground">{variant.conversionRate || 0}%</span>
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
                        <p className="text-sm font-medium">{test.confidence_score || 0}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Metric</p>
                        <p className="text-sm font-medium">{test.metric_to_optimize}</p>
                      </div>
                      {test.start_date && (
                        <div>
                          <p className="text-xs text-muted-foreground">Started</p>
                          <p className="text-sm font-medium">{test.start_date}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {status === "draft" && (
                        <Button size="sm" className="gap-1">
                          <Play className="h-3 w-3" />
                          Start
                        </Button>
                      )}
                      {status === "running" && (
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
                      {status === "completed" && (
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
      )}
    </div>
  );
};

export default ABTestManagerModule;
