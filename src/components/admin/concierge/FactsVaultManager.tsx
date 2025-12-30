import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, CheckCircle, XCircle, Plus, Trash2, Save, 
  Globe, Palette, MapPin, Calendar, Link2, Languages, Edit2
} from 'lucide-react';

interface ArtistFacts {
  id: string;
  artist_id: string;
  display_name: string;
  legal_name: string | null;
  public_handle: string | null;
  brand_positioning: {
    one_liner: { text: string | null; verified: boolean };
    long_bio: { text: string | null; verified: boolean };
  };
  specialties: Array<{ tag: string; verified: boolean }>;
  not_offered_styles: Array<{ tag: string; verified: boolean }>;
  not_offered_work_types: Array<{ tag: string; verified: boolean }>;
  booking_model: {
    session_model: string;
    one_client_per_day: boolean;
    arrival_window: { start: string | null; end: string | null; verified: boolean };
    notes: { text: string | null; verified: boolean };
  };
  base_location: { city: string | null; country: string | null; verified: boolean };
  bookable_cities: Array<{ city: string; country: string; verified: boolean }>;
  location_notes: { text: string | null; verified: boolean };
  public_links: { website: string | null; booking_page: string | null; instagram: string | null };
  languages: Array<{ code: string; label: string; verified: boolean }>;
}

interface Artist {
  id: string;
  display_name: string;
  name: string;
}

const SPECIALTY_OPTIONS = [
  'black_and_grey_realism', 'micro_realism', 'fine_line', 'single_needle',
  'color_realism', 'neo_traditional', 'american_traditional', 'japanese',
  'geometric', 'dotwork', 'watercolor', 'illustrative', 'minimalist', 'portrait'
];

const WORK_TYPE_OPTIONS = [
  'cover_up', 'touch_up_other_artist', 'rework', 'repeat_design', 'flash'
];

