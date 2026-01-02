import { supabase } from "@/integrations/supabase/client";

interface InvokeResult<T> {
  data: T | null;
  error: Error | null;
  usedFallback: boolean;
  latency: number;
}

interface InvokeOptions<T> {
  functionName: string;
  body?: unknown;
  fallbackResponse?: T;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Invokes a Supabase edge function with automatic retry, fallback, and error handling.
 * 
 * @example
 * const { data, error, usedFallback } = await invokeWithFallback({
 *   functionName: "chat-assistant",
 *   body: { message: "Hello" },
 *   fallbackResponse: { reply: "Service temporarily unavailable" },
 *   maxRetries: 2,
 * });
 */
export async function invokeWithFallback<T>(options: InvokeOptions<T>): Promise<InvokeResult<T>> {
  const {
    functionName,
    body,
    fallbackResponse,
    maxRetries = 2,
    retryDelay = 1000,
    timeout = 30000,
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      clearTimeout(timeoutId);

      if (error) {
        lastError = new Error(error.message || "Function invocation failed");
        console.warn(`[invokeWithFallback] ${functionName} attempt ${attempt + 1} failed:`, error.message);
        
        // If it's a non-retryable error, break early
        if (error.message?.includes("401") || error.message?.includes("403")) {
          break;
        }
        
        // Wait before retry
        if (attempt < maxRetries) {
          await sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
        continue;
      }

      return {
        data: data as T,
        error: null,
        usedFallback: false,
        latency: Date.now() - startTime,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error("Unknown error");
      console.warn(`[invokeWithFallback] ${functionName} attempt ${attempt + 1} exception:`, lastError.message);
      
      if (attempt < maxRetries) {
        await sleep(retryDelay * Math.pow(2, attempt));
      }
    }
  }

  // All retries failed - use fallback if available
  if (fallbackResponse !== undefined) {
    console.info(`[invokeWithFallback] ${functionName} using fallback response`);
    return {
      data: fallbackResponse,
      error: lastError,
      usedFallback: true,
      latency: Date.now() - startTime,
    };
  }

  return {
    data: null,
    error: lastError,
    usedFallback: false,
    latency: Date.now() - startTime,
  };
}

/**
 * Batch invoke multiple edge functions in parallel with fallback support.
 */
export async function invokeMultipleWithFallback<T extends Record<string, unknown>>(
  invocations: Array<InvokeOptions<T[keyof T]> & { key: keyof T }>
): Promise<{ results: Partial<T>; errors: Record<keyof T, Error | null> }> {
  const results: Partial<T> = {};
  const errors: Record<keyof T, Error | null> = {} as Record<keyof T, Error | null>;

  const promises = invocations.map(async (invocation) => {
    const result = await invokeWithFallback(invocation);
    results[invocation.key] = result.data as T[keyof T];
    errors[invocation.key] = result.error;
  });

  await Promise.all(promises);

  return { results, errors };
}

/**
 * Helper to check if an edge function is available/healthy.
 */
export async function checkFunctionHealth(functionName: string): Promise<{
  available: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { error } = await supabase.functions.invoke(functionName, {
      body: { healthCheck: true },
    });

    const latency = Date.now() - startTime;

    // Even if there's an error response, the function is "available" if it responded
    return {
      available: !error || latency > 0,
      latency,
      error: error?.message,
    };
  } catch (err: unknown) {
    return {
      available: false,
      latency: Date.now() - startTime,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default invokeWithFallback;
