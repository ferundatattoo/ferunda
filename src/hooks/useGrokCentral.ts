import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/lib/eventBus';

// ============================================================================
// TYPES
// ============================================================================

export interface GrokMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolsExecuted?: string[];
  toolResults?: any[];
}

export interface GrokContext {
  currentView?: string;
  selectedClient?: { id: string; name: string; email: string };
  selectedBooking?: { id: string; status: string };
  conversationId?: string;
  [key: string]: any;
}

export interface UseGrokCentralOptions {
  onMessage?: (message: GrokMessage) => void;
  onToolExecuted?: (toolName: string, result: any) => void;
  onError?: (error: Error) => void;
  context?: GrokContext;
}

export interface UseGrokCentralReturn {
  messages: GrokMessage[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  clearMessages: () => void;
  setContext: (context: GrokContext) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useGrokCentral(options: UseGrokCentralOptions = {}): UseGrokCentralReturn {
  const { onMessage, onToolExecuted, onError, context: initialContext } = options;

  const [messages, setMessages] = useState<GrokMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [context, setContext] = useState<GrokContext>(initialContext || {});

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: GrokMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    onMessage?.(userMessage);

    try {
      // Prepare messages for API (convert to simple format)
      const apiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages.push({ role: 'user', content });

      // Call Grok Central
      const { data, error: invokeError } = await supabase.functions.invoke('grok-central', {
        body: {
          messages: apiMessages,
          context: {
            ...context,
            currentView: window.location.pathname,
          },
        },
      });

      if (invokeError) throw invokeError;

      // Handle rate limit errors
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          throw new Error('Demasiadas solicitudes. Intenta de nuevo en unos segundos.');
        }
        if (data.error.includes('Payment required')) {
          throw new Error('Créditos AI agotados. Contacta al administrador.');
        }
        throw new Error(data.error);
      }

      // Create assistant message
      const assistantMessage: GrokMessage = {
        id: generateId(),
        role: 'assistant',
        content: data?.content || 'No response received',
        timestamp: new Date(),
        toolsExecuted: data?.toolsExecuted || [],
        toolResults: data?.toolResults || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onMessage?.(assistantMessage);

      // Notify about tool executions
      if (data?.toolsExecuted?.length) {
        data.toolsExecuted.forEach((toolName: string, index: number) => {
          const result = data.toolResults?.[index];
          onToolExecuted?.(toolName, result);

          // Emit to EventBus for system-wide awareness
          eventBus.emit('agent:decision_made', {
            decisionId: generateId(),
            type: toolName,
            confidence: result?.success ? 0.9 : 0.3,
          });
        });
      }

      // Emit AI response event
      eventBus.emit('bus:ai_response', {
        taskType: 'grok_central',
        provider: data?.provider || 'grok',
        success: true,
        tokensUsed: 0,
      });

    } catch (err) {
      console.error('[useGrokCentral] Error:', err);
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      onError?.(errorObj);

      // Add error message to chat
      const errorMessage: GrokMessage = {
        id: generateId(),
        role: 'assistant',
        content: `❌ Error: ${errorObj.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
    }
  }, [messages, context, onMessage, onToolExecuted, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    clearMessages,
    setContext,
  };
}

export default useGrokCentral;