export function FactsVaultManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [facts, setFacts] = useState<ArtistFacts | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    if (selectedArtistId) {
      fetchFacts(selectedArtistId);
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

  const fetchFacts = async (artistId: string) => {
    const { data, error } = await supabase
      .from('artist_public_facts')
      .select('*')
      .eq('artist_id', artistId)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast({ title: 'Error loading facts', description: error.message, variant: 'destructive' });
    }

    if (data) {
      setFacts(data as unknown as ArtistFacts);
    } else {
      // Create empty facts for this artist
      const artist = artists.find(a => a.id === artistId);
      setFacts({
        id: '',
        artist_id: artistId,
        display_name: artist?.display_name || artist?.name || '',
        legal_name: null,
        public_handle: null,
        brand_positioning: {
          one_liner: { text: null, verified: false },
          long_bio: { text: null, verified: false }
        },
        specialties: [],
        not_offered_styles: [],
        not_offered_work_types: [],
        booking_model: {
          session_model: 'day_session',
          one_client_per_day: true,
          arrival_window: { start: null, end: null, verified: false },
          notes: { text: null, verified: false }
        },
        base_location: { city: null, country: null, verified: false },
        bookable_cities: [],
        location_notes: { text: null, verified: false },
        public_links: { website: null, booking_page: null, instagram: null },
        languages: []
      });
    }
  };

  const saveFacts = async () => {
    if (!facts || !selectedArtistId) return;

    setSaving(true);
    
    const payload = {
      artist_id: selectedArtistId,
      display_name: facts.display_name,
      legal_name: facts.legal_name,
      public_handle: facts.public_handle,
      brand_positioning: facts.brand_positioning,
      specialties: facts.specialties,
      not_offered_styles: facts.not_offered_styles,
      not_offered_work_types: facts.not_offered_work_types,
      booking_model: facts.booking_model,
      base_location: facts.base_location,
      bookable_cities: facts.bookable_cities,
      location_notes: facts.location_notes,
      public_links: facts.public_links,
      languages: facts.languages
    };

    let error;
    if (facts.id) {
      const result = await supabase
        .from('artist_public_facts')
        .update(payload)
        .eq('id', facts.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('artist_public_facts')
        .insert(payload)
        .select()
        .single();
      error = result.error;
      if (!error && result.data) {
        setFacts({ ...facts, id: result.data.id });
      }
    }

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Facts saved', description: 'Artist public facts updated successfully' });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const updateFact = (path: string, value: unknown) => {
    if (!facts) return;
    
    const newFacts = { ...facts };
    const keys = path.split('.');
    let obj: any = newFacts;
    
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    
    setFacts(newFacts);
  };

  const toggleSpecialty = (tag: string, list: 'specialties' | 'not_offered_styles' | 'not_offered_work_types') => {
    if (!facts) return;
    
    const current = facts[list];
    const exists = current.find(s => s.tag === tag);
    
    if (exists) {
      updateFact(list, current.filter(s => s.tag !== tag));
    } else {
      updateFact(list, [...current, { tag, verified: true }]);
    }
  };

  const addLanguage = () => {
    if (!facts) return;
    updateFact('languages', [...facts.languages, { code: 'en', label: 'English', verified: false }]);
  };

  const removeLanguage = (index: number) => {
    if (!facts) return;
    updateFact('languages', facts.languages.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Facts Vault</h2>
          <p className="text-sm text-muted-foreground">
            Manage verified artist facts. The AI can ONLY speak facts marked as verified.
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

          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={saveFacts} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Facts
            </Button>
          )}
        </div>
      </div>

      {facts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Display Name</Label>
                <Input
                  value={facts.display_name}
                  onChange={(e) => updateFact('display_name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>Legal Name</Label>
                <Input
                  value={facts.legal_name || ''}
                  onChange={(e) => updateFact('legal_name', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Fernando Morales Unda"
                />
              </div>
              <div>
                <Label>Public Handle</Label>
                <Input
                  value={facts.public_handle || ''}
                  onChange={(e) => updateFact('public_handle', e.target.value)}
                  disabled={!isEditing}
                  placeholder="@ferunda"
                />
              </div>
            </CardContent>
          </Card>

          {/* Brand Positioning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Brand Positioning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>One-Liner</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={facts.brand_positioning.one_liner.verified}
                      onCheckedChange={(v) => updateFact('brand_positioning.one_liner.verified', v)}
                      disabled={!isEditing}
                    />
                    <span className="text-xs">{facts.brand_positioning.one_liner.verified ? 'Verified' : 'Unverified'}</span>
                  </div>
                </div>
                <Input
                  value={facts.brand_positioning.one_liner.text || ''}
                  onChange={(e) => updateFact('brand_positioning.one_liner.text', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Black & grey realism, micro realism, fine line..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Long Bio</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={facts.brand_positioning.long_bio.verified}
                      onCheckedChange={(v) => updateFact('brand_positioning.long_bio.verified', v)}
                      disabled={!isEditing}
                    />
                    <span className="text-xs">{facts.brand_positioning.long_bio.verified ? 'Verified' : 'Unverified'}</span>
                  </div>
                </div>
                <Textarea
                  value={facts.brand_positioning.long_bio.text || ''}
                  onChange={(e) => updateFact('brand_positioning.long_bio.text', e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Detailed artist biography..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Specialties (What They DO)
              </CardTitle>
              <CardDescription>Styles the artist specializes in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map(tag => {
                  const isSelected = facts.specialties.some(s => s.tag === tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer ${isEditing ? 'hover:opacity-80' : ''}`}
                      onClick={() => isEditing && toggleSpecialty(tag, 'specialties')}
                    >
                      {isSelected && <CheckCircle className="w-3 h-3 mr-1" />}
                      {tag.replace(/_/g, ' ')}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Not Offered */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Not Offered (What They DON'T Do)
              </CardTitle>
              <CardDescription>Styles and work types they decline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Styles</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SPECIALTY_OPTIONS.filter(t => !facts.specialties.some(s => s.tag === t)).map(tag => {
                    const isSelected = facts.not_offered_styles.some(s => s.tag === tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? 'destructive' : 'outline'}
                        className={`cursor-pointer ${isEditing ? 'hover:opacity-80' : ''}`}
                        onClick={() => isEditing && toggleSpecialty(tag, 'not_offered_styles')}
                      >
                        {isSelected && <XCircle className="w-3 h-3 mr-1" />}
                        {tag.replace(/_/g, ' ')}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Work Types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {WORK_TYPE_OPTIONS.map(tag => {
                    const isSelected = facts.not_offered_work_types.some(s => s.tag === tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? 'destructive' : 'outline'}
                        className={`cursor-pointer ${isEditing ? 'hover:opacity-80' : ''}`}
                        onClick={() => isEditing && toggleSpecialty(tag, 'not_offered_work_types')}
                      >
                        {isSelected && <XCircle className="w-3 h-3 mr-1" />}
                        {tag.replace(/_/g, ' ')}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Model */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Session Model</Label>
                <select
                  value={facts.booking_model.session_model}
                  onChange={(e) => updateFact('booking_model.session_model', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="day_session">Day Session</option>
                  <option value="timed_slots">Timed Slots</option>
                  <option value="by_piece">By Piece</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={facts.booking_model.one_client_per_day}
                  onCheckedChange={(v) => updateFact('booking_model.one_client_per_day', v)}
                  disabled={!isEditing}
                />
                <Label>One Client Per Day</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Arrival Window Start</Label>
                  <Input
                    type="time"
                    value={facts.booking_model.arrival_window.start || ''}
                    onChange={(e) => updateFact('booking_model.arrival_window.start', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>Arrival Window End</Label>
                  <Input
                    type="time"
                    value={facts.booking_model.arrival_window.end || ''}
                    onChange={(e) => updateFact('booking_model.arrival_window.end', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base City</Label>
                  <Input
                    value={facts.base_location.city || ''}
                    onChange={(e) => updateFact('base_location.city', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Los Angeles"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={facts.base_location.country || ''}
                    onChange={(e) => updateFact('base_location.country', e.target.value)}
                    disabled={!isEditing}
                    placeholder="United States"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={facts.base_location.verified}
                  onCheckedChange={(v) => updateFact('base_location.verified', v)}
                  disabled={!isEditing}
                />
                <Label className="text-sm">Verified Base Location</Label>
              </div>
            </CardContent>
          </Card>

          {/* Public Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Public Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Website</Label>
                <Input
                  value={facts.public_links.website || ''}
                  onChange={(e) => updateFact('public_links.website', e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://www.ferunda.com"
                />
              </div>
              <div>
                <Label>Booking Page</Label>
                <Input
                  value={facts.public_links.booking_page || ''}
                  onChange={(e) => updateFact('public_links.booking_page', e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://www.ferunda.com/book"
                />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input
                  value={facts.public_links.instagram || ''}
                  onChange={(e) => updateFact('public_links.instagram', e.target.value)}
                  disabled={!isEditing}
                  placeholder="@ferunda"
                />
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Languages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {facts.languages.map((lang, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={lang.code}
                    onChange={(e) => {
                      const newLangs = [...facts.languages];
                      newLangs[i] = { ...lang, code: e.target.value };
                      updateFact('languages', newLangs);
                    }}
                    disabled={!isEditing}
                    className="w-20"
                    placeholder="en"
                  />
                  <Input
                    value={lang.label}
                    onChange={(e) => {
                      const newLangs = [...facts.languages];
                      newLangs[i] = { ...lang, label: e.target.value };
                      updateFact('languages', newLangs);
                    }}
                    disabled={!isEditing}
                    placeholder="English"
                  />
                  <Switch
                    checked={lang.verified}
                    onCheckedChange={(v) => {
                      const newLangs = [...facts.languages];
                      newLangs[i] = { ...lang, verified: v };
                      updateFact('languages', newLangs);
                    }}
                    disabled={!isEditing}
                  />
                  {isEditing && (
                    <Button variant="ghost" size="icon" onClick={() => removeLanguage(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <Button variant="outline" size="sm" onClick={addLanguage}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Language
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
