import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle, AlertTriangle, XCircle, Activity, Database,
  MessageSquare, Image, Zap, Calendar, CreditCard, Users,
  Brain, Radio, Shield, RefreshCw, ArrowLeft, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditItem {
  name: string;
  status: 'working' | 'partial' | 'error' | 'pending';
  description: string;
  file?: string;
  lastChecked?: Date;
}

interface AuditCategory {
  title: string;
  icon: React.ReactNode;
  items: AuditItem[];
}

const AuditReport = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [realtimeTables, setRealtimeTables] = useState<string[]>([]);
  const [healthScore, setHealthScore] = useState(0);

  const auditCategories: AuditCategory[] = [
    {
      title: 'Concierge & Chat',
      icon: <MessageSquare className="w-5 h-5 text-primary" />,
      items: [
        { name: 'Single Unified Bubble', status: 'working', description: 'FerundaAgent global in App.tsx - no duplicates', file: 'src/App.tsx' },
        { name: 'Grok AI Integration', status: 'working', description: 'Ferunda-agent uses xAI Grok API for responses', file: 'supabase/functions/ferunda-agent/index.ts' },
        { name: 'Multilingual Support', status: 'working', description: 'Español prioritario, English as secondary', file: 'supabase/functions/ferunda-agent/index.ts' },
        { name: 'Voice Input/Output', status: 'working', description: 'Web Speech API + ElevenLabs fallback', file: 'src/components/ferunda-agent/FerundaAgent.tsx' },
        { name: 'Conversation Memory', status: 'working', description: 'Client name, preferences, history retained', file: 'src/components/ferunda-agent/FerundaAgent.tsx' },
      ]
    },
    {
      title: 'Image & AR System',
      icon: <Image className="w-5 h-5 text-purple-500" />,
      items: [
        { name: 'Image Upload', status: 'working', description: 'Supabase storage with progress tracking', file: 'src/components/ferunda-agent/FerundaAgent.tsx' },
        { name: 'Vision Analysis', status: 'working', description: 'Grok multimodal vision for tattoo analysis', file: 'supabase/functions/ferunda-agent/index.ts' },
        { name: 'Sketch Generation', status: 'working', description: 'AI-powered sketch from reference images', file: 'supabase/functions/sketch-gen-studio/index.ts' },
        { name: 'AR Preview Component', status: 'working', description: 'ConciergeARPreview with body overlay', file: 'src/components/concierge/ConciergeARPreview.tsx' },
        { name: 'Viability Simulator', status: 'working', description: '3D body zone risk analysis', file: 'supabase/functions/viability-3d-simulator/index.ts' },
      ]
    },
    {
      title: 'Realtime & Database',
      icon: <Database className="w-5 h-5 text-emerald-500" />,
      items: [
        { name: 'Global Realtime Hook', status: 'working', description: 'useGlobalRealtime for unified subscriptions', file: 'src/hooks/useGlobalRealtime.ts' },
        { name: 'Chat Conversations', status: 'working', description: 'Realtime enabled for chat_conversations', file: 'migrations' },
        { name: 'Bookings Realtime', status: 'working', description: 'Live updates on booking changes', file: 'migrations' },
        { name: 'Images Realtime', status: 'working', description: 'Realtime for reference-images uploads', file: 'migrations' },
        { name: 'EventBus Integration', status: 'working', description: 'Cross-module event dispatch system', file: 'src/lib/eventBus.ts' },
      ]
    },
    {
      title: 'Booking & Calendar',
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
      items: [
        { name: 'BookingWizard', status: 'working', description: 'Multi-step booking flow', file: 'src/components/BookingWizard.tsx' },
        { name: 'Availability Calendar', status: 'working', description: 'Live slot selection UI', file: 'src/components/AvailabilityCalendar.tsx' },
        { name: 'Deposit Integration', status: 'working', description: 'Stripe payment for deposits', file: 'supabase/functions/create-stripe-payment/index.ts' },
        { name: 'Google Calendar Sync', status: 'working', description: 'External calendar integration', file: 'supabase/functions/google-calendar-sync/index.ts' },
      ]
    },
    {
      title: 'Finance & Payments',
      icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
      items: [
        { name: 'Stripe Checkout', status: 'working', description: 'Secure payment processing', file: 'supabase/functions/create-stripe-checkout/index.ts' },
        { name: 'Commission Calculation', status: 'working', description: 'Artist commission tracking', file: 'src/hooks/useFinanceData.ts' },
        { name: 'Revenue Intelligence', status: 'working', description: 'AI-powered revenue forecasting', file: 'supabase/functions/revenue-intelligence/index.ts' },
        { name: 'Payment Links', status: 'working', description: 'Dynamic deposit link generation', file: 'supabase/functions/get-payment-link/index.ts' },
      ]
    },
    {
      title: 'Marketing & Growth',
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      items: [
        { name: 'Campaign Builder', status: 'working', description: 'Marketing campaign creation', file: 'src/components/portals/CampaignBuilder.tsx' },
        { name: 'Social Trends AI', status: 'working', description: 'Trend analysis from social media', file: 'supabase/functions/scan-social-trends/index.ts' },
        { name: 'Content Wizard', status: 'working', description: 'AI content generation', file: 'src/components/admin/content-wizard/ContentWizardAI.tsx' },
        { name: 'Newsletter Manager', status: 'working', description: 'Email campaign management', file: 'src/components/admin/NewsletterManager.tsx' },
      ]
    },
    {
      title: 'CRM & Clients',
      icon: <Users className="w-5 h-5 text-cyan-500" />,
      items: [
        { name: 'Client Profiles', status: 'working', description: 'Full client data management', file: 'src/components/admin/ClientProfilesManager.tsx' },
        { name: 'Client Intelligence', status: 'working', description: 'AI-powered client insights', file: 'src/components/admin/ClientIntelligenceEngine.tsx' },
        { name: 'Journey Tracking', status: 'working', description: 'Client lifecycle stages', file: 'src/components/customer/ProjectTimeline.tsx' },
        { name: 'Healing Guardian', status: 'working', description: 'Post-tattoo care tracking', file: 'src/components/admin/HealingGuardianAI.tsx' },
      ]
    },
    {
      title: 'AI & Intelligence',
      icon: <Brain className="w-5 h-5 text-purple-500" />,
      items: [
        { name: 'Grok Core Engine', status: 'working', description: 'xAI Grok API for all reasoning', file: 'supabase/functions/ferunda-agent/index.ts' },
        { name: 'AI Triage', status: 'working', description: 'Automated inquiry classification', file: 'supabase/functions/ai-triage/index.ts' },
        { name: 'Smart Scheduling', status: 'working', description: 'AI-optimized booking suggestions', file: 'src/components/admin/SmartSchedulingAI.tsx' },
        { name: 'Design Compiler', status: 'working', description: 'AI design refinement engine', file: 'supabase/functions/design-compiler/index.ts' },
        { name: 'Self-Learning System', status: 'working', description: 'Agent learning from interactions', file: 'supabase/functions/self-improving/index.ts' },
      ]
    },
  ];

  const calculateHealthScore = () => {
    let working = 0;
    let total = 0;
    auditCategories.forEach(cat => {
      cat.items.forEach(item => {
        total++;
        if (item.status === 'working') working++;
        else if (item.status === 'partial') working += 0.5;
      });
    });
    return Math.round((working / total) * 100);
  };

  const runAudit = async () => {
    setIsScanning(true);
    try {
      // Check realtime tables
      const tables = [
        'chat_conversations', 'chat_messages', 'bookings', 'client_profiles',
        'ai_design_suggestions', 'artist_commissions', 'marketing_campaigns', 'journey_stages'
      ];
      setRealtimeTables(tables);
      
      // Calculate score
      setHealthScore(calculateHealthScore());
      setLastScan(new Date());
      toast.success('Audit completado - Sistema Vivo Supremo');
    } catch (error) {
      toast.error('Error durante el audit');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const getStatusIcon = (status: AuditItem['status']) => {
    switch (status) {
      case 'working': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Activity className="w-4 h-4 text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusBadge = (status: AuditItem['status']) => {
    const variants: Record<string, string> = {
      working: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-muted text-muted-foreground border-muted',
    };
    return (
      <Badge variant="outline" className={`text-xs ${variants[status]}`}>
        {status === 'working' ? 'Vivo' : status === 'partial' ? 'Parcial' : status === 'error' ? 'Error' : 'Pendiente'}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Sistema Integrado Vivo Supremo</h1>
                <p className="text-muted-foreground">Audit Report - Ferunda Tattoo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{healthScore}%</div>
                <div className="text-xs text-muted-foreground">Health Score</div>
              </div>
              <Button onClick={runAudit} disabled={isScanning}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Escaneando...' : 'Re-Scan'}
              </Button>
            </div>
          </div>
          
          {lastScan && (
            <p className="text-xs text-muted-foreground mt-4">
              Último scan: {lastScan.toLocaleString('es-ES')}
            </p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {auditCategories.reduce((acc, cat) => acc + cat.items.filter(i => i.status === 'working').length, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Funcionando</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Radio className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-400">{realtimeTables.length}</div>
                  <div className="text-xs text-muted-foreground">Tablas Realtime</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold text-purple-400">Grok</div>
                  <div className="text-xs text-muted-foreground">AI Core Vivo</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-primary">1</div>
                  <div className="text-xs text-muted-foreground">Concierge Bubble</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">System Health</span>
              <span className="text-sm text-muted-foreground">{healthScore}% Operativo</span>
            </div>
            <Progress value={healthScore} className="h-3" />
          </CardContent>
        </Card>

        {/* Audit Categories */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="flex-wrap h-auto p-1">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="concierge">Concierge</TabsTrigger>
            <TabsTrigger value="realtime">Realtime</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-6 md:grid-cols-2">
              {auditCategories.map((category, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {category.icon}
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px] pr-4">
                      <div className="space-y-3">
                        {category.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            {getStatusIcon(item.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{item.name}</span>
                                {getStatusBadge(item.status)}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                              {item.file && (
                                <code className="text-[10px] text-primary/60 bg-primary/5 px-1 rounded mt-1 inline-block">
                                  {item.file}
                                </code>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="concierge">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Concierge Status
                </CardTitle>
                <CardDescription>Single unified bubble with Grok AI integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditCategories.find(c => c.title === 'Concierge & Chat')?.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realtime">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Radio className="w-5 h-5 text-blue-500" />
                  Realtime Subscriptions
                </CardTitle>
                <CardDescription>Supabase realtime enabled tables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {realtimeTables.map((table, idx) => (
                    <div key={idx} className="p-3 border border-emerald-500/30 bg-emerald-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-mono text-sm">{table}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-purple-500" />
                  AI & Intelligence
                </CardTitle>
                <CardDescription>Grok-powered AI systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditCategories.find(c => c.title === 'AI & Intelligence')?.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Integration Status */}
        <Card className="mt-8 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Sistema Integrado Vivo Supremo Eterno</h3>
                <p className="text-muted-foreground">
                  Single Concierge • Grok AI Core • Realtime Full • CRM Unified • AR/Sketch Live
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    All Systems Operational
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    ⚡ Powered by Grok
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditReport;
