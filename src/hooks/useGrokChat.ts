import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface GrokMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UseGrokChatOptions {
  onStream?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  fallbackToLovable?: boolean;
}

export interface UseGrokChatReturn {
  sendMessage: (messages: GrokMessage[], imageUrl?: string) => Promise<string>;
  analyzeImage: (imageUrl: string, prompt?: string) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
  usedFallback: boolean;
}

// ============================================================================
// LOVABLE AI FALLBACK
// ============================================================================

async function callLovableAI(messages: GrokMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke('studio-concierge', {
    body: {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    },
  });

  if (error) throw error;
  return data?.response || data?.content || '';
}

// ============================================================================
// HOOK
// ============================================================================

export function useGrokChat(options: UseGrokChatOptions = {}): UseGrokChatReturn {
  const { onStream, onComplete, onError, fallbackToLovable = true } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    messages: GrokMessage[],
    imageUrl?: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    setUsedFallback(false);
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Try Grok Gateway first
      const response = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages,
          imageUrl,
          stream: !!onStream,
        },
      });

      // Check for fallback signal
      if (response.data?.fallback && fallbackToLovable) {
        console.log('[useGrokChat] Grok failed, falling back to Lovable AI');
        setUsedFallback(true);
        const fallbackResponse = await callLovableAI(messages);
        onComplete?.(fallbackResponse);
        return fallbackResponse;
      }

      if (response.error) {
        throw new Error(response.error.message || 'Grok Gateway error');
      }

      // Handle streaming response
      if (onStream && response.data instanceof ReadableStream) {
        const reader = response.data.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  onStream(parsed.content);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        onComplete?.(fullContent);
        return fullContent;
      }

      // Handle JSON response
      const content = response.data?.content || '';
      onComplete?.(content);
      return content;

    } catch (err) {
      console.error('[useGrokChat] Error:', err);
      
      // Fallback to Lovable AI
      if (fallbackToLovable) {
        try {
          console.log('[useGrokChat] Attempting Lovable AI fallback');
          setUsedFallback(true);
          const fallbackResponse = await callLovableAI(messages);
          onComplete?.(fallbackResponse);
          return fallbackResponse;
        } catch (fallbackErr) {
          const error = fallbackErr instanceof Error ? fallbackErr : new Error('Fallback failed');
          setError(error);
          onError?.(error);
          throw error;
        }
      }

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      throw error;

    } finally {
      setIsLoading(false);
    }
  }, [onStream, onComplete, onError, fallbackToLovable]);

  const analyzeImage = useCallback(async (
    imageUrl: string,
    prompt?: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    setUsedFallback(false);

    try {
      const response = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: prompt || 'Analyze this image' }],
          imageUrl,
          stream: false,
        },
      });

      if (response.data?.fallback || response.error) {
        // Fallback to analyze-reference for vision
        console.log('[useGrokChat] Vision fallback to analyze-reference');
        setUsedFallback(true);
        
        const fallbackResponse = await supabase.functions.invoke('analyze-reference', {
          body: { image_urls: [imageUrl] },
        });

        if (fallbackResponse.error) throw fallbackResponse.error;
        
        // Format the analysis result as readable text
        const analysis = fallbackResponse.data;
        const formattedAnalysis = formatAnalysis(analysis);
        return formattedAnalysis;
      }

      return response.data?.content || '';

    } catch (err) {
      console.error('[useGrokChat] Vision error:', err);
      const error = err instanceof Error ? err : new Error('Vision analysis failed');
      setError(error);
      onError?.(error);
      throw error;

    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  return {
    sendMessage,
    analyzeImage,
    isLoading,
    error,
    usedFallback,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAnalysis(analysis: any): string {
  if (!analysis) return 'Unable to analyze image';

  const parts: string[] = [];

  if (analysis.styles?.length) {
    parts.push(`**Styles detected:** ${analysis.styles.join(', ')}`);
  }
  if (analysis.elements?.length) {
    parts.push(`**Elements:** ${analysis.elements.join(', ')}`);
  }
  if (analysis.colors?.length) {
    parts.push(`**Colors:** ${analysis.colors.join(', ')}`);
  }
  if (analysis.complexity) {
    parts.push(`**Complexity:** ${analysis.complexity}`);
  }
  if (analysis.estimatedHours) {
    parts.push(`**Estimated time:** ${analysis.estimatedHours} hours`);
  }
  if (analysis.description) {
    parts.push(`\n${analysis.description}`);
  }

  return parts.join('\n') || 'Image analyzed successfully';
}

export default useGrokChat;
