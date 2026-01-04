// SystemProvider - Initializes global system components like EventBridge and Realtime
// Phase 4: Now passes workspace context to EventBridge for proper notification routing
import { useEffect, ReactNode } from 'react';
import { initializeEventBridge, updateBridgeContext } from '@/lib/eventBridge';
import { initializeGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { initializeCoreBus } from '@/hooks/useCoreBus';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';

interface SystemProviderProps {
  children: ReactNode;
}

export function SystemProvider({ children }: SystemProviderProps) {
  const { user } = useAuth();
  const { workspaceId } = useWorkspace(user?.id ?? null);

  // Initialize EventBridge, CoreBus and Realtime once on mount
  useEffect(() => {
    // Initialize EventBridge for cross-module communication
    const cleanupBridge = initializeEventBridge();

    // Initialize Core Bus (singleton)
    const cleanupCoreBus = initializeCoreBus();

    // Initialize Global Realtime subscriptions
    const cleanupRealtime = initializeGlobalRealtime();

    console.log('[SystemProvider] ✅ System initialized');

    return () => {
      cleanupBridge();
      cleanupCoreBus();
      cleanupRealtime();
      console.log('[SystemProvider] System cleanup complete');
    };
  }, []);

  // Phase 4: Update EventBridge context when workspace/user changes
  useEffect(() => {
    if (user?.id || workspaceId) {
      updateBridgeContext({
        workspaceId: workspaceId,
        currentUserId: user?.id ?? null,
      });
      console.log('[SystemProvider] 🔄 EventBridge context updated:', { workspaceId, userId: user?.id });
    }
  }, [user?.id, workspaceId]);

  return <>{children}</>;
}
