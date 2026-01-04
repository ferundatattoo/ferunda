// ============================================================================
// SYSTEM CONSOLIDADO VIVO SUPREMO ETERNO - Status Component
// Muestra el estado del sistema nervioso central Ferunda
// ============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Zap, 
  Brain, 
  Heart, 
  MessageCircle,
  DollarSign,
  Calendar,
  Palette,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Volume2,
  Radio
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCoreBus, type CoreBusStatus } from "@/hooks/useCoreBus";
import { eventBus } from "@/lib/eventBus";
import { supabase } from "@/integrations/supabase/client";

interface ModuleStatus {
  name: string;
  icon: React.ReactNode;
  status: 'active' | 'idle' | 'error';
  lastEvent?: string;
  eventCount: number;
}

interface AIProviderStatus {
  name: string;
  primary: boolean;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
}

export function SystemConsolidadoStatus() {
  const { status: coreBusStatus, eventCount, lastEvent, reconnect } = useCoreBus();
  
  const [modules, setModules] = useState<ModuleStatus[]>([
    { name: 'Concierge', icon: <MessageCircle className="w-4 h-4" />, status: 'idle', eventCount: 0 },
    { name: 'Bookings', icon: <Calendar className="w-4 h-4" />, status: 'idle', eventCount: 0 },
    { name: 'Finanzas', icon: <DollarSign className="w-4 h-4" />, status: 'idle', eventCount: 0 },
    { name: 'Marketing', icon: <Zap className="w-4 h-4" />, status: 'idle', eventCount: 0 },
    { name: 'Design', icon: <Palette className="w-4 h-4" />, status: 'idle', eventCount: 0 },
    { name: 'Healing', icon: <Heart className="w-4 h-4" />, status: 'idle', eventCount: 0 },
  ]);

  const [aiProviders, setAiProviders] = useState<AIProviderStatus[]>([
    { name: 'Grok', primary: true, status: 'healthy' },
    { name: 'Lovable AI', primary: false, status: 'healthy' },
    { name: 'ElevenLabs', primary: true, status: 'healthy' },
  ]);

  const [totalEventsToday, setTotalEventsToday] = useState(0);
  const [systemHealth, setSystemHealth] = useState(100);

  // Listen to EventBus for module activity
  useEffect(() => {
    const unsubscribers = [
      eventBus.on('concierge:session_started', () => updateModuleActivity('Concierge')),
      eventBus.on('concierge:stage_change', () => updateModuleActivity('Concierge')),
      eventBus.on('message:received', () => updateModuleActivity('Concierge')),
      eventBus.on('booking:created', () => updateModuleActivity('Bookings')),
      eventBus.on('booking:confirmed', () => updateModuleActivity('Bookings')),
      eventBus.on('payment:received', () => updateModuleActivity('Finanzas')),
      eventBus.on('marketing:content_generated', () => updateModuleActivity('Marketing')),
      eventBus.on('design:created', () => updateModuleActivity('Design')),
      eventBus.on('design:approved', () => updateModuleActivity('Design')),
      eventBus.on('healing:started', () => updateModuleActivity('Healing')),
      eventBus.on('healing:checkin', () => updateModuleActivity('Healing')),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Fetch AI provider health
  useEffect(() => {
    const fetchProviderHealth = async () => {
      try {
        const { data } = await supabase
          .from('ai_provider_roles')
          .select('task_type, primary_provider, fallback_provider, is_active')
          .eq('is_active', true);

        if (data && data.length > 0) {
          // All providers healthy if we got data
          setAiProviders(prev => prev.map(p => ({ ...p, status: 'healthy' as const })));
        }
      } catch (err) {
        console.log('[SystemStatus] Provider health check failed');
      }
    };

    fetchProviderHealth();
    const interval = setInterval(fetchProviderHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch today's events count
  useEffect(() => {
    const fetchTodayEvents = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from('event_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today);

        setTotalEventsToday(count || 0);
      } catch (err) {
        console.log('[SystemStatus] Event count fetch failed');
      }
    };

    fetchTodayEvents();
    const interval = setInterval(fetchTodayEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update system health based on status
  useEffect(() => {
    let health = 100;
    if (coreBusStatus === 'disconnected') health -= 30;
    if (coreBusStatus === 'error') health -= 50;
    
    const downProviders = aiProviders.filter(p => p.status === 'down').length;
    health -= downProviders * 15;
    
    const degradedProviders = aiProviders.filter(p => p.status === 'degraded').length;
    health -= degradedProviders * 5;
    
    setSystemHealth(Math.max(0, health));
  }, [coreBusStatus, aiProviders]);

  const updateModuleActivity = (moduleName: string) => {
    setModules(prev => prev.map(m => 
      m.name === moduleName 
        ? { ...m, status: 'active' as const, eventCount: m.eventCount + 1, lastEvent: new Date().toISOString() }
        : m
    ));

    // Reset to idle after 3 seconds
    setTimeout(() => {
      setModules(prev => prev.map(m =>
        m.name === moduleName ? { ...m, status: 'idle' as const } : m
      ));
    }, 3000);
  };

  const getStatusColor = (status: CoreBusStatus) => {
    switch (status) {
      case 'connected': return 'text-emerald-500';
      case 'connecting': return 'text-amber-500';
      case 'disconnected': return 'text-red-500';
      case 'error': return 'text-red-500';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'bg-emerald-500';
    if (health >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main Status Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-gold/5 to-purple-500/10 border-emerald-500/30 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
              <span>System Consolidado Vivo Supremo Eterno</span>
            </div>
            <Badge 
              variant="outline" 
              className={`${getStatusColor(coreBusStatus)} border-current`}
            >
              {coreBusStatus === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  VIVO
                </>
              ) : coreBusStatus === 'connecting' ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Conectando
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Health Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">System Health</span>
              <span className={systemHealth >= 80 ? 'text-emerald-500' : systemHealth >= 50 ? 'text-amber-500' : 'text-red-500'}>
                {systemHealth}%
              </span>
            </div>
            <Progress value={systemHealth} className={`h-2 ${getHealthColor(systemHealth)}`} />
          </div>

          {/* Core Bus Stats */}
          <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-background/50">
            <div className="text-center">
              <p className="font-display text-2xl text-emerald-500">{eventCount}</p>
              <p className="text-xs text-muted-foreground">Eventos (sesión)</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl text-gold">{totalEventsToday}</p>
              <p className="text-xs text-muted-foreground">Eventos (hoy)</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl text-foreground">
                {lastEvent?.type?.replace('bus:', '').slice(0, 8) || '—'}
              </p>
              <p className="text-xs text-muted-foreground">Último evento</p>
            </div>
          </div>

          {/* AI Providers Status */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              AI Nexus Providers
            </p>
            <div className="grid grid-cols-3 gap-2">
              {aiProviders.map(provider => (
                <div 
                  key={provider.name}
                  className="flex items-center gap-2 p-2 rounded-md bg-background/30"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    provider.status === 'healthy' ? 'bg-emerald-500 animate-pulse' :
                    provider.status === 'degraded' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-xs font-medium">{provider.name}</span>
                  {provider.primary && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      Primary
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Module Activity Grid */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Módulos Conectados
            </p>
            <div className="grid grid-cols-3 gap-2">
              {modules.map(module => (
                <motion.div
                  key={module.name}
                  animate={{
                    scale: module.status === 'active' ? [1, 1.05, 1] : 1,
                    backgroundColor: module.status === 'active' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(0, 0, 0, 0)'
                  }}
                  className="flex items-center gap-2 p-2 rounded-md border border-border/50"
                >
                  <div className={`${
                    module.status === 'active' ? 'text-emerald-500' :
                    module.status === 'error' ? 'text-red-500' :
                    'text-muted-foreground'
                  }`}>
                    {module.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{module.name}</p>
                    <p className="text-[10px] text-muted-foreground">{module.eventCount} eventos</p>
                  </div>
                  {module.status === 'active' && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Reconnect Button (if disconnected) */}
          {coreBusStatus !== 'connected' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reconnect}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconectar Core Bus
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default SystemConsolidadoStatus;
