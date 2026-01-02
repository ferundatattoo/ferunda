import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  workspace_id?: string;
  type: 'booking' | 'message' | 'payment' | 'alert' | 'system' | 'escalation';
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setNotifications((data as Notification[]) || []);
      setError(null);
    } catch (err) {
      console.error('[Notifications] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      );
    } catch (err) {
      console.error('[Notifications] Mark read error:', err);
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err);
    }
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) {
      setConnectionStatus('disconnected');
      return;
    }

    fetchNotifications();

    let channel: RealtimeChannel;
    
    const setupRealtime = () => {
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Notifications] New notification:', payload.new);
            setNotifications(prev => [payload.new as Notification, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Notifications] Realtime connected');
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Notifications] Realtime error');
            setConnectionStatus('error');
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
          }
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}

// Helper to create a notification (for use in other modules)
export async function createNotification(params: {
  userId: string;
  workspaceId?: string;
  type: Notification['type'];
  title: string;
  message?: string;
  link?: string;
  priority?: Notification['priority'];
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      priority: params.priority || 'normal',
      metadata: params.metadata || {}
    })
    .select()
    .single();

  if (error) {
    console.error('[Notifications] Create error:', error);
    throw error;
  }

  return data;
}
