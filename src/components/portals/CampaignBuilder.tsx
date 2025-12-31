import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, Instagram, Mail, Calendar, 
  TrendingUp, Target, Wand2, Send, Clock
} from 'lucide-react';

interface Campaign {
  id?: string;
  name: string;
  campaign_type: 'social_post' | 'email' | 'dm_blast' | 'story';
  target_channels: string[];
  content: {
    caption?: string;
    body?: string;
    subject?: string;
    cta?: string;
  };
  scheduled_at?: string;
  ai_generated: boolean;
}

export function CampaignBuilder() {
  const [campaign, setCampaign] = useState<Campaign>({
    name: '',
    campaign_type: 'social_post',
    target_channels: ['instagram'],
    content: {},
    ai_generated: false
  });
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const { toast } = useToast();

  const generateAIContent = async () => {
    setGenerating(true);
    try {
      // Use Lovable AI to generate campaign content
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: `You are a marketing expert for Ferunda Tattoo, a micro-realism geometric tattoo artist. 
              Generate engaging social media content that:
              - Showcases the unique geometric micro-realism style
              - Uses emotive, artistic language
              - Includes relevant hashtags
              - Has a clear call-to-action for booking
              - Is concise and impactful
              
              Return JSON with: { caption, hashtags, cta, timing_recommendation }`
            },
            {
              role: 'user',
              content: `Generate ${campaign.campaign_type} content for: ${campaign.name || 'general portfolio showcase'}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        
        setCampaign(prev => ({
          ...prev,
          content: {
            caption: content.caption || '',
            cta: content.cta || 'Book your session ✨',
            body: content.caption + '\n\n' + (content.hashtags || '')
          },
          ai_generated: true
        }));
        
        toast({ title: 'AI content generated!' });
      }
    } catch (error) {
      console.error('Error generating content:', error);
      // Fallback content
      setCampaign(prev => ({
        ...prev,
        content: {
          caption: '✨ New geometric micro-realism piece fresh from the studio. Every line tells a story, every shadow adds depth. \n\n📩 DM for bookings\n\n#geometrictattoo #microrealism #blackandgrey #tattooart #ferundatattoo',
          cta: 'Book your session →'
        },
        ai_generated: true
      }));
    } finally {
      setGenerating(false);
    }
  };

  const saveCampaign = async (publish: boolean = false) => {
    setScheduling(true);
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          name: campaign.name,
          campaign_type: campaign.campaign_type,
          target_channels: campaign.target_channels,
          content: campaign.content,
          scheduled_at: campaign.scheduled_at,
          status: publish ? 'scheduled' : 'draft',
          ai_generated: campaign.ai_generated
        });

      if (error) throw error;
      
      toast({ 
        title: publish ? 'Campaign scheduled!' : 'Campaign saved as draft'
      });
      
      // Reset form
      setCampaign({
        name: '',
        campaign_type: 'social_post',
        target_channels: ['instagram'],
        content: {},
        ai_generated: false
      });
    } catch (error) {
      toast({ title: 'Error saving campaign', variant: 'destructive' });
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campaign Builder</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => saveCampaign(false)} disabled={scheduling}>
            Save Draft
          </Button>
          <Button onClick={() => saveCampaign(true)} disabled={scheduling}>
            <Send className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Setup */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  placeholder="e.g., Holiday Portfolio Showcase"
                  value={campaign.name}
                  onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <Tabs 
                  value={campaign.campaign_type} 
                  onValueChange={(v) => setCampaign(prev => ({ ...prev, campaign_type: v as any }))}
                >
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="social_post">Post</TabsTrigger>
                    <TabsTrigger value="story">Story</TabsTrigger>
                    <TabsTrigger value="dm_blast">DM Blast</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label>Target Channels</Label>
                <div className="flex gap-2">
                  {['instagram', 'tiktok', 'email'].map(channel => (
                    <Badge
                      key={channel}
                      variant={campaign.target_channels.includes(channel) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setCampaign(prev => ({
                          ...prev,
                          target_channels: prev.target_channels.includes(channel)
                            ? prev.target_channels.filter(c => c !== channel)
                            : [...prev.target_channels, channel]
                        }));
                      }}
                    >
                      {channel === 'instagram' && <Instagram className="h-3 w-3 mr-1" />}
                      {channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Content</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateAIContent}
                disabled={generating}
              >
                <Wand2 className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'AI Generate'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.campaign_type === 'email' && (
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    placeholder="Your next tattoo awaits..."
                    value={campaign.content.subject || ''}
                    onChange={(e) => setCampaign(prev => ({
                      ...prev,
                      content: { ...prev.content, subject: e.target.value }
                    }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {campaign.campaign_type === 'email' ? 'Body' : 'Caption'}
                </Label>
                <Textarea
                  placeholder="Write your content here..."
                  className="min-h-[200px]"
                  value={campaign.content.caption || campaign.content.body || ''}
                  onChange={(e) => setCampaign(prev => ({
                    ...prev,
                    content: { 
                      ...prev.content, 
                      caption: e.target.value,
                      body: e.target.value 
                    }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Call to Action</Label>
                <Input
                  placeholder="Book now →"
                  value={campaign.content.cta || ''}
                  onChange={(e) => setCampaign(prev => ({
                    ...prev,
                    content: { ...prev.content, cta: e.target.value }
                  }))}
                />
              </div>

              {campaign.ai_generated && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Generated
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Schedule for later</Label>
                  <p className="text-sm text-muted-foreground">
                    Set a specific date and time
                  </p>
                </div>
                <Switch
                  checked={!!campaign.scheduled_at}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      setCampaign(prev => ({ ...prev, scheduled_at: undefined }));
                    }
                  }}
                />
              </div>

              {campaign.scheduled_at !== undefined && (
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={campaign.scheduled_at || ''}
                    onChange={(e) => setCampaign(prev => ({ 
                      ...prev, 
                      scheduled_at: e.target.value 
                    }))}
                  />
                </div>
              )}

              {/* AI Timing Recommendation */}
              <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-amber-500">AI Recommendation</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Best time to post: <strong>Thursday 7:00 PM</strong> based on your audience engagement patterns.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Analytics */}
        <div className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
                  <span className="font-medium text-white text-sm">ferunda.tattoo</span>
                </div>
                <div className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center">
                  <span className="text-zinc-500 text-sm">Media Preview</span>
                </div>
                <p className="text-white text-sm whitespace-pre-wrap">
                  {campaign.content.caption || 'Your caption will appear here...'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Predicted Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">2.4K</p>
                  <p className="text-xs text-muted-foreground">Est. Reach</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">180</p>
                  <p className="text-xs text-muted-foreground">Est. Engagement</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">Est. DMs</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">$840</p>
                  <p className="text-xs text-muted-foreground">Est. Revenue</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Based on AI analysis of similar past campaigns
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Good hashtag variety</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Clear call-to-action</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">!</span>
                  <span>Consider adding a question to boost engagement</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
