import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RealtimeStatusIndicator } from '@/components/RealtimeStatusIndicator';
import { useNotifications, createNotification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Database, Zap, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeEvent {
  id: string;
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
  latency?: number;
}

export default function TestRealtime() {
  const { user } = useAuth();
  const { notifications, unreadCount, connectionStatus: notifStatus, markAllAsRead } = useNotifications();
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [subscribedTables, setSubscribedTables] = useState<string[]>([]);

  // Subscribe to multiple tables for testing
  useEffect(() => {
    const tables = [
      'bookings',
      'booking_requests',
      'concierge_sessions',
      'concierge_messages',
      'notifications',
      'customer_payments',
      'deposit_transactions'
    ];

    const channel: RealtimeChannel = supabase.channel('test-realtime-all');

    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const now = Date.now();
          const createdAt = payload.new?.created_at ? new Date(payload.new.created_at).getTime() : now;
          const latency = now - createdAt;

          const event: RealtimeEvent = {
            id: `${table}-${now}-${Math.random()}`,
            table,
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            payload: payload.new || payload.old,
            timestamp: now,
            latency: latency > 0 && latency < 60000 ? latency : undefined
          };

          setEvents(prev => [event, ...prev].slice(0, 100));
          console.log(`[Realtime Test] ${table}:${payload.eventType}`, payload);
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
        setSubscribedTables(tables);
        console.log('[Realtime Test] Connected to all tables');
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionStatus('error');
      } else if (status === 'CLOSED') {
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendTestNotification = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to send test notifications');
      return;
    }

    try {
      await createNotification({
        userId: user.id,
        type: 'system',
        title: 'Test Notification',
        message: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
        priority: 'normal'
      });
      toast.success('Test notification sent!');
    } catch (err) {
      toast.error('Failed to send notification');
    }
  };

  const clearEvents = () => setEvents([]);

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'INSERT': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'UPDATE': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Realtime Test Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor live database events and test realtime subscriptions
            </p>
          </div>
          <RealtimeStatusIndicator status={connectionStatus} showLabel size="md" />
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                Subscribed Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {subscribedTables.map(table => (
                  <Badge key={table} variant="secondary" className="text-xs">
                    {table}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Events Captured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">Last 100 events stored</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{unreadCount}</div>
                  <p className="text-xs text-muted-foreground">Unread notifications</p>
                </div>
                <RealtimeStatusIndicator status={notifStatus} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSendTestNotification} disabled={!user}>
            <Send className="w-4 h-4 mr-2" />
            Send Test Notification
          </Button>
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mark All Read ({unreadCount})
          </Button>
          <Button variant="destructive" onClick={clearEvents} disabled={events.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Events
          </Button>
        </div>

        {/* Events Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Events</CardTitle>
              <CardDescription>Real-time database changes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {events.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Zap className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Waiting for events...</p>
                    <p className="text-xs">Make changes in the app to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map(event => (
                      <div 
                        key={event.id}
                        className="p-3 rounded-lg border bg-card/50 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getEventColor(event.eventType)}>
                              {event.eventType}
                            </Badge>
                            <span className="font-mono text-sm">{event.table}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {event.latency && (
                              <span className="text-green-400">{event.latency}ms</span>
                            )}
                            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.payload, null, 2).slice(0, 200)}
                          {JSON.stringify(event.payload).length > 200 && '...'}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Your live notification feed</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {notifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No notifications yet</p>
                    <p className="text-xs">Click "Send Test Notification" to test</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id}
                        className={`p-3 rounded-lg border ${notif.read ? 'bg-muted/20' : 'bg-primary/5 border-primary/20'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {!notif.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                              {notif.title}
                            </div>
                            {notif.message && (
                              <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                            )}
                          </div>
                          <Badge variant="outline">{notif.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
