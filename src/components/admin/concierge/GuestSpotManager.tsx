import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, MapPin, Calendar, Users, Bell, 
  CheckCircle, Clock, XCircle, Eye, Edit2
} from 'lucide-react';
import { format } from 'date-fns';

interface GuestSpotEvent {
  id: string;
  artist_id: string;
  city: string;
  country: string;
  venue_name: string | null;
  venue_address: string | null;
  date_range_start: string;
  date_range_end: string;
  status: 'rumored' | 'announced' | 'booking_open' | 'sold_out' | 'completed' | 'cancelled';
  booking_status: 'not_open' | 'open' | 'waitlist_only' | 'closed';
  max_slots: number | null;
  booked_slots: number;
  source_url: string | null;
  notes: string | null;
  internal_notes: string | null;
  announced_at: string | null;
  booking_opens_at: string | null;
}

interface Artist {
  id: string;
  display_name: string;
  name: string;
}

interface Subscription {
  id: string;
  email: string;
  client_name: string | null;
  subscription_type: string;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'rumored', label: 'Rumored', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'announced', label: 'Announced', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'booking_open', label: 'Booking Open', color: 'bg-green-500/20 text-green-600' },
  { value: 'sold_out', label: 'Sold Out', color: 'bg-purple-500/20 text-purple-600' },
  { value: 'completed', label: 'Completed', color: 'bg-muted text-muted-foreground' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-destructive/20 text-destructive' },
];

const BOOKING_STATUS_OPTIONS = [
  { value: 'not_open', label: 'Not Open' },
  { value: 'open', label: 'Open' },
  { value: 'waitlist_only', label: 'Waitlist Only' },
  { value: 'closed', label: 'Closed' },
];

