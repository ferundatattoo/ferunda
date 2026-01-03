import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  CheckCircle, AlertTriangle, XCircle, Activity, Database,
  MessageSquare, Image, Zap, Calendar, CreditCard, Users,
  Brain, Radio, Shield, RefreshCw, ArrowLeft, Sparkles,
  Folder, FileCode, Server, Globe, Code, Layers,
  ArrowRight, Bug, Clock, Wifi, WifiOff, Terminal, 
  Settings, LayoutDashboard, Inbox, BarChart3, Palette,
  DollarSign, TrendingUp, Target, Eye, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

type AuditStatus = 'working' | 'partial' | 'error' | 'pending' | 'deprecated';

interface AuditItem {
  name: string;
  status: AuditStatus;
  description: string;
  file?: string;
  notes?: string;
  language?: 'es' | 'en' | 'mixed';
}

interface AuditCategory {
  title: string;
  icon: React.ReactNode;
  items: AuditItem[];
}

interface LiveCheck {
  name: string;
  status: 'checking' | 'ok' | 'error' | 'warning';
  latency?: number;
  message?: string;
}

// ============================================================================
// LIVE AUDIT REPORT COMPONENT
// ============================================================================

const LiveAuditReport = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [healthScore, setHealthScore] = useState(0);
  const [liveChecks, setLiveChecks] = useState<LiveCheck[]>([]);
  const [dbStats, setDbStats] = useState<{ table: string; count: number | null; hasRLS: boolean }[]>([]);

  // ============================================================================
  // STATIC CODE AUDIT DATA (based on file review)
  // ============================================================================

  const auditCategories: AuditCategory[] = [
    {
      title: '🎯 Concierge & Chat (ETHEREAL)',
      icon: <MessageSquare className="w-5 h-5 text-primary" />,
      items: [
        { 
          name: 'FerundaAgent (Bubble Única)', 
          status: 'working', 
          description: 'Bubble global en App.tsx - sistema unificado ETHEREAL',
          file: 'src/components/ferunda-agent/FerundaAgent.tsx',
          notes: 'Luna obsoleto, todo enrutado a ETHEREAL via ai-router'
        },
        { 
          name: 'AI Router Gateway', 
          status: 'working', 
          description: 'Gateway unificado para chat/vision/booking',
          file: 'supabase/functions/ai-router/index.ts'
        },
        { 
          name: 'Grok API Integration', 
          status: 'working', 
          description: 'xAI Grok para respuestas + vision',
          file: 'supabase/functions/ferunda-agent/index.ts'
        },
        { 
          name: 'Voice Input/Output', 
          status: 'working', 
          description: 'Web Speech API + ElevenLabs fallback',
          file: 'src/components/ferunda-agent/FerundaAgent.tsx'
        },
        { 
          name: 'concierge_sessions Persistence', 
          status: 'working', 
          description: 'Sesiones persistidas con workspace_id',
          file: 'supabase/functions/ai-router/index.ts',
          notes: 'Fix reciente: NULL workspace_id → corregido'
        },
        { 
          name: 'Idioma Español', 
          status: 'working', 
          description: 'Español prioritario en system prompt',
          language: 'es'
        },
      ]
    },
    {
      title: '📤 Upload de Imágenes',
      icon: <Image className="w-5 h-5 text-purple-500" />,
      items: [
        { 
          name: 'Image Compression', 
          status: 'working', 
          description: 'Compresión client-side antes de subir',
          file: 'src/components/ferunda-agent/FerundaAgent.tsx'
        },
        { 
          name: 'Pre-Upload Pipeline', 
          status: 'working', 
          description: 'Signed URL via chat-upload-url edge function',
          file: 'supabase/functions/chat-upload-url/index.ts'
        },
        { 
          name: 'Supabase Storage', 
          status: 'working', 
          description: 'Bucket reference-images configurado',
          notes: 'Requiere políticas de storage activas'
        },
        { 
          name: 'Vision Analysis', 
          status: 'working', 
          description: 'Grok multimodal para análisis de tatuajes',
          file: 'supabase/functions/ferunda-agent/index.ts'
        },
        { 
          name: 'Document Upload (PDF/DOCX)', 
          status: 'partial', 
          description: 'Soporte agregado pero parse-document incompleto',
          file: 'supabase/functions/parse-document/index.ts',
          notes: 'Falta testing extensivo de flujo completo'
        },
      ]
    },
    {
      title: '📡 Realtime & Database',
      icon: <Database className="w-5 h-5 text-emerald-500" />,
      items: [
        { 
          name: 'useGlobalRealtime', 
          status: 'partial', 
          description: 'Subscripción global para múltiples tablas',
          file: 'src/hooks/useGlobalRealtime.ts',
          notes: '⚠️ Console muestra: "Realtime unavailable, using offline mode"'
        },
        { 
          name: 'EventBus', 
          status: 'working', 
          description: 'Sistema de eventos cross-module',
          file: 'src/lib/eventBus.ts'
        },
        { 
          name: 'concierge_sessions Realtime', 
          status: 'partial', 
          description: 'Tabla en lista pero conexión inestable',
          notes: 'Ver logs: CHANNEL_ERROR frecuente'
        },
        { 
          name: 'bookings Realtime', 
          status: 'partial', 
          description: 'Habilitado pero depende de conexión global',
        },
        { 
          name: 'Connection Fallback', 
          status: 'working', 
          description: 'Timeout 10s + offline mode graceful',
          file: 'src/hooks/useGlobalRealtime.ts'
        },
      ]
    },
    {
      title: '💰 Finance & Money',
      icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
      items: [
        { 
          name: 'useFinanceData Hook', 
          status: 'partial', 
          description: 'Query a bookings para métricas',
          file: 'src/hooks/useFinanceData.ts',
          notes: '⚠️ Depende de RLS - fix reciente aplicado'
        },
        { 
          name: 'OSMoney Page', 
          status: 'partial', 
          description: 'Dashboard de finanzas con tabs',
          file: 'src/pages/os/Money.tsx',
          notes: '⚠️ Reportado: spinner infinito en carga'
        },
        { 
          name: 'RLS Policy bookings', 
          status: 'working', 
          description: 'Política para workspace_members aplicada',
          notes: 'Fix reciente: "Workspace members can view bookings"'
        },
        { 
          name: 'Stripe Checkout', 
          status: 'working', 
          description: 'Edge function para pagos',
          file: 'supabase/functions/create-stripe-checkout/index.ts'
        },
        { 
          name: 'Revenue Intelligence', 
          status: 'working', 
          description: 'AI forecasting de ingresos',
          file: 'supabase/functions/revenue-intelligence/index.ts'
        },
      ]
    },
    {
      title: '🔐 Auth & RBAC',
      icon: <Shield className="w-5 h-5 text-cyan-500" />,
      items: [
        { 
          name: 'useAuth Hook', 
          status: 'working', 
          description: 'Gestión de sesión + admin check via RPC',
          file: 'src/hooks/useAuth.tsx',
          notes: '⚠️ Sin timeout explícito - potencial bloqueo'
        },
        { 
          name: 'useWorkspace Hook', 
          status: 'working', 
          description: 'Multi-workspace + role normalization',
          file: 'src/hooks/useWorkspace.ts'
        },
        { 
          name: 'useRBAC Hook', 
          status: 'working', 
          description: 'Control de acceso por rol',
          file: 'src/hooks/useRBAC.ts'
        },
        { 
          name: 'has_role RPC', 
          status: 'working', 
          description: 'SECURITY DEFINER function para roles',
          notes: 'Bypass RLS para verificación'
        },
        { 
          name: 'ProtectedRoute', 
          status: 'working', 
          description: 'Guard para rutas protegidas',
          file: 'src/pages/ferunda-os/ProtectedRoute.tsx'
        },
      ]
    },
    {
      title: '📊 OS Dashboard',
      icon: <LayoutDashboard className="w-5 h-5 text-blue-500" />,
      items: [
        { 
          name: 'OSLayout', 
          status: 'working', 
          description: 'Layout principal con sidebar + header',
          file: 'src/components/os/OSLayout.tsx'
        },
        { 
          name: 'CommandCenter', 
          status: 'working', 
          description: 'Dashboard principal /os',
          file: 'src/pages/os/CommandCenter.tsx'
        },
        { 
          name: 'OSInbox', 
          status: 'partial', 
          description: 'Inbox de mensajes',
          file: 'src/pages/os/Inbox.tsx',
          notes: 'Depende de realtime para actualizaciones'
        },
        { 
          name: 'OSClients', 
          status: 'working', 
          description: 'Gestión de clientes',
          file: 'src/pages/os/Clients.tsx'
        },
        { 
          name: 'OSCreative', 
          status: 'working', 
          description: 'Módulo creativo consolidado',
          file: 'src/pages/os/Creative.tsx'
        },
        { 
          name: 'OSGrowth', 
          status: 'working', 
          description: 'Marketing y crecimiento',
          file: 'src/pages/os/Growth.tsx'
        },
        { 
          name: 'OSAICenter', 
          status: 'working', 
          description: 'Centro de AI consolidado',
          file: 'src/pages/os/AICenter.tsx'
        },
      ]
    },
    {
      title: '🤖 AI & Edge Functions',
      icon: <Brain className="w-5 h-5 text-purple-500" />,
      items: [
        { 
          name: 'ai-router', 
          status: 'working', 
          description: 'Gateway principal para todos los AI requests',
          file: 'supabase/functions/ai-router/index.ts'
        },
        { 
          name: 'ferunda-agent', 
          status: 'working', 
          description: 'Backend del chat ETHEREAL',
          file: 'supabase/functions/ferunda-agent/index.ts'
        },
        { 
          name: 'ai-triage', 
          status: 'working', 
          description: 'Clasificación automática de inquiries',
          file: 'supabase/functions/ai-triage/index.ts'
        },
        { 
          name: 'sketch-gen-studio', 
          status: 'working', 
          description: 'Generación de sketches AI',
          file: 'supabase/functions/sketch-gen-studio/index.ts'
        },
        { 
          name: 'design-compiler', 
          status: 'working', 
          description: 'Refinamiento de diseños AI',
          file: 'supabase/functions/design-compiler/index.ts'
        },
        { 
          name: 'self-improving', 
          status: 'working', 
          description: 'Sistema de auto-aprendizaje',
          file: 'supabase/functions/self-improving/index.ts'
        },
      ]
    },
    {
      title: '🔧 Hooks & Services',
      icon: <Code className="w-5 h-5 text-amber-500" />,
      items: [
        { 
          name: 'useGrokChat', 
          status: 'working', 
          description: 'Hook para chat con Grok',
          file: 'src/hooks/useGrokChat.ts'
        },
        { 
          name: 'useGrokVision', 
          status: 'working', 
          description: 'Hook para análisis visual',
          file: 'src/hooks/useGrokVision.ts'
        },
        { 
          name: 'useGrokAR', 
          status: 'working', 
          description: 'Hook para AR preview',
          file: 'src/hooks/useGrokAR.ts'
        },
        { 
          name: 'useGrokMarketing', 
          status: 'working', 
          description: 'Hook para marketing AI',
          file: 'src/hooks/useGrokMarketing.ts'
        },
        { 
          name: 'useGrokFinance', 
          status: 'working', 
          description: 'Hook para finanzas AI',
          file: 'src/hooks/useGrokFinance.ts'
        },
        { 
          name: 'useConciergeData', 
          status: 'working', 
          description: 'Hook para datos del concierge',
          file: 'src/hooks/useConciergeData.ts'
        },
        { 
          name: 'useStudioData', 
          status: 'working', 
          description: 'Hook para datos del studio',
          file: 'src/hooks/useStudioData.ts'
        },
      ]
    },
    {
      title: '⚠️ Problemas Conocidos',
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      items: [
        { 
          name: 'Realtime Disconnection', 
          status: 'error', 
          description: 'Realtime frecuentemente muestra "unavailable"',
          notes: 'Console: CHANNEL_ERROR / offline mode'
        },
        { 
          name: 'OSMoney Loading Infinito', 
          status: 'error', 
          description: 'Spinner que no avanza en /os/money',
          notes: 'Posible: authLoading o rbacLoading atascado'
        },
        { 
          name: 'Idioma Mixto', 
          status: 'partial', 
          description: 'Algunos textos en inglés en UI española',
          language: 'mixed',
          notes: 'Principalmente en OS Dashboard y componentes admin'
        },
        { 
          name: 'Luna Obsoleto', 
          status: 'deprecated', 
          description: 'Sistema legacy de chat aún tiene código',
          notes: 'Marcar para eliminación - ETHEREAL es el único activo'
        },
        { 
          name: 'forwardRef Warning', 
          status: 'partial', 
          description: 'OSMoney sin forwardRef pero recibe ref',
          file: 'src/pages/os/Money.tsx',
          notes: 'Console warning en App render'
        },
      ]
    },
  ];

  // ============================================================================
  // KNOWN ISSUES DETAIL
  // ============================================================================

  const knownIssues = [
    {
      id: 'realtime-disconnect',
      severity: 'high',
      title: 'Realtime Disconnection Frecuente',
      description: 'La conexión realtime muestra "unavailable" en consola con CHANNEL_ERROR.',
      symptoms: ['[GlobalRealtime] ⚠️ Realtime unavailable, using offline mode', 'Datos no se actualizan en tiempo real'],
      affectedModules: ['Inbox', 'Money', 'Clients', 'All OS Modules'],
      possibleCauses: ['Configuración de realtime en Supabase', 'RLS bloqueando subscripciones', 'Network issues'],
    },
    {
      id: 'money-loading',
      severity: 'critical',
      title: 'OSMoney Spinner Infinito',
      description: 'La página /os/money se queda cargando indefinidamente.',
      symptoms: ['Rueda de carga que no avanza', 'Revenue = 0'],
      affectedModules: ['OSMoney', 'useFinanceData', 'useAuth'],
      possibleCauses: ['authLoading atascado', 'rbacLoading atascado', 'RLS blocking bookings query'],
    },
    {
      id: 'mixed-language',
      severity: 'low',
      title: 'Idioma Mixto (ES/EN)',
      description: 'Algunos componentes muestran texto en inglés cuando debería ser español.',
      symptoms: ['Labels en inglés', 'Buttons con texto inglés'],
      affectedModules: ['OS Dashboard', 'Admin Components'],
      possibleCauses: ['Hardcoded strings', 'Missing translations'],
    },
  ];

  // ============================================================================
  // LIVE CHECKS
  // ============================================================================

  const runLiveChecks = useCallback(async () => {
    setIsScanning(true);
    const checks: LiveCheck[] = [];

    // Check 1: Supabase connection
    const supabaseCheck: LiveCheck = { name: 'Supabase Connection', status: 'checking' };
    checks.push(supabaseCheck);
    setLiveChecks([...checks]);
    
    try {
      const start = performance.now();
      const { error } = await supabase.from('workspace_settings').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      supabaseCheck.latency = latency;
      
      if (error) {
        supabaseCheck.status = 'error';
        supabaseCheck.message = error.message;
      } else {
        supabaseCheck.status = 'ok';
        supabaseCheck.message = `${latency}ms`;
      }
    } catch (e: any) {
      supabaseCheck.status = 'error';
      supabaseCheck.message = e.message;
    }
    setLiveChecks([...checks]);

    // Check 2: Auth session
    const authCheck: LiveCheck = { name: 'Auth Session', status: 'checking' };
    checks.push(authCheck);
    setLiveChecks([...checks]);
    
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        authCheck.status = 'error';
        authCheck.message = error.message;
      } else if (data.session) {
        authCheck.status = 'ok';
        authCheck.message = `Logged in: ${data.session.user.email}`;
      } else {
        authCheck.status = 'warning';
        authCheck.message = 'No session (anonymous)';
      }
    } catch (e: any) {
      authCheck.status = 'error';
      authCheck.message = e.message;
    }
    setLiveChecks([...checks]);

    // Check 3: Database tables access
    const tablesCheck: LiveCheck = { name: 'Database Access', status: 'checking' };
    checks.push(tablesCheck);
    setLiveChecks([...checks]);
    
    try {
      const stats: { table: string; count: number | null; hasRLS: boolean }[] = [];
      
      // Check bookings
      try {
        const { count, error } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
        stats.push({ table: 'bookings', count: error ? null : count, hasRLS: !error });
      } catch {
        stats.push({ table: 'bookings', count: null, hasRLS: false });
      }
      
      // Check concierge_sessions
      try {
        const { count, error } = await supabase.from('concierge_sessions').select('*', { count: 'exact', head: true });
        stats.push({ table: 'concierge_sessions', count: error ? null : count, hasRLS: !error });
      } catch {
        stats.push({ table: 'concierge_sessions', count: null, hasRLS: false });
      }
      
      // Check client_profiles
      try {
        const { count, error } = await supabase.from('client_profiles').select('*', { count: 'exact', head: true });
        stats.push({ table: 'client_profiles', count: error ? null : count, hasRLS: !error });
      } catch {
        stats.push({ table: 'client_profiles', count: null, hasRLS: false });
      }
      
      // Check studio_artists
      try {
        const { count, error } = await supabase.from('studio_artists').select('*', { count: 'exact', head: true });
        stats.push({ table: 'studio_artists', count: error ? null : count, hasRLS: !error });
      } catch {
        stats.push({ table: 'studio_artists', count: null, hasRLS: false });
      }
      
      setDbStats(stats);
      const accessible = stats.filter(s => s.count !== null).length;
      tablesCheck.status = accessible === 4 ? 'ok' : accessible > 0 ? 'warning' : 'error';
      tablesCheck.message = `${accessible}/4 tables accessible`;
    } catch (e: any) {
      tablesCheck.status = 'error';
      tablesCheck.message = e.message;
    }
    setLiveChecks([...checks]);

    // Check 4: Edge function health
    const edgeCheck: LiveCheck = { name: 'Edge Functions', status: 'checking' };
    checks.push(edgeCheck);
    setLiveChecks([...checks]);
    
    try {
      const start = performance.now();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'health' }),
      });
      const latency = Math.round(performance.now() - start);
      edgeCheck.latency = latency;
      
      if (response.ok) {
        edgeCheck.status = 'ok';
        edgeCheck.message = `ai-router: ${latency}ms`;
      } else {
        edgeCheck.status = 'warning';
        edgeCheck.message = `Status: ${response.status}`;
      }
    } catch (e: any) {
      edgeCheck.status = 'error';
      edgeCheck.message = 'ai-router unreachable';
    }
    setLiveChecks([...checks]);

    // Calculate health score
    let working = 0;
    let total = 0;
    auditCategories.forEach(cat => {
      cat.items.forEach(item => {
        total++;
        if (item.status === 'working') working++;
        else if (item.status === 'partial') working += 0.5;
      });
    });
    setHealthScore(Math.round((working / total) * 100));
    setLastScan(new Date());
    setIsScanning(false);
    toast.success('Auditoría en vivo completada');
  }, []);

  useEffect(() => {
    runLiveChecks();
  }, [runLiveChecks]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getStatusIcon = (status: AuditStatus) => {
    switch (status) {
      case 'working': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'deprecated': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'pending': return <Activity className="w-4 h-4 text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusBadge = (status: AuditStatus) => {
    const variants: Record<AuditStatus, string> = {
      working: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      deprecated: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      pending: 'bg-muted text-muted-foreground border-muted',
    };
    const labels: Record<AuditStatus, string> = {
      working: '✓ Vivo',
      partial: '⚡ Parcial',
      error: '✗ Error',
      deprecated: '⊘ Obsoleto',
      pending: '⏳ Pendiente',
    };
    return (
      <Badge variant="outline" className={`text-xs ${variants[status]}`}>
        {labels[status]}
      </Badge>
    );
  };

  const getLiveCheckIcon = (status: LiveCheck['status']) => {
    switch (status) {
      case 'checking': return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'ok': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };


  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-red-500/10 via-amber-500/10 to-emerald-500/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <Link to="/os">
              <Button variant="outline" size="sm">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                OS Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-amber-500 to-emerald-500 flex items-center justify-center animate-pulse">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">🔴 AUDITORÍA EN VIVO</h1>
                <p className="text-muted-foreground">Sistema Ferunda - Estado Real del Código</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-3xl font-bold ${healthScore >= 80 ? 'text-emerald-400' : healthScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {healthScore}%
                </div>
                <div className="text-xs text-muted-foreground">Health Score</div>
              </div>
              <Button onClick={runLiveChecks} disabled={isScanning}>
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

      {/* Live Checks Section */}
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6 border-2 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
              Checks en Vivo
            </CardTitle>
            <CardDescription>Verificación en tiempo real de servicios críticos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {liveChecks.map((check, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                  {getLiveCheckIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{check.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {check.message || 'Checking...'}
                    </div>
                  </div>
                  {check.latency && (
                    <Badge variant="outline" className="text-xs">
                      {check.latency}ms
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Database Stats */}
        {dbStats.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                Acceso a Tablas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {dbStats.map((stat) => (
                  <div key={stat.table} className="p-3 rounded-lg border border-border bg-card/50">
                    <div className="flex items-center gap-2 mb-1">
                      {stat.count !== null ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-mono text-sm">{stat.table}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stat.count !== null ? `${stat.count} registros` : 'Sin acceso (RLS)'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Known Issues Section */}
        <Card className="mb-8 border-2 border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <Bug className="w-5 h-5" />
              ⚠️ Problemas Conocidos Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {knownIssues.map((issue) => (
                <AccordionItem key={issue.id} value={issue.id} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        issue.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        issue.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }>
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-left">{issue.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                      
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Síntomas:</span>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {issue.symptoms.map((s, i) => (
                            <li key={i} className="text-muted-foreground">{s}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Módulos afectados:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {issue.affectedModules.map((m, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Posibles causas:</span>
                        <ul className="list-disc list-inside text-sm mt-1">
                          {issue.possibleCauses.map((c, i) => (
                            <li key={i} className="text-muted-foreground">{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Audit Categories */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="flex-wrap h-auto p-1">
            <TabsTrigger value="all">📋 Todos</TabsTrigger>
            <TabsTrigger value="issues">⚠️ Con Issues</TabsTrigger>
            <TabsTrigger value="working">✓ Funcionando</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-6 md:grid-cols-2">
              {auditCategories.map((category, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {category.icon}
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <Badge variant="outline" className="ml-auto">
                        {category.items.filter(i => i.status === 'working').length}/{category.items.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px] pr-4">
                      <div className="space-y-3">
                        {category.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            {getStatusIcon(item.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{item.name}</span>
                                {getStatusBadge(item.status)}
                                {item.language && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {item.language === 'es' ? '🇪🇸' : item.language === 'en' ? '🇺🇸' : '🌐'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                              {item.file && (
                                <code className="text-[10px] text-primary/60 bg-primary/5 px-1 rounded mt-1 inline-block">
                                  {item.file}
                                </code>
                              )}
                              {item.notes && (
                                <p className="text-[10px] text-amber-400/80 mt-1 italic">
                                  📝 {item.notes}
                                </p>
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

          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Items con Issues (Parcial / Error / Deprecated)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {auditCategories.flatMap(cat => 
                      cat.items
                        .filter(i => ['partial', 'error', 'deprecated'].includes(i.status))
                        .map((item, idx) => (
                          <div key={`${cat.title}-${idx}`} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                            {getStatusIcon(item.status)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{item.name}</span>
                                {getStatusBadge(item.status)}
                                <Badge variant="outline" className="text-xs bg-muted">
                                  {cat.title}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              {item.file && (
                                <code className="text-xs text-primary/60 bg-primary/5 px-1 rounded mt-1 inline-block">
                                  {item.file}
                                </code>
                              )}
                              {item.notes && (
                                <p className="text-xs text-amber-400/80 mt-1 italic">
                                  📝 {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="working">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Items Funcionando Correctamente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {auditCategories.flatMap(cat => 
                      cat.items
                        .filter(i => i.status === 'working')
                        .map((item, idx) => (
                          <div key={`${cat.title}-${idx}`} className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-sm truncate">{item.name}</span>
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edge Functions List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              Edge Functions Disponibles
            </CardTitle>
            <CardDescription>Funciones desplegadas en el backend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {[
                'ai-router', 'ferunda-agent', 'ai-triage', 'chat-session', 'chat-upload-url',
                'sketch-gen-studio', 'design-compiler', 'create-stripe-checkout', 'create-stripe-payment',
                'booking-workflow', 'google-calendar-sync', 'revenue-intelligence', 'self-improving',
                'analyze-reference', 'analyze-healing-photo', 'viability-3d-simulator', 'ar-tattoo-engine',
                'send-campaign', 'scan-social-trends', 'magic-link', 'send-verification-otp'
              ].map((fn) => (
                <Badge key={fn} variant="outline" className="justify-center py-1.5 font-mono text-xs">
                  {fn}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Footer */}
        <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-primary/10 border border-primary/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Resumen de Auditoría</h3>
              <p className="text-sm text-muted-foreground">
                {auditCategories.reduce((acc, cat) => acc + cat.items.filter(i => i.status === 'working').length, 0)} funcionando • 
                {auditCategories.reduce((acc, cat) => acc + cat.items.filter(i => i.status === 'partial').length, 0)} parcial • 
                {auditCategories.reduce((acc, cat) => acc + cat.items.filter(i => i.status === 'error').length, 0)} errores
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/audit-report">
                <Button variant="outline" size="sm">
                  Ver Audit Report Original
                </Button>
              </Link>
              <Link to="/os/diagnostics">
                <Button variant="default" size="sm">
                  <Terminal className="w-4 h-4 mr-2" />
                  OS Diagnostics
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAuditReport;
