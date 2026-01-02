import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Zap,
  Send,
  Clock,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Settings,
  LayoutDashboard,
  Inbox,
  Briefcase,
  BarChart3,
  Map,
  Sparkles,
  Play,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  keywords: string[];
  category: 'navigation' | 'actions' | 'ai' | 'search';
  shortcut?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface SearchResult {
  type: 'client' | 'conversation' | 'booking';
  id: string;
  title: string;
  subtitle: string;
}

export function EnhancedCommandPalette({ open, onOpenChange }: EnhancedCommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentActions, setRecentActions] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSearchResults([]);
    }
  }, [open]);

  // Search clients and conversations
  useEffect(() => {
    const searchData = async () => {
      if (search.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Search clients
        const { data: clients } = await supabase
          .from('client_profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
          .limit(5);

        // Search conversations
        const { data: conversations } = await supabase
          .from('chat_conversations')
          .select('id, client_name, client_email, status')
          .or(`client_name.ilike.%${search}%,client_email.ilike.%${search}%`)
          .limit(5);

        const results: SearchResult[] = [
          ...(clients?.map(c => ({
            type: 'client' as const,
            id: c.id,
            title: c.full_name || 'Unknown',
            subtitle: c.email || '',
          })) || []),
          ...(conversations?.map(c => ({
            type: 'conversation' as const,
            id: c.id,
            title: c.client_name || 'Unknown',
            subtitle: `${c.status || 'active'} • ${c.client_email || ''}`,
          })) || []),
        ];

        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const executeAction = async (actionKey: string, label: string) => {
    // Log execution
    try {
      await supabase.from('action_executions').insert({
        action_key: actionKey,
        status: 'success',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    } catch (e) {
      // Silent fail for logging
    }

    setRecentActions(prev => [actionKey, ...prev.slice(0, 4)]);
    toast.success(`Ejecutando: ${label}`);
    onOpenChange(false);
  };

  const handleSelect = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  // Navigation commands
  const navigationCommands: CommandAction[] = useMemo(() => [
    {
      id: 'nav-command-center',
      label: 'Command Center',
      description: 'Panel principal del día',
      icon: LayoutDashboard,
      action: () => navigate('/os'),
      keywords: ['home', 'dashboard', 'centro', 'principal'],
      category: 'navigation',
      shortcut: '⌘1',
    },
    {
      id: 'nav-inbox',
      label: 'Inbox',
      description: 'Conversaciones y mensajes',
      icon: Inbox,
      action: () => navigate('/os/inbox'),
      keywords: ['mensajes', 'chat', 'dm', 'conversaciones'],
      category: 'navigation',
      shortcut: '⌘2',
    },
    {
      id: 'nav-work',
      label: 'Work',
      description: 'Pipeline de trabajo',
      icon: Briefcase,
      action: () => navigate('/os/work'),
      keywords: ['trabajo', 'bookings', 'requests', 'pipeline'],
      category: 'navigation',
      shortcut: '⌘3',
    },
    {
      id: 'nav-money',
      label: 'Money',
      description: 'Finanzas y pagos',
      icon: DollarSign,
      action: () => navigate('/os/money'),
      keywords: ['dinero', 'pagos', 'deposits', 'payouts'],
      category: 'navigation',
      shortcut: '⌘4',
    },
    {
      id: 'nav-growth',
      label: 'Growth',
      description: 'Marketing y crecimiento',
      icon: TrendingUp,
      action: () => navigate('/os/growth'),
      keywords: ['marketing', 'contenido', 'social', 'leads'],
      category: 'navigation',
      shortcut: '⌘5',
    },
    {
      id: 'nav-process-map',
      label: 'Process Map',
      description: 'Mapa del flujo operativo',
      icon: Map,
      action: () => navigate('/os/process-map'),
      keywords: ['flujo', 'proceso', 'mapa', 'workflow'],
      category: 'navigation',
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'Configuración del sistema',
      icon: Settings,
      action: () => navigate('/os/settings'),
      keywords: ['config', 'ajustes', 'preferencias'],
      category: 'navigation',
    },
  ], [navigate]);

  // Quick actions
  const actionCommands: CommandAction[] = useMemo(() => [
    {
      id: 'action-create-booking',
      label: 'Crear Booking Draft',
      description: 'Nuevo borrador de reserva',
      icon: Calendar,
      action: () => executeAction('create_booking_draft', 'Crear Booking Draft'),
      keywords: ['booking', 'reserva', 'cita', 'nuevo'],
      category: 'actions',
      riskLevel: 'low',
    },
    {
      id: 'action-send-deposit',
      label: 'Enviar Link de Depósito',
      description: 'Generar y enviar link de pago',
      icon: CreditCard,
      action: () => executeAction('create_deposit_link', 'Enviar Link de Depósito'),
      keywords: ['deposit', 'pago', 'link', 'cobrar'],
      category: 'actions',
      riskLevel: 'medium',
    },
    {
      id: 'action-propose-slots',
      label: 'Proponer Horarios',
      description: 'Sugerir slots disponibles',
      icon: Clock,
      action: () => executeAction('propose_slots', 'Proponer Horarios'),
      keywords: ['horarios', 'slots', 'disponibilidad', 'agenda'],
      category: 'actions',
      riskLevel: 'low',
    },
    {
      id: 'action-send-reminder',
      label: 'Enviar Recordatorio',
      description: 'Notificar al cliente',
      icon: Send,
      action: () => executeAction('send_reminder', 'Enviar Recordatorio'),
      keywords: ['reminder', 'recordatorio', 'notificar'],
      category: 'actions',
      riskLevel: 'low',
    },
    {
      id: 'action-sync-calendar',
      label: 'Sincronizar Calendario',
      description: 'Sync con Google Calendar',
      icon: RefreshCw,
      action: () => executeAction('sync_calendar', 'Sincronizar Calendario'),
      keywords: ['sync', 'google', 'calendar', 'sincronizar'],
      category: 'actions',
      riskLevel: 'low',
    },
    {
      id: 'action-run-playbook',
      label: 'Ejecutar Playbook',
      description: 'Iniciar automatización',
      icon: Play,
      action: () => executeAction('run_playbook', 'Ejecutar Playbook'),
      keywords: ['playbook', 'automation', 'automatizar'],
      category: 'actions',
      riskLevel: 'medium',
    },
  ], []);

  // AI commands
  const aiCommands: CommandAction[] = useMemo(() => [
    {
      id: 'ai-generate-plan',
      label: 'Generar Plan del Día',
      description: 'AI crea plan de acciones prioritarias',
      icon: Sparkles,
      action: () => executeAction('generate_plan', 'Generar Plan del Día'),
      keywords: ['plan', 'ai', 'prioridades', 'día'],
      category: 'ai',
    },
    {
      id: 'ai-draft-reply',
      label: 'Generar Respuesta',
      description: 'AI genera 3 opciones de respuesta',
      icon: MessageSquare,
      action: () => executeAction('generate_reply', 'Generar Respuesta'),
      keywords: ['respuesta', 'reply', 'mensaje', 'ai'],
      category: 'ai',
    },
    {
      id: 'ai-generate-quote',
      label: 'Generar Quote',
      description: 'AI calcula precio estimado',
      icon: FileText,
      action: () => executeAction('generate_quote', 'Generar Quote'),
      keywords: ['quote', 'precio', 'estimado', 'cotización'],
      category: 'ai',
    },
    {
      id: 'ai-analyze-lead',
      label: 'Analizar Lead',
      description: 'AI evalúa intent y readiness',
      icon: Users,
      action: () => executeAction('analyze_lead', 'Analizar Lead'),
      keywords: ['lead', 'analizar', 'intent', 'cliente'],
      category: 'ai',
    },
    {
      id: 'ai-generate-content',
      label: 'Generar Contenido',
      description: 'AI crea post para redes',
      icon: TrendingUp,
      action: () => executeAction('generate_content', 'Generar Contenido'),
      keywords: ['contenido', 'post', 'social', 'marketing'],
      category: 'ai',
    },
  ], []);

  const allCommands = useMemo(() => [
    ...navigationCommands,
    ...actionCommands,
    ...aiCommands,
  ], [navigationCommands, actionCommands, aiCommands]);

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    const colors: Record<string, string> = {
      low: 'bg-green-500/20 text-green-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-orange-500/20 text-orange-400',
      critical: 'bg-red-500/20 text-red-400',
    };
    return <Badge className={`${colors[risk]} text-xs`}>{risk}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="overflow-hidden p-0 shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <Command className="rounded-lg">
                <div className="flex items-center border-b border-border/50 px-4">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="Buscar clientes, acciones, comandos..."
                    value={search}
                    onValueChange={setSearch}
                    className="flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-50 sm:flex">
                    ESC
                  </kbd>
                </div>

                <CommandList className="max-h-[400px] overflow-y-auto p-2">
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    {isSearching ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Buscando...
                      </div>
                    ) : (
                      'No se encontraron resultados.'
                    )}
                  </CommandEmpty>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <CommandGroup heading="Resultados de búsqueda">
                      {searchResults.map((result) => (
                        <CommandItem
                          key={`${result.type}-${result.id}`}
                          onSelect={() => {
                            if (result.type === 'client') {
                              navigate(`/os/clients/${result.id}`);
                            } else if (result.type === 'conversation') {
                              navigate(`/os/inbox?conversation=${result.id}`);
                            }
                            onOpenChange(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        >
                          {result.type === 'client' ? (
                            <Users className="h-4 w-4 text-blue-400" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-green-400" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{result.title}</span>
                            <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                          </div>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {result.type}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  <CommandSeparator className="my-2" />

                  {/* AI Actions */}
                  <CommandGroup heading="🤖 AI Actions">
                    {aiCommands.map((command) => (
                      <CommandItem
                        key={command.id}
                        onSelect={() => handleSelect(command.action)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <command.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">{command.label}</span>
                          <span className="text-xs text-muted-foreground">{command.description}</span>
                        </div>
                        <Sparkles className="h-3 w-3 text-primary/50" />
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  <CommandSeparator className="my-2" />

                  {/* Quick Actions */}
                  <CommandGroup heading="⚡ Quick Actions">
                    {actionCommands.map((command) => (
                      <CommandItem
                        key={command.id}
                        onSelect={() => handleSelect(command.action)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/50">
                          <command.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">{command.label}</span>
                          <span className="text-xs text-muted-foreground">{command.description}</span>
                        </div>
                        {getRiskBadge(command.riskLevel)}
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  <CommandSeparator className="my-2" />

                  {/* Navigation */}
                  <CommandGroup heading="📍 Navigation">
                    {navigationCommands.map((command) => (
                      <CommandItem
                        key={command.id}
                        onSelect={() => handleSelect(command.action)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                          <command.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">{command.label}</span>
                          <span className="text-xs text-muted-foreground">{command.description}</span>
                        </div>
                        {command.shortcut && (
                          <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-50 hidden sm:flex">
                            {command.shortcut}
                          </kbd>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" /> para seleccionar
                    </span>
                    <span className="flex items-center gap-1">
                      ↑↓ para navegar
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary" />
                    AI-powered
                  </span>
                </div>
              </Command>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
