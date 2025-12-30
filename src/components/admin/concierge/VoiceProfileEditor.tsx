import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  Mic, Plus, Trash2, Save, Edit2, MessageSquare,
  CheckCircle, XCircle, Volume2
} from 'lucide-react';

interface VoiceProfile {
  id: string;
  artist_id: string;
  tone: string[];
  do_rules: string[];
  dont_rules: string[];
  signature_phrases: {
    not_a_fit: string | null;
    review: string | null;
    greeting: string | null;
    closing: string | null;
  };
  max_questions_per_message: number;
  default_language: string;
  is_active: boolean;
}

interface Artist {
  id: string;
  display_name: string;
  name: string;
}

const TONE_OPTIONS = [
  'premium', 'warm', 'direct', 'calm', 'friendly', 'professional',
  'playful', 'sophisticated', 'approachable', 'authoritative', 'empathetic'
];

export function VoiceProfileEditor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newDoRule, setNewDoRule] = useState('');
  const [newDontRule, setNewDontRule] = useState('');

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    if (selectedArtistId) {
      fetchProfile(selectedArtistId);
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

  const fetchProfile = async (artistId: string) => {
    const { data, error } = await supabase
      .from('voice_profiles')
      .select('*')
      .eq('artist_id', artistId)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast({ title: 'Error loading profile', description: error.message, variant: 'destructive' });
    }

    if (data) {
      setProfile({
        ...data,
        do_rules: Array.isArray(data.do_rules) ? (data.do_rules as unknown as string[]) : [],
        dont_rules: Array.isArray(data.dont_rules) ? (data.dont_rules as unknown as string[]) : [],
        signature_phrases: data.signature_phrases as VoiceProfile['signature_phrases']
      });
    } else {
      // Create default profile
      setProfile({
        id: '',
        artist_id: artistId,
        tone: ['premium', 'warm', 'direct', 'calm'],
        do_rules: [
          'Answer the user\'s question first, then ask one follow-up question.',
          'Use short sentences. No hype claims.',
          'Offer two paths: Notify-only or Fast-track.'
        ],
        dont_rules: [
          'Do not invent press mentions, locations, pricing, or guest spots.',
          'Do not ask for deposits unless a date/slot is shown and available.',
          'Do not ask multiple questions in one message unless user requests a checklist.'
        ],
        signature_phrases: {
          not_a_fit: 'I want to make sure you get the best possible result.',
          review: 'A quick detail will help me guide you correctly.',
          greeting: null,
          closing: null
        },
        max_questions_per_message: 1,
        default_language: 'en',
        is_active: true
      });
    }
  };

  const saveProfile = async () => {
    if (!profile || !selectedArtistId) return;

    setSaving(true);

    const payload = {
      artist_id: selectedArtistId,
      tone: profile.tone,
      do_rules: profile.do_rules,
      dont_rules: profile.dont_rules,
      signature_phrases: profile.signature_phrases,
      max_questions_per_message: profile.max_questions_per_message,
      default_language: profile.default_language,
      is_active: profile.is_active
    };

    let error;
    if (profile.id) {
      const result = await supabase
        .from('voice_profiles')
        .update(payload)
        .eq('id', profile.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('voice_profiles')
        .insert(payload)
        .select()
        .single();
      error = result.error;
      if (!error && result.data) {
        setProfile({ ...profile, id: result.data.id });
      }
    }

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Voice profile saved' });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const toggleTone = (tone: string) => {
    if (!profile) return;
    const current = profile.tone;
    if (current.includes(tone)) {
      setProfile({ ...profile, tone: current.filter(t => t !== tone) });
    } else {
      setProfile({ ...profile, tone: [...current, tone] });
    }
  };

  const addDoRule = () => {
    if (!profile || !newDoRule.trim()) return;
    setProfile({ ...profile, do_rules: [...profile.do_rules, newDoRule.trim()] });
    setNewDoRule('');
  };

  const removeDoRule = (index: number) => {
    if (!profile) return;
    setProfile({ ...profile, do_rules: profile.do_rules.filter((_, i) => i !== index) });
  };

  const addDontRule = () => {
    if (!profile || !newDontRule.trim()) return;
    setProfile({ ...profile, dont_rules: [...profile.dont_rules, newDontRule.trim()] });
    setNewDontRule('');
  };

  const removeDontRule = (index: number) => {
    if (!profile) return;
    setProfile({ ...profile, dont_rules: profile.dont_rules.filter((_, i) => i !== index) });
  };

  const updateSignaturePhrase = (key: keyof VoiceProfile['signature_phrases'], value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      signature_phrases: { ...profile.signature_phrases, [key]: value || null }
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Voice Profile</h2>
          <p className="text-sm text-muted-foreground">
            Define how the AI should sound and behave. This ensures consistent, premium messaging.
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
              <Button onClick={saveProfile} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Tone
              </CardTitle>
              <CardDescription>Select the personality traits for the AI voice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map(tone => {
                  const isSelected = profile.tone.includes(tone);
                  return (
                    <Badge
                      key={tone}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer capitalize ${isEditing ? 'hover:opacity-80' : ''}`}
                      onClick={() => isEditing && toggleTone(tone)}
                    >
                      {tone}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Max Questions Per Message</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={profile.max_questions_per_message}
                  onChange={(e) => setProfile({ ...profile, max_questions_per_message: parseInt(e.target.value) || 1 })}
                  disabled={!isEditing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How many questions the AI can ask in a single message
                </p>
              </div>
              <div>
                <Label>Default Language</Label>
                <select
                  value={profile.default_language}
                  onChange={(e) => setProfile({ ...profile, default_language: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* DO Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                DO Rules
              </CardTitle>
              <CardDescription>What the AI should always do</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.do_rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-green-500/10 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <span className="flex-1 text-sm">{rule}</span>
                  {isEditing && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDoRule(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    value={newDoRule}
                    onChange={(e) => setNewDoRule(e.target.value)}
                    placeholder="Add a DO rule..."
                    onKeyPress={(e) => e.key === 'Enter' && addDoRule()}
                  />
                  <Button size="icon" onClick={addDoRule}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* DON'T Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                DON'T Rules
              </CardTitle>
              <CardDescription>What the AI must never do</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.dont_rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-destructive/10 rounded">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <span className="flex-1 text-sm">{rule}</span>
                  {isEditing && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDontRule(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    value={newDontRule}
                    onChange={(e) => setNewDontRule(e.target.value)}
                    placeholder="Add a DON'T rule..."
                    onKeyPress={(e) => e.key === 'Enter' && addDontRule()}
                  />
                  <Button size="icon" onClick={addDontRule}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signature Phrases */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Signature Phrases
              </CardTitle>
              <CardDescription>
                Consistent phrases for specific situations. These keep messaging premium and on-brand.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Not a Fit Response</Label>
                <Textarea
                  value={profile.signature_phrases.not_a_fit || ''}
                  onChange={(e) => updateSignaturePhrase('not_a_fit', e.target.value)}
                  disabled={!isEditing}
                  placeholder="I want to make sure you get the best possible result."
                  rows={2}
                />
              </div>
              <div>
                <Label>Review/Clarification Needed</Label>
                <Textarea
                  value={profile.signature_phrases.review || ''}
                  onChange={(e) => updateSignaturePhrase('review', e.target.value)}
                  disabled={!isEditing}
                  placeholder="A quick detail will help me guide you correctly."
                  rows={2}
                />
              </div>
              <div>
                <Label>Greeting</Label>
                <Textarea
                  value={profile.signature_phrases.greeting || ''}
                  onChange={(e) => updateSignaturePhrase('greeting', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Hey! Welcome to the studio..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Closing</Label>
                <Textarea
                  value={profile.signature_phrases.closing || ''}
                  onChange={(e) => updateSignaturePhrase('closing', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Looking forward to creating something special!"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
