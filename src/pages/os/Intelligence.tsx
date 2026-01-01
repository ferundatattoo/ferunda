import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, MessageSquare, TrendingUp, Target, BarChart3
} from 'lucide-react';
import ConversionAnalytics from '@/components/admin/ConversionAnalytics';

const OSIntelligence = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversation Intelligence y Analytics
          </p>
        </div>
        <Badge className="bg-ai/10 text-ai border-ai/20">
          <Brain className="w-3 h-3 mr-1" />
          AI-Powered
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversaciones</p>
                <p className="text-2xl font-semibold">156</p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-semibold text-success">24%</p>
              </div>
              <Target className="w-8 h-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-semibold">2.4h</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Accuracy</p>
                <p className="text-2xl font-semibold text-ai">92%</p>
              </div>
              <Brain className="w-8 h-8 text-ai/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/30 border border-border/50">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Conversion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Intent Distribution</CardTitle>
                <CardDescription>Clasificación de intenciones de clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { intent: 'Booking Request', count: 45, color: 'bg-primary' },
                  { intent: 'Price Question', count: 32, color: 'bg-ai' },
                  { intent: 'Aftercare', count: 18, color: 'bg-success' },
                  { intent: 'Reschedule', count: 12, color: 'bg-warning' },
                  { intent: 'Complaint', count: 3, color: 'bg-destructive' },
                ].map((item) => (
                  <div key={item.intent} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm">{item.intent}</span>
                    </div>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Objections</CardTitle>
                <CardDescription>Objeciones más comunes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { objection: 'Precio muy alto', count: 23, resolution: 'Explain value' },
                  { objection: 'Necesito más tiempo', count: 18, resolution: 'Offer later dates' },
                  { objection: 'Miedo al dolor', count: 12, resolution: 'Reassure + tips' },
                  { objection: 'No estoy seguro del diseño', count: 8, resolution: 'Offer consult' },
                ].map((item) => (
                  <div key={item.objection} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium">{item.objection}</p>
                      <p className="text-xs text-muted-foreground">{item.resolution}</p>
                    </div>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Analysis</CardTitle>
              <CardDescription>Análisis detallado de conversaciones</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Conversation Intelligence coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="mt-6">
          <ConversionAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OSIntelligence;
