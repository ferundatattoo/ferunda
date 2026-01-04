import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Calendar,
  Mail,
  Video,
  Users,
  CreditCard,
  MessageCircle,
  Search,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useGrokCentral, GrokMessage } from '@/hooks/useGrokCentral';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GrokChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: Record<string, any>;
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  create_booking: <Calendar className="w-3 h-3" />,
  check_availability: <Calendar className="w-3 h-3" />,
  reschedule_booking: <Calendar className="w-3 h-3" />,
  lookup_client: <Users className="w-3 h-3" />,
  update_client: <Users className="w-3 h-3" />,
  send_email: <Mail className="w-3 h-3" />,
  create_payment_link: <CreditCard className="w-3 h-3" />,
  check_payment_status: <CreditCard className="w-3 h-3" />,
  send_message: <MessageCircle className="w-3 h-3" />,
  get_conversations: <MessageCircle className="w-3 h-3" />,
  generate_avatar_video: <Video className="w-3 h-3" />,
  generate_content: <Palette className="w-3 h-3" />,
  generate_design: <Palette className="w-3 h-3" />,
  search_system: <Search className="w-3 h-3" />,
};

const QUICK_ACTIONS = [
  { label: "Ver citas de hoy", icon: Calendar, command: "¿Qué citas hay para hoy?" },
  { label: "Buscar cliente", icon: Users, command: "Buscar cliente " },
  { label: "Nueva reserva", icon: Calendar, command: "Crear una reserva para " },
  { label: "Generar video", icon: Video, command: "Genera un video de bienvenida para " },
];

export function GrokChatPanel({ isOpen, onClose, initialContext }: GrokChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    clearMessages,
    setContext,
  } = useGrokCentral({
    context: initialContext,
    onToolExecuted: (toolName, result) => {
      console.log(`[GrokChatPanel] Tool executed: ${toolName}`, result);
    },
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update context when prop changes
  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
    }
  }, [initialContext, setContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleQuickAction = (command: string) => {
    setInputValue(command);
    inputRef.current?.focus();
  };

  const renderMessage = (message: GrokMessage) => {
    const isUser = message.role === 'user';

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex gap-3 mb-4",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-gradient-to-br from-gold/20 to-gold/10 border border-gold/20"
            : "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20"
        )}>
          {isUser ? (
            <Users className="w-4 h-4 text-gold" />
          ) : (
            <Brain className="w-4 h-4 text-primary" />
          )}
        </div>

        {/* Message Content */}
        <div className={cn(
          "max-w-[80%] rounded-lg p-3",
          isUser
            ? "bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/20"
            : "bg-muted border border-border/50"
        )}>
          {/* Tools Used Badge */}
          {message.toolsExecuted && message.toolsExecuted.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {message.toolsExecuted.map((tool, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                >
                  {TOOL_ICONS[tool] || <Sparkles className="w-3 h-3" />}
                  <span className="ml-1">{tool.replace(/_/g, ' ')}</span>
                </Badge>
              ))}
            </div>
          )}

          {/* Message Text */}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

          {/* Tool Results Summary */}
          {message.toolResults && message.toolResults.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              {message.toolResults.map((result, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {result.success ? (
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                  )}
                  <span>{result.result?.message || (result.success ? 'Completado' : 'Error')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground mt-2 block">
            {format(message.timestamp, 'HH:mm')}
          </span>
        </div>
      </motion.div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className={cn(
          "fixed right-0 top-0 bottom-0 bg-background border-l border-border/50 shadow-xl z-50 flex flex-col",
          isExpanded ? "w-full md:w-[600px]" : "w-full md:w-[400px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-card to-background">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl flex items-center justify-center border border-gold/20">
                <Brain className="w-5 h-5 text-gold" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-4 h-4 text-gold animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg font-medium">Grok Central</h3>
              <p className="text-xs text-muted-foreground">AI Intelligence Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="hover:text-gold"
              title="Clear chat"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="hover:text-gold hidden md:flex"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gold/10 to-transparent rounded-2xl flex items-center justify-center border border-gold/20 mb-4">
                <Brain className="w-8 h-8 text-gold/50" />
              </div>
              <h4 className="font-display text-lg text-foreground mb-2">
                ¿En qué puedo ayudarte?
              </h4>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Puedo crear reservas, enviar emails, generar videos, buscar clientes y mucho más.
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {QUICK_ACTIONS.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left h-auto py-2 px-3 border-border/50 hover:border-gold/30 hover:bg-gold/5"
                    onClick={() => handleQuickAction(action.command)}
                  >
                    <action.icon className="w-4 h-4 mr-2 text-gold" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(renderMessage)}
              
              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gold" />
                      <span className="text-sm text-muted-foreground">Grok está pensando...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-gradient-to-r from-card to-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe un comando o pregunta..."
              disabled={isLoading}
              className="flex-1 border-border/50 focus:border-gold/50"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-gold text-gold-foreground hover:bg-gold/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* Capability hints */}
          <div className="flex flex-wrap gap-1 mt-2">
            {['📅 Reservas', '📧 Emails', '🎬 Videos', '💬 Mensajes', '🔍 Búsqueda'].map((cap) => (
              <span key={cap} className="text-xs text-muted-foreground">{cap}</span>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default GrokChatPanel;
