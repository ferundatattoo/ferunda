// SystemProvider - Initializes global system components like EventBridge and Realtime
import { useEffect, ReactNode } from 'react';
import { initializeEventBridge } from '@/lib/eventBridge';
import { initializeGlobalRealtime } from '@/hooks/useGlobalRealtime';

interface SystemProviderProps {
  children: ReactNode;
}

export function SystemProvider({ children }: SystemProviderProps) {
  useEffect(() => {
    // Initialize EventBridge for cross-module communication
    const cleanupBridge = initializeEventBridge();
    
    // Initialize Global Realtime subscriptions
    const cleanupRealtime = initializeGlobalRealtime();
    
    console.log('[SystemProvider] ✅ System initialized');
    
    return () => {
      cleanupBridge();
      cleanupRealtime();
      console.log('[SystemProvider] System cleanup complete');
    };
  }, []);

  return <>{children}</>;
}
