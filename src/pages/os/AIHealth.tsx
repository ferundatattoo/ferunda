import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Eye, 
  Target, 
  Brain,
  Shield
} from 'lucide-react';
import { ShadowModePanel } from '@/components/admin/shadow-mode';
import { DriftDetectionDashboard } from '@/components/admin/drift-detection';
import { ClientSegmentationStudio } from '@/components/admin/client-segmentation';
import { ExplainabilityPanel } from '@/components/admin/explainability';

export default function AIHealth() {
  const [activeTab, setActiveTab] = useState('drift');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Health Center</h1>
          <p className="text-muted-foreground mt-1">
            Monitor, train, and optimize your AI systems
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="drift" className="gap-2">
            <Activity className="h-4 w-4" />
            Drift Detection
          </TabsTrigger>
          <TabsTrigger value="shadow" className="gap-2">
            <Eye className="h-4 w-4" />
            Shadow Mode
          </TabsTrigger>
          <TabsTrigger value="segments" className="gap-2">
            <Target className="h-4 w-4" />
            Segmentation
          </TabsTrigger>
          <TabsTrigger value="explainability" className="gap-2">
            <Brain className="h-4 w-4" />
            Explainability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drift" className="mt-6">
          <DriftDetectionDashboard />
        </TabsContent>

        <TabsContent value="shadow" className="mt-6">
          <ShadowModePanel />
        </TabsContent>

        <TabsContent value="segments" className="mt-6">
          <ClientSegmentationStudio />
        </TabsContent>

        <TabsContent value="explainability" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <ExplainabilityPanel />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Safety Constraints Active
              </h3>
              <p className="text-sm text-muted-foreground">
                Hard safety constraints are enforced across all AI decisions.
                Configure them in Settings → Safety.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
