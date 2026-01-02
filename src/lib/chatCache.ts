/**
 * Chat Cache with IndexedDB for offline persistence
 * Fase 4: Cache inteligente en cliente
 */

const DB_NAME = 'ferunda-chat-cache';
const DB_VERSION = 1;
const RESPONSE_STORE = 'responses';
const CONVERSATION_STORE = 'conversations';

interface CachedResponse {
  hash: string;
  response: string;
  expiry: number;
  createdAt: number;
}

interface CachedConversation {
  id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  updated: number;
}

// Simple hash function for cache keys
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Open or create the IndexedDB database
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create response cache store
      if (!db.objectStoreNames.contains(RESPONSE_STORE)) {
        db.createObjectStore(RESPONSE_STORE, { keyPath: 'hash' });
      }
      
      // Create conversation store
      if (!db.objectStoreNames.contains(CONVERSATION_STORE)) {
        db.createObjectStore(CONVERSATION_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Cached database instance
let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    dbInstance = await openDatabase();
  }
  return dbInstance;
}

export const chatCache = {
  /**
   * Generate a cache key from message content
   */
  generateKey(message: string, contextLength: number = 0): string {
    const normalized = message.toLowerCase().trim().slice(0, 200);
    return simpleHash(`${normalized}:${contextLength}`);
  },

  /**
   * Get cached response by message hash
   */
  async get(messageHash: string): Promise<string | null> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(RESPONSE_STORE, 'readonly');
        const store = tx.objectStore(RESPONSE_STORE);
        const request = store.get(messageHash);
        
        request.onsuccess = () => {
          const cached = request.result as CachedResponse | undefined;
          if (cached && cached.expiry > Date.now()) {
            resolve(cached.response);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Cache a response with TTL (default 1 hour)
   */
  async set(messageHash: string, response: string, ttlMs: number = 3600000): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction(RESPONSE_STORE, 'readwrite');
      const store = tx.objectStore(RESPONSE_STORE);
      
      const entry: CachedResponse = {
        hash: messageHash,
        response,
        expiry: Date.now() + ttlMs,
        createdAt: Date.now(),
      };
      
      store.put(entry);
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Silently fail cache writes
    }
  },

  /**
   * Get conversation from cache
   */
  async getConversation(id: string): Promise<CachedConversation | null> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(CONVERSATION_STORE, 'readonly');
        const store = tx.objectStore(CONVERSATION_STORE);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Save conversation to cache
   */
  async saveConversation(
    id: string, 
    messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>
  ): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction(CONVERSATION_STORE, 'readwrite');
      const store = tx.objectStore(CONVERSATION_STORE);
      
      const entry: CachedConversation = {
        id,
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        updated: Date.now(),
      };
      
      store.put(entry);
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Silently fail
    }
  },

  /**
   * Clear expired cache entries
   */
  async cleanup(): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction(RESPONSE_STORE, 'readwrite');
      const store = tx.objectStore(RESPONSE_STORE);
      const request = store.openCursor();
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as CachedResponse;
          if (entry.expiry < Date.now()) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch {
      // Silently fail
    }
  },

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction([RESPONSE_STORE, CONVERSATION_STORE], 'readwrite');
      tx.objectStore(RESPONSE_STORE).clear();
      tx.objectStore(CONVERSATION_STORE).clear();
    } catch {
      // Silently fail
    }
  },
};

// Cleanup expired entries on module load
if (typeof window !== 'undefined') {
  setTimeout(() => chatCache.cleanup(), 5000);
}
