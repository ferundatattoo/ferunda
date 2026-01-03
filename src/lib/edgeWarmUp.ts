/**
 * Edge Function Warm-Up Strategy
 * Fase 5: Precargar edge functions para eliminar cold starts
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_TO_WARM = ['concierge-gateway', 'studio-concierge', 'chat-session'];

// Track if warm-up has been done this session
let warmUpDone = false;

/**
 * Silently warm up edge functions using sendBeacon or fetch
 * Called on hover over chat button to eliminate cold start latency
 */
export function warmUpEdgeFunctions(): void {
  if (warmUpDone || !SUPABASE_URL) return;
  
  warmUpDone = true;
  
  const isDebug = localStorage.getItem('ferunda_debug') === '1';
  if (isDebug) console.log('[WarmUp] Firing warm-up requests...');

  FUNCTIONS_TO_WARM.forEach((fn) => {
    const url = `${SUPABASE_URL}/functions/v1/${fn}`;
    const payload = JSON.stringify({ healthCheck: true, warmUp: true });
    
    // Try sendBeacon first (fire-and-forget, non-blocking)
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        if (isDebug) console.log(`[WarmUp] sendBeacon → ${fn}`);
        return;
      } catch {
        // Fall through to fetch
      }
    }
    
    // Fallback: fire-and-forget fetch
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: payload,
      keepalive: true, // Allow request to complete even if page unloads
    }).catch(() => {
      // Intentionally ignore errors - this is a best-effort warm-up
    });
    
    if (isDebug) console.log(`[WarmUp] fetch → ${fn}`);
  });
}

/**
 * Reset warm-up flag (useful for testing or after long inactivity)
 */
export function resetWarmUp(): void {
  warmUpDone = false;
}

/**
 * Check if warm-up has been performed
 */
export function isWarmedUp(): boolean {
  return warmUpDone;
}
