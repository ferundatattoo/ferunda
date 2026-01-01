import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OfflineAction {
  id: string;
  type: string;
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface SyncStatus {
  isOnline: boolean;
  pendingActions: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
}

const DB_NAME = "ferunda_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "pending_actions";
const CACHE_STORE = "cached_data";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: "key" });
        cacheStore.createIndex("expiry", "expiry", { unique: false });
      }
    };
  });
};

export const useOfflineSync = () => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    pendingActions: 0,
    lastSyncAt: null,
    isSyncing: false,
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
      toast({
        title: "You're offline",
        description: "Changes will be synced when you're back online",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync check
    loadPendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadPendingCount = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        setStatus(prev => ({ ...prev, pendingActions: countRequest.result }));
      };
    } catch (err) {
      console.error("Failed to load pending count:", err);
    }
  };

  const queueAction = useCallback(async (
    type: "insert" | "update" | "delete",
    table: string,
    data: Record<string, unknown>
  ): Promise<string> => {
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type,
      table,
      data,
      timestamp: Date.now(),
    };

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(action);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      setStatus(prev => ({ ...prev, pendingActions: prev.pendingActions + 1 }));
      
      // If online, try to sync immediately
      if (navigator.onLine) {
        syncPendingActions();
      }

      return action.id;
    } catch (err) {
      console.error("Failed to queue action:", err);
      throw err;
    }
  }, []);

  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine) return;

    setStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      
      const actions: OfflineAction[] = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      let synced = 0;
      
      for (const action of actions.sort((a, b) => a.timestamp - b.timestamp)) {
        try {
          let result;
          
          switch (action.type) {
            case "insert":
              result = await supabase.from(action.table as any).insert(action.data as any);
              break;
            case "update":
              const { id: updateId, ...updateData } = action.data;
              result = await supabase.from(action.table as any).update(updateData as any).eq("id", updateId as string);
              break;
            case "delete":
              result = await supabase.from(action.table as any).delete().eq("id", action.data.id as string);
              break;
          }

          if (result?.error) throw result.error;

          // Remove synced action
          const deleteTx = db.transaction(STORE_NAME, "readwrite");
          const deleteStore = deleteTx.objectStore(STORE_NAME);
          deleteStore.delete(action.id);
          synced++;
        } catch (err) {
          console.error(`Failed to sync action ${action.id}:`, err);
        }
      }

      if (synced > 0) {
        toast({
          title: "Synced successfully",
          description: `${synced} changes synced to server`,
        });
      }

      setStatus(prev => ({
        ...prev,
        pendingActions: actions.length - synced,
        lastSyncAt: new Date(),
        isSyncing: false,
      }));
    } catch (err) {
      console.error("Sync failed:", err);
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // Cache management
  const cacheData = useCallback(async (
    key: string,
    data: unknown,
    ttlMinutes: number = 60
  ) => {
    try {
      const db = await openDB();
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          key,
          data,
          expiry: Date.now() + ttlMinutes * 60 * 1000,
          cachedAt: Date.now(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Failed to cache data:", err);
    }
  }, []);

  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    try {
      const db = await openDB();
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      
      const result = await new Promise<{ data: T; expiry: number } | undefined>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!result) return null;
      if (result.expiry < Date.now()) {
        // Expired, delete it
        const deleteTx = db.transaction(CACHE_STORE, "readwrite");
        deleteTx.objectStore(CACHE_STORE).delete(key);
        return null;
      }

      return result.data;
    } catch (err) {
      console.error("Failed to get cached data:", err);
      return null;
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(CACHE_STORE, "readwrite");
      tx.objectStore(CACHE_STORE).clear();
    } catch (err) {
      console.error("Failed to clear cache:", err);
    }
  }, []);

  return {
    status,
    queueAction,
    syncPendingActions,
    cacheData,
    getCachedData,
    clearCache,
  };
};

export default useOfflineSync;
