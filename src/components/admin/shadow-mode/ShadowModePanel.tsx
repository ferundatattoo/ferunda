import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  BarChart3,
  Lightbulb,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShadowDecision {
  id: string;
  conversation_id: string;
  human_persona_used: string;
  router_persona_suggested: string;
  diff_summary: Record<string, unknown> | null;
  predicted_outcome_delta: number;
  confidence: number;
  was_router_better: boolean | null;
  created_at: string;
}

interface DeploymentGate {
  id: string;
  gate_name: string;
  gate_conditions: Record<string, unknown> | null;
  auto_pause_enabled: boolean;
  max_policy_violations: number;
  current_violations: number;
  status: string;
}

export function ShadowModePanel() {
  const [shadowDecisions, setShadowDecisions] = useState<ShadowDecision[]>([]);
  const [gates, setGates] = useState<DeploymentGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [decisionsRes, gatesRes] = await Promise.all([
        supabase
          .from('shadow_decisions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('deployment_gates')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (decisionsRes.data) {
        setShadowDecisions(decisionsRes.data.map(d => ({
          ...d,
          diff_summary: (d.diff_summary as unknown as Record<string, unknown>) || null
        })));
      }
      if (gatesRes.data) {
        setGates(gatesRes.data.map(g => ({
          ...g,
          gate_conditions: (g.gate_conditions as unknown as Record<string, unknown>) || null
        })));
      }
    } catch (error) {
      console.error('Error fetching shadow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const promoteToRollout = async (decisionId: string) => {
    toast.success('Promoted to limited rollout (10%)');
  };

  const getImprovementCases = () => 
    shadowDecisions.filter(d => d.predicted_outcome_delta > 0.1);
  
  const getDangerousCases = () => 
    shadowDecisions.filter(d => d.predicted_outcome_delta < -0.1);
  
  const getTopDivergences = () => 
    shadowDecisions.filter(d => d.human_persona_used !== d.router_persona_suggested);

  const stats = {
    totalDecisions: shadowDecisions.length,
    improvements: getImprovementCases().length,
    dangerous: getDangerousCases().length,
    divergences: getTopDivergences().length,
    avgConfidence: shadowDecisions.length > 0 
      ? (shadowDecisions.reduce((acc, d) => acc + (d.confidence || 0), 0) / shadowDecisions.length * 100).toFixed(1)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            Shadow Mode
          </h2>
          <p className="text-muted-foreground mt-1">
            AI decides in parallel, learns without risk
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={shadowEnabled} 
              onCheckedChange={setShadowEnabled}
            />
            <span className="text-sm text-muted-foreground">
              {shadowEnabled ? 'Active' : 'Paused'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Decisions</p>
                <p className="text-2xl font-bold">{stats.totalDecisions}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600">Router Would Improve</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.improvements}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600">Router Would Hurt</p>
                <p className="text-2xl font-bold text-red-600">{stats.dangerous}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600">Divergences</p>
                <p className="text-2xl font-bold text-amber-600">{stats.divergences}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-primary">Avg Confidence</p>
                <p className="text-2xl font-bold text-primary">{stats.avgConfidence}%</p>
              </div>
              <Sparkles className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Shadow Insights
          </TabsTrigger>
          <TabsTrigger value="divergences">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Top Divergences
          </TabsTrigger>
          <TabsTrigger value="gates">
            <Zap className="h-4 w-4 mr-2" />
            Deployment Gates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Improvements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Router Would Have Improved
                </CardTitle>
                <CardDescription>
                  Cases where AI routing would have performed better
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <AnimatePresence>
                    {getImprovementCases().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No improvement cases yet
                      </p>
                    ) : (
                      getImprovementCases().map((decision, idx) => (
                        <motion.div
                          key={decision.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-2"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                              +{(decision.predicted_outcome_delta * 100).toFixed(0)}% predicted
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(decision.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{decision.human_persona_used}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-medium text-emerald-600">{decision.router_persona_suggested}</span>
                          </div>
                          {decision.diff_summary?.key_divergence && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {String(decision.diff_summary.key_divergence)}
                            </p>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="mt-2 text-emerald-600"
                            onClick={() => promoteToRollout(decision.id)}
                          >
                            Promote to Rollout
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Dangerous Cases */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Router Would Have Hurt
                </CardTitle>
                <CardDescription>
                  Cases where AI routing would have performed worse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <AnimatePresence>
                    {getDangerousCases().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No dangerous cases detected
                      </p>
                    ) : (
                      getDangerousCases().map((decision, idx) => (
                        <motion.div
                          key={decision.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 mb-2"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="bg-red-500/10 text-red-600">
                              {(decision.predicted_outcome_delta * 100).toFixed(0)}% predicted
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(decision.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-foreground">{decision.human_persona_used}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-red-600 line-through">{decision.router_persona_suggested}</span>
                          </div>
                          {decision.diff_summary?.key_divergence && (
                            <p className="text-xs text-muted-foreground mt-2">
                              ⚠️ {String(decision.diff_summary.key_divergence)}
                            </p>
                          )}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="divergences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Human vs Router Divergences</CardTitle>
              <CardDescription>
                When human chose differently than AI would have
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {getTopDivergences().length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No divergences recorded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getTopDivergences().map((decision) => (
                      <div 
                        key={decision.id}
                        className="p-4 rounded-lg border bg-card/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{decision.human_persona_used}</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Badge className="bg-primary/20 text-primary">
                              {decision.router_persona_suggested}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(decision.confidence || 0) * 100} 
                              className="w-20 h-2"
                            />
                            <span className="text-xs text-muted-foreground">
                              {((decision.confidence || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        {decision.diff_summary && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {decision.diff_summary?.tone_difference && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Tone</p>
                                <p>{String(decision.diff_summary.tone_difference)}</p>
                              </div>
                            )}
                            {decision.diff_summary?.content_difference && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Content</p>
                                <p>{String(decision.diff_summary.content_difference)}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Gates</CardTitle>
              <CardDescription>
                Safety controls for AI auto-switching rollout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No deployment gates configured</p>
                  <Button>Create Gate</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {gates.map((gate) => (
                    <div 
                      key={gate.id}
                      className="p-4 rounded-lg border bg-card/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{gate.gate_name}</h4>
                          <Badge 
                            variant={gate.status === 'active' ? 'default' : 'secondary'}
                            className={gate.status === 'active' ? 'bg-emerald-500' : ''}
                          >
                            {gate.status}
                          </Badge>
                        </div>
                        <Switch 
                          checked={gate.auto_pause_enabled}
                          disabled
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Policy Violations</p>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(gate.current_violations / gate.max_policy_violations) * 100}
                              className="h-2"
                            />
                            <span className="text-sm">
                              {gate.current_violations}/{gate.max_policy_violations}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Auto-Pause</p>
                          <p className="text-sm">
                            {gate.auto_pause_enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ShadowModePanel;
