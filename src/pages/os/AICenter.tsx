import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Activity, 
  Eye, 
  Target, 
  Workflow,
  BarChart3,
  Sparkles,
  Shield,
  Cpu
} from 'lucide-react';
import { FeatureGate } from '@/components/ui/FeatureGate';

// Import consolidated components
import { ShadowModePanel } from '@/components/admin/shadow-mode';
import { DriftDetectionDashboard } from '@/components/admin/drift-detection';
import { ClientSegmentationStudio } from '@/components/admin/client-segmentation';
import { ExplainabilityPanel } from '@/components/admin/explainability';
import { WorkflowBuilderHub } from '@/components/admin/workflow-engine';
import WorkflowMonitoringDashboard from '@/components/admin/workflow-engine/WorkflowMonitoringDashboard';
import ConversionAnalytics from '@/components/admin/ConversionAnalytics';

export default function AICenter() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-ai/20 to-primary/10 border border-ai/20">
            <Brain className="w-6 h-6 text-ai" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">AI Center</h1>
            <p className="text-sm text-muted-foreground">
              Centro unificado de inteligencia artificial
            </p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-ai/20 to-primary/20 text-ai border-ai/20">
          <Sparkles className="w-3 h-3 mr-1" />
          AI-Powered
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-ai/10">
                <Cpu className="w-5 h-5 text-ai" />
              </div>
              <div>
                <p className="text-2xl font-bold">94%</p>
                <p className="text-xs text-muted-foreground">AI Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">0.02%</p>
                <p className="text-xs text-muted-foreground">Drift Detected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Workflow className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Active Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Target className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-xs text-muted-foreground">Segments Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Workflow className="h-4 w-4" />
            Automations
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Activity className="h-4 w-4" />
            AI Health
          </TabsTrigger>
          <TabsTrigger value="segments" className="gap-2">
            <Target className="h-4 w-4" />
            Segments
          </TabsTrigger>
          <TabsTrigger value="shadow" className="gap-2">
            <Eye className="h-4 w-4" />
            Shadow Mode
          </TabsTrigger>
          <TabsTrigger value="explainability" className="gap-2">
            <Brain className="h-4 w-4" />
            Explainability
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Conversion Analytics</CardTitle>
                <CardDescription>AI-powered conversion insights</CardDescription>
              </CardHeader>
              <CardContent>
                <ConversionAnalytics />
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">AI Performance</CardTitle>
                <CardDescription>Model metrics and health status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">Response Accuracy</span>
                    <Badge variant="outline" className="bg-success/10 text-success">94%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">Intent Classification</span>
                    <Badge variant="outline" className="bg-success/10 text-success">97%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">Sentiment Analysis</span>
                    <Badge variant="outline" className="bg-success/10 text-success">89%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm">Booking Predictions</span>
                    <Badge variant="outline" className="bg-warning/10 text-warning">82%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="mt-6">
          <FeatureGate module="ai-center">
            <Tabs defaultValue="builder">
              <TabsList className="bg-muted/30">
                <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              </TabsList>
              <TabsContent value="builder" className="mt-4">
                <WorkflowBuilderHub />
              </TabsContent>
              <TabsContent value="monitoring" className="mt-4">
                <WorkflowMonitoringDashboard />
              </TabsContent>
            </Tabs>
          </FeatureGate>
        </TabsContent>

        {/* AI Health Tab */}
        <TabsContent value="health" className="mt-6">
          <FeatureGate module="ai-center">
            <DriftDetectionDashboard />
          </FeatureGate>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="mt-6">
          <FeatureGate module="ai-center">
            <ClientSegmentationStudio />
          </FeatureGate>
        </TabsContent>

        {/* Shadow Mode Tab */}
        <TabsContent value="shadow" className="mt-6">
          <FeatureGate module="ai-center">
            <ShadowModePanel />
          </FeatureGate>
        </TabsContent>

        {/* Explainability Tab */}
        <TabsContent value="explainability" className="mt-6">
          <FeatureGate module="ai-center">
            <div className="grid md:grid-cols-2 gap-6">
              <ExplainabilityPanel />
              <Card className="bg-card/50 backdrop-blur-xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Safety Constraints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Hard safety constraints are enforced across all AI decisions.
                    Configure them in Settings → Safety.
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-success/10">
                      <span className="text-sm">No double-booking</span>
                      <Badge variant="outline" className="text-success">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-success/10">
                      <span className="text-sm">Price floor enforcement</span>
                      <Badge variant="outline" className="text-success">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-success/10">
                      <span className="text-sm">Artist availability check</span>
                      <Badge variant="outline" className="text-success">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </FeatureGate>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