export function GuestSpotManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [events, setEvents] = useState<GuestSpotEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GuestSpotEvent | null>(null);
  const [viewingSubscriptions, setViewingSubscriptions] = useState<string | null>(null);

  const [newEvent, setNewEvent] = useState({
    city: '',
    country: '',
    venue_name: '',
    venue_address: '',
    date_range_start: '',
    date_range_end: '',
    status: 'announced' as const,
    booking_status: 'not_open' as const,
    max_slots: '',
    source_url: '',
    notes: '',
    internal_notes: ''
  });

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    if (selectedArtistId) {
      fetchEvents(selectedArtistId);
    }
  }, [selectedArtistId]);

  const fetchArtists = async () => {
    const { data, error } = await supabase
      .from('studio_artists')
      .select('id, display_name, name')
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) {
      toast({ title: 'Error loading artists', description: error.message, variant: 'destructive' });
    } else {
      setArtists(data || []);
      if (data && data.length > 0) {
        setSelectedArtistId(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchEvents = async (artistId: string) => {
    const { data, error } = await supabase
      .from('guest_spot_events')
      .select('*')
      .eq('artist_id', artistId)
      .order('date_range_start', { ascending: true });

    if (error) {
      toast({ title: 'Error loading events', description: error.message, variant: 'destructive' });
    } else {
      setEvents((data || []) as unknown as GuestSpotEvent[]);
    }
  };

  const fetchSubscriptionsForEvent = async (eventCity: string, eventCountry: string) => {
    if (!selectedArtistId) return;

    const { data, error } = await supabase
      .from('guest_spot_subscriptions')
      .select('id, email, client_name, subscription_type, status, created_at')
      .eq('artist_id', selectedArtistId)
      .or(`country.eq.${eventCountry},country.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading subscriptions', description: error.message, variant: 'destructive' });
    } else {
      setSubscriptions(data || []);
    }
  };

  const createEvent = async () => {
    if (!selectedArtistId || !newEvent.city || !newEvent.country || !newEvent.date_range_start) {
      toast({ title: 'Missing fields', description: 'City, country, and start date are required', variant: 'destructive' });
      return;
    }

    const { data, error } = await supabase
      .from('guest_spot_events')
      .insert({
        artist_id: selectedArtistId,
        city: newEvent.city,
        country: newEvent.country,
        venue_name: newEvent.venue_name || null,
        venue_address: newEvent.venue_address || null,
        date_range_start: newEvent.date_range_start,
        date_range_end: newEvent.date_range_end || newEvent.date_range_start,
        status: newEvent.status,
        booking_status: newEvent.booking_status,
        max_slots: newEvent.max_slots ? parseInt(newEvent.max_slots) : null,
        source_url: newEvent.source_url || null,
        notes: newEvent.notes || null,
        internal_notes: newEvent.internal_notes || null,
        announced_at: newEvent.status === 'rumored' ? null : new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error creating event', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Event created' });
      setEvents([...events, data as unknown as GuestSpotEvent]);
      setShowAddForm(false);
      setNewEvent({
        city: '', country: '', venue_name: '', venue_address: '',
        date_range_start: '', date_range_end: '', status: 'announced',
        booking_status: 'not_open', max_slots: '', source_url: '', notes: '', internal_notes: ''
      });
    }
  };

  const updateEvent = async (event: GuestSpotEvent) => {
    const { error } = await supabase
      .from('guest_spot_events')
      .update({
        city: event.city,
        country: event.country,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        date_range_start: event.date_range_start,
        date_range_end: event.date_range_end,
        status: event.status,
        booking_status: event.booking_status,
        max_slots: event.max_slots,
        source_url: event.source_url,
        notes: event.notes,
        internal_notes: event.internal_notes
      })
      .eq('id', event.id);

    if (error) {
      toast({ title: 'Error updating event', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Event updated' });
      setEvents(events.map(e => e.id === event.id ? event : e));
      setEditingEvent(null);
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from('guest_spot_events')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting event', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Event deleted' });
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? <Badge className={option.color}>{option.label}</Badge> : null;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Guest Spot Events</h2>
          <p className="text-sm text-muted-foreground">
            Manage guest spot announcements. The AI can ONLY mention events listed here.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedArtistId || ''}
            onChange={(e) => setSelectedArtistId(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {artists.map(artist => (
              <option key={artist.id} value={artist.id}>
                {artist.display_name || artist.name}
              </option>
            ))}
          </select>

          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Add Guest Spot Event</CardTitle>
                <CardDescription>Create a new guest spot announcement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City *</Label>
                    <Input
                      value={newEvent.city}
                      onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                      placeholder="Mexico City"
                    />
                  </div>
                  <div>
                    <Label>Country *</Label>
                    <Input
                      value={newEvent.country}
                      onChange={(e) => setNewEvent({ ...newEvent, country: e.target.value })}
                      placeholder="Mexico"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Venue Name</Label>
                    <Input
                      value={newEvent.venue_name}
                      onChange={(e) => setNewEvent({ ...newEvent, venue_name: e.target.value })}
                      placeholder="Studio XYZ"
                    />
                  </div>
                  <div>
                    <Label>Venue Address</Label>
                    <Input
                      value={newEvent.venue_address}
                      onChange={(e) => setNewEvent({ ...newEvent, venue_address: e.target.value })}
                      placeholder="123 Main St"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={newEvent.date_range_start}
                      onChange={(e) => setNewEvent({ ...newEvent, date_range_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newEvent.date_range_end}
                      onChange={(e) => setNewEvent({ ...newEvent, date_range_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Status</Label>
                    <select
                      value={newEvent.status}
                      onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Booking Status</Label>
                    <select
                      value={newEvent.booking_status}
                      onChange={(e) => setNewEvent({ ...newEvent, booking_status: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {BOOKING_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Max Slots</Label>
                    <Input
                      type="number"
                      value={newEvent.max_slots}
                      onChange={(e) => setNewEvent({ ...newEvent, max_slots: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes (Public)</Label>
                  <Textarea
                    value={newEvent.notes}
                    onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                    placeholder="Public notes about this guest spot..."
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button onClick={createEvent}>Create Event</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No guest spot events yet.</p>
              <p className="text-sm">Add events so the AI can tell clients about upcoming locations.</p>
            </CardContent>
          </Card>
        ) : (
          events.map(event => (
            <Card key={event.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span className="text-lg font-semibold">{event.city}, {event.country}</span>
                      {getStatusBadge(event.status)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.date_range_start), 'MMM d')} - {format(new Date(event.date_range_end), 'MMM d, yyyy')}
                      </span>
                      {event.max_slots && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.booked_slots}/{event.max_slots} slots
                        </span>
                      )}
                      {event.venue_name && (
                        <span>@ {event.venue_name}</span>
                      )}
                    </div>

                    {event.notes && (
                      <p className="text-sm text-muted-foreground">{event.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setViewingSubscriptions(event.id);
                        fetchSubscriptionsForEvent(event.city, event.country);
                      }}
                    >
                      <Bell className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingEvent(event)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Subscriptions panel */}
                <AnimatePresence>
                  {viewingSubscriptions === event.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Subscriptions for {event.country}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setViewingSubscriptions(null)}>
                          Close
                        </Button>
                      </div>
                      {subscriptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No subscriptions yet</p>
                      ) : (
                        <div className="space-y-2">
                          {subscriptions.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div>
                                <span className="font-medium">{sub.client_name || sub.email}</span>
                                <Badge variant="outline" className="ml-2">{sub.subscription_type}</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(sub.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Modal - simplified inline edit */}
      <AnimatePresence>
        {editingEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditingEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-background border rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Edit Event</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={editingEvent.city}
                      onChange={(e) => setEditingEvent({ ...editingEvent, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={editingEvent.country}
                      onChange={(e) => setEditingEvent({ ...editingEvent, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <select
                      value={editingEvent.status}
                      onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Booking Status</Label>
                    <select
                      value={editingEvent.booking_status}
                      onChange={(e) => setEditingEvent({ ...editingEvent, booking_status: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      {BOOKING_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={editingEvent.notes || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
                  <Button onClick={() => updateEvent(editingEvent)}>Save Changes</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
